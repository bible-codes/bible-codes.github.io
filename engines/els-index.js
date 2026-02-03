/**
 * Torah ELS Index Query Engine
 *
 * Provides instant lookups for precomputed ELS word occurrences.
 * Enables proximity searches, cluster discovery, and ELS embeddings.
 *
 * @module engines/els-index
 */

/**
 * ELS Index Service
 * Manages loading and querying the precomputed ELS index
 */
export class ElsIndexService {
  constructor() {
    this.index = null;
    this.metadata = null;
    this.loaded = false;
    this.loading = null;
  }

  /**
   * Load ELS index from file
   * @param {string} indexPath - Path to compressed index file
   * @returns {Promise<Object>} Metadata about loaded index
   */
  async load(indexPath = 'data/els-index/els-index-50.json.gz') {
    if (this.loaded) {
      return this.metadata;
    }

    if (this.loading) {
      return this.loading;
    }

    this.loading = this._loadIndex(indexPath);
    return this.loading;
  }

  async _loadIndex(indexPath) {
    console.log(`ElsIndex: Loading from ${indexPath}...`);
    const startTime = performance.now();

    try {
      const response = await fetch(indexPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${indexPath}: ${response.status}`);
      }

      // Decompress gzip
      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const text = await new Response(decompressedStream).text();
      const data = JSON.parse(text);

      this.metadata = data.metadata;
      this.index = data.index;
      this.loaded = true;

      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`ElsIndex: Loaded ${this.metadata.total_words.toLocaleString()} words, ` +
                  `${this.metadata.total_occurrences.toLocaleString()} occurrences in ${loadTime}s`);

      return this.metadata;
    } catch (error) {
      console.error('ElsIndex: Load failed:', error);
      this.loading = null;
      throw error;
    }
  }

  /**
   * Check if index is loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Get index metadata
   * @returns {Object|null}
   */
  getMetadata() {
    return this.metadata;
  }

  // ==================== Basic Lookups ====================

  /**
   * Find all occurrences of a word
   * @param {string} word - Hebrew word to find
   * @returns {Array<{pos: number, skip: number}>} Array of occurrences
   */
  findWord(word) {
    if (!this.loaded) {
      console.warn('ElsIndex: Not loaded');
      return [];
    }

    const occurrences = this.index[word];
    if (!occurrences) {
      return [];
    }

    // Convert from [[pos, skip], ...] to [{pos, skip}, ...]
    return occurrences.map(([pos, skip]) => ({ pos, skip }));
  }

  /**
   * Check if a word exists in the index
   * @param {string} word - Hebrew word
   * @returns {boolean}
   */
  hasWord(word) {
    return this.loaded && word in this.index;
  }

  /**
   * Get number of occurrences for a word
   * @param {string} word - Hebrew word
   * @returns {number}
   */
  getOccurrenceCount(word) {
    if (!this.loaded || !(word in this.index)) {
      return 0;
    }
    return this.index[word].length;
  }

  /**
   * Get all indexed words
   * @returns {string[]}
   */
  getAllWords() {
    if (!this.loaded) return [];
    return Object.keys(this.index);
  }

  // ==================== Proximity Searches ====================

  /**
   * Find all words within a distance of a target position
   * @param {number} targetPos - Target Torah position
   * @param {number} maxDistance - Maximum distance in characters
   * @param {Object} options - Search options
   * @returns {Array<{word: string, occurrences: Array, minDistance: number}>}
   */
  findNearby(targetPos, maxDistance, options = {}) {
    if (!this.loaded) return [];

    const { minWordLength = 2, maxResults = 100 } = options;
    const results = [];

    for (const [word, occurrences] of Object.entries(this.index)) {
      if (word.length < minWordLength) continue;

      const nearbyOccs = [];
      let minDist = Infinity;

      for (const [pos, skip] of occurrences) {
        const dist = Math.abs(pos - targetPos);
        if (dist <= maxDistance) {
          nearbyOccs.push({ pos, skip, distance: dist });
          minDist = Math.min(minDist, dist);
        }
      }

      if (nearbyOccs.length > 0) {
        results.push({
          word,
          occurrences: nearbyOccs,
          minDistance: minDist,
          totalOccurrences: occurrences.length
        });
      }
    }

    // Sort by minimum distance
    results.sort((a, b) => a.minDistance - b.minDistance);

    return results.slice(0, maxResults);
  }

  /**
   * Find words near any occurrence of a target word
   * @param {string} targetWord - Word to find nearby terms for
   * @param {number} maxDistance - Maximum distance
   * @param {Object} options - Search options
   * @returns {Array}
   */
  findNearbyWords(targetWord, maxDistance, options = {}) {
    const targetOccs = this.findWord(targetWord);
    if (targetOccs.length === 0) return [];

    // Use first occurrence as center (or could aggregate all)
    const centerPos = targetOccs[0].pos;

    return this.findNearby(centerPos, maxDistance, options);
  }

  // ==================== Pair Proximity ====================

  /**
   * Find minimum distance between any occurrences of two words
   * @param {string} word1 - First word
   * @param {string} word2 - Second word
   * @returns {Object|null} Proximity info or null
   */
  pairProximity(word1, word2) {
    if (!this.loaded) return null;

    const occs1 = this.index[word1];
    const occs2 = this.index[word2];

    if (!occs1 || !occs2) return null;

    let minDist = Infinity;
    let bestPair = null;

    for (const [pos1, skip1] of occs1) {
      for (const [pos2, skip2] of occs2) {
        const dist = Math.abs(pos1 - pos2);
        if (dist < minDist) {
          minDist = dist;
          bestPair = {
            word1: { pos: pos1, skip: skip1 },
            word2: { pos: pos2, skip: skip2 }
          };
        }
      }
    }

    if (!bestPair) return null;

    return {
      distance: minDist,
      ...bestPair,
      word1Text: word1,
      word2Text: word2
    };
  }

  /**
   * Compute proximity matrix for multiple words
   * @param {string[]} words - Array of words
   * @returns {Object} Matrix and word list
   */
  computeProximityMatrix(words) {
    const n = words.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(Infinity));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 0;
      for (let j = i + 1; j < n; j++) {
        const prox = this.pairProximity(words[i], words[j]);
        const dist = prox ? prox.distance : Infinity;
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }

    return { words, matrix };
  }

  // ==================== Cluster Discovery ====================

  /**
   * Discover cluster of related terms around a seed word
   * @param {string} seedWord - Starting word
   * @param {number} maxDistance - Search radius
   * @param {Object} options - Options
   * @returns {Object|null} Cluster info
   */
  discoverCluster(seedWord, maxDistance = 1000, options = {}) {
    const { topN = 20, minWordLength = 3 } = options;

    const seedOccs = this.findWord(seedWord);
    if (seedOccs.length === 0) return null;

    // Use first occurrence as center
    const center = seedOccs[0];

    // Find nearby words
    const nearby = this.findNearby(center.pos, maxDistance, {
      minWordLength,
      maxResults: topN * 2
    });

    // Filter out the seed word itself
    const otherWords = nearby.filter(w => w.word !== seedWord);

    // Compute centroid
    const allPositions = [];
    for (const w of otherWords.slice(0, topN)) {
      for (const occ of w.occurrences) {
        allPositions.push(occ.pos);
      }
    }

    const centroid = allPositions.length > 0
      ? Math.round(allPositions.reduce((a, b) => a + b, 0) / allPositions.length)
      : center.pos;

    return {
      seed: seedWord,
      center: center,
      centroid: centroid,
      centroidShift: centroid - center.pos,
      words: otherWords.slice(0, topN),
      totalNearbyOccurrences: allPositions.length
    };
  }

  /**
   * Recompute centroid based on multiple terms
   * @param {string[]} terms - Terms to consider
   * @param {number} currentCenter - Current center position
   * @param {number} radius - Search radius
   * @returns {number} New centroid position
   */
  recomputeCentroid(terms, currentCenter, radius = 5000) {
    const positions = [];
    const weights = [];

    for (const term of terms) {
      const occs = this.findWord(term);
      const nearbyOccs = occs.filter(o => Math.abs(o.pos - currentCenter) <= radius);

      // Weight inversely by total occurrences (rare words weighted more)
      const weight = 1 / (1 + Math.log(occs.length + 1));

      for (const occ of nearbyOccs) {
        positions.push(occ.pos);
        weights.push(weight);
      }
    }

    if (positions.length === 0) return currentCenter;

    // Weighted average
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < positions.length; i++) {
      weightedSum += positions[i] * weights[i];
      totalWeight += weights[i];
    }

    return Math.round(weightedSum / totalWeight);
  }

  // ==================== ELS Embeddings ====================

  /**
   * Compute ELS-based embedding for a word
   * @param {string} word - Hebrew word
   * @param {number} dimensions - Embedding dimensions
   * @returns {Float32Array|null} Normalized embedding vector
   */
  computeEmbedding(word, dimensions = 100) {
    if (!this.loaded) return null;

    const occs = this.index[word];
    if (!occs) return null;

    const torahLength = this.metadata.torah_length;
    const regionSize = Math.ceil(torahLength / dimensions);
    const embedding = new Float32Array(dimensions);

    // Count occurrences in each region
    for (const [pos] of occs) {
      const region = Math.min(Math.floor(pos / regionSize), dimensions - 1);
      embedding[region]++;
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  /**
   * Compute cosine similarity between two word embeddings
   * @param {string} word1 - First word
   * @param {string} word2 - Second word
   * @param {number} dimensions - Embedding dimensions
   * @returns {number} Cosine similarity (-1 to 1)
   */
  embeddingSimilarity(word1, word2, dimensions = 100) {
    const emb1 = this.computeEmbedding(word1, dimensions);
    const emb2 = this.computeEmbedding(word2, dimensions);

    if (!emb1 || !emb2) return 0;

    // Dot product (already normalized)
    let dot = 0;
    for (let i = 0; i < dimensions; i++) {
      dot += emb1[i] * emb2[i];
    }
    return dot;
  }

  /**
   * Find words with similar ELS distribution
   * @param {string} targetWord - Target word
   * @param {number} topK - Number of results
   * @returns {Array<{word: string, similarity: number}>}
   */
  findSimilarByEmbedding(targetWord, topK = 10) {
    if (!this.loaded) return [];

    const targetEmb = this.computeEmbedding(targetWord);
    if (!targetEmb) return [];

    const results = [];

    for (const word of Object.keys(this.index)) {
      if (word === targetWord) continue;

      const similarity = this.embeddingSimilarity(targetWord, word);
      if (similarity > 0) {
        results.push({ word, similarity });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  // ==================== Statistical Analysis ====================

  /**
   * Get Torah letter frequencies (for expected occurrence calculation)
   * @returns {Object} Letter frequency map
   */
  static getLetterFrequencies() {
    // Pre-computed from Torah text (approximate)
    return {
      'א': 0.0902, 'ב': 0.0534, 'ג': 0.0130, 'ד': 0.0350,
      'ה': 0.0957, 'ו': 0.1064, 'ז': 0.0107, 'ח': 0.0297,
      'ט': 0.0101, 'י': 0.1072, 'כ': 0.0321, 'ל': 0.0651,
      'מ': 0.0606, 'נ': 0.0468, 'ס': 0.0101, 'ע': 0.0322,
      'פ': 0.0179, 'צ': 0.0131, 'ק': 0.0152, 'ר': 0.0549,
      'ש': 0.0550, 'ת': 0.0457,
      // Final forms (same frequency as regular)
      'ך': 0.0321, 'ם': 0.0606, 'ן': 0.0468, 'ף': 0.0179, 'ץ': 0.0131
    };
  }

  /**
   * Calculate expected random occurrences for a word
   * @param {string} word - Hebrew word
   * @returns {number} Expected occurrences
   */
  expectedOccurrences(word) {
    if (!this.metadata) return 0;

    const freq = ElsIndexService.getLetterFrequencies();
    const skipRange = this.metadata.skip_range;
    const skipCount = skipRange[1] - skipRange[0];  // Excludes 0
    const torahLen = this.metadata.torah_length;

    // Probability of word appearing by chance
    let prob = 1;
    for (const letter of word) {
      prob *= freq[letter] || 0.01;  // Default for unknown
    }

    // Approximate number of valid starting positions
    const avgSkip = (Math.abs(skipRange[0]) + skipRange[1]) / 2;
    const validPositions = torahLen - (word.length - 1) * avgSkip;

    return prob * validPositions * skipCount;
  }

  /**
   * Calculate statistical significance (z-score) for a word
   * @param {string} word - Hebrew word
   * @returns {Object} Significance stats
   */
  significanceScore(word) {
    const observed = this.getOccurrenceCount(word);
    const expected = this.expectedOccurrences(word);

    if (expected === 0) {
      return { observed, expected: 0, zScore: observed > 0 ? Infinity : 0 };
    }

    // Z-score using Poisson approximation
    const zScore = (observed - expected) / Math.sqrt(expected);

    return {
      observed,
      expected: Math.round(expected * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
      significant: Math.abs(zScore) > 2  // 95% confidence
    };
  }
}

// Singleton instance
let elsIndexService = null;

/**
 * Get or create ELS index service singleton
 * @returns {ElsIndexService}
 */
export function getElsIndexService() {
  if (!elsIndexService) {
    elsIndexService = new ElsIndexService();
  }
  return elsIndexService;
}

/**
 * Initialize and load ELS index
 * @param {string} indexPath - Path to index file
 * @returns {Promise<Object>} Index metadata
 */
export async function initElsIndex(indexPath) {
  const service = getElsIndexService();
  return service.load(indexPath);
}
