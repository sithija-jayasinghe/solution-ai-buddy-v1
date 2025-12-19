/**
 * Ollama Service - Handles communication with local Ollama server
 *
 * TypeScript version for VS Code extension
 */
export interface AIExplanation {
    what: string | null;
    why: string | null;
    fix: string | null;
    example: string | null;
    raw: string;
    isOffline?: boolean;
}
export declare class OllamaService {
    private baseUrl;
    private model;
    private timeout;
    constructor(baseUrl?: string, model?: string);
    /**
     * Check if Ollama is running and accessible
     */
    checkConnection(): Promise<boolean>;
    /**
     * Get explanation for an error from Ollama
     */
    explainError(errorText: string, language?: string): Promise<AIExplanation>;
    /**
     * Build the prompt for the AI
     */
    private buildPrompt;
    /**
     * Sanitize error text before sending to AI
     */
    private sanitizeError;
    /**
     * Parse the AI response into structured format
     */
    private parseResponse;
}
//# sourceMappingURL=ollama-service.d.ts.map