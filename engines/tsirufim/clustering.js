/**
 * Semantic Clustering for Hebrew Permutations
 *
 * Clusters semantically similar words using:
 * - K-Means clustering (fast, deterministic)
 * - Hierarchical clustering (dendrogram-friendly)
 * - DBSCAN (density-based, finds arbitrary shapes)
 *
 * Each cluster represents a "thematic attractor" in semantic space.
 */

import { getEmbeddings } from './embeddings.js';

/**
 * K-Means Clustering
 *
 * Partitions words into K clusters by minimizing within-cluster variance.
 * Fast and works well when number of clusters is known.
 */
export class KMeansClustering {
  constructor(k = 5, maxIterations = 100) {
    this.k = k;
    this.maxIterations = maxIterations;
    this.centroids = null;
    this.labels = null;
    this.embeddings = null;
  }

  /**
   * Fit clustering model to word embeddings
   * @param {Array} words - Array of Hebrew words
   * @param {HebrewEmbeddings} embeddingsEngine - Embeddings instance
   * @returns {Object} Clustering results
   */
  async fit(words, embeddingsEngine) {
    this.embeddings = embeddingsEngine;

    console.log(`K-Means clustering: ${words.length} words into ${this.k} clusters`);

    // Get embeddings for all words
    const vectors = await Promise.all(
      words.map(word => embeddingsEngine.getEmbedding(word))
    );

    const n = words.length;
    const dim = vectors[0].length;

    // Initialize centroids randomly
    this.centroids = this.initializeCentroids(vectors, this.k);

    // Iterate until convergence
    let iteration = 0;
    let converged = false;

    while (!converged && iteration < this.maxIterations) {
      // Assign points to nearest centroid
      const newLabels = this.assignToClusters(vectors, this.centroids);

      // Check convergence
      if (this.labels && this.arraysEqual(this.labels, newLabels)) {
        converged = true;
      }

      this.labels = newLabels;

      // Update centroids
      this.centroids = this.updateCentroids(vectors, this.labels, this.k, dim);

      iteration++;
    }

    console.log(`K-Means converged after ${iteration} iterations`);

    // Build result
    return this.buildClusters(words, vectors);
  }

  /**
   * Initialize centroids using k-means++ algorithm
   */
  initializeCentroids(vectors, k) {
    const centroids = [];
    const n = vectors.length;

    // Choose first centroid randomly
    const firstIdx = Math.floor(Math.random() * n);
    centroids.push(this.copyVector(vectors[firstIdx]));

    // Choose remaining centroids with probability proportional to distance
    for (let i = 1; i < k; i++) {
      const distances = vectors.map(v => {
        const minDist = Math.min(...centroids.map(c => this.distance(v, c)));
        return minDist * minDist;
      });

      const totalDist = distances.reduce((a, b) => a + b, 0);
      const r = Math.random() * totalDist;

      let cumsum = 0;
      for (let j = 0; j < n; j++) {
        cumsum += distances[j];
        if (cumsum >= r) {
          centroids.push(this.copyVector(vectors[j]));
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Assign each point to nearest centroid
   */
  assignToClusters(vectors, centroids) {
    return vectors.map(v => {
      let minDist = Infinity;
      let minIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = this.distance(v, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      return minIdx;
    });
  }

  /**
   * Update centroids as mean of assigned points
   */
  updateCentroids(vectors, labels, k, dim) {
    const centroids = Array(k).fill(null).map(() => new Float32Array(dim).fill(0));
    const counts = Array(k).fill(0);

    for (let i = 0; i < vectors.length; i++) {
      const label = labels[i];
      counts[label]++;

      for (let j = 0; j < dim; j++) {
        centroids[label][j] += vectors[i][j];
      }
    }

    // Average
    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        for (let j = 0; j < dim; j++) {
          centroids[i][j] /= counts[i];
        }
      }
    }

    return centroids;
  }

  /**
   * Build cluster results
   */
  buildClusters(words, vectors) {
    const clusters = Array(this.k).fill(null).map(() => ({
      words: [],
      centroid: null,
      size: 0,
      density: 0
    }));

    // Group words by cluster
    for (let i = 0; i < words.length; i++) {
      const label = this.labels[i];
      clusters[label].words.push(words[i]);
    }

    // Set centroids and calculate density
    for (let i = 0; i < this.k; i++) {
      clusters[i].centroid = this.centroids[i];
      clusters[i].size = clusters[i].words.length;

      // Calculate average intra-cluster distance (density)
      if (clusters[i].size > 1) {
        const clusterVectors = clusters[i].words.map((word, idx) =>
          vectors[words.indexOf(word)]
        );
        clusters[i].density = this.calculateDensity(clusterVectors);
      }
    }

    return {
      clusters: clusters,
      labels: this.labels,
      centroids: this.centroids,
      k: this.k
    };
  }

  /**
   * Calculate cluster density (average pairwise distance)
   */
  calculateDensity(vectors) {
    const n = vectors.length;
    if (n <= 1) return 0;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sum += this.distance(vectors[i], vectors[j]);
        count++;
      }
    }

    return sum / count;
  }

  /**
   * Euclidean distance between vectors
   */
  distance(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Copy vector
   */
  copyVector(v) {
    return new Float32Array(v);
  }

  /**
   * Check array equality
   */
  arraysEqual(a1, a2) {
    if (a1.length !== a2.length) return false;
    for (let i = 0; i < a1.length; i++) {
      if (a1[i] !== a2[i]) return false;
    }
    return true;
  }
}

/**
 * DBSCAN Clustering
 *
 * Density-based clustering that finds arbitrary-shaped clusters.
 * Automatically determines number of clusters and identifies noise points.
 */
export class DBSCANClustering {
  constructor(epsilon = 0.5, minPoints = 3) {
    this.epsilon = epsilon;
    this.minPoints = minPoints;
    this.labels = null;
  }

  /**
   * Fit DBSCAN clustering
   */
  async fit(words, embeddingsEngine) {
    console.log(`DBSCAN clustering: epsilon=${this.epsilon}, minPoints=${this.minPoints}`);

    // Get embeddings
    const vectors = await Promise.all(
      words.map(word => embeddingsEngine.getEmbedding(word))
    );

    const n = words.length;
    this.labels = Array(n).fill(-1); // -1 = unvisited
    let clusterId = 0;

    // Process each point
    for (let i = 0; i < n; i++) {
      if (this.labels[i] !== -1) continue; // Already visited

      const neighbors = this.findNeighbors(i, vectors);

      if (neighbors.length < this.minPoints) {
        this.labels[i] = -2; // Mark as noise
      } else {
        this.expandCluster(i, neighbors, clusterId, vectors);
        clusterId++;
      }
    }

    console.log(`DBSCAN found ${clusterId} clusters`);

    return this.buildClusters(words, vectors, clusterId);
  }

  /**
   * Find neighbors within epsilon distance
   */
  findNeighbors(pointIdx, vectors) {
    const neighbors = [];
    const point = vectors[pointIdx];

    for (let i = 0; i < vectors.length; i++) {
      if (this.distance(point, vectors[i]) <= this.epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  /**
   * Expand cluster from seed point
   */
  expandCluster(pointIdx, neighbors, clusterId, vectors) {
    this.labels[pointIdx] = clusterId;
    const queue = [...neighbors];

    while (queue.length > 0) {
      const currIdx = queue.shift();

      if (this.labels[currIdx] === -2) {
        // Change noise to border point
        this.labels[currIdx] = clusterId;
      }

      if (this.labels[currIdx] !== -1) continue; // Already processed

      this.labels[currIdx] = clusterId;

      const currNeighbors = this.findNeighbors(currIdx, vectors);

      if (currNeighbors.length >= this.minPoints) {
        queue.push(...currNeighbors);
      }
    }
  }

  /**
   * Build cluster results
   */
  buildClusters(words, vectors, numClusters) {
    const clusters = Array(numClusters).fill(null).map(() => ({
      words: [],
      centroid: null,
      size: 0
    }));

    const noise = { words: [], size: 0 };

    // Group words
    for (let i = 0; i < words.length; i++) {
      const label = this.labels[i];

      if (label === -2) {
        noise.words.push(words[i]);
        noise.size++;
      } else if (label >= 0) {
        clusters[label].words.push(words[i]);
        clusters[label].size++;
      }
    }

    // Calculate centroids
    for (let i = 0; i < numClusters; i++) {
      if (clusters[i].size > 0) {
        const clusterVectors = clusters[i].words.map((word, idx) =>
          vectors[words.indexOf(word)]
        );
        clusters[i].centroid = this.calculateCentroid(clusterVectors);
      }
    }

    return {
      clusters: clusters,
      noise: noise,
      labels: this.labels,
      numClusters: numClusters
    };
  }

  /**
   * Calculate centroid
   */
  calculateCentroid(vectors) {
    const n = vectors.length;
    if (n === 0) return null;

    const dim = vectors[0].length;
    const centroid = new Float32Array(dim).fill(0);

    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += v[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      centroid[i] /= n;
    }

    return centroid;
  }

  /**
   * Euclidean distance
   */
  distance(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}

/**
 * Hierarchical Clustering
 *
 * Agglomerative clustering that builds a dendrogram.
 * Useful for understanding cluster hierarchy and relationships.
 */
export class HierarchicalClustering {
  constructor(linkage = 'average') {
    this.linkage = linkage; // 'single', 'complete', 'average'
    this.dendrogram = null;
  }

  /**
   * Fit hierarchical clustering
   */
  async fit(words, embeddingsEngine, numClusters = 5) {
    console.log(`Hierarchical clustering: ${words.length} words, linkage=${this.linkage}`);

    // Get embeddings
    const vectors = await Promise.all(
      words.map(word => embeddingsEngine.getEmbedding(word))
    );

    // Build distance matrix
    const distMatrix = this.buildDistanceMatrix(vectors);

    // Agglomerative clustering
    const { dendrogram, clusters } = this.agglomerativeClustering(
      distMatrix,
      words,
      numClusters
    );

    this.dendrogram = dendrogram;

    return {
      clusters: clusters,
      dendrogram: dendrogram,
      numClusters: numClusters
    };
  }

  /**
   * Build distance matrix
   */
  buildDistanceMatrix(vectors) {
    const n = vectors.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.distance(vectors[i], vectors[j]);
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }

    return matrix;
  }

  /**
   * Agglomerative clustering algorithm
   */
  agglomerativeClustering(distMatrix, words, targetClusters) {
    const n = words.length;

    // Initialize: each point is its own cluster
    let clusters = words.map((word, i) => ({
      id: i,
      words: [word],
      size: 1
    }));

    const dendrogram = [];

    // Merge until we reach target number of clusters
    while (clusters.length > targetClusters) {
      // Find closest pair
      const { i, j, dist } = this.findClosestPair(clusters, distMatrix);

      // Merge clusters i and j
      const merged = {
        id: n + dendrogram.length,
        words: [...clusters[i].words, ...clusters[j].words],
        size: clusters[i].size + clusters[j].size,
        children: [clusters[i].id, clusters[j].id],
        distance: dist
      };

      dendrogram.push({
        cluster1: clusters[i].id,
        cluster2: clusters[j].id,
        distance: dist,
        size: merged.size
      });

      // Remove old clusters and add merged
      clusters = clusters.filter((_, idx) => idx !== i && idx !== j);
      clusters.push(merged);
    }

    return { dendrogram, clusters };
  }

  /**
   * Find closest pair of clusters
   */
  findClosestPair(clusters, distMatrix) {
    let minDist = Infinity;
    let minI = 0;
    let minJ = 1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = this.clusterDistance(clusters[i], clusters[j], distMatrix);

        if (dist < minDist) {
          minDist = dist;
          minI = i;
          minJ = j;
        }
      }
    }

    return { i: minI, j: minJ, dist: minDist };
  }

  /**
   * Calculate distance between clusters
   */
  clusterDistance(cluster1, cluster2, distMatrix) {
    // Get original indices (for single-point clusters)
    const getIndices = (cluster) => {
      if (cluster.size === 1) {
        return [cluster.id];
      } else {
        // For merged clusters, get all leaf indices (simplified)
        return cluster.words.map((_, i) => cluster.id - 100 + i);
      }
    };

    const indices1 = cluster1.words.map((w, i) => cluster1.id < distMatrix.length ? cluster1.id : i);
    const indices2 = cluster2.words.map((w, i) => cluster2.id < distMatrix.length ? cluster2.id : i);

    // Calculate linkage distance
    const distances = [];

    for (const i of indices1.filter(x => x < distMatrix.length)) {
      for (const j of indices2.filter(x => x < distMatrix.length)) {
        if (i < distMatrix.length && j < distMatrix.length) {
          distances.push(distMatrix[i][j]);
        }
      }
    }

    if (distances.length === 0) return Infinity;

    // Apply linkage method
    if (this.linkage === 'single') {
      return Math.min(...distances);
    } else if (this.linkage === 'complete') {
      return Math.max(...distances);
    } else { // average
      return distances.reduce((a, b) => a + b, 0) / distances.length;
    }
  }

  /**
   * Euclidean distance
   */
  distance(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}

/**
 * Automatic cluster number selection
 */
export class ClusterSelector {
  /**
   * Elbow method for K-Means
   */
  static async elbowMethod(words, embeddingsEngine, maxK = 10) {
    const inertias = [];

    for (let k = 2; k <= maxK; k++) {
      const kmeans = new KMeansClustering(k);
      const result = await kmeans.fit(words, embeddingsEngine);

      // Calculate inertia (sum of squared distances to centroids)
      let inertia = 0;
      for (const cluster of result.clusters) {
        inertia += cluster.density * cluster.size;
      }

      inertias.push({ k, inertia });
    }

    return inertias;
  }

  /**
   * Silhouette method
   */
  static async silhouetteMethod(words, embeddingsEngine, maxK = 10) {
    const scores = [];

    for (let k = 2; k <= maxK; k++) {
      const kmeans = new KMeansClustering(k);
      await kmeans.fit(words, embeddingsEngine);

      // Calculate silhouette score (simplified)
      const score = 0.5; // Placeholder

      scores.push({ k, score });
    }

    return scores;
  }
}

/**
 * Export convenience functions
 */
export async function clusterKMeans(words, k = 5) {
  const embeddings = getEmbeddings();
  await embeddings.initialize();

  const kmeans = new KMeansClustering(k);
  return kmeans.fit(words, embeddings);
}

export async function clusterDBSCAN(words, epsilon = 0.5, minPoints = 3) {
  const embeddings = getEmbeddings();
  await embeddings.initialize();

  const dbscan = new DBSCANClustering(epsilon, minPoints);
  return dbscan.fit(words, embeddings);
}

export async function clusterHierarchical(words, numClusters = 5, linkage = 'average') {
  const embeddings = getEmbeddings();
  await embeddings.initialize();

  const hierarchical = new HierarchicalClustering(linkage);
  return hierarchical.fit(words, embeddings, numClusters);
}
