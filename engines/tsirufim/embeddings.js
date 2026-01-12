/**
 * Hebrew Semantic Embeddings
 *
 * Multi-layer embedding system for Hebrew words:
 * 1. Gematria-based features (immediate)
 * 2. Root-based semantic features
 * 3. Morphological features
 * 4. Pre-trained embeddings (word2vec/FastText - optional)
 *
 * Provides vector representations for semantic similarity analysis.
 */

import { getRootExtractor } from '../roots.js';
import { calculateGematria } from '../gematria.js';

export class HebrewEmbeddings {
  constructor() {
    this.rootExtractor = null;
    this.pretrainedEmbeddings = null;
    this.embeddingDim = 64; // Default dimension
    this.cache = new Map();
  }

  /**
   * Initialize embeddings system
   */
  async initialize() {
    this.rootExtractor = getRootExtractor();
    await this.rootExtractor.initialize();

    // Try to load pre-trained embeddings (optional)
    try {
      await this.loadPretrainedEmbeddings();
    } catch (error) {
      console.log('Pre-trained embeddings not available, using feature-based embeddings');
    }
  }

  /**
   * Get embedding vector for a Hebrew word
   * @param {string} word - Hebrew word
   * @returns {Float32Array} Embedding vector
   */
  async getEmbedding(word) {
    // Check cache
    if (this.cache.has(word)) {
      return this.cache.get(word);
    }

    let embedding;

    // Try pre-trained embeddings first
    if (this.pretrainedEmbeddings && this.pretrainedEmbeddings[word]) {
      embedding = new Float32Array(this.pretrainedEmbeddings[word]);
    } else {
      // Generate feature-based embedding
      embedding = await this.generateFeatureEmbedding(word);
    }

    // Cache result
    this.cache.set(word, embedding);

    return embedding;
  }

  /**
   * Generate feature-based embedding from linguistic features
   */
  async generateFeatureEmbedding(word) {
    const features = [];

    // 1. Gematria features (normalized)
    const gematria = {
      standard: calculateGematria(word, 'standard'),
      reduced: calculateGematria(word, 'reduced'),
      ordinal: calculateGematria(word, 'ordinal')
    };

    features.push(this.normalize(gematria.standard, 0, 5000));
    features.push(this.normalize(gematria.reduced, 0, 100));
    features.push(this.normalize(gematria.ordinal, 0, 500));

    // 2. Root-based features
    const rootData = await this.rootExtractor.extractRoot(word);
    const rootGematria = calculateGematria(rootData.root, 'standard');

    features.push(this.normalize(rootGematria, 0, 1500));
    features.push(rootData.confidence);

    // 3. Morphological features
    features.push(word.length / 10.0); // Normalized word length

    // Binyan encoding (one-hot)
    const binyans = ['qal', 'nifal', 'piel', 'pual', 'hifil', 'hufal', 'hitpael'];
    for (const binyan of binyans) {
      features.push(rootData.binyan === binyan ? 1.0 : 0.0);
    }

    // 4. Letter composition features
    const letterFeatures = this.extractLetterFeatures(word);
    features.push(...letterFeatures);

    // 5. Root letter features
    const rootLetterFeatures = this.extractLetterFeatures(rootData.root);
    features.push(...rootLetterFeatures);

    // 6. Positional features (first, middle, last letter)
    const positionalFeatures = this.extractPositionalFeatures(word);
    features.push(...positionalFeatures);

    // Pad or truncate to target dimension
    while (features.length < this.embeddingDim) {
      features.push(0.0);
    }

    return new Float32Array(features.slice(0, this.embeddingDim));
  }

  /**
   * Extract letter composition features
   */
  extractLetterFeatures(word) {
    const features = [];

    // Letter frequency (normalized)
    const letterCounts = this.countLetters(word);
    const totalLetters = word.length;

    // Count by letter categories
    const gutturals = ['א', 'ה', 'ח', 'ע'];
    const weak = ['א', 'ה', 'ו', 'י'];
    const emphatic = ['ט', 'צ', 'ק'];

    let gutturalCount = 0;
    let weakCount = 0;
    let emphaticCount = 0;

    for (const letter of word) {
      if (gutturals.includes(letter)) gutturalCount++;
      if (weak.includes(letter)) weakCount++;
      if (emphatic.includes(letter)) emphaticCount++;
    }

    features.push(gutturalCount / totalLetters);
    features.push(weakCount / totalLetters);
    features.push(emphaticCount / totalLetters);

    // Most frequent letter dominance
    const maxFreq = Math.max(...Object.values(letterCounts));
    features.push(maxFreq / totalLetters);

    return features;
  }

  /**
   * Extract positional features
   */
  extractPositionalFeatures(word) {
    const features = [];

    if (word.length === 0) {
      return [0, 0, 0, 0, 0, 0];
    }

    // First letter (encode as ordinal position / 22)
    const firstChar = word[0];
    features.push(this.letterToOrdinal(firstChar) / 22.0);

    // Last letter
    const lastChar = word[word.length - 1];
    features.push(this.letterToOrdinal(lastChar) / 22.0);

    // Middle letter (if odd length)
    if (word.length % 2 === 1) {
      const midChar = word[Math.floor(word.length / 2)];
      features.push(this.letterToOrdinal(midChar) / 22.0);
    } else {
      features.push(0.5); // Neutral for even-length words
    }

    // First two letters (bigram encoding)
    if (word.length >= 2) {
      const bigram = word.slice(0, 2);
      const bigramValue = calculateGematria(bigram, 'ordinal');
      features.push(this.normalize(bigramValue, 0, 44));
    } else {
      features.push(0.0);
    }

    // Last two letters
    if (word.length >= 2) {
      const bigram = word.slice(-2);
      const bigramValue = calculateGematria(bigram, 'ordinal');
      features.push(this.normalize(bigramValue, 0, 44));
    } else {
      features.push(0.0);
    }

    // Palindrome-like property (first vs last letter similarity)
    features.push(firstChar === lastChar ? 1.0 : 0.0);

    return features;
  }

  /**
   * Count letter occurrences
   */
  countLetters(word) {
    const counts = {};
    for (const letter of word) {
      counts[letter] = (counts[letter] || 0) + 1;
    }
    return counts;
  }

  /**
   * Convert Hebrew letter to ordinal (א=1, ב=2, ..., ת=22)
   */
  letterToOrdinal(letter) {
    const code = letter.charCodeAt(0);
    const alef = 'א'.charCodeAt(0);

    if (code >= alef && code <= alef + 21) {
      return code - alef + 1;
    }

    // Handle final letters
    const finals = { 'ך': 11, 'ם': 13, 'ן': 14, 'ף': 17, 'ץ': 18 };
    return finals[letter] || 0;
  }

  /**
   * Normalize value to [0, 1] range
   */
  normalize(value, min, max) {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Calculate semantic similarity between two words
   */
  async semanticSimilarity(word1, word2) {
    const emb1 = await this.getEmbedding(word1);
    const emb2 = await this.getEmbedding(word2);
    return this.cosineSimilarity(emb1, emb2);
  }

  /**
   * Get embeddings for multiple words (batch)
   */
  async getEmbeddings(words) {
    return Promise.all(words.map(word => this.getEmbedding(word)));
  }

  /**
   * Find most similar words to a query
   */
  async findSimilar(query, candidates, topK = 10) {
    const queryEmb = await this.getEmbedding(query);

    const similarities = await Promise.all(
      candidates.map(async (word) => {
        const emb = await this.getEmbedding(word);
        const sim = this.cosineSimilarity(queryEmb, emb);
        return { word, similarity: sim };
      })
    );

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }

  /**
   * Calculate centroid (mean) embedding from multiple words
   */
  async getCentroid(words) {
    const embeddings = await this.getEmbeddings(words);

    if (embeddings.length === 0) {
      return new Float32Array(this.embeddingDim).fill(0);
    }

    const centroid = new Float32Array(this.embeddingDim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < this.embeddingDim; i++) {
        centroid[i] += emb[i];
      }
    }

    for (let i = 0; i < this.embeddingDim; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  /**
   * Load pre-trained embeddings (optional)
   */
  async loadPretrainedEmbeddings() {
    try {
      const response = await fetch('data/embeddings/tanakh-w2v.json.gz');

      if (!response.ok) {
        throw new Error('Pre-trained embeddings not found');
      }

      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();

      this.pretrainedEmbeddings = JSON.parse(text);
      this.embeddingDim = Object.values(this.pretrainedEmbeddings)[0].length;

      console.log(`Loaded ${Object.keys(this.pretrainedEmbeddings).length} pre-trained embeddings`);
    } catch (error) {
      console.log('Pre-trained embeddings not available:', error.message);
      this.pretrainedEmbeddings = null;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      dimension: this.embeddingDim,
      pretrained: this.pretrainedEmbeddings !== null
    };
  }
}

/**
 * Singleton instance
 */
let embeddings = null;

/**
 * Get or create global embeddings instance
 */
export function getEmbeddings() {
  if (!embeddings) {
    embeddings = new HebrewEmbeddings();
  }
  return embeddings;
}

/**
 * Convenience function: get embedding for word
 */
export async function getEmbedding(word) {
  const emb = getEmbeddings();
  return emb.getEmbedding(word);
}

/**
 * Convenience function: calculate semantic similarity
 */
export async function semanticSimilarity(word1, word2) {
  const emb = getEmbeddings();
  return emb.semanticSimilarity(word1, word2);
}
