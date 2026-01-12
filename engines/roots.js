/**
 * Hebrew Root Extraction Engine
 *
 * Extracts Hebrew roots (שורש) from words using:
 * 1. Precomputed lexicon (primary)
 * 2. Morphological heuristics (fallback)
 * 3. Pattern matching (last resort)
 *
 * Supports both Biblical and Modern Hebrew.
 */

export class HebrewRootExtractor {
  constructor() {
    this.lexicon = null; // Loaded from hebrew-roots.json.gz
    this.loadPromise = null;
  }

  /**
   * Initialize by loading the root lexicon
   */
  async initialize() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.loadLexicon();
    return this.loadPromise;
  }

  /**
   * Load compressed root lexicon from data/
   */
  async loadLexicon() {
    try {
      const response = await fetch('data/embeddings/hebrew-roots.json.gz');

      if (!response.ok) {
        console.warn('Root lexicon not found, using heuristic mode only');
        this.lexicon = {};
        return;
      }

      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();

      this.lexicon = JSON.parse(text);
      console.log(`Loaded ${Object.keys(this.lexicon).length} root entries`);
    } catch (error) {
      console.error('Failed to load root lexicon:', error);
      this.lexicon = {};
    }
  }

  /**
   * Extract root from a Hebrew word
   * @param {string} word - Hebrew word (consonantal or with niqqud)
   * @param {boolean} aggressive - Use aggressive stripping (default: true)
   * @returns {Object} { root, binyan, pos, method, confidence }
   */
  async extractRoot(word, aggressive = true) {
    if (!this.lexicon) await this.initialize();

    // Normalize word (remove niqqud, final letters)
    const normalized = this.normalizeWord(word);

    // Try exact lexicon match
    if (this.lexicon[normalized]) {
      return {
        ...this.lexicon[normalized],
        method: 'lexicon',
        confidence: 1.0
      };
    }

    // Try lexicon match after stripping prefixes/suffixes
    const stripped = this.stripAffixes(normalized);
    if (this.lexicon[stripped]) {
      return {
        ...this.lexicon[stripped],
        method: 'lexicon-stripped',
        confidence: 0.9
      };
    }

    // Fallback to heuristic extraction
    return this.heuristicExtraction(normalized, aggressive);
  }

  /**
   * Normalize word: remove niqqud, convert final letters
   */
  normalizeWord(word) {
    // Remove niqqud (Unicode combining marks)
    let normalized = word.normalize('NFD').replace(/[\u0591-\u05C7]/g, '');

    // Convert final letters to regular forms
    const finalMap = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    normalized = normalized.split('').map(c => finalMap[c] || c).join('');

    return normalized;
  }

  /**
   * Strip common prefixes and suffixes
   */
  stripAffixes(word) {
    let stripped = word;

    // Strip prefixes (ה, ו, ב, כ, ל, מ, ש)
    const prefixes = ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'];
    for (const prefix of prefixes) {
      if (stripped.startsWith(prefix) && stripped.length > 2) {
        stripped = stripped.slice(1);
        break; // Only strip one prefix
      }
    }

    // Strip suffixes (most common first)
    const suffixes = [
      'ים', 'ות', 'יהם', 'יהן', 'יכם', 'יכן',
      'הם', 'הן', 'כם', 'כן', 'נו',
      'ה', 'י', 'ך', 'ו', 'ת'
    ];

    for (const suffix of suffixes) {
      if (stripped.endsWith(suffix) && stripped.length > suffix.length + 1) {
        stripped = stripped.slice(0, -suffix.length);
        break; // Only strip one suffix
      }
    }

    return stripped;
  }

  /**
   * Heuristic root extraction using morphological patterns
   */
  heuristicExtraction(word, aggressive) {
    const original = word;
    let confidence = 0.5;

    // Strip affixes
    if (aggressive) {
      word = this.stripAffixes(word);
    }

    // Root extraction heuristics by word length
    let root;
    const len = word.length;

    if (len === 3) {
      // Already tri-literal (most common)
      root = word;
      confidence = 0.7;

    } else if (len === 4) {
      // Could be:
      // - Quadri-literal root (פרפר, גלגל)
      // - Tri-literal with added letter (נ, ת, ה patterns)

      if (word[0] === word[2] && word[1] === word[3]) {
        // Reduplication: פרפר → פר
        root = word.slice(0, 2);
        confidence = 0.6;
      } else if (word[0] === 'נ') {
        // נפעל pattern: נשבר → שבר
        root = word.slice(1);
        confidence = 0.6;
      } else if (word[0] === 'ה') {
        // הפעיל pattern: הקדים → קדם
        root = word.slice(1);
        confidence = 0.6;
      } else if (word[0] === 'מ') {
        // מפעל/מפעיל pattern: מדבר → דבר
        root = word.slice(1);
        confidence = 0.5;
      } else if (word[0] === 'ת') {
        // תפעל pattern: תשובה → שוב
        root = word.slice(1);
        confidence = 0.5;
      } else {
        // Assume quadri-literal
        root = word;
        confidence = 0.5;
      }

    } else if (len === 5) {
      // Usually tri-literal with affixes
      // Try removing first and last letters
      root = word.slice(1, 4);
      confidence = 0.4;

    } else if (len > 5) {
      // Long word, extract middle 3 letters as guess
      const mid = Math.floor(len / 2);
      root = word.slice(mid - 1, mid + 2);
      confidence = 0.3;

    } else if (len === 2) {
      // Bi-literal (rare) or heavily stripped
      root = word;
      confidence = 0.4;

    } else {
      // Single letter or empty
      root = word;
      confidence = 0.1;
    }

    return {
      root: root,
      binyan: null,
      pos: null,
      method: 'heuristic',
      confidence: confidence,
      original: original
    };
  }

  /**
   * Extract roots from multiple words (batch operation)
   * @param {string[]} words - Array of Hebrew words
   * @returns {Promise<Array>} Array of root extraction results
   */
  async extractRoots(words) {
    if (!this.lexicon) await this.initialize();

    return Promise.all(words.map(word => this.extractRoot(word)));
  }

  /**
   * Get all words sharing a root
   * @param {string} root - Hebrew root to search
   * @returns {string[]} Words with this root
   */
  getWordsWithRoot(root) {
    if (!this.lexicon) return [];

    const normalized = this.normalizeWord(root);
    return Object.entries(this.lexicon)
      .filter(([_, data]) => data.root === normalized)
      .map(([word, _]) => word);
  }

  /**
   * Check if a word exists in the lexicon
   * @param {string} word - Hebrew word to check
   * @returns {boolean}
   */
  isKnownWord(word) {
    if (!this.lexicon) return false;
    const normalized = this.normalizeWord(word);
    return normalized in this.lexicon;
  }

  /**
   * Get lexicon statistics
   */
  getStats() {
    if (!this.lexicon) return null;

    const roots = new Set();
    const binyans = new Set();
    const pos = new Set();

    for (const data of Object.values(this.lexicon)) {
      if (data.root) roots.add(data.root);
      if (data.binyan) binyans.add(data.binyan);
      if (data.pos) pos.add(data.pos);
    }

    return {
      totalWords: Object.keys(this.lexicon).length,
      uniqueRoots: roots.size,
      binyans: Array.from(binyans),
      posCategories: Array.from(pos)
    };
  }
}

/**
 * Hebrew Binyan (verbal stem) patterns
 */
export const BINYAN_PATTERNS = {
  'פָּעַל': 'qal',         // Simple active
  'נִפְעַל': 'nifal',      // Simple passive
  'פִּעֵל': 'piel',        // Intensive active
  'פֻּעַל': 'pual',        // Intensive passive
  'הִפְעִיל': 'hifil',     // Causative active
  'הֻפְעַל': 'hufal',      // Causative passive
  'הִתְפַּעֵל': 'hitpael'  // Reflexive
};

/**
 * Common tri-literal root patterns
 */
export const ROOT_PATTERNS = {
  STRONG: /^[א-ת]{3}$/,           // All strong letters
  HOLLOW: /^[א-ת][ואי][א-ת]$/,    // Middle weak letter (ו, א, י)
  DEFECTIVE: /^[א-ת]{2}[הוי]$/,   // Final weak letter
  GUTTURAL: /[אהחע]/,             // Contains guttural
  DOUBLED: /^([א-ת])\1[א-ת]$/     // First two letters same
};

/**
 * Singleton instance
 */
let extractor = null;

/**
 * Get or create the global root extractor instance
 */
export function getRootExtractor() {
  if (!extractor) {
    extractor = new HebrewRootExtractor();
  }
  return extractor;
}

/**
 * Convenience function: extract root from single word
 */
export async function extractRoot(word, aggressive = true) {
  const ext = getRootExtractor();
  return ext.extractRoot(word, aggressive);
}

/**
 * Convenience function: extract roots from multiple words
 */
export async function extractRoots(words) {
  const ext = getRootExtractor();
  return ext.extractRoots(words);
}
