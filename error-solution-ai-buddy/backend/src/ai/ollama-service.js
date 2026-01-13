/**
 * Ollama AI Service - Handles communication with local Ollama server
 * 
 * WHY OLLAMA:
 * 1. 100% free - no API keys needed
 * 2. Runs locally - your code never leaves your machine
 * 3. Works offline - no internet required after model download
 * 4. Fast - local inference with no network latency
 * 
 * SETUP:
 * 1. Install Ollama: https://ollama.ai
 * 2. Run: ollama pull llama3.2
 * 3. Run: ollama serve
 */

/**
 * System prompt for error explanation
 * 
 * WHY this structure:
 * - Forces consistent output format
 * - Beginner-friendly language
 * - Prevents hallucinations with explicit rules
 */
const SYSTEM_PROMPT = `You are an expert programming assistant that explains errors to developers.

RULES (VERY IMPORTANT):
1. Always respond in this EXACT format:
   WHAT: [Name the specific error code/exception (e.g. "NullPointerException", "CS1061") and what it means]
   WHY: [Explain specifically why this code causes that error]
   FIX: [Clear steps to fix the error]
   EXAMPLE: [Short code example if helpful]

2. Use simple language a junior developer can understand
3. Be concise - no long paragraphs
4. Do NOT assume frameworks (like Spring, React) unless the error explicitly mentions them
5. Focus on the most likely cause first (typos, missing variables, syntax)
6. IF suggesting a fix involves installing a new package, ONLY do so if the error is explicitly "Module/Package not found".
7. If the error mentions "not a statement" and looks like "variable;", explain that standalone variables are not valid statements.
8. Never make up information - if unsure, say so
9. Always explicitly mention the error name or code in the "WHAT" section.

LANGUAGE-SPECIFIC TIPS:
- JavaScript: Common issues are undefined/null, async/await, imports
- Java: 
  - "not a statement" often means a standalone variable (e.g. 'x;') which is invalid in Java. It must be an assignment ('x=1;') or method call.
  - Common issues: NullPointer, missing variables, types
  - Avoid suggesting @Autowired unless it's a Spring error
- C#: Common issues are null reference, missing using, async

Remember: Developers are frustrated when they see errors. Be helpful and direct.`;

export class AIService {
  constructor(baseUrl = 'http://localhost:11434', model = 'llama3.2') {
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeout = 30000; // 30 second timeout
  }

  /**
   * Check if Ollama is running and accessible
   */
  async checkConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal, // 3 second timeout for health check
      }).finally(() => clearTimeout(timeoutId));
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      // Check if the model we want is available
      const models = data.models || [];
      const modelBaseName = this.model.split(':')[0];
      const hasModel = models.some(m => m.name.startsWith(modelBaseName));
      
      if (!hasModel && models.length > 0) {
        // Use first available model as fallback
        this.model = models[0].name;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get explanation for an error from Ollama
   */
  async explainError(errorText, language = 'unknown') {
    const prompt = this.buildPrompt(errorText, language);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          system: SYSTEM_PROMPT,
          stream: false,
          options: {
            temperature: 0.1,  // Very low to prevent hallucinations
            top_p: 0.9,
            num_predict: 500, // Limit response length
          }
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorData = await response.text();
        // Check for memory error
        if (errorData.includes('memory')) {
          throw new Error('Not enough RAM. Try: errbuddy --model qwen2.5:0.5b');
        }
        throw new Error(`Ollama returned ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      // Check for error in response
      if (data.error) {
        if (data.error.includes('memory')) {
          throw new Error('Not enough RAM. Try a smaller model: --model qwen2.5:0.5b');
        }
        throw new Error(data.error);
      }
      
      return this.parseResponse(data.response);
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('AI explanation timed out. Try a smaller model.');
      }
      throw error;
    }
  }

  /**
   * Build the prompt for the AI
   */
  buildPrompt(errorText, language) {
    const langName = {
      javascript: 'JavaScript/Node.js',
      java: 'Java',
      csharp: 'C#/.NET',
      unknown: 'programming'
    }[language] || language;

    return `Explain this ${langName} error to a developer:

\`\`\`
${errorText}
\`\`\`

Remember to use the format: WHAT, WHY, FIX, EXAMPLE`;
  }

  /**
   * Parse the AI response into structured format
   */
  parseResponse(response) {
    const result = {
      what: null,
      why: null,
      fix: null,
      example: null,
      raw: response
    };

    // Try to extract structured parts
    const whatMatch = response.match(/WHAT:\s*(.+?)(?=WHY:|FIX:|EXAMPLE:|$)/is);
    const whyMatch = response.match(/WHY:\s*(.+?)(?=WHAT:|FIX:|EXAMPLE:|$)/is);
    const fixMatch = response.match(/FIX:\s*(.+?)(?=WHAT:|WHY:|EXAMPLE:|$)/is);
    const exampleMatch = response.match(/EXAMPLE:\s*(.+?)(?=WHAT:|WHY:|FIX:|$)/is);

    if (whatMatch) result.what = whatMatch[1].trim();
    if (whyMatch) result.why = whyMatch[1].trim();
    if (fixMatch) result.fix = fixMatch[1].trim();
    if (exampleMatch) result.example = exampleMatch[1].trim();

    // If structured parsing failed, try to make sense of the response
    if (!result.what && !result.why && !result.fix) {
      // Split by sentences and assign
      const sentences = response.split(/[.!]\s+/).filter(s => s.trim());
      if (sentences.length >= 1) result.what = sentences[0].trim() + '.';
      if (sentences.length >= 2) result.why = sentences[1].trim() + '.';
      if (sentences.length >= 3) result.fix = sentences.slice(2).join('. ').trim();
    }

    // Extract code blocks for example
    if (!result.example) {
      const codeMatch = response.match(/```[\w]*\n?([\s\S]+?)```/);
      if (codeMatch) {
        result.example = codeMatch[1].trim();
      }
    }

    return result;
  }

  /**
   * Stream explanation (for future use - better UX for long responses)
   * Currently not used but ready for implementation
   */
  async *streamExplanation(errorText, language = 'unknown') {
    const prompt = this.buildPrompt(errorText, language);
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        system: SYSTEM_PROMPT,
        stream: true,
        options: {
          temperature: 0.3,
          num_predict: 500,
        }
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            yield data.response;
          }
        } catch {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }
  }
}
