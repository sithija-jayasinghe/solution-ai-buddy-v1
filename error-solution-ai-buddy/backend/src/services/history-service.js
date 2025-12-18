/**
 * Error History Service - Stores and retrieves past errors
 * 
 * WHY SQLite:
 * 1. No server needed - just a file
 * 2. Fast reads for local storage
 * 3. Easy to backup (copy the file)
 * 4. Works offline
 * 
 * This service allows:
 * - Saving errors and their explanations for later reference
 * - Searching past errors ("have I seen this before?")
 * - Learning which errors are most common
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

export class HistoryService {
  constructor(dbPath = null) {
    // Default location: ~/.errbuddy/history.db
    if (!dbPath) {
      const errbuddyDir = join(homedir(), '.errbuddy');
      if (!existsSync(errbuddyDir)) {
        mkdirSync(errbuddyDir, { recursive: true });
      }
      dbPath = join(errbuddyDir, 'history.db');
    }

    this.db = new Database(dbPath);
    this.initialize();
  }

  /**
   * Create database schema if not exists
   */
  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS error_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        language TEXT,
        error_type TEXT,
        error_message TEXT,
        error_full TEXT,
        file_path TEXT,
        line_number INTEGER,
        explanation_what TEXT,
        explanation_why TEXT,
        explanation_fix TEXT,
        explanation_example TEXT,
        command TEXT,
        helpful INTEGER DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_error_type ON error_history(error_type);
      CREATE INDEX IF NOT EXISTS idx_language ON error_history(language);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON error_history(timestamp);
    `);
  }

  /**
   * Save an error and its explanation
   */
  saveError(error, explanation, command = null) {
    const stmt = this.db.prepare(`
      INSERT INTO error_history (
        language, error_type, error_message, error_full,
        file_path, line_number, explanation_what, explanation_why,
        explanation_fix, explanation_example, command
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      error.language || null,
      error.errorType || null,
      error.errorMessage || null,
      error.fullText || null,
      error.file || null,
      error.line || null,
      explanation?.what || null,
      explanation?.why || null,
      explanation?.fix || null,
      explanation?.example || null,
      command
    );

    return result.lastInsertRowid;
  }

  /**
   * Mark an explanation as helpful or not
   */
  markHelpful(id, helpful) {
    const stmt = this.db.prepare(`
      UPDATE error_history SET helpful = ? WHERE id = ?
    `);
    stmt.run(helpful ? 1 : 0, id);
  }

  /**
   * Get recent errors
   */
  getRecent(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM error_history
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  /**
   * Search errors by type or message
   */
  search(query, limit = 20) {
    const stmt = this.db.prepare(`
      SELECT * FROM error_history
      WHERE error_type LIKE ? OR error_message LIKE ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, limit);
  }

  /**
   * Find similar errors (useful for "have I seen this before?")
   */
  findSimilar(errorType, language) {
    const stmt = this.db.prepare(`
      SELECT * FROM error_history
      WHERE error_type = ? AND language = ?
      ORDER BY timestamp DESC
      LIMIT 5
    `);
    return stmt.all(errorType, language);
  }

  /**
   * Get error statistics
   */
  getStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM error_history').get();
    
    const byLanguage = this.db.prepare(`
      SELECT language, COUNT(*) as count
      FROM error_history
      GROUP BY language
      ORDER BY count DESC
    `).all();

    const byType = this.db.prepare(`
      SELECT error_type, COUNT(*) as count
      FROM error_history
      GROUP BY error_type
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const helpfulStats = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN helpful = 1 THEN 1 ELSE 0 END) as helpful,
        SUM(CASE WHEN helpful = 0 THEN 1 ELSE 0 END) as not_helpful,
        SUM(CASE WHEN helpful IS NULL THEN 1 ELSE 0 END) as no_feedback
      FROM error_history
    `).get();

    return {
      total: total.count,
      byLanguage,
      topErrors: byType,
      feedback: helpfulStats
    };
  }

  /**
   * Clear all history
   */
  clearHistory() {
    this.db.exec('DELETE FROM error_history');
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
