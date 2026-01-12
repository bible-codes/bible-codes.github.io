/**
 * Contextual Semantic Scoring Engine
 *
 * Scores permutation candidates based on semantic relevance to situation/context:
 * - Cosine similarity to situation embedding
 * - Event-type anchor alignment
 * - Semantic drift penalty
 * - Inter-word coherence boost
 */

import { getEmbeddings } from './embeddings.js';

export class ContextualScorer {
  constructor() {
    this.embeddings = null;
    this.situationEmbedding = null;
    this.eventAnchors = null;
  }

  /**
   * Initialize scorer
   */
  async initialize() {
    this.embeddings = getEmbeddings();
    await this.embeddings.initialize();

    // Load event-type anchors
    this.eventAnchors = this.buildEventAnchors();
  }

  /**
   * Score permutation candidates relative to a situation
   * @param {Array} candidates - Permutation candidates with word/root data
   * @param {string|Array} situation - Original words/context
   * @param {Object} options - Scoring options
   * @returns {Array} Candidates with scores
   */
  async scoreCandidates(candidates, situation, options = {}) {
    const {
      eventType = null,
      weightSimilarity = 1.0,
      weightCoherence = 0.5,
      weightDrift = 0.3,
      weightAnchor = 0.4
    } = options;

    // Build situation embedding (centroid of situation words)
    this.situationEmbedding = await this.buildSituationEmbedding(situation);

    // Get event anchor if specified
    const eventAnchor = eventType ? this.eventAnchors[eventType] : null;

    console.log(`Scoring ${candidates.length} candidates...`);

    // Score each candidate
    const scored = await Promise.all(
      candidates.map(async (candidate) => {
        const scores = await this.scoreSingle(
          candidate,
          this.situationEmbedding,
          eventAnchor,
          candidates
        );

        // Weighted total score
        const totalScore =
          scores.similarity * weightSimilarity +
          scores.coherence * weightCoherence -
          scores.drift * weightDrift +
          scores.anchor * weightAnchor;

        return {
          ...candidate,
          scores: scores,
          totalScore: totalScore,
          normalizedScore: this.normalize(totalScore, -2, 2)
        };
      })
    );

    // Sort by total score (descending)
    scored.sort((a, b) => b.totalScore - a.totalScore);

    return scored;
  }

  /**
   * Score a single candidate
   */
  async scoreSingle(candidate, situationEmb, eventAnchor, allCandidates) {
    const wordEmb = await this.embeddings.getEmbedding(candidate.word);

    // 1. Similarity to situation
    const similarity = this.embeddings.cosineSimilarity(wordEmb, situationEmb);

    // 2. Semantic drift (distance from centroid)
    const drift = 1.0 - similarity;

    // 3. Coherence with other candidates
    const coherence = await this.calculateCoherence(
      candidate,
      allCandidates.filter(c => c.word !== candidate.word)
    );

    // 4. Event anchor alignment
    let anchor = 0;
    if (eventAnchor) {
      anchor = this.embeddings.cosineSimilarity(wordEmb, eventAnchor);
    }

    return {
      similarity: similarity,
      drift: drift,
      coherence: coherence,
      anchor: anchor
    };
  }

  /**
   * Calculate coherence with other candidates
   */
  async calculateCoherence(candidate, otherCandidates) {
    if (otherCandidates.length === 0) return 0;

    const candidateEmb = await this.embeddings.getEmbedding(candidate.word);

    // Average similarity to top other candidates
    const topOthers = otherCandidates.slice(0, 10);

    let totalSim = 0;
    for (const other of topOthers) {
      const otherEmb = await this.embeddings.getEmbedding(other.word);
      totalSim += this.embeddings.cosineSimilarity(candidateEmb, otherEmb);
    }

    return totalSim / topOthers.length;
  }

  /**
   * Build situation embedding from context words
   */
  async buildSituationEmbedding(situation) {
    // Parse situation into words
    let words = [];

    if (typeof situation === 'string') {
      // Split on whitespace
      words = situation.split(/\s+/).filter(w => w.length > 0);
    } else if (Array.isArray(situation)) {
      words = situation;
    } else {
      throw new Error('Situation must be string or array of words');
    }

    console.log(`Building situation embedding from ${words.length} words`);

    // Get centroid of situation words
    return this.embeddings.getCentroid(words);
  }

  /**
   * Build event-type semantic anchors
   */
  buildEventAnchors() {
    // Simplified anchors (in real implementation, these would be pre-computed)
    // For now, we'll generate them on-demand when needed

    return {
      conflict: ['מלחמה', 'קרב', 'אויב', 'נלחם'],
      movement: ['הלך', 'יצא', 'בא', 'נסע'],
      speech: ['אמר', 'דבר', 'קרא', 'ענה'],
      creation: ['ברא', 'עשה', 'יצר', 'כון'],
      destruction: ['שבר', 'הרס', 'כלה', 'אבד'],
      covenant: ['ברית', 'שבע', 'אות', 'חק'],
      judgment: ['שפט', 'דין', 'משפט', 'צדק'],
      blessing: ['ברך', 'טוב', 'חסד', 'שלום'],
      curse: ['קלל', 'ארר', 'רע', 'שנא'],
      transformation: ['הפך', 'שנה', 'חדש', 'נהפך']
    };
  }

  /**
   * Get event anchor embedding
   */
  async getEventAnchor(eventType) {
    const anchorWords = this.eventAnchors[eventType];
    if (!anchorWords) return null;

    return this.embeddings.getCentroid(anchorWords);
  }

  /**
   * Normalize value to [0, 1] range
   */
  normalize(value, min, max) {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Get available event types
   */
  getEventTypes() {
    return Object.keys(this.eventAnchors);
  }

  /**
   * Re-score with different weights
   */
  async rescore(scoredCandidates, weights) {
    const {
      weightSimilarity = 1.0,
      weightCoherence = 0.5,
      weightDrift = 0.3,
      weightAnchor = 0.4
    } = weights;

    for (const candidate of scoredCandidates) {
      const s = candidate.scores;

      candidate.totalScore =
        s.similarity * weightSimilarity +
        s.coherence * weightCoherence -
        s.drift * weightDrift +
        s.anchor * weightAnchor;

      candidate.normalizedScore = this.normalize(candidate.totalScore, -2, 2);
    }

    // Re-sort
    scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

    return scoredCandidates;
  }
}

/**
 * Similarity metrics for analysis
 */
export class SimilarityMetrics {
  /**
   * Calculate pairwise similarity matrix
   */
  static async calculateMatrix(words, embeddings) {
    const n = words.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      const emb_i = await embeddings.getEmbedding(words[i]);

      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const emb_j = await embeddings.getEmbedding(words[j]);
          const sim = embeddings.cosineSimilarity(emb_i, emb_j);
          matrix[i][j] = sim;
          matrix[j][i] = sim; // Symmetric
        }
      }
    }

    return matrix;
  }

  /**
   * Find nearest neighbors
   */
  static async findNearestNeighbors(query, candidates, embeddings, k = 5) {
    const queryEmb = await embeddings.getEmbedding(query);

    const similarities = await Promise.all(
      candidates.map(async (word) => {
        const emb = await embeddings.getEmbedding(word);
        return {
          word: word,
          similarity: embeddings.cosineSimilarity(queryEmb, emb)
        };
      })
    );

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, k);
  }

  /**
   * Calculate semantic density (average pairwise similarity)
   */
  static async calculateDensity(words, embeddings) {
    const matrix = await this.calculateMatrix(words, embeddings);
    const n = words.length;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sum += matrix[i][j];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }
}

/**
 * Singleton instance
 */
let scorer = null;

/**
 * Get or create global scorer instance
 */
export function getScorer() {
  if (!scorer) {
    scorer = new ContextualScorer();
  }
  return scorer;
}

/**
 * Convenience function: score candidates
 */
export async function scoreCandidates(candidates, situation, options = {}) {
  const s = getScorer();
  await s.initialize();
  return s.scoreCandidates(candidates, situation, options);
}
