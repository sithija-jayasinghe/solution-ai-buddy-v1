/**
 * Error Buddy Terminal - Custom terminal that wraps commands with errbuddy
 *
 * This provides an alternative integration method for terminals
 * that don't support Shell Integration API.
 */
import * as vscode from 'vscode';
export declare class ErrorBuddyTerminal {
    private terminal;
    /**
     * Create and show an Error Buddy terminal
     */
    create(): vscode.Terminal;
    /**
     * Run a command in the Error Buddy terminal
     */
    runCommand(command: string): void;
    /**
     * Dispose of the terminal
     */
    dispose(): void;
}
//# sourceMappingURL=error-buddy-terminal.d.ts.map