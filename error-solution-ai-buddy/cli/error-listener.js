/**
 * Error Listener - Detects and analyzes errors from stderr
 * 
 * This module is responsible for:
 * 1. Detecting if output contains an error (vs. just warnings/info)
 * 2. Identifying the programming language
 * 3. Extracting useful context (error type, line number, file)
 * 4. Providing pattern-based explanations (fallback when AI unavailable)
 */

/**
 * Error patterns for each language
 * 
 * WHY we use patterns:
 * 1. Fast detection without AI
 * 2. Fallback when Ollama is offline
 * 3. Helps identify language for better AI prompts
 */
const ERROR_PATTERNS = {
  javascript: {
    // Pattern: matches the error type and extracts it
    patterns: [
      /^(\w*Error): (.+)$/m,                           // TypeError: message
      /^(\w*Exception): (.+)$/m,                       // ReferenceException: message
      /SyntaxError: (.+)/,                             // Syntax errors
      /Cannot find module '(.+)'/,                     // Module not found
      /is not defined/,                                // Undefined variable
      /is not a function/,                             // Calling non-function
      /Cannot read propert(?:y|ies) of (undefined|null)/, // Null/undefined access
      /ENOENT|EACCES|ECONNREFUSED/,                    // System errors
    ],
    stackTraceIndicator: /at\s+(?:\S+\s+)?\(?.*:\d+:\d+\)?/,
    fileLinePattern: /at\s+.*\(?(.*):(\d+):(\d+)\)?/,
  },
  
  java: {
    patterns: [
      /^Exception in thread ".*" (\w+(?:\.\w+)*): (.*)$/m,  // Exception in thread "main"
      /^(\w+(?:\.\w+)*Exception): (.*)$/m,                   // NullPointerException:
      /^(\w+(?:\.\w+)*Error): (.*)$/m,                       // OutOfMemoryError:
      /^Caused by: (\w+(?:\.\w+)*): (.*)$/m,                 // Caused by:
      /cannot find symbol/,                                   // Compile error
      /error: (.+)/,                                          // Generic error
      /incompatible types/,                                   // Type mismatch
    ],
    stackTraceIndicator: /at\s+[\w.$]+\([\w.]+:\d+\)/,
    fileLinePattern: /at\s+[\w.$]+\(([\w.]+):(\d+)\)/,
  },
  
  csharp: {
    patterns: [
      /^Unhandled exception\. (\w+(?:\.\w+)*): (.*)$/m,     // Unhandled exception.
      /^(\w+(?:\.\w+)*Exception): (.*)$/m,                   // NullReferenceException:
      /error CS\d+: (.+)/,                                   // Compiler error
      /Object reference not set/,                            // NullRef
      /Index was outside the bounds/,                        // Array bounds
      /The type or namespace name .* could not be found/,    // Missing type
    ],
    stackTraceIndicator: /at\s+[\w.<>]+\(.*\)\s+in\s+.*:line\s+\d+/,
    fileLinePattern: /in\s+(.*):line\s+(\d+)/,
  }
};

/**
 * Common error explanations (used when AI is unavailable)
 * 
 * WHY we have local explanations:
 * - Works offline
 * - Instant response (no network latency)
 * - Fallback if Ollama fails
 */
const COMMON_ERRORS = {
  javascript: {
    'TypeError': {
      'Cannot read property': {
        what: 'You tried to access a property on something that is undefined or null.',
        why: 'The variable you\'re accessing doesn\'t exist or hasn\'t been assigned a value yet.',
        fix: 'Add a null check before accessing properties.',
        example: `// Instead of: data.users.map(...)
// Do this:
if (data && data.users) {
  data.users.map(...)
}`
      },
      'is not a function': {
        what: 'You tried to call something as a function, but it\'s not a function.',
        why: 'The variable might be undefined, or you imported/accessed the wrong thing.',
        fix: 'Check that you\'re calling the right function and it\'s properly imported.',
        example: `// Check if it's a function first:
if (typeof myFunc === 'function') {
  myFunc();
}`
      }
    },
    'ReferenceError': {
      'is not defined': {
        what: 'You\'re using a variable that doesn\'t exist in the current scope.',
        why: 'Either the variable was never declared, or it\'s spelled wrong, or it\'s out of scope.',
        fix: 'Make sure the variable is declared (const, let, var) before using it.',
        example: `// Wrong:
console.log(myVar);

// Right:
const myVar = 'hello';
console.log(myVar);`
      }
    },
    'SyntaxError': {
      'default': {
        what: 'Your code has a syntax mistake that JavaScript cannot understand.',
        why: 'Missing brackets, quotes, semicolons, or other syntax issues.',
        fix: 'Check the line number mentioned and look for missing or extra characters.',
        example: `// Common issues:
// - Missing closing bracket: { or }
// - Missing closing parenthesis: ( or )
// - Missing quotes: " or '
// - Extra/missing comma in arrays/objects`
      }
    },
    'ENOENT': {
      'default': {
        what: 'A file or directory you tried to access doesn\'t exist.',
        why: 'The path is wrong, or the file was deleted/moved.',
        fix: 'Check that the file path is correct and the file exists.',
        example: `// Check if file exists first:
const fs = require('fs');
if (fs.existsSync('./myfile.txt')) {
  // read file
}`
      }
    },
    'ECONNREFUSED': {
      'default': {
        what: 'Your code tried to connect to a server that refused the connection.',
        why: 'The server might not be running, wrong port, or firewall blocking.',
        fix: 'Make sure the server is running and the port/host are correct.',
        example: `// Common checks:
// 1. Is the database/server running?
// 2. Is the port correct? (e.g., 3000, 5432)
// 3. Is it localhost or 127.0.0.1?`
      }
    }
  },
  
  java: {
    'NullPointerException': {
      'default': {
        what: 'You tried to use an object that is null (doesn\'t exist).',
        why: 'A variable wasn\'t initialized, or a method returned null.',
        fix: 'Add null checks before using objects.',
        example: `// Instead of: user.getName()
// Do this:
if (user != null) {
    user.getName();
}

// Or use Optional:
Optional.ofNullable(user).map(User::getName);`
      }
    },
    'ArrayIndexOutOfBoundsException': {
      'default': {
        what: 'You tried to access an array index that doesn\'t exist.',
        why: 'Arrays are 0-indexed, so an array of size 5 has indices 0-4.',
        fix: 'Check array length before accessing an index.',
        example: `// Wrong: accessing index 5 in array of size 5
int[] arr = new int[5];
arr[5] = 10; // Error! Valid indices are 0-4

// Right:
if (index >= 0 && index < arr.length) {
    arr[index] = 10;
}`
      }
    },
    'ClassNotFoundException': {
      'default': {
        what: 'Java cannot find a class you\'re trying to use.',
        why: 'The class isn\'t in your classpath, or the name is misspelled.',
        fix: 'Check your dependencies (pom.xml/build.gradle) and class name.',
        example: `// Check:
// 1. Is the dependency in pom.xml?
// 2. Did you run 'mvn install'?
// 3. Is the class name spelled correctly?
// 4. Is the import statement correct?`
      }
    },
    'cannot find symbol': {
      'default': {
        what: 'Java compiler cannot find a variable, method, or class you\'re using.',
        why: 'Typo in name, missing import, or wrong scope.',
        fix: 'Check spelling and make sure imports are correct.',
        example: `// Common causes:
// 1. Typo: myVarible instead of myVariable
// 2. Missing import statement
// 3. Variable declared in different scope
// 4. Method doesn't exist in that class`
      }
    }
  },
  
  csharp: {
    'NullReferenceException': {
      'default': {
        what: 'You tried to use an object that is null.',
        why: 'A variable wasn\'t initialized, or a method returned null.',
        fix: 'Add null checks or use null-conditional operators.',
        example: `// Instead of: user.Name
// Use null-conditional:
var name = user?.Name;

// Or null check:
if (user != null)
{
    var name = user.Name;
}`
      }
    },
    'IndexOutOfRangeException': {
      'default': {
        what: 'You tried to access an array/list index that doesn\'t exist.',
        why: 'The index is negative or greater than the collection size.',
        fix: 'Check collection length before accessing an index.',
        example: `// Wrong:
var items = new int[5];
var x = items[5]; // Error!

// Right:
if (index >= 0 && index < items.Length)
{
    var x = items[index];
}`
      }
    },
    'CS0103': {
      'default': {
        what: 'The name you\'re using doesn\'t exist in the current context.',
        why: 'Variable not declared, typo, or missing using statement.',
        fix: 'Check variable spelling and add any missing using statements.',
        example: `// Did you forget to add:
using System.Linq;
using YourNamespace;

// Or declare the variable:
var myVariable = "value";`
      }
    },
    'CS0246': {
      'default': {
        what: 'C# cannot find a type or namespace you\'re trying to use.',
        why: 'Missing using statement, missing NuGet package, or typo.',
        fix: 'Add the using statement or install the required NuGet package.',
        example: `// Add using statement:
using Newtonsoft.Json;

// Or install package:
// dotnet add package Newtonsoft.Json`
      }
    }
  }
};

export class ErrorListener {
  constructor() {
    this.patterns = ERROR_PATTERNS;
    this.explanations = COMMON_ERRORS;
  }

  /**
   * Quick check if text looks like an error
   * 
   * WHY: We don't want to trigger AI for every output.
   * Only analyze when there's likely an actual error.
   */
  detectError(text) {
    const errorIndicators = [
      /error/i,
      /exception/i,
      /failed/i,
      /cannot/i,
      /unable to/i,
      /fatal/i,
      /ENOENT|EACCES|ECONNREFUSED/,
      /at\s+[\w.]+\(.*:\d+/,  // Stack trace pattern
    ];

    return errorIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Analyze the error and extract useful information
   */
  analyzeError(errorText) {
    const analysis = {
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
      // Try to still detect if it's an error
      analysis.isError = this.detectError(errorText);
      analysis.language = 'unknown';
      return analysis;
    }

    const langPatterns = this.patterns[analysis.language];
    
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
        analysis.line = fileMatch[2];
        analysis.column = fileMatch[3] || null;
      }
    }

    // Get local explanation if available
    analysis.localExplanation = this.getLocalExplanation(analysis, errorText);

    return analysis;
  }

  /**
   * Detect programming language from error output
   */
  detectLanguage(errorText) {
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
   * Get local explanation for an error (used when AI is unavailable)
   */
  getLocalExplanation(analysis, errorText) {
    if (!analysis.language || !this.explanations[analysis.language]) {
      return null;
    }

    const langExplanations = this.explanations[analysis.language];
    
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
        if (subErrors.default) {
          return subErrors.default;
        }
      }
    }

    return null;
  }
}
