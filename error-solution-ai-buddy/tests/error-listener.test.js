/**
 * Tests for Error Listener
 * 
 * Run with: node --test tests/error-listener.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ErrorListener } from '../cli/error-listener.js';

describe('ErrorListener', () => {
  const listener = new ErrorListener();

  describe('detectError()', () => {
    it('should detect JavaScript TypeError', () => {
      const error = `TypeError: Cannot read properties of undefined (reading 'map')
    at app.js:12:5`;
      assert.strictEqual(listener.detectError(error), true);
    });

    it('should detect Java NullPointerException', () => {
      const error = `Exception in thread "main" java.lang.NullPointerException
    at com.example.Main.main(Main.java:10)`;
      assert.strictEqual(listener.detectError(error), true);
    });

    it('should detect C# NullReferenceException', () => {
      const error = `Unhandled exception. System.NullReferenceException: Object reference not set
   at Program.Main() in Program.cs:line 15`;
      assert.strictEqual(listener.detectError(error), true);
    });

    it('should detect generic error keyword', () => {
      const error = `Error: Something went wrong`;
      assert.strictEqual(listener.detectError(error), true);
    });

    it('should not flag normal output as error', () => {
      const output = `Server started on port 3000
Connected to database
Ready to accept connections`;
      assert.strictEqual(listener.detectError(output), false);
    });
  });

  describe('detectLanguage()', () => {
    it('should detect JavaScript from stack trace', () => {
      const error = `TypeError: undefined is not a function
    at Object.<anonymous> (/app/index.js:15:3)
    at Module._compile (node:internal/modules/cjs/loader:1241:14)`;
      assert.strictEqual(listener.detectLanguage(error), 'javascript');
    });

    it('should detect JavaScript from node_modules', () => {
      const error = `Error: Cannot find module 'express'
    at node_modules/some-package/index.js:5:10`;
      assert.strictEqual(listener.detectLanguage(error), 'javascript');
    });

    it('should detect Java from stack trace', () => {
      const error = `java.lang.NullPointerException
    at com.example.service.UserService.getUser(UserService.java:42)
    at com.example.controller.UserController.index(UserController.java:15)`;
      assert.strictEqual(listener.detectLanguage(error), 'java');
    });

    it('should detect Java from Exception in thread', () => {
      const error = `Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds`;
      assert.strictEqual(listener.detectLanguage(error), 'java');
    });

    it('should detect C# from stack trace', () => {
      const error = `System.NullReferenceException: Object reference not set
   at MyApp.Program.Main(String[] args) in C:\\Projects\\MyApp\\Program.cs:line 25`;
      assert.strictEqual(listener.detectLanguage(error), 'csharp');
    });

    it('should detect C# from compiler error', () => {
      const error = `Program.cs(10,15): error CS0103: The name 'myVar' does not exist in the current context`;
      assert.strictEqual(listener.detectLanguage(error), 'csharp');
    });

    it('should return null for unknown language', () => {
      const error = `Some generic error happened`;
      assert.strictEqual(listener.detectLanguage(error), null);
    });
  });

  describe('analyzeError()', () => {
    it('should extract JavaScript error details', () => {
      const error = `TypeError: Cannot read properties of undefined (reading 'map')
    at processData (/app/src/utils.js:25:10)`;
      
      const analysis = listener.analyzeError(error);
      
      assert.strictEqual(analysis.isError, true);
      assert.strictEqual(analysis.language, 'javascript');
      assert.strictEqual(analysis.errorType, 'TypeError');
      assert.ok(analysis.localExplanation);
    });

    it('should extract Java error details', () => {
      const error = `Exception in thread "main" java.lang.NullPointerException: Cannot invoke method on null
    at com.example.App.main(App.java:15)`;
      
      const analysis = listener.analyzeError(error);
      
      assert.strictEqual(analysis.isError, true);
      assert.strictEqual(analysis.language, 'java');
      assert.ok(analysis.localExplanation);
    });

    it('should extract C# error details', () => {
      const error = `Unhandled exception. System.NullReferenceException: Object reference not set to an instance
   at MyApp.Program.Main() in Program.cs:line 10`;
      
      const analysis = listener.analyzeError(error);
      
      assert.strictEqual(analysis.isError, true);
      assert.strictEqual(analysis.language, 'csharp');
    });

    it('should provide local explanation for common errors', () => {
      const error = `TypeError: Cannot read properties of undefined (reading 'length')
    at app.js:5:10`;
      
      const analysis = listener.analyzeError(error);
      
      assert.ok(analysis.localExplanation);
      assert.ok(analysis.localExplanation.what);
      assert.ok(analysis.localExplanation.why);
      assert.ok(analysis.localExplanation.fix);
    });
  });
});

describe('Error Pattern Coverage', () => {
  const listener = new ErrorListener();

  describe('JavaScript Errors', () => {
    const jsErrors = [
      { name: 'TypeError null access', error: "TypeError: Cannot read properties of null (reading 'id')" },
      { name: 'ReferenceError', error: "ReferenceError: myVariable is not defined" },
      { name: 'SyntaxError', error: "SyntaxError: Unexpected token '}'" },
      { name: 'Module not found', error: "Error: Cannot find module './missing-file'" },
      { name: 'ENOENT', error: "Error: ENOENT: no such file or directory, open '/app/config.json'" },
      { name: 'ECONNREFUSED', error: "Error: connect ECONNREFUSED 127.0.0.1:5432" },
    ];

    for (const { name, error } of jsErrors) {
      it(`should detect: ${name}`, () => {
        assert.strictEqual(listener.detectError(error), true);
        assert.strictEqual(listener.detectLanguage(error), 'javascript');
      });
    }
  });

  describe('Java Errors', () => {
    const javaErrors = [
      { name: 'NullPointerException', error: "java.lang.NullPointerException\n\tat Main.main(Main.java:5)" },
      { name: 'ArrayIndexOutOfBounds', error: "java.lang.ArrayIndexOutOfBoundsException: Index 10 out of bounds for length 5" },
      { name: 'ClassNotFoundException', error: "java.lang.ClassNotFoundException: com.example.MissingClass" },
      { name: 'Cannot find symbol', error: "error: cannot find symbol\n  symbol:   variable myVar" },
    ];

    for (const { name, error } of javaErrors) {
      it(`should detect: ${name}`, () => {
        assert.strictEqual(listener.detectError(error), true);
      });
    }
  });

  describe('C# Errors', () => {
    const csharpErrors = [
      { name: 'NullReferenceException', error: "System.NullReferenceException: Object reference not set" },
      { name: 'IndexOutOfRangeException', error: "System.IndexOutOfRangeException: Index was outside the bounds" },
      { name: 'CS0103', error: "error CS0103: The name 'x' does not exist in the current context" },
      { name: 'CS0246', error: "error CS0246: The type or namespace name 'MyClass' could not be found" },
    ];

    for (const { name, error } of csharpErrors) {
      it(`should detect: ${name}`, () => {
        assert.strictEqual(listener.detectError(error), true);
      });
    }
  });
});
