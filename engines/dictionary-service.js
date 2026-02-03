/**
 * Unified Dictionary Service
 *
 * Manages multiple Hebrew dictionary sources and provides unified query interface.
 * Each dictionary is kept separate by source for provenance tracking.
 *
 * Sources:
 * - tanakh: Words extracted from Tanakh text (56K words, heuristic roots)
 * - bdb: Brown-Driver-Briggs lexicon (6.9K verified Biblical Hebrew)
 * - wiktionary: Hebrew Wiktionary (planned)
 * - wikipedia: Hebrew Wikipedia vocabulary (planned)
 */

export class DictionaryService {
  constructor() {
    this.dictionaries = new Map();
    this.initialized = false;
    this.loadingPromises = new Map();
  }

  /**
   * Available dictionary sources
   */
  static SOURCES = {
    tanakh: {
      name: 'Tanakh Extracted',
      file: 'data/embeddings/hebrew-roots.json.gz',
      description: 'Words extracted from Tanakh with heuristic root analysis',
      license: 'N/A (derived)',
      priority: 2,  // Lower priority (heuristic)
    },
    bdb: {
      name: 'Brown-Driver-Briggs',
      file: 'data/dictionaries/openscriptures-bdb.json.gz',
      description: 'Classic Biblical Hebrew lexicon with verified roots',
      license: 'CC-BY-SA',
      priority: 1,  // Higher priority (verified)
    },
    // Future sources:
    // wiktionary: { ... }
    // wikipedia: { ... }
  };

  /**
   * Initialize service and load specified dictionaries
   * @param {string[]} sources - Array of source names to load, or 'all'
   */
  async initialize(sources = ['bdb', 'tanakh']) {
    if (sources === 'all') {
      sources = Object.keys(DictionaryService.SOURCES);
    }

    console.log(`DictionaryService: Loading ${sources.length} dictionaries...`);

    const results = await Promise.allSettled(
      sources.map(source => this.loadDictionary(source))
    );

    // Report results
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        console.log(`  ✓ ${sources[i]}: ${result.value.count} entries`);
      } else {
        console.warn(`  ✗ ${sources[i]}: ${result.reason}`);
      }
    });

    this.initialized = true;
    return this.getStatus();
  }

  /**
   * Load a single dictionary
   */
  async loadDictionary(source) {
    // Check if already loading
    if (this.loadingPromises.has(source)) {
      return this.loadingPromises.get(source);
    }

    // Check if already loaded
    if (this.dictionaries.has(source)) {
      return { source, count: this.dictionaries.get(source).entries.size };
    }

    const sourceInfo = DictionaryService.SOURCES[source];
    if (!sourceInfo) {
      throw new Error(`Unknown dictionary source: ${source}`);
    }

    // Start loading
    const loadPromise = this._loadDictionaryFile(source, sourceInfo);
    this.loadingPromises.set(source, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(source);
      return result;
    } catch (error) {
      this.loadingPromises.delete(source);
      throw error;
    }
  }

  /**
   * Internal: Load and parse dictionary file
   */
  async _loadDictionaryFile(source, sourceInfo) {
    const response = await fetch(sourceInfo.file);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourceInfo.file}: ${response.status}`);
    }

    // Decompress gzip
    const blob = await response.blob();
    const ds = new DecompressionStream('gzip');
    const decompressedStream = blob.stream().pipeThrough(ds);
    const text = await new Response(decompressedStream).text();
    const data = JSON.parse(text);

    // Normalize data structure (different sources have different formats)
    const entries = new Map();

    if (source === 'tanakh') {
      // Tanakh format: { word: { root, binyan, pos, confidence, metadata } }
      for (const [word, info] of Object.entries(data)) {
        entries.set(word, {
          word,
          root: info.root,
          pos: info.pos,
          confidence: info.confidence || 0.5,
          binyan: info.binyan,
          source: 'tanakh',
        });
      }
    } else if (source === 'bdb') {
      // BDB format: { source: {...}, entries: { word: { root, pos, definitions, ... } } }
      const dictEntries = data.entries || data;
      for (const [word, info] of Object.entries(dictEntries)) {
        entries.set(word, {
          word,
          root: info.root,
          pos: info.pos,
          definitions: info.definitions || [],
          isRoot: info.is_root || false,
          bdbId: info.bdb_id,
          refs: info.refs || [],
          source: 'bdb',
        });
      }
    }

    // Store dictionary
    this.dictionaries.set(source, {
      info: sourceInfo,
      metadata: data.source || {},
      entries,
      loadedAt: new Date(),
    });

    return { source, count: entries.size };
  }

  /**
   * Look up a word in specified sources
   * @param {string} word - Hebrew word to look up
   * @param {string[]} sources - Sources to search, or null for all loaded
   * @returns {Object[]} Array of results from each source
   */
  lookup(word, sources = null) {
    const results = [];
    const searchSources = sources || Array.from(this.dictionaries.keys());

    // Normalize word (remove niqqud, convert finals)
    const normalized = this.normalizeWord(word);

    for (const source of searchSources) {
      const dict = this.dictionaries.get(source);
      if (!dict) continue;

      // Try exact match first
      let entry = dict.entries.get(word);

      // Try normalized form
      if (!entry && normalized !== word) {
        entry = dict.entries.get(normalized);
      }

      if (entry) {
        results.push({
          ...entry,
          sourceName: dict.info.name,
          sourcePriority: dict.info.priority,
        });
      }
    }

    // Sort by priority (lower = better)
    results.sort((a, b) => a.sourcePriority - b.sourcePriority);

    return results;
  }

  /**
   * Check if a word exists in any dictionary
   * @param {string} word - Hebrew word
   * @param {string[]} sources - Sources to check, or null for all
   * @returns {boolean}
   */
  isKnownWord(word, sources = null) {
    return this.lookup(word, sources).length > 0;
  }

  /**
   * Get root for a word (best available from highest priority source)
   * @param {string} word - Hebrew word
   * @param {string[]} sources - Sources to check, or null for all
   * @returns {Object|null} Root info or null
   */
  getRoot(word, sources = null) {
    const results = this.lookup(word, sources);

    for (const result of results) {
      if (result.root) {
        return {
          root: result.root,
          source: result.source,
          confidence: result.confidence || 1.0,
          pos: result.pos,
        };
      }
    }

    return null;
  }

  /**
   * Get definitions for a word
   * @param {string} word - Hebrew word
   * @param {string[]} sources - Sources to check, or null for all
   * @returns {Object[]} Array of definitions with source attribution
   */
  getDefinitions(word, sources = null) {
    const results = this.lookup(word, sources);
    const definitions = [];

    for (const result of results) {
      if (result.definitions && result.definitions.length > 0) {
        definitions.push({
          definitions: result.definitions,
          source: result.source,
          sourceName: result.sourceName,
        });
      }
    }

    return definitions;
  }

  /**
   * Search for words matching a pattern
   * @param {Object} criteria - Search criteria
   * @returns {Object[]} Matching entries
   */
  search(criteria, sources = null) {
    const { root, pos, prefix, suffix, minLength, maxLength, limit = 100 } = criteria;
    const results = [];
    const searchSources = sources || Array.from(this.dictionaries.keys());

    for (const source of searchSources) {
      const dict = this.dictionaries.get(source);
      if (!dict) continue;

      for (const [word, entry] of dict.entries) {
        // Apply filters
        if (root && entry.root !== root) continue;
        if (pos && entry.pos !== pos) continue;
        if (prefix && !word.startsWith(prefix)) continue;
        if (suffix && !word.endsWith(suffix)) continue;
        if (minLength && word.length < minLength) continue;
        if (maxLength && word.length > maxLength) continue;

        results.push({
          ...entry,
          sourceName: dict.info.name,
        });

        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Get all words from specified sources
   * @param {string[]} sources - Sources to get words from
   * @returns {Set<string>} Set of all words
   */
  getAllWords(sources = null) {
    const words = new Set();
    const searchSources = sources || Array.from(this.dictionaries.keys());

    for (const source of searchSources) {
      const dict = this.dictionaries.get(source);
      if (!dict) continue;

      for (const word of dict.entries.keys()) {
        words.add(word);
      }
    }

    return words;
  }

  /**
   * Normalize Hebrew word
   */
  normalizeWord(word) {
    if (!word) return '';

    // Remove niqqud
    let normalized = word.normalize('NFD').replace(/[\u0591-\u05C7]/g, '');

    // Convert final letters to regular
    const finalMap = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    normalized = normalized.split('').map(c => finalMap[c] || c).join('');

    return normalized;
  }

  /**
   * Get service status
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      sources: {},
      totalWords: 0,
    };

    for (const [source, dict] of this.dictionaries) {
      status.sources[source] = {
        name: dict.info.name,
        count: dict.entries.size,
        license: dict.info.license,
        loadedAt: dict.loadedAt,
      };
      status.totalWords += dict.entries.size;
    }

    return status;
  }

  /**
   * Get available sources
   */
  getAvailableSources() {
    return Object.entries(DictionaryService.SOURCES).map(([id, info]) => ({
      id,
      ...info,
      loaded: this.dictionaries.has(id),
      count: this.dictionaries.get(id)?.entries.size || 0,
    }));
  }
}

// Singleton instance
let dictionaryService = null;

/**
 * Get or create the global dictionary service
 */
export function getDictionaryService() {
  if (!dictionaryService) {
    dictionaryService = new DictionaryService();
  }
  return dictionaryService;
}

/**
 * Initialize dictionary service with default sources
 */
export async function initDictionaries(sources = ['bdb', 'tanakh']) {
  const service = getDictionaryService();
  return service.initialize(sources);
}
