/**
 * Error Buddy Terminal - Custom terminal that wraps commands with errbuddy
 * 
 * This provides an alternative integration method for terminals
 * that don't support Shell Integration API.
 */

import * as vscode from 'vscode';

export class ErrorBuddyTerminal {
    private terminal: vscode.Terminal | undefined;

    /**
     * Create and show an Error Buddy terminal
     */
    create(): vscode.Terminal {
        this.terminal = vscode.window.createTerminal({
            name: '🤖 Error Buddy',
            message: 'Error Buddy Terminal - Errors will be auto-explained\nTip: Use errbuddy prefix for any command\n',
        });

        this.terminal.show();
        return this.terminal;
    }

    /**
     * Run a command in the Error Buddy terminal
     */
    runCommand(command: string): void {
        if (!this.terminal) {
            this.create();
        }
        
        // Wrap with errbuddy
        this.terminal!.sendText(`errbuddy ${command}`);
    }

    /**
     * Dispose of the terminal
     */
    dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}
