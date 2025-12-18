/**
 * Tests for Formatter
 * 
 * Run with: node --test tests/formatter.test.js
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Formatter } from '../cli/formatter.js';

describe('Formatter', () => {
  describe('constructor', () => {
    it('should create formatter with default options', () => {
      const formatter = new Formatter();
      assert.strictEqual(formatter.useColor, true);
      assert.strictEqual(formatter.useEmoji, true);
    });

    it('should respect disabled color option', () => {
      const formatter = new Formatter({ useColor: false });
      assert.strictEqual(formatter.useColor, false);
    });

    it('should respect disabled emoji option', () => {
      const formatter = new Formatter({ useEmoji: false });
      assert.strictEqual(formatter.useEmoji, false);
    });
  });

  describe('wrapText()', () => {
    const formatter = new Formatter();

    it('should wrap long text at specified width', () => {
      const text = 'This is a long sentence that should be wrapped to fit within the specified width limit.';
      const wrapped = formatter.wrapText(text, 30);
      const lines = wrapped.split('\n');
      
      // Each line should be <= 30 characters (approximately, word boundaries)
      assert.ok(lines.length > 1, 'Text should be wrapped into multiple lines');
    });

    it('should handle empty text', () => {
      assert.strictEqual(formatter.wrapText(''), '');
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(formatter.wrapText(null), '');
      assert.strictEqual(formatter.wrapText(undefined), '');
    });

    it('should not wrap short text', () => {
      const text = 'Short text';
      const wrapped = formatter.wrapText(text, 50);
      assert.strictEqual(wrapped, 'Short text');
    });
  });

  describe('formatCode()', () => {
    const formatter = new Formatter();

    it('should add indentation to code', () => {
      const code = 'const x = 1;\nconst y = 2;';
      const formatted = formatter.formatCode(code);
      
      assert.ok(formatted.includes('  const x = 1;'));
      assert.ok(formatted.includes('  const y = 2;'));
    });

    it('should handle empty code', () => {
      assert.strictEqual(formatter.formatCode(''), '');
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(formatter.formatCode(null), '');
      assert.strictEqual(formatter.formatCode(undefined), '');
    });
  });

  describe('formatLanguage()', () => {
    const formatter = new Formatter();

    it('should format javascript as JavaScript/Node.js', () => {
      assert.strictEqual(formatter.formatLanguage('javascript'), 'JavaScript/Node.js');
    });

    it('should format java as Java', () => {
      assert.strictEqual(formatter.formatLanguage('java'), 'Java');
    });

    it('should format csharp as C#/.NET', () => {
      assert.strictEqual(formatter.formatLanguage('csharp'), 'C#/.NET');
    });

    it('should return input for unknown languages', () => {
      assert.strictEqual(formatter.formatLanguage('rust'), 'rust');
    });
  });
});

describe('Formatter Output Structure', () => {
  it('should produce valid AI explanation structure', () => {
    const formatter = new Formatter();
    
    const explanation = {
      what: 'Test what',
      why: 'Test why',
      fix: 'Test fix',
      example: 'const x = 1;'
    };

    // Mock console.log to capture output
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    try {
      formatter.printAIExplanation(explanation);
      
      const output = logs.join('\n');
      
      // Verify structure elements are present
      assert.ok(output.includes('What'), 'Should include What section');
      assert.ok(output.includes('Why') || output.includes('why'), 'Should include Why section');
      assert.ok(output.includes('fix') || output.includes('Fix'), 'Should include Fix section');
    } finally {
      console.log = originalLog;
    }
  });

  it('should produce valid pattern explanation structure', () => {
    const formatter = new Formatter();
    
    const analysis = {
      language: 'javascript',
      errorType: 'TypeError',
      localExplanation: {
        what: 'Test what',
        why: 'Test why',
        fix: 'Test fix',
        example: 'if (x) { x.map() }'
      }
    };

    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    try {
      formatter.printPatternExplanation(analysis);
      
      const output = logs.join('\n');
      
      // Verify structure
      assert.ok(output.includes('JavaScript') || output.includes('javascript'), 'Should show language');
    } finally {
      console.log = originalLog;
    }
  });
});
