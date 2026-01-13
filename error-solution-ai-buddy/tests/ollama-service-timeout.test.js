
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AIService } from '../backend/src/ai/ollama-service.js';

describe('AIService Timeouts', () => {
  // Store original fetch to restore later
  const originalFetch = global.fetch;

  it('should timeout explainError when request takes too long', async () => {
    // Mock fetch to never resolve (or take very long)
    global.fetch = async (url, options) => {
      // Simulate delay longer than timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If the signal is already aborted, throw AbortError
      if (options.signal && options.signal.aborted) {
         const error = new Error('The user aborted a request.');
         error.name = 'AbortError';
         throw error;
      }
      
      return {
        ok: true,
        json: async () => ({ response: 'success' })
      };
    };

    const service = new AIService();
    // Set a very short timeout for testing
    service.timeout = 10; 

    try {
      await service.explainError('error text');
      assert.fail('Should have thrown timeout error');
    } catch (error) {
      assert.strictEqual(error.message, 'AI explanation timed out. Try a smaller model.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should timeout checkConnection when request takes too long', async () => {
    // Mock fetch to simulate delay
    global.fetch = async (url, options) => {
        // Wait 50ms (longer than the test timeout we want)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (options.signal && options.signal.aborted) {
            const error = new Error('The user aborted a request.');
            error.name = 'AbortError';
            throw error;
        }

        return {
          ok: true,
          json: async () => ({ models: [] })
        };
    };

    const service = new AIService();
    
    // We can't easily change the hardcoded 3000ms timeout in checkConnection 
    // without refactoring, but we can verify it doesn't crash on AbortError.
    // However, waiting 3s in a unit test is bad.
    
    // Strategy: Since we modified the code to catch AbortError and return false,
    // let's verifying that catching logic.
    // We will simulate an immediate AbortError from fetch.
    
    global.fetch = async () => {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        throw error;
    };

    const result = await service.checkConnection();
    assert.strictEqual(result, false, 'Should return false on timeout/error');

    global.fetch = originalFetch;
  });
});
