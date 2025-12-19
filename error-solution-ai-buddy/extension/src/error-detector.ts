/**
 * Error Detector - Detects and analyzes errors from text
 * 
 * This is a TypeScript port of the CLI error-listener.js
 * Provides language detection and pattern-based explanations.
 */

export interface ErrorAnalysis {
    isError: boolean;
    language: string | null;
    errorType: string | null;
    errorMessage: string | null;
    file: string | null;
    line: number | null;
    column: number | null;
    localExplanation: ErrorExplanation | null;
}

export interface ErrorExplanation {
    what: string;
    why: string;
    fix: string;
    example: string | null;
    isOffline?: boolean;
}

interface LanguagePatterns {
    patterns: RegExp[];
    stackTraceIndicator: RegExp;
    fileLinePattern: RegExp;
}

const ERROR_PATTERNS: Record<string, LanguagePatterns> = {
    javascript: {
        patterns: [
            /^(\w*Error): (.+)$/m,
            /^(\w*Exception): (.+)$/m,
            /SyntaxError: (.+)/,
            /Cannot find module '(.+)'/,
            /is not defined/,
            /is not a function/,
            /Cannot read propert(?:y|ies) of (undefined|null)/,
            /ENOENT|EACCES|ECONNREFUSED/,
        ],
        stackTraceIndicator: /at\s+(?:\S+\s+)?\(?.*:\d+:\d+\)?/,
        fileLinePattern: /at\s+.*\(?(.*):(\d+):(\d+)\)?/,
    },

    java: {
        patterns: [
            /^Exception in thread ".*" (\w+(?:\.\w+)*): (.*)$/m,
            /^(\w+(?:\.\w+)*Exception): (.*)$/m,
            /^(\w+(?:\.\w+)*Error): (.*)$/m,
            /^Caused by: (\w+(?:\.\w+)*): (.*)$/m,
            /cannot find symbol/,
            /error: (.+)/,
            /incompatible types/,
        ],
        stackTraceIndicator: /at\s+[\w.$]+\([\w.]+:\d+\)/,
        fileLinePattern: /at\s+[\w.$]+\(([\w.]+):(\d+)\)/,
    },

    csharp: {
        patterns: [
            /^Unhandled exception\. (\w+(?:\.\w+)*): (.*)$/m,
            /^(\w+(?:\.\w+)*Exception): (.*)$/m,
            /error CS\d+: (.+)/,
            /Object reference not set/,
            /Index was outside the bounds/,
            /The type or namespace name .* could not be found/,
        ],
        stackTraceIndicator: /at\s+[\w.<>]+\(.*\)\s+in\s+.*:line\s+\d+/,
        fileLinePattern: /in\s+(.*):line\s+(\d+)/,
    }
};

const COMMON_ERRORS: Record<string, Record<string, Record<string, ErrorExplanation>>> = {
    javascript: {
        'TypeError': {
            'Cannot read propert': {
                what: 'You tried to access a property on something that is undefined or null.',
                why: 'The variable you\'re accessing doesn\'t exist or hasn\'t been assigned a value yet.',
                fix: 'Add a null check before accessing properties.',
                example: `if (data && data.users) {\n  data.users.map(...)\n}`
            },
            'is not a function': {
                what: 'You tried to call something as a function, but it\'s not a function.',
                why: 'The variable might be undefined, or you imported/accessed the wrong thing.',
                fix: 'Check that you\'re calling the right function and it\'s properly imported.',
                example: `if (typeof myFunc === 'function') {\n  myFunc();\n}`
            }
        },
        'ReferenceError': {
            'is not defined': {
                what: 'You\'re using a variable that doesn\'t exist in the current scope.',
                why: 'Either the variable was never declared, or it\'s spelled wrong, or it\'s out of scope.',
                fix: 'Make sure the variable is declared (const, let, var) before using it.',
                example: `// Wrong:\nconsole.log(myVar);\n\n// Right:\nconst myVar = 'hello';\nconsole.log(myVar);`
            }
        },
        'SyntaxError': {
            'default': {
                what: 'Your code has a syntax mistake that JavaScript cannot understand.',
                why: 'Missing brackets, quotes, semicolons, or other syntax issues.',
                fix: 'Check the line number mentioned and look for missing or extra characters.',
                example: null
            }
        },
        'ENOENT': {
            'default': {
                what: 'A file or directory you tried to access doesn\'t exist.',
                why: 'The path is wrong, or the file was deleted/moved.',
                fix: 'Check that the file path is correct and the file exists.',
                example: null
            }
        }
    },

    java: {
        'NullPointerException': {
            'default': {
                what: 'You tried to use an object that is null (doesn\'t exist).',
                why: 'A variable wasn\'t initialized, or a method returned null.',
                fix: 'Add null checks before using objects.',
                example: `if (user != null) {\n    user.getName();\n}`
            }
        },
        'ArrayIndexOutOfBoundsException': {
            'default': {
                what: 'You tried to access an array index that doesn\'t exist.',
                why: 'Arrays are 0-indexed, so an array of size 5 has indices 0-4.',
                fix: 'Check array length before accessing an index.',
                example: `if (index >= 0 && index < arr.length) {\n    arr[index] = 10;\n}`
            }
        }
    },

    csharp: {
        'NullReferenceException': {
            'default': {
                what: 'You tried to use an object that is null.',
                why: 'A variable wasn\'t initialized, or a method returned null.',
                fix: 'Add null checks or use null-conditional operators.',
                example: `var name = user?.Name;\n// Or:\nif (user != null) {\n    var name = user.Name;\n}`
            }
        },
        'CS0103': {
            'default': {
                what: 'The name you\'re using doesn\'t exist in the current context.',
                why: 'Variable not declared, typo, or missing using statement.',
                fix: 'Check variable spelling and add any missing using statements.',
                example: null
            }
        }
    }
};

export class ErrorDetector {
    /**
     * Quick check if text looks like an error
     */
    detectError(text: string): boolean {
        const errorIndicators = [
            /error/i,
            /exception/i,
            /failed/i,
            /cannot/i,
            /unable to/i,
            /fatal/i,
            /ENOENT|EACCES|ECONNREFUSED/,
            /at\s+[\w.]+\(.*:\d+/,
        ];

        return errorIndicators.some(pattern => pattern.test(text));
    }

    /**
     * Detect programming language from error output
     */
    detectLanguage(errorText: string): string | null {
        // JavaScript/Node.js indicators
        if (
            /at\s+\S+\s+\(.*\.js:\d+:\d+\)/.test(errorText) ||
            /at\s+.*\.js:\d+:\d+/.test(errorText) ||
            /node_modules/.test(errorText) ||
            /ENOENT|EACCES|ECONNREFUSED/.test(errorText) ||
            /Cannot find module/.test(errorText)
        ) {
            return 'javascript';
        }

        // Java indicators
        if (
            /at\s+[\w.$]+\([\w.]+\.java:\d+\)/.test(errorText) ||
            /Exception in thread/.test(errorText) ||
            /\.java:\d+:/.test(errorText) ||
            /at\s+java\./.test(errorText)
        ) {
            return 'java';
        }

        // C# indicators
        if (
            /at\s+[\w.<>]+\(.*\)\s+in\s+.*:line\s+\d+/.test(errorText) ||
            /error CS\d+/.test(errorText) ||
            /\.cs\(\d+,\d+\)/.test(errorText) ||
            /Unhandled exception\. System\./.test(errorText) ||
            /at\s+System\./.test(errorText)
        ) {
            return 'csharp';
        }

        return null;
    }

    /**
     * Analyze the error and extract useful information
     */
    analyzeError(errorText: string): ErrorAnalysis {
        const analysis: ErrorAnalysis = {
            isError: false,
            language: this.detectLanguage(errorText),
            errorType: null,
            errorMessage: null,
            file: null,
            line: null,
            column: null,
            localExplanation: null,
        };

        if (!analysis.language) {
            analysis.isError = this.detectError(errorText);
            analysis.language = 'unknown';
            return analysis;
        }

        const langPatterns = ERROR_PATTERNS[analysis.language];
        if (!langPatterns) {
            analysis.isError = this.detectError(errorText);
            return analysis;
        }

        // Try to match error patterns
        for (const pattern of langPatterns.patterns) {
            const match = errorText.match(pattern);
            if (match) {
                analysis.isError = true;
                analysis.errorType = match[1] || null;
                analysis.errorMessage = match[2] || match[1] || null;
                break;
            }
        }

        // Extract file and line number
        if (langPatterns.fileLinePattern) {
            const fileMatch = errorText.match(langPatterns.fileLinePattern);
            if (fileMatch) {
                analysis.file = fileMatch[1];
                analysis.line = parseInt(fileMatch[2], 10);
                analysis.column = fileMatch[3] ? parseInt(fileMatch[3], 10) : null;
            }
        }

        // Get local explanation if available
        analysis.localExplanation = this.getLocalExplanation(analysis, errorText);

        return analysis;
    }

    /**
     * Get local explanation for an error (used when AI is unavailable)
     */
    getLocalExplanation(analysis: ErrorAnalysis, errorText: string): ErrorExplanation | null {
        if (!analysis.language || !COMMON_ERRORS[analysis.language]) {
            return null;
        }

        const langExplanations = COMMON_ERRORS[analysis.language];

        // Try to find matching explanation
        for (const [errorType, subErrors] of Object.entries(langExplanations)) {
            if (errorText.includes(errorType) || analysis.errorType?.includes(errorType)) {
                // Check for specific sub-patterns
                for (const [subPattern, explanation] of Object.entries(subErrors)) {
                    if (subPattern === 'default' || errorText.includes(subPattern)) {
                        return explanation;
                    }
                }
                // Return default if exists
                if (subErrors['default']) {
                    return subErrors['default'];
                }
            }
        }

        return null;
    }
}
