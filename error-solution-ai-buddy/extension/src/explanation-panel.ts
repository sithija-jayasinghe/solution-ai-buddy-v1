/**
 * Explanation Panel - Webview panel to display error explanations
 */

import * as vscode from 'vscode';
import { ErrorAnalysis, ErrorExplanation } from './error-detector';
import { AIExplanation } from './ollama-service';

export class ExplanationPanel {
    private panel: vscode.WebviewPanel | undefined;
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    /**
     * Show the explanation panel with error details
     */
    async show(
        errorText: string,
        explanation: AIExplanation | ErrorExplanation,
        analysis?: ErrorAnalysis
    ): Promise<void> {
        // Create or reveal panel
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'errorBuddyExplanation',
                '🤖 Error Buddy',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        }

        // Update content
        this.panel.webview.html = this.getWebviewContent(errorText, explanation, analysis);
    }

    /**
     * Generate the webview HTML content
     */
    private getWebviewContent(
        errorText: string,
        explanation: AIExplanation | ErrorExplanation,
        analysis?: ErrorAnalysis
    ): string {
        const isOffline = 'isOffline' in explanation && explanation.isOffline;
        
        // Escape HTML in error text
        const escapedError = this.escapeHtml(errorText);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Buddy Explanation</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-editor-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
        }
        
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        
        .header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header h1 {
            margin: 0;
            font-size: 1.4em;
            font-weight: 600;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 500;
        }
        
        .badge.language {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        
        .badge.offline {
            background-color: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
        }
        
        .error-box {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 20px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        .section {
            margin-bottom: 20px;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .section-header .icon {
            font-size: 1.2em;
        }
        
        .section-header h2 {
            margin: 0;
            font-size: 1.1em;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .section-content {
            padding-left: 28px;
            color: var(--vscode-descriptionForeground);
        }
        
        .what .section-header h2 { color: var(--vscode-charts-blue); }
        .why .section-header h2 { color: var(--vscode-charts-yellow); }
        .fix .section-header h2 { color: var(--vscode-charts-green); }
        .example .section-header h2 { color: var(--vscode-charts-purple); }
        
        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .feedback-buttons {
            display: flex;
            gap: 8px;
        }
        
        .feedback-btn {
            padding: 4px 12px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .feedback-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <span style="font-size: 1.5em;">🤖</span>
        <h1>Error Buddy Explanation</h1>
        ${analysis?.language ? `<span class="badge language">${this.formatLanguage(analysis.language)}</span>` : ''}
        ${isOffline ? '<span class="badge offline">Offline Mode</span>' : ''}
    </div>
    
    <div class="error-box">${escapedError}</div>
    
    ${explanation.what ? `
    <div class="section what">
        <div class="section-header">
            <span class="icon">📘</span>
            <h2>What is this error?</h2>
        </div>
        <div class="section-content">${this.escapeHtml(explanation.what)}</div>
    </div>
    ` : ''}
    
    ${explanation.why ? `
    <div class="section why">
        <div class="section-header">
            <span class="icon">❓</span>
            <h2>Why does it happen?</h2>
        </div>
        <div class="section-content">${this.escapeHtml(explanation.why)}</div>
    </div>
    ` : ''}
    
    ${explanation.fix ? `
    <div class="section fix">
        <div class="section-header">
            <span class="icon">✅</span>
            <h2>How to fix it</h2>
        </div>
        <div class="section-content">${this.escapeHtml(explanation.fix)}</div>
    </div>
    ` : ''}
    
    ${explanation.example ? `
    <div class="section example">
        <div class="section-header">
            <span class="icon">💡</span>
            <h2>Example</h2>
        </div>
        <div class="section-content">
            <div class="code-block">${this.escapeHtml(explanation.example)}</div>
        </div>
    </div>
    ` : ''}
    
    <div class="footer">
        <span>Powered by ${isOffline ? 'Pattern Matching' : 'Ollama AI'}</span>
        <div class="feedback-buttons">
            <button class="feedback-btn" onclick="sendFeedback(true)">👍 Helpful</button>
            <button class="feedback-btn" onclick="sendFeedback(false)">👎 Not helpful</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function sendFeedback(helpful) {
            vscode.postMessage({
                type: 'feedback',
                helpful: helpful
            });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Format language name for display
     */
    private formatLanguage(lang: string): string {
        const names: Record<string, string> = {
            javascript: 'JavaScript',
            java: 'Java',
            csharp: 'C#',
            python: 'Python',
            unknown: 'Unknown'
        };
        return names[lang] || lang;
    }

    /**
     * Dispose of the panel
     */
    dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
