/**
 * Error History Service - Stores and retrieves past errors
 * 
 * WHY JSON file instead of SQLite:
 * 1. No native compilation needed (works on all systems without Visual Studio)
 * 2. Simple to understand and debug
 * 3. Good enough for local history
 * 4. Can be upgraded to SQLite later if needed
 * 
 * This service allows:
 * - Saving errors and their explanations for later reference
 * - Searching past errors ("have I seen this before?")
 * - Learning which errors are most common
 */

import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

export class HistoryService {
  constructor(filePath = null) {
    // Default location: ~/.errbuddy/history.json
    if (!filePath) {
      const errbuddyDir = join(homedir(), '.errbuddy');
      if (!existsSync(errbuddyDir)) {
        mkdirSync(errbuddyDir, { recursive: true });
      }
      filePath = join(errbuddyDir, 'history.json');
    }

    this.filePath = filePath;
    this.data = this.load();
  }

  /**
   * Load history from file
   */
  load() {
    try {
      if (existsSync(this.filePath)) {
        const content = readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      // Silently fail and use default
    }
    
    // Return default structure
    return {
      errors: [],
      nextId: 1
    };
  }

  /**
   * Save history to file
   */
  save() {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (err) {
      // Silently fail - history is not critical
    }
  }

  /**
   * Save an error and its explanation
   */
  saveError(error, explanation, command = null) {
    const entry = {
      id: this.data.nextId++,
      timestamp: new Date().toISOString(),
      language: error.language || null,
      errorType: error.errorType || null,
      errorMessage: error.errorMessage || null,
      errorFull: error.fullText || null,
      filePath: error.file || null,
      lineNumber: error.line || null,
      explanationWhat: explanation?.what || null,
      explanationWhy: explanation?.why || null,
      explanationFix: explanation?.fix || null,
      explanationExample: explanation?.example || null,
      command: command,
      helpful: null
    };

    this.data.errors.push(entry);
    
    // Keep only last 500 errors to prevent file from growing too large
    if (this.data.errors.length > 500) {
      this.data.errors = this.data.errors.slice(-500);
    }
    
    this.save();
    return entry.id;
  }

  /**
   * Mark an explanation as helpful or not
   */
  markHelpful(id, helpful) {
    const entry = this.data.errors.find(e => e.id === id);
    if (entry) {
      entry.helpful = helpful;
      this.save();
    }
  }

  /**
   * Get recent errors
   */
  getRecent(limit = 10) {
    return this.data.errors
      .slice(-limit)
      .reverse();
  }

  /**
   * Search errors by type or message
   */
  search(query, limit = 20) {
    const lowerQuery = query.toLowerCase();
    return this.data.errors
      .filter(e => 
        (e.errorType && e.errorType.toLowerCase().includes(lowerQuery)) ||
        (e.errorMessage && e.errorMessage.toLowerCase().includes(lowerQuery))
      )
      .slice(-limit)
      .reverse();
  }

  /**
   * Find similar errors (useful for "have I seen this before?")
   */
  findSimilar(errorType, language) {
    return this.data.errors
      .filter(e => e.errorType === errorType && e.language === language)
      .slice(-5)
      .reverse();
  }

  /**
   * Get error statistics
   */
  getStats() {
    const errors = this.data.errors;
    
    // Count by language
    const byLanguage = {};
    errors.forEach(e => {
      if (e.language) {
        byLanguage[e.language] = (byLanguage[e.language] || 0) + 1;
      }
    });

    // Count by error type
    const byType = {};
    errors.forEach(e => {
      if (e.errorType) {
        byType[e.errorType] = (byType[e.errorType] || 0) + 1;
      }
    });

    // Sort and format
    const sortedByLanguage = Object.entries(byLanguage)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    const sortedByType = Object.entries(byType)
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Helpful stats
    const helpful = errors.filter(e => e.helpful === true).length;
    const notHelpful = errors.filter(e => e.helpful === false).length;
    const noFeedback = errors.filter(e => e.helpful === null).length;

    return {
      total: errors.length,
      byLanguage: sortedByLanguage,
      topErrors: sortedByType,
      feedback: { helpful, notHelpful, noFeedback }
    };
  }

  /**
   * Clear all history
   */
  clearHistory() {
    this.data = { errors: [], nextId: 1 };
    this.save();
  }
}
