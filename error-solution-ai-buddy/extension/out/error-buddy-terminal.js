"use strict";
/**
 * Error Buddy Terminal - Custom terminal that wraps commands with errbuddy
 *
 * This provides an alternative integration method for terminals
 * that don't support Shell Integration API.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBuddyTerminal = void 0;
const vscode = __importStar(require("vscode"));
class ErrorBuddyTerminal {
    terminal;
    /**
     * Create and show an Error Buddy terminal
     */
    create() {
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
    runCommand(command) {
        if (!this.terminal) {
            this.create();
        }
        // Wrap with errbuddy
        this.terminal.sendText(`errbuddy ${command}`);
    }
    /**
     * Dispose of the terminal
     */
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
    }
}
exports.ErrorBuddyTerminal = ErrorBuddyTerminal;
//# sourceMappingURL=error-buddy-terminal.js.map