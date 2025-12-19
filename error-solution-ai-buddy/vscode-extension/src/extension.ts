/**
 * Error Buddy VS Code Extension - Main Entry Point
 * 
 * This extension provides AI-powered error explanations directly in VS Code.
 * It integrates with the terminal to detect errors and show explanations.
 */

import * as vscode from 'vscode';
import { ErrorDetector } from './error-detector';
import { OllamaService } from './ollama-service';
import { ExplanationPanel } from './explanation-panel';
import { ErrorBuddyTerminal } from './error-buddy-terminal';

// Global state
let errorDetector: ErrorDetector;
let ollamaService: OllamaService;
let explanationPanel: ExplanationPanel;
let statusBarItem: vscode.StatusBarItem;
let autoExplainEnabled: boolean = true;
let lastError: string | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('Error Buddy extension is now active!');

    // Initialize services
    const config = vscode.workspace.getConfiguration('errorBuddy');
    const ollamaUrl = config.get<string>('ollamaUrl', 'http://localhost:11434');
    const model = config.get<string>('model', 'qwen2.5:0.5b');
    autoExplainEnabled = config.get<boolean>('autoExplain', true);

    errorDetector = new ErrorDetector();
    ollamaService = new OllamaService(ollamaUrl, model);
    explanationPanel = new ExplanationPanel(context.extensionUri);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(bug) Error Buddy';
    statusBarItem.tooltip = 'Error Buddy - Click to toggle auto-explain';
    statusBarItem.command = 'errorBuddy.toggleAutoExplain';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Check Ollama connection
    checkOllamaConnection();

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('errorBuddy.explainError', explainSelectedError),
        vscode.commands.registerCommand('errorBuddy.explainLastError', explainLastError),
        vscode.commands.registerCommand('errorBuddy.toggleAutoExplain', toggleAutoExplain),
        vscode.commands.registerCommand('errorBuddy.openErrorBuddyTerminal', openErrorBuddyTerminal),
        vscode.commands.registerCommand('errorBuddy.showHistory', showHistory)
    );

    // Listen for terminal data (using Shell Integration API - VS Code 1.93+)
    context.subscriptions.push(
        vscode.window.onDidEndTerminalShellExecution(handleTerminalExecution)
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('errorBuddy')) {
                updateConfiguration();
            }
        })
    );

    // Show welcome message on first install
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        showWelcomeMessage();
        context.globalState.update('hasShownWelcome', true);
    }
}

/**
 * Handle terminal command execution completion
 */
async function handleTerminalExecution(event: vscode.TerminalShellExecutionEndEvent) {
    if (!autoExplainEnabled) {
        return;
    }

    const execution = event.execution;
    
    // Check exit code - non-zero usually means error
    if (event.exitCode === 0) {
        return;
    }

    // Get the terminal output
    const stream = execution.read();
    let output = '';
    
    for await (const data of stream) {
        output += data;
    }

    // Analyze the output for errors
    const analysis = errorDetector.analyzeError(output);
    
    if (analysis.isError) {
        lastError = output;
        updateStatusBar('error');
        
        const config = vscode.workspace.getConfiguration('errorBuddy');
        
        // Show notification if enabled
        if (config.get<boolean>('showNotification', false)) {
            const action = await vscode.window.showWarningMessage(
                `Error detected: ${analysis.errorType || 'Unknown error'}`,
                'Explain',
                'Dismiss'
            );
            
            if (action === 'Explain') {
                await explainError(output, analysis);
            }
        } else {
            // Auto-explain without notification
            await explainError(output, analysis);
        }
    }
}

/**
 * Explain a specific error
 */
async function explainError(errorText: string, analysis?: any) {
    updateStatusBar('loading');
    
    try {
        // Check if Ollama is available
        const isConnected = await ollamaService.checkConnection();
        
        let explanation;
        
        if (isConnected) {
            // Get AI explanation
            explanation = await ollamaService.explainError(errorText, analysis?.language || 'unknown');
        } else {
            // Use pattern-based explanation
            explanation = errorDetector.getLocalExplanation(analysis, errorText);
            if (!explanation) {
                explanation = {
                    what: 'An error occurred in your code.',
                    why: 'Unable to determine the exact cause.',
                    fix: 'Check the error message above for details.',
                    example: null,
                    isOffline: true
                };
            }
            explanation.isOffline = true;
        }

        // Show in panel
        const config = vscode.workspace.getConfiguration('errorBuddy');
        if (config.get<boolean>('showInPanel', true)) {
            await explanationPanel.show(errorText, explanation, analysis);
        }

        updateStatusBar('ready');
        
    } catch (error) {
        updateStatusBar('error');
        vscode.window.showErrorMessage(`Error Buddy: Failed to get explanation - ${error}`);
    }
}

/**
 * Explain selected text in editor or terminal
 */
async function explainSelectedError() {
    const editor = vscode.window.activeTextEditor;
    
    if (editor && editor.selection) {
        const selectedText = editor.document.getText(editor.selection);
        if (selectedText) {
            const analysis = errorDetector.analyzeError(selectedText);
            await explainError(selectedText, analysis);
            return;
        }
    }

    // Try to get terminal selection
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
        // Terminal selection is not directly accessible, prompt user
        const errorText = await vscode.window.showInputBox({
            prompt: 'Paste the error text you want to explain',
            placeHolder: 'TypeError: Cannot read property...',
            ignoreFocusOut: true
        });
        
        if (errorText) {
            const analysis = errorDetector.analyzeError(errorText);
            await explainError(errorText, analysis);
        }
    }
}

/**
 * Explain the last detected error
 */
async function explainLastError() {
    if (!lastError) {
        vscode.window.showInformationMessage('No recent errors detected.');
        return;
    }
    
    const analysis = errorDetector.analyzeError(lastError);
    await explainError(lastError, analysis);
}

/**
 * Toggle auto-explain feature
 */
function toggleAutoExplain() {
    autoExplainEnabled = !autoExplainEnabled;
    
    const config = vscode.workspace.getConfiguration('errorBuddy');
    config.update('autoExplain', autoExplainEnabled, vscode.ConfigurationTarget.Global);
    
    updateStatusBar(autoExplainEnabled ? 'ready' : 'disabled');
    
    vscode.window.showInformationMessage(
        `Error Buddy auto-explain: ${autoExplainEnabled ? 'Enabled' : 'Disabled'}`
    );
}

/**
 * Open a terminal with errbuddy wrapper
 */
function openErrorBuddyTerminal() {
    const terminal = vscode.window.createTerminal({
        name: 'Error Buddy Terminal',
        shellPath: undefined,  // Use default shell
        message: '🤖 Error Buddy Terminal - Errors will be auto-explained',
    });
    terminal.show();
    
    // Send a helpful message
    terminal.sendText('echo "🤖 Error Buddy Terminal Ready! Run your commands normally."', true);
}

/**
 * Show error history panel
 */
async function showHistory() {
    // For now, show a simple message. Could be expanded to full history.
    vscode.window.showInformationMessage('Error history feature coming soon!');
}

/**
 * Update status bar appearance
 */
function updateStatusBar(state: 'ready' | 'loading' | 'error' | 'disabled') {
    switch (state) {
        case 'ready':
            statusBarItem.text = '$(bug) Error Buddy';
            statusBarItem.backgroundColor = undefined;
            statusBarItem.tooltip = 'Error Buddy - Ready (Click to toggle)';
            break;
        case 'loading':
            statusBarItem.text = '$(loading~spin) Analyzing...';
            statusBarItem.tooltip = 'Error Buddy - Analyzing error...';
            break;
        case 'error':
            statusBarItem.text = '$(bug) Error Buddy';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            statusBarItem.tooltip = 'Error Buddy - Error detected!';
            break;
        case 'disabled':
            statusBarItem.text = '$(bug) Error Buddy (off)';
            statusBarItem.backgroundColor = undefined;
            statusBarItem.tooltip = 'Error Buddy - Disabled (Click to enable)';
            break;
    }
}

/**
 * Check Ollama connection and update UI
 */
async function checkOllamaConnection() {
    const isConnected = await ollamaService.checkConnection();
    
    if (!isConnected) {
        statusBarItem.tooltip = 'Error Buddy - Ollama not connected (using offline mode)';
    }
}

/**
 * Update configuration from settings
 */
function updateConfiguration() {
    const config = vscode.workspace.getConfiguration('errorBuddy');
    
    autoExplainEnabled = config.get<boolean>('autoExplain', true);
    
    const ollamaUrl = config.get<string>('ollamaUrl', 'http://localhost:11434');
    const model = config.get<string>('model', 'qwen2.5:0.5b');
    
    ollamaService = new OllamaService(ollamaUrl, model);
    
    updateStatusBar(autoExplainEnabled ? 'ready' : 'disabled');
}

/**
 * Show welcome message on first install
 */
function showWelcomeMessage() {
    vscode.window.showInformationMessage(
        '🤖 Welcome to Error Buddy! Errors in your terminal will now be automatically explained.',
        'Open Settings',
        'Dismiss'
    ).then(action => {
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'errorBuddy');
        }
    });
}

export function deactivate() {
    console.log('Error Buddy extension deactivated');
}
