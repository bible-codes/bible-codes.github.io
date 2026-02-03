# Torah ELS Index System - Technical Specification

## Executive Summary

A precomputed index of ALL Hebrew dictionary word occurrences at ALL ELS (Equidistant Letter Sequence) skip values across the entire Torah. This transforms ELS searches from computationally expensive real-time operations into instant lookups, enabling advanced features like proximity analysis, term clustering, and ELS-based word embeddings.

---

## 1. Core Concept

### 1.1 The Problem

Traditional ELS search requires:
- Scanning ~305,000 Torah letters
- At each of ~2000 skip values (-1000 to +1000)
- Checking against ~82,000 dictionary words
- **Result**: ~50 billion potential comparisons per search

### 1.2 The Solution

**Precompute once, query forever**:
- Build complete index of where every dictionary word appears at every ELS skip
- Store as compressed, indexed data structure
- Query becomes O(1) lookup + O(n) proximity calculation where n = occurrences

### 1.3 Analogy

| System | Precomputation | Query Time |
|--------|---------------|------------|
| Google Search | Web crawling & indexing | Milliseconds |
| Database | Build B-tree indices | Milliseconds |
| Transformer Attention | Compute QKV matrices | Linear scan |
| **Torah ELS Index** | Find all ELS occurrences | Instant lookup |

---

## 2. Data Structure

### 2.1 Primary Index Schema

```javascript
{
  "metadata": {
    "version": "1.0",
    "created": "2024-02-03T...",
    "torah_hash": "b65394d28c85...",  // Verify Torah text integrity
    "skip_range": [-1000, 1000],
    "dictionary_size": 82530,
    "total_occurrences": 12500000,    // Estimated
    "compression": "gzip"
  },

  "index": {
    // Word → Array of (position, skip) tuples
    "אב": [
      [1234, 1],      // position 1234, skip 1 (open text)
      [5678, 50],     // position 5678, skip 50
      [9012, -33],    // position 9012, skip -33
      // ...
    ],
    "אבד": [...],
    "אברהם": [...],
    // ... 82,530 words
  }
}
```

### 2.2 Optimized Binary Format

For PWA efficiency, use a binary format:

```
Header (32 bytes):
  - Magic number: "ELSX" (4 bytes)
  - Version: uint16 (2 bytes)
  - Skip range min: int16 (2 bytes)
  - Skip range max: int16 (2 bytes)
  - Word count: uint32 (4 bytes)
  - Total occurrences: uint32 (4 bytes)
  - Reserved: (14 bytes)

Word Table (variable):
  For each word:
    - Word length: uint8 (1 byte)
    - Word (UTF-8): variable
    - Occurrence count: uint32 (4 bytes)
    - Occurrences offset: uint32 (4 bytes)  // Points to occurrence data

Occurrence Data (variable):
  For each word's occurrences:
    - Array of (position: uint32, skip: int16) tuples
    - Delta-encoded for compression
```

### 2.3 Storage Estimates

| Skip Range | Est. Occurrences | JSON Size | Compressed |
|------------|------------------|-----------|------------|
| ±100 | ~2.5M | ~80 MB | ~15 MB |
| ±500 | ~12M | ~400 MB | ~70 MB |
| ±1000 | ~25M | ~800 MB | ~140 MB |

**Recommendation**: Start with ±100, expand based on performance.

---

## 3. Precomputation Algorithm

### 3.1 Naive Approach (Too Slow)

```python
for word in dictionary:           # 82K iterations
    for skip in range(-1000, 1001):  # 2001 iterations
        for pos in range(len(torah)):  # 305K iterations
            if extract(torah, pos, skip, len(word)) == word:
                index[word].append((pos, skip))
# Total: 82K × 2K × 305K = 50 trillion operations
```

### 3.2 Optimized Approach: Trie + Single Pass

```python
def build_index(torah, dictionary, skip_range):
    # Build trie from dictionary for O(L) word lookup
    trie = build_trie(dictionary)

    index = defaultdict(list)

    # For each skip value
    for skip in range(skip_range[0], skip_range[1] + 1):
        if skip == 0:
            continue

        # Single pass through Torah at this skip
        # Check ALL starting positions simultaneously using trie
        for start in range(len(torah)):
            # Walk trie while extracting letters
            node = trie.root
            pos = start
            depth = 0

            while node and 0 <= pos < len(torah) and depth < MAX_WORD_LEN:
                letter = torah[pos]
                node = node.children.get(letter)

                if node and node.is_word:
                    # Found a valid word!
                    index[node.word].append((start, skip))

                pos += skip
                depth += 1

    return index

# Complexity: O(skip_range × torah_length × avg_word_length)
# = 2000 × 305K × 7 ≈ 4 billion operations
# With efficient trie: ~10 minutes on modern CPU
```

### 3.3 Further Optimizations

1. **Parallel Processing**: Split skip ranges across CPU cores
2. **Early Termination**: Stop when sequence leaves Torah bounds
3. **Skip Symmetry**: For palindromic words, skip = s and skip = -s give related results
4. **Batch Processing**: Process multiple skip values simultaneously with SIMD
5. **Incremental Updates**: If dictionary changes, only recompute affected words

---

## 4. Query Operations

### 4.1 Basic Lookup

```javascript
// Find all occurrences of a word
function findWord(word) {
  return elsIndex[word] || [];
}

// Usage
const mosheOccurrences = findWord("משה");
// Returns: [{pos: 12345, skip: 50}, {pos: 23456, skip: -49}, ...]
```

### 4.2 Proximity Search

```javascript
// Find all words within distance D of a target position
function findNearby(targetPos, maxDistance, minOccurrences = 1) {
  const results = [];

  for (const [word, occurrences] of Object.entries(elsIndex)) {
    const nearbyOccs = occurrences.filter(
      occ => Math.abs(occ.pos - targetPos) <= maxDistance
    );

    if (nearbyOccs.length >= minOccurrences) {
      results.push({
        word,
        occurrences: nearbyOccs,
        minDistance: Math.min(...nearbyOccs.map(o => Math.abs(o.pos - targetPos)))
      });
    }
  }

  return results.sort((a, b) => a.minDistance - b.minDistance);
}
```

### 4.3 Term Pair Proximity

```javascript
// Find minimum distance between any occurrence of word1 and word2
function pairProximity(word1, word2) {
  const occs1 = elsIndex[word1] || [];
  const occs2 = elsIndex[word2] || [];

  let minDist = Infinity;
  let bestPair = null;

  for (const o1 of occs1) {
    for (const o2 of occs2) {
      const dist = Math.abs(o1.pos - o2.pos);
      if (dist < minDist) {
        minDist = dist;
        bestPair = { occ1: o1, occ2: o2 };
      }
    }
  }

  return { distance: minDist, ...bestPair };
}
```

### 4.4 Cluster Discovery

```javascript
// Find clusters of related terms
function findCluster(seedWord, maxDistance, topN = 20) {
  const seedOccs = elsIndex[seedWord] || [];
  if (seedOccs.length === 0) return null;

  // Use first/best occurrence as center
  const center = seedOccs[0];

  // Find all words near this center
  const nearby = findNearby(center.pos, maxDistance);

  // Compute cluster centroid
  const allPositions = nearby.flatMap(w =>
    w.occurrences.map(o => o.pos)
  );
  const centroid = allPositions.reduce((a, b) => a + b, 0) / allPositions.length;

  return {
    seed: seedWord,
    center: center,
    centroid: Math.round(centroid),
    words: nearby.slice(0, topN),
    totalOccurrences: allPositions.length
  };
}
```

### 4.5 ELS Word Embedding

```javascript
// Create embedding vector based on Torah position distribution
function computeEmbedding(word, dimensions = 100) {
  const occs = elsIndex[word] || [];
  if (occs.length === 0) return null;

  // Divide Torah into regions
  const regionSize = Math.ceil(304805 / dimensions);
  const embedding = new Float32Array(dimensions);

  for (const { pos } of occs) {
    const region = Math.floor(pos / regionSize);
    embedding[region]++;
  }

  // L2 normalize
  const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

// Cosine similarity between word embeddings
function embeddingSimilarity(word1, word2) {
  const emb1 = computeEmbedding(word1);
  const emb2 = computeEmbedding(word2);

  if (!emb1 || !emb2) return 0;

  let dot = 0;
  for (let i = 0; i < emb1.length; i++) {
    dot += emb1[i] * emb2[i];
  }
  return dot;  // Already normalized, so this is cosine similarity
}
```

---

## 5. Advanced Features

### 5.1 Attention-Style Proximity Matrix

For a set of search terms, compute pairwise proximity:

```javascript
function computeAttentionMatrix(words) {
  const n = words.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;  // Self-distance
      } else {
        const prox = pairProximity(words[i], words[j]);
        matrix[i][j] = prox.distance;
        matrix[j][i] = prox.distance;  // Symmetric
      }
    }
  }

  return matrix;
}

// Convert to attention weights (inverse distance)
function proximityToAttention(matrix) {
  return matrix.map(row => {
    const weights = row.map(d => d === 0 ? 1 : 1 / (1 + d / 1000));
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);  // Softmax-style normalization
  });
}
```

### 5.2 Dynamic Centroid Recomputation

```javascript
function recomputeCentroid(terms, currentCenter) {
  // Gather all occurrences of all terms near current center
  const nearbyOccs = [];

  for (const term of terms) {
    const occs = (elsIndex[term] || []).filter(
      o => Math.abs(o.pos - currentCenter) < 5000
    );
    nearbyOccs.push(...occs.map(o => ({ ...o, term })));
  }

  if (nearbyOccs.length === 0) return currentCenter;

  // Weighted centroid (more occurrences = more weight)
  const weights = {};
  for (const occ of nearbyOccs) {
    weights[occ.term] = (weights[occ.term] || 0) + 1;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const occ of nearbyOccs) {
    const weight = 1 / weights[occ.term];  // Normalize by term frequency
    weightedSum += occ.pos * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}
```

### 5.3 Statistical Significance

```javascript
// Expected occurrences based on letter frequencies
function expectedOccurrences(word, skipRange) {
  const letterFreq = getTorahLetterFrequencies();
  const torahLength = 304805;
  const skipCount = skipRange[1] - skipRange[0];

  // Probability of word appearing by chance
  let prob = 1;
  for (const letter of word) {
    prob *= letterFreq[letter];
  }

  // Expected count
  const positions = torahLength - (word.length - 1) * Math.max(Math.abs(skipRange[0]), skipRange[1]);
  return prob * positions * skipCount;
}

// P-value for observed vs expected
function significanceScore(word) {
  const observed = (elsIndex[word] || []).length;
  const expected = expectedOccurrences(word, [-100, 100]);

  // Poisson approximation
  if (expected === 0) return observed > 0 ? 0 : 1;

  // Simple z-score
  const z = (observed - expected) / Math.sqrt(expected);
  return z;
}
```

---

## 6. Implementation Architecture

### 6.1 File Structure

```
tools/
├── build-els-index.py       # Precomputation script
├── validate-els-index.py    # Validation & statistics

data/
├── els-index/
│   ├── els-index-100.json.gz    # Skip range ±100
│   ├── els-index-500.json.gz    # Skip range ±500 (optional)
│   └── metadata.json            # Index metadata

engines/
├── els-index.js             # Query engine
├── els-proximity.js         # Proximity calculations
├── els-embedding.js         # ELS-based embeddings

pages/
├── els-explorer.html        # Interactive exploration UI
```

### 6.2 Build Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Torah Text      │────▶│ Precomputation  │────▶│ Compressed      │
│ (304,805 chars) │     │ (Python)        │     │ Index Files     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ Dictionary      │
                        │ (82,530 words)  │
                        └─────────────────┘
```

### 6.3 Runtime Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser / PWA                                               │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ IndexedDB   │◀──▶│ ELS Index   │◀──▶│ Query       │    │
│  │ (Cache)     │    │ Engine      │    │ Interface   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ Service     │    │ Web Worker  │    │ UI          │    │
│  │ Worker      │    │ (Heavy ops) │    │ Components  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Performance Targets

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Index load | < 5 seconds | From IndexedDB cache |
| Single word lookup | < 1 ms | Direct hash lookup |
| Proximity search (1 word) | < 100 ms | Linear scan of results |
| Cluster discovery | < 500 ms | Multiple word lookups |
| Embedding computation | < 50 ms | Per word |
| Attention matrix (10 words) | < 1 second | 45 pair comparisons |

---

## 8. Future Extensions

1. **Expanded Skip Range**: Build indices for ±500 or ±1000
2. **Phrase Index**: Precompute 2-3 word phrases
3. **Cross-Reference**: Link to Talmud/Midrash mentions
4. **Machine Learning**: Train models on ELS co-occurrence patterns
5. **Visualization**: 3D embedding space explorer
6. **API Service**: Cloud-hosted index for larger datasets

---

## 9. References

- Witztum, Rips, Rosenberg (1994): "Equidistant Letter Sequences in the Book of Genesis"
- Torah text: Koren Edition (verified 304,805 letters)
- Dictionary: Unified Hebrew Dictionary (82,530 words)

---

*Document Version: 1.0*
*Created: 2024-02-03*
*Status: Ready for Implementation*
