/**
 * Explanation Panel - Webview panel to display error explanations
 */
import * as vscode from 'vscode';
import { ErrorAnalysis, ErrorExplanation } from './error-detector';
import { AIExplanation } from './ollama-service';
export declare class ExplanationPanel {
    private panel;
    private extensionUri;
    constructor(extensionUri: vscode.Uri);
    /**
     * Show the explanation panel with error details
     */
    show(errorText: string, explanation: AIExplanation | ErrorExplanation, analysis?: ErrorAnalysis): Promise<void>;
    /**
     * Generate the webview HTML content
     */
    private getWebviewContent;
    /**
     * Escape HTML special characters
     */
    private escapeHtml;
    /**
     * Format language name for display
     */
    private formatLanguage;
    /**
     * Dispose of the panel
     */
    dispose(): void;
}
//# sourceMappingURL=explanation-panel.d.ts.map