/**
 * Tests for Ollama AI Service
 * 
 * Run with: node --test tests/ollama-service.test.js
 * 
 * Note: These tests mock the Ollama API. For integration tests
 * with a real Ollama instance, see tests/integration/
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AIService } from '../backend/src/ai/ollama-service.js';

describe('AIService', () => {
  describe('constructor', () => {
    it('should create service with default settings', () => {
      const service = new AIService();
      assert.strictEqual(service.baseUrl, 'http://localhost:11434');
      assert.strictEqual(service.model, 'llama3.2');
    });

    it('should accept custom URL and model', () => {
      const service = new AIService('http://custom:1234', 'codellama');
      assert.strictEqual(service.baseUrl, 'http://custom:1234');
      assert.strictEqual(service.model, 'codellama');
    });
  });

  describe('buildPrompt()', () => {
    const service = new AIService();

    it('should include error text in prompt', () => {
      const error = 'TypeError: undefined is not a function';
      const prompt = service.buildPrompt(error, 'javascript');
      
      assert.ok(prompt.includes(error));
    });

    it('should include language name', () => {
      const prompt = service.buildPrompt('error', 'javascript');
      assert.ok(prompt.includes('JavaScript'));
    });

    it('should format Java language correctly', () => {
      const prompt = service.buildPrompt('error', 'java');
      assert.ok(prompt.includes('Java'));
    });

    it('should format C# language correctly', () => {
      const prompt = service.buildPrompt('error', 'csharp');
      assert.ok(prompt.includes('C#'));
    });

    it('should handle unknown language', () => {
      const prompt = service.buildPrompt('error', 'unknown');
      assert.ok(prompt.includes('programming'));
    });
  });

  describe('parseResponse()', () => {
    const service = new AIService();

    it('should parse well-formatted response', () => {
      const response = `WHAT: This is an undefined error.
WHY: The variable was not initialized.
FIX: Initialize the variable before use.
EXAMPLE: const x = null; if (x) { x.method(); }`;

      const parsed = service.parseResponse(response);

      assert.ok(parsed.what.includes('undefined'));
      assert.ok(parsed.why.includes('initialized'));
      assert.ok(parsed.fix.includes('Initialize'));
      assert.ok(parsed.example.includes('const x'));
    });

    it('should extract code blocks as examples', () => {
      const response = `WHAT: Error occurred.
WHY: Bad code.
FIX: Fix it.
\`\`\`javascript
const fixed = true;
\`\`\``;

      const parsed = service.parseResponse(response);

      assert.ok(parsed.example.includes('const fixed'));
    });

    it('should handle unstructured response', () => {
      const response = 'This error happens because you did something wrong. You should fix it by doing this instead.';

      const parsed = service.parseResponse(response);

      // Should still extract something
      assert.ok(parsed.what || parsed.raw);
    });

    it('should preserve raw response', () => {
      const response = 'Some AI response text';
      const parsed = service.parseResponse(response);
      
      assert.strictEqual(parsed.raw, response);
    });
  });
});

describe('AIService Response Parsing Edge Cases', () => {
  const service = new AIService();

  it('should handle WHAT/WHY/FIX in different order', () => {
    const response = `WHY: Because of null.
WHAT: Null pointer error.
FIX: Check for null.`;

    const parsed = service.parseResponse(response);

    assert.ok(parsed.what.includes('Null'));
    assert.ok(parsed.why.includes('null'));
    assert.ok(parsed.fix.includes('Check'));
  });

  it('should handle multi-line sections', () => {
    const response = `WHAT: This is a complex error that spans
multiple lines and has lots of detail.
WHY: The cause is complicated.
FIX: Do these steps:
1. First step
2. Second step`;

    const parsed = service.parseResponse(response);

    assert.ok(parsed.what.includes('multiple lines'));
    assert.ok(parsed.fix.includes('First step'));
  });

  it('should handle missing sections gracefully', () => {
    const response = `WHAT: Just the what section.`;

    const parsed = service.parseResponse(response);

    assert.ok(parsed.what);
    assert.strictEqual(parsed.why, null);
    assert.strictEqual(parsed.fix, null);
  });
});
