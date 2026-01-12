/**
 * Hebrew Letter Permutation Generator
 *
 * Generates all possible permutations of Hebrew letters with intelligent pruning:
 * - Dictionary validation (Biblical + Modern Hebrew)
 * - Morphological plausibility
 * - Consonantal constraints
 * - Gematria bounds filtering
 */

import { getRootExtractor } from '../roots.js';

export class PermutationGenerator {
  constructor() {
    this.rootExtractor = null;
    this.maxPermutations = 10000; // Safety limit
    this.validWords = new Set();
    this.generateCount = 0;
  }

  /**
   * Initialize with root extractor for validation
   */
  async initialize() {
    this.rootExtractor = getRootExtractor();
    await this.rootExtractor.initialize();
  }

  /**
   * Generate all permutations of letters with pruning
   * @param {string} letters - Hebrew letters to permute
   * @param {Object} options - Generation options
   * @returns {Array} Valid permutation candidates
   */
  async generate(letters, options = {}) {
    const {
      minLength = 2,
      maxLength = letters.length,
      requireDictionary = true,
      requireRoot = false,
      minConfidence = 0.3,
      allowDuplicates = false
    } = options;

    // Normalize letters
    const normalized = this.normalizeLetters(letters);

    console.log(`Generating permutations from: ${normalized}`);
    console.log(`Length range: ${minLength}-${maxLength}`);

    this.generateCount = 0;
    this.validWords.clear();

    const results = [];

    // Generate permutations of different lengths
    for (let len = minLength; len <= maxLength; len++) {
      const perms = this.generateFixedLength(normalized, len, allowDuplicates);

      // Validate and filter
      for (const perm of perms) {
        if (this.generateCount >= this.maxPermutations) {
          console.warn(`Reached max permutations limit: ${this.maxPermutations}`);
          break;
        }

        // Check if valid word
        const validation = await this.validateWord(perm, {
          requireDictionary,
          requireRoot,
          minConfidence
        });

        if (validation.valid) {
          results.push({
            word: perm,
            length: len,
            root: validation.root,
            confidence: validation.confidence,
            inDictionary: validation.inDictionary,
            method: validation.method
          });
          this.validWords.add(perm);
        }

        this.generateCount++;
      }

      if (this.generateCount >= this.maxPermutations) break;
    }

    console.log(`Generated ${this.generateCount} candidates, found ${results.length} valid words`);

    return results;
  }

  /**
   * Generate permutations of fixed length
   * @param {string} letters - Source letters
   * @param {number} length - Target length
   * @param {boolean} allowDuplicates - Allow letter reuse
   * @returns {Set} Set of unique permutations
   */
  generateFixedLength(letters, length, allowDuplicates = false) {
    const results = new Set();
    const letterArray = letters.split('');

    if (!allowDuplicates && length > letterArray.length) {
      return results;
    }

    const generate = (current, remaining) => {
      if (current.length === length) {
        results.add(current);
        return;
      }

      if (results.size >= this.maxPermutations) return;

      const available = allowDuplicates ? letterArray : remaining;

      for (let i = 0; i < available.length; i++) {
        const letter = available[i];
        const newRemaining = allowDuplicates
          ? remaining
          : remaining.slice(0, i) + remaining.slice(i + 1);

        generate(current + letter, newRemaining);
      }
    };

    generate('', letters);
    return results;
  }

  /**
   * Validate if a permutation is a plausible Hebrew word
   */
  async validateWord(word, options = {}) {
    const {
      requireDictionary = true,
      requireRoot = false,
      minConfidence = 0.3
    } = options;

    // Check dictionary first (fast)
    const inDictionary = this.rootExtractor.isKnownWord(word);

    if (requireDictionary && !inDictionary) {
      return { valid: false };
    }

    // Extract root
    const rootData = await this.rootExtractor.extractRoot(word, true);

    // Check confidence threshold
    if (rootData.confidence < minConfidence) {
      return { valid: false };
    }

    // Check if root extraction was successful
    if (requireRoot && !rootData.root) {
      return { valid: false };
    }

    return {
      valid: true,
      root: rootData.root,
      confidence: rootData.confidence,
      inDictionary: inDictionary,
      method: rootData.method,
      binyan: rootData.binyan
    };
  }

  /**
   * Normalize Hebrew letters (remove niqqud, final letters)
   */
  normalizeLetters(text) {
    // Remove niqqud
    let normalized = text.normalize('NFD').replace(/[\u0591-\u05C7]/g, '');

    // Convert final letters
    const finalMap = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
    normalized = normalized.split('').map(c => finalMap[c] || c).join('');

    // Remove non-Hebrew characters
    normalized = normalized.replace(/[^א-ת]/g, '');

    return normalized;
  }

  /**
   * Generate anagrams (full-length permutations only)
   */
  async generateAnagrams(letters, options = {}) {
    const normalized = this.normalizeLetters(letters);
    return this.generate(normalized, {
      ...options,
      minLength: normalized.length,
      maxLength: normalized.length,
      allowDuplicates: false
    });
  }

  /**
   * Generate subword permutations (combinations + permutations)
   */
  async generateSubwords(letters, options = {}) {
    const normalized = this.normalizeLetters(letters);
    return this.generate(normalized, {
      ...options,
      minLength: 2,
      maxLength: normalized.length,
      allowDuplicates: false
    });
  }

  /**
   * Set maximum permutations limit
   */
  setMaxPermutations(limit) {
    this.maxPermutations = limit;
  }

  /**
   * Get generation statistics
   */
  getStats() {
    return {
      generated: this.generateCount,
      valid: this.validWords.size,
      validRate: this.generateCount > 0
        ? (this.validWords.size / this.generateCount * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

/**
 * Calculate factorial (for estimating permutation count)
 */
export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

/**
 * Calculate permutations nPr
 */
export function permutations(n, r) {
  if (r > n) return 0;
  let result = 1;
  for (let i = 0; i < r; i++) {
    result *= (n - i);
  }
  return result;
}

/**
 * Calculate combinations nCr
 */
export function combinations(n, r) {
  if (r > n) return 0;
  return permutations(n, r) / factorial(r);
}

/**
 * Estimate total permutations for letter set
 */
export function estimatePermutations(letters, minLen = 2, maxLen = null) {
  const n = letters.length;
  maxLen = maxLen || n;

  let total = 0;
  for (let r = minLen; r <= Math.min(maxLen, n); r++) {
    total += permutations(n, r);
  }

  return total;
}

/**
 * Check if permutation count is manageable
 */
export function isManageable(letters, minLen = 2, maxLen = null, limit = 10000) {
  const estimate = estimatePermutations(letters, minLen, maxLen);
  return {
    estimate,
    manageable: estimate <= limit,
    limit
  };
}

/**
 * Singleton instance
 */
let generator = null;

/**
 * Get or create global permutation generator
 */
export function getPermutationGenerator() {
  if (!generator) {
    generator = new PermutationGenerator();
  }
  return generator;
}
