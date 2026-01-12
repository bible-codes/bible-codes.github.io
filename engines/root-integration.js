/**
 * Root Extraction Integration Module
 *
 * Provides root-based search enhancement for existing tools:
 * - Text Search: Root-based query expansion
 * - Gematria: Root-level gematria analysis
 * - Acronym: Root-aware pattern detection
 */

import { getRootExtractor } from './roots.js';

/**
 * Root Integration Helper
 */
export class RootIntegration {
  constructor() {
    this.rootExtractor = null;
    this.initialized = false;
  }

  /**
   * Initialize root extractor
   */
  async initialize() {
    if (this.initialized) return;

    this.rootExtractor = getRootExtractor();
    await this.rootExtractor.initialize();
    this.initialized = true;

    console.log('Root integration initialized');
  }

  /**
   * Expand search query with root-based words
   * @param {string} query - Original search term
   * @returns {Promise<Array>} Related words with same root
   */
  async expandQuery(query) {
    if (!this.initialized) await this.initialize();

    const rootData = await this.rootExtractor.extractRoot(query);

    if (!rootData.root) {
      return [query]; // No root found, return original
    }

    // Find all words with this root
    const relatedWords = this.rootExtractor.getWordsWithRoot(rootData.root);

    return {
      original: query,
      root: rootData.root,
      related: relatedWords,
      confidence: rootData.confidence
    };
  }

  /**
   * Add root information to search results
   * @param {Array} results - Search results with words
   * @returns {Promise<Array>} Results enriched with root data
   */
  async enrichResults(results) {
    if (!this.initialized) await this.initialize();

    return Promise.all(results.map(async (result) => {
      const word = result.word || result.text || result;
      const rootData = await this.rootExtractor.extractRoot(word);

      return {
        ...result,
        root: rootData.root,
        binyan: rootData.binyan,
        rootConfidence: rootData.confidence
      };
    }));
  }

  /**
   * Group results by root
   * @param {Array} results - Search results with root data
   * @returns {Object} Results grouped by root
   */
  groupByRoot(results) {
    const grouped = {};

    for (const result of results) {
      const root = result.root || 'unknown';

      if (!grouped[root]) {
        grouped[root] = {
          root: root,
          words: [],
          count: 0
        };
      }

      grouped[root].words.push(result);
      grouped[root].count++;
    }

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }

  /**
   * Get root statistics for a set of words
   * @param {Array} words - Array of Hebrew words
   * @returns {Promise<Object>} Root statistics
   */
  async getStatistics(words) {
    if (!this.initialized) await this.initialize();

    const roots = await Promise.all(
      words.map(word => this.rootExtractor.extractRoot(word))
    );

    const uniqueRoots = new Set(roots.map(r => r.root));
    const avgConfidence = roots.reduce((sum, r) => sum + r.confidence, 0) / roots.length;

    const binyans = {};
    for (const r of roots) {
      if (r.binyan) {
        binyans[r.binyan] = (binyans[r.binyan] || 0) + 1;
      }
    }

    return {
      totalWords: words.length,
      uniqueRoots: uniqueRoots.size,
      avgConfidence: avgConfidence,
      binyans: binyans,
      roots: Array.from(uniqueRoots)
    };
  }

  /**
   * Create UI component for root display
   * @param {Object} rootData - Root extraction result
   * @returns {HTMLElement} Root info element
   */
  createRootDisplay(rootData) {
    const div = document.createElement('div');
    div.className = 'root-display';
    div.style.cssText = `
      display: inline-block;
      padding: 4px 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      font-size: 0.85em;
      margin: 5px;
      font-weight: 600;
    `;

    div.innerHTML = `שורש: ${rootData.root || 'לא ידוע'}`;

    if (rootData.binyan) {
      div.innerHTML += ` | ${rootData.binyan}`;
    }

    div.title = `ביטחון: ${(rootData.confidence * 100).toFixed(0)}%`;

    return div;
  }

  /**
   * Create UI component for root-based search toggle
   * @param {Function} onChange - Callback when toggle changes
   * @returns {HTMLElement} Toggle element
   */
  createRootSearchToggle(onChange) {
    const container = document.createElement('div');
    container.className = 'root-search-toggle';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 6px;
      margin: 10px 0;
    `;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'root-search-enabled';
    checkbox.style.cssText = `
      width: 20px;
      height: 20px;
      cursor: pointer;
    `;

    checkbox.addEventListener('change', (e) => {
      onChange(e.target.checked);
    });

    const label = document.createElement('label');
    label.htmlFor = 'root-search-enabled';
    label.textContent = '🌱 חיפוש מבוסס-שורש (מצא מילים קשורות)';
    label.style.cssText = `
      cursor: pointer;
      font-weight: 600;
      color: #667eea;
    `;

    container.appendChild(checkbox);
    container.appendChild(label);

    return container;
  }

  /**
   * Create UI component for root expansion results
   * @param {Object} expansion - Query expansion result
   * @returns {HTMLElement} Expansion display element
   */
  createExpansionDisplay(expansion) {
    const container = document.createElement('div');
    container.className = 'root-expansion';
    container.style.cssText = `
      background: #f0f4ff;
      border-right: 4px solid #667eea;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    `;

    container.innerHTML = `
      <div style="font-weight: bold; color: #667eea; margin-bottom: 10px;">
        🔍 הרחבת חיפוש לפי שורש: ${expansion.root}
      </div>
      <div style="font-size: 0.9em; color: #666; margin-bottom: 10px;">
        נמצאו ${expansion.related.length} מילים קשורות
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${expansion.related.map(word => `
          <span style="
            background: white;
            padding: 6px 12px;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
            font-family: 'David Libre', serif;
            font-size: 1.1em;
          ">${word}</span>
        `).join('')}
      </div>
    `;

    return container;
  }
}

/**
 * Singleton instance
 */
let integration = null;

/**
 * Get or create global integration instance
 */
export function getRootIntegration() {
  if (!integration) {
    integration = new RootIntegration();
  }
  return integration;
}

/**
 * Convenience functions
 */
export async function expandQuery(query) {
  const int = getRootIntegration();
  return int.expandQuery(query);
}

export async function enrichResults(results) {
  const int = getRootIntegration();
  return int.enrichResults(results);
}

export async function groupByRoot(results) {
  const int = getRootIntegration();
  return int.groupByRoot(results);
}

export async function getRootStatistics(words) {
  const int = getRootIntegration();
  return int.getStatistics(words);
}
