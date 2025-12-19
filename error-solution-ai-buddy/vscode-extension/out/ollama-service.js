"use strict";
/**
 * Ollama Service - Handles communication with local Ollama server
 *
 * TypeScript version for VS Code extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const SYSTEM_PROMPT = `You are an expert programming assistant that explains errors to developers.

RULES (VERY IMPORTANT):
1. Always respond in this EXACT format:
   WHAT: [One sentence explaining what the error is]
   WHY: [One sentence explaining why this happens]
   FIX: [Clear steps to fix the error]
   EXAMPLE: [Short code example if helpful]

2. Use simple language a junior developer can understand
3. Be concise - no long paragraphs
4. If you're not 100% sure, say "This might be because..."
5. Focus on the most likely cause first
6. Never make up information - if unsure, say so

Remember: Developers are frustrated when they see errors. Be helpful and direct.`;
class OllamaService {
    baseUrl;
    model;
    timeout = 30000;
    constructor(baseUrl = 'http://localhost:11434', model = 'qwen2.5:0.5b') {
        this.baseUrl = baseUrl;
        this.model = model;
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
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            const models = data.models || [];
            const modelBaseName = this.model.split(':')[0];
            const hasModel = models.some((m) => m.name.startsWith(modelBaseName));
            if (!hasModel && models.length > 0) {
                this.model = models[0].name;
            }
            return true;
        }
        catch (error) {
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
                        temperature: 0.3,
                        top_p: 0.9,
                        num_predict: 500,
                    }
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorData = await response.text();
                if (errorData.includes('memory')) {
                    throw new Error('Not enough RAM. Try a smaller model in settings.');
                }
                throw new Error(`Ollama returned ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            return this.parseResponse(data.response || '');
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('AI explanation timed out.');
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
        };
        return `Explain this ${langName[language] || language} error to a developer:

\`\`\`
${this.sanitizeError(errorText)}
\`\`\`

Remember to use the format: WHAT, WHY, FIX, EXAMPLE`;
    }
    /**
     * Sanitize error text before sending to AI
     */
    sanitizeError(errorText) {
        let sanitized = errorText;
        // Remove Windows-style absolute paths
        sanitized = sanitized.replace(/[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*/g, '[path]\\');
        // Remove Unix-style absolute paths
        sanitized = sanitized.replace(/\/(?:home|Users|var|usr|opt)\/[^\s:]+/g, '[path]');
        // Remove common secret patterns
        sanitized = sanitized.replace(/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, '[REDACTED]');
        // Truncate if too long
        if (sanitized.length > 2000) {
            sanitized = sanitized.substring(0, 2000) + '\n... (truncated)';
        }
        return sanitized;
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
        if (whatMatch)
            result.what = whatMatch[1].trim();
        if (whyMatch)
            result.why = whyMatch[1].trim();
        if (fixMatch)
            result.fix = fixMatch[1].trim();
        if (exampleMatch)
            result.example = exampleMatch[1].trim();
        // If structured parsing failed, try to make sense of the response
        if (!result.what && !result.why && !result.fix) {
            const sentences = response.split(/[.!]\s+/).filter(s => s.trim());
            if (sentences.length >= 1)
                result.what = sentences[0].trim() + '.';
            if (sentences.length >= 2)
                result.why = sentences[1].trim() + '.';
            if (sentences.length >= 3)
                result.fix = sentences.slice(2).join('. ').trim();
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
}
exports.OllamaService = OllamaService;
//# sourceMappingURL=ollama-service.js.map