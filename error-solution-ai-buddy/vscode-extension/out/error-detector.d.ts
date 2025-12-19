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
export declare class ErrorDetector {
    /**
     * Quick check if text looks like an error
     */
    detectError(text: string): boolean;
    /**
     * Detect programming language from error output
     */
    detectLanguage(errorText: string): string | null;
    /**
     * Analyze the error and extract useful information
     */
    analyzeError(errorText: string): ErrorAnalysis;
    /**
     * Get local explanation for an error (used when AI is unavailable)
     */
    getLocalExplanation(analysis: ErrorAnalysis, errorText: string): ErrorExplanation | null;
}
//# sourceMappingURL=error-detector.d.ts.map