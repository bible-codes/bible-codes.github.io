# Hebrew Bible Analysis Suite - Complete Documentation

**Version**: 2.0
**Last Updated**: January 12, 2026
**Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Hebrew Root Extraction System](#hebrew-root-extraction-system)
4. [Tsirufim - Semantic Permutation Analysis](#tsirufim-semantic-permutation-analysis)
5. [Core Search Tools](#core-search-tools)
6. [Database Architecture](#database-architecture)
7. [API Reference](#api-reference)
8. [User Guides](#user-guides)
9. [Technical Implementation Details](#technical-implementation-details)
10. [Performance & Optimization](#performance--optimization)
11. [Future Enhancements](#future-enhancements)
12. [Contributing](#contributing)

---

## Executive Summary

### What This System Does

The Hebrew Bible Analysis Suite is a comprehensive, client-side PWA (Progressive Web App) for analyzing the Hebrew Bible (Tanakh) using computational linguistics, gematria, and semantic analysis methods.

**Core Capabilities:**
- **ELS (Equidistant Letter Sequence) Search**: Find hidden codes with skip patterns
- **Text Search**: Powerful pattern matching with Hebrew morphology awareness
- **Gematria Calculator**: Multiple calculation methods with search capabilities
- **Acronym/Notarikon**: Extract first/last letters, pattern detection
- **Tsirufim (צירופים)**: Semantic permutation analysis with ML clustering
- **Root Extraction**: Morphological analysis identifying Hebrew roots (שורש)

**Key Features:**
- ✅ 100% client-side (runs entirely in browser)
- ✅ Works offline (PWA with service worker)
- ✅ Character-level canonical database (~1.2M characters, 39 books)
- ✅ Root lexicon (56K words → 11.5K roots)
- ✅ Semantic embeddings & clustering
- ✅ No server required (GitHub Pages compatible)

**Data Sources:**
- **Hebrew Bible**: Masoretic Text (Leningrad Codex tradition)
- **Coverage**: Complete Tanakh (Torah, Prophets, Writings - 39 books)
- **Character Count**: ~1,197,000 characters
- **Word Count**: ~309,000 words
- **Verse Count**: ~23,000 verses

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   UI Layer   │  │  Tool Pages  │  │ Service      │     │
│  │  (HTML/CSS)  │  │ (HTML+JS)    │  │ Worker       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────┴──────────────────┴──────────────────┴───────┐    │
│  │           Application Logic (ES6 Modules)           │    │
│  │                                                      │    │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────────┐ │    │
│  │  │ Search  │  │ Gematria │  │    Tsirufim       │ │    │
│  │  │ Engines │  │ Engine   │  │  (Permutations +  │ │    │
│  │  └─────────┘  └──────────┘  │   Clustering)     │ │    │
│  │                              └───────────────────┘ │    │
│  │                                                      │    │
│  │  ┌────────────────────────────────────────────────┐│    │
│  │  │         Root Extraction Engine                  ││    │
│  │  │  - Lexicon Lookup (56K words)                  ││    │
│  │  │  - Morphological Heuristics                    ││    │
│  │  │  - Binyan Detection                            ││    │
│  │  └────────────────────────────────────────────────┘│    │
│  │                                                      │    │
│  │  ┌────────────────────────────────────────────────┐│    │
│  │  │         Semantic Embeddings                     ││    │
│  │  │  - Gematria-based features                     ││    │
│  │  │  - Root-based features                         ││    │
│  │  │  - Morphological features                      ││    │
│  │  └────────────────────────────────────────────────┘│    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                IndexedDB Storage                      │   │
│  │                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   chars     │  │   words     │  │   verses    │ │   │
│  │  │ ~1.2M rows  │  │ ~309K rows  │  │ ~23K rows   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  │                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   roots     │  │ definitions │  │ embeddings  │ │   │
│  │  │ ~56K rows   │  │  (future)   │  │  (future)   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ Loads from
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    GitHub Pages (CDN)                        │
│                                                              │
│  data/*.json.gz (compressed)    engines/*.js (modules)      │
│  - chars.json.gz (per book)     - roots.js                  │
│  - words.json.gz (per book)     - gematria.js               │
│  - verses.json.gz (per book)    - search.js                 │
│  - hebrew-roots.json.gz         - tsirufim/*.js              │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Pure JavaScript (ES6 modules)
- HTML5 + CSS3
- D3.js (visualization)
- No framework dependencies (vanilla JS)

**Data Storage:**
- IndexedDB (client-side database)
- Compression Streams API (gzip)
- Service Worker (offline caching)

**Build Tools (Python - local only):**
- `build-database.py`: Generate character/word/verse databases
- `build-root-lexicon.py`: Generate root mappings

**Deployment:**
- GitHub Pages (static hosting)
- PWA Manifest (installable app)
- Service Worker (offline capability)

---

## Hebrew Root Extraction System

### Overview

The root extraction system identifies the tri-literal or quad-literal Hebrew root (שורש) of words using a dual approach:

1. **Precomputed Lexicon** (primary): Fast O(1) lookup of 56,118 Biblical words
2. **Morphological Heuristics** (fallback): Pattern-based extraction

### Technical Approach

#### Phase 1: Lexicon Lookup

```javascript
import { getRootExtractor } from './engines/roots.js';

const extractor = getRootExtractor();
await extractor.initialize(); // Loads 56K root mappings

const result = await extractor.extractRoot('מדברים');
// {
//   root: 'דבר',
//   binyan: 'piel',
//   pos: null,
//   method: 'lexicon',
//   confidence: 1.0
// }
```

**Lexicon Structure:**
```json
{
  "מדברים": {
    "root": "דבר",
    "binyan": "piel",
    "pos": "verb",
    "confidence": 1.0,
    "metadata": {
      "normalized": "מדברים",
      "stripped": "דברים"
    }
  }
}
```

**Lookup Process:**
1. Normalize word (remove niqqud, convert final letters)
2. Check lexicon for exact match → return immediately (confidence: 1.0)
3. If not found, continue to affix stripping

#### Phase 2: Affix Stripping

**Prefixes (ה, ו, ב, כ, ל, מ, ש):**
- הַשָּׁמַיִם → שמים (remove ה)
- וְיֹאמֶר → יאמר (remove ו)
- בְּרֵאשִׁית → ראשית (remove ב)

**Suffixes (ים, ות, הם, כם, נו, ה, י, ך):**
- מלכים → מלכ (remove ים)
- אדמה → אדמ (remove ה)
- דברינו → דבר (remove ינו)

**Process:**
```javascript
stripAffixes(word) {
  // Strip ONE prefix
  for (const prefix of ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש']) {
    if (word.startsWith(prefix) && word.length > 2) {
      word = word.slice(1);
      break;
    }
  }

  // Strip ONE suffix (longest match first)
  for (const suffix of ['יהם', 'יהן', 'כם', 'ים', 'ות', 'ה', 'י']) {
    if (word.endsWith(suffix) && word.length > suffix.length + 1) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}
```

After stripping, check lexicon again → return if found (confidence: 0.9)

#### Phase 3: Heuristic Extraction

If still not found, apply morphological rules based on word length:

**3 Letters (Tri-literal):**
```
דבר → דבר (already root)
Confidence: 0.8
```

**4 Letters:**
```
Pattern Detection:
- נשבר → Remove נ → שבר (Nifal pattern)
- הקדים → Remove ה → קדם (Hifil pattern)
- מדבר → Remove מ → דבר (Mif'al pattern)
- פרפר → Reduplication → פר

Confidence: 0.6-0.7
```

**5+ Letters:**
```
Extract middle 3 letters:
מדברים → דבר (middle extraction)
Confidence: 0.4
```

### Binyan Detection

**Hebrew Verbal Stems (בניינים):**

| Binyan | Pattern | Example | Detection |
|--------|---------|---------|-----------|
| Qal (פָּעַל) | Simple active | דָּבַר | 3-letter base form |
| Nifal (נִפְעַל) | Simple passive | נִשְׁבַּר | Starts with נ |
| Piel (פִּעֵל) | Intensive active | דִּבֵּר | Ambiguous without niqqud |
| Pual (פֻּעַל) | Intensive passive | דֻּבַּר | Ambiguous without niqqud |
| Hifil (הִפְעִיל) | Causative active | הִקְדִּים | Starts with ה |
| Hufal (הֻפְעַל) | Causative passive | הֻקְדַּם | Starts with ה |
| Hitpael (הִתְפַּעֵל) | Reflexive | הִתְפַּלֵּל | Starts with הת or ת |

**Implementation:**
```javascript
detectBinyan(normalizedWord) {
  if (normalizedWord.match(/^נ[א-ת]{2,3}/)) return 'nifal';
  if (normalizedWord.match(/^ה[א-ת]{2,3}/)) return 'hifil';
  if (normalizedWord.match(/^(הת|ת)[א-ת]{2,3}/)) return 'hitpael';
  if (normalizedWord.match(/^[א-ת]{3}$/)) return 'qal';
  return null;
}
```

### Performance

- **Lexicon Load**: ~100ms (691 KB decompression)
- **Lookup Time**: <1ms per word
- **Memory**: ~15 MB (uncompressed lexicon in RAM)
- **Coverage**: 56,118 Biblical words (100% of Tanakh vocabulary)

### Accuracy

| Method | Confidence | Accuracy (Estimate) |
|--------|------------|---------------------|
| Lexicon Match | 1.0 | ~95% |
| Lexicon (Stripped) | 0.9 | ~85% |
| Heuristic (4-letter) | 0.6-0.7 | ~70% |
| Heuristic (5+ letter) | 0.4 | ~50% |

**Limitations:**
- Without niqqud, some homographs are ambiguous (דָּבָר vs דְּבַר)
- Modern Hebrew words not in Biblical lexicon fallback to heuristics
- Aramaic portions (Daniel, Ezra) have different morphology

---

## Tsirufim - Semantic Permutation Analysis

### Concept

**צירופים** (Tsirufim) = "Combinations/Permutations"

**Core Idea**: In Hebrew, letters composing words that describe a situation can recombine to spell out related concepts and details.

**Challenge**: Massive combinatorial explosion
- 4 letters → 24 permutations
- 5 letters → 120 permutations
- 6 letters → 720 permutations
- 10 letters → 3,628,800 permutations (!)

**Solution**: Multi-stage filtering and semantic analysis

### Architecture

```
Input Letters (e.g., "משה")
        ↓
┌───────────────────────────────┐
│  Stage 1: Generate Candidates │
│  - All permutations           │
│  - Dictionary validation      │
│  - Morphological filtering    │
└───────────┬───────────────────┘
            ↓
      Valid Words (e.g., משה, שמה, המש, אמש)
            ↓
┌───────────────────────────────┐
│  Stage 2: Extract Features    │
│  - Hebrew roots               │
│  - Gematria values            │
│  - Morphological features     │
│  - Letter composition         │
└───────────┬───────────────────┘
            ↓
      Feature Vectors (64-dim)
            ↓
┌───────────────────────────────┐
│  Stage 3: Contextual Scoring  │
│  - Similarity to situation    │
│  - Event-type anchors         │
│  - Semantic coherence         │
└───────────┬───────────────────┘
            ↓
      Scored Candidates
            ↓
┌───────────────────────────────┐
│  Stage 4: Semantic Clustering │
│  - K-Means / DBSCAN           │
│  - Identify thematic groups   │
└───────────┬───────────────────┘
            ↓
      Thematic Clusters
            ↓
┌───────────────────────────────┐
│  Stage 5: Visualization       │
│  - 2D projection (PCA)        │
│  - Interactive D3.js          │
└───────────────────────────────┘
```

### Stage 1: Permutation Generation

**Module**: `engines/tsirufim/permutations.js`

```javascript
import { getPermutationGenerator } from './engines/tsirufim/permutations.js';

const generator = getPermutationGenerator();
await generator.initialize();

// Generate permutations with filtering
const candidates = await generator.generate('משה', {
  minLength: 2,              // Minimum word length
  maxLength: 4,              // Maximum word length
  requireDictionary: true,   // Only known words
  requireRoot: true,         // Must have identifiable root
  minConfidence: 0.3,        // Minimum root confidence
  allowDuplicates: false     // No letter reuse
});

// Result: [
//   { word: 'משה', root: 'משה', confidence: 0.8, inDictionary: true },
//   { word: 'שמה', root: 'שמה', confidence: 0.7, inDictionary: true },
//   ...
// ]
```

**Hard Constraints (Pruning):**
1. **Dictionary validation**: Word must exist in Biblical or Modern Hebrew
2. **Root extraction**: Must have identifiable tri/quad-literal root (confidence ≥ threshold)
3. **Length bounds**: 2 ≤ length ≤ maxLength

**Combinatorial Math:**
```javascript
// nPr (permutations)
function permutations(n, r) {
  return factorial(n) / factorial(n - r);
}

// Estimate total permutations
function estimatePermutations(letters, minLen, maxLen) {
  let total = 0;
  for (let r = minLen; r <= maxLen; r++) {
    total += permutations(letters.length, r);
  }
  return total;
}

// Example:
estimatePermutations('משה', 2, 3)
// = P(3,2) + P(3,3)
// = 6 + 6
// = 12 permutations
```

**Performance:**
- Safety limit: 10,000 permutations max
- Typical runtime: 100-500ms for 3-5 letters
- Dictionary lookup: O(1) per word

### Stage 2: Semantic Embeddings

**Module**: `engines/tsirufim/embeddings.js`

**Goal**: Map each word to a 64-dimensional vector representing its semantic meaning.

**Feature Composition:**

```
┌──────────────────────────────────────────────────────────┐
│              64-Dimensional Feature Vector                │
├──────────────────────────────────────────────────────────┤
│  Indices 0-2:   Gematria Features (normalized)           │
│    [0] Standard gematria / 5000                          │
│    [1] Reduced gematria / 100                            │
│    [2] Ordinal gematria / 500                            │
├──────────────────────────────────────────────────────────┤
│  Indices 3-4:   Root Features                            │
│    [3] Root gematria / 1500                              │
│    [4] Root confidence (0.0-1.0)                         │
├──────────────────────────────────────────────────────────┤
│  Index 5:       Word Length / 10.0                       │
├──────────────────────────────────────────────────────────┤
│  Indices 6-12:  Binyan Encoding (one-hot)                │
│    [6] qal, [7] nifal, [8] piel, [9] pual,              │
│    [10] hifil, [11] hufal, [12] hitpael                  │
├──────────────────────────────────────────────────────────┤
│  Indices 13-16: Letter Composition                       │
│    [13] Guttural ratio (א ה ח ע)                        │
│    [14] Weak ratio (א ה ו י)                            │
│    [15] Emphatic ratio (ט צ ק)                          │
│    [16] Dominant letter frequency                        │
├──────────────────────────────────────────────────────────┤
│  Indices 17-20: Root Letter Composition (same metrics)   │
├──────────────────────────────────────────────────────────┤
│  Indices 21-26: Positional Features                      │
│    [21] First letter ordinal / 22                        │
│    [22] Last letter ordinal / 22                         │
│    [23] Middle letter ordinal / 22                       │
│    [24] First bigram gematria / 44                       │
│    [25] Last bigram gematria / 44                        │
│    [26] Palindrome flag (0 or 1)                         │
├──────────────────────────────────────────────────────────┤
│  Indices 27-63: Reserved / Padding (zeros)               │
└──────────────────────────────────────────────────────────┘
```

**Example:**
```javascript
const embeddings = getEmbeddings();
await embeddings.initialize();

const vector = await embeddings.getEmbedding('משה');
// Float32Array(64) [0.234, 0.156, 0.089, 0.567, 0.8, ...]

// Calculate similarity
const sim = await embeddings.semanticSimilarity('משה', 'אהרן');
// 0.7234 (cosine similarity, -1 to 1)
```

**Cosine Similarity:**
```javascript
cosineSimilarity(v1, v2) {
  let dot = 0, norm1 = 0, norm2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
```

**Future Enhancement**: Pre-trained word2vec/FastText embeddings
- Load from `data/embeddings/tanakh-w2v.json.gz`
- 100-300 dimensions trained on Biblical corpus
- Higher accuracy (~90%+) vs feature-based (~70%)

### Stage 3: Contextual Scoring

**Module**: `engines/tsirufim/scoring.js`

**Goal**: Score each candidate word relative to the original situation/context.

**Scoring Components:**

1. **Situation Similarity** (weight: 1.0)
   - Build centroid embedding of situation words
   - Calculate cosine similarity to each candidate
   - Range: -1 to +1 (higher = more similar)

2. **Semantic Coherence** (weight: 0.5)
   - Average similarity to other high-scoring candidates
   - Rewards words that "fit together" semantically
   - Range: -1 to +1

3. **Semantic Drift Penalty** (weight: 0.3)
   - Distance from situation centroid
   - Penalizes words too far from context
   - Range: 0 to 2 (higher = worse)

4. **Event Anchor Alignment** (weight: 0.4)
   - Similarity to pre-defined event-type anchor
   - Event types: conflict, movement, speech, creation, etc.
   - Range: -1 to +1

**Total Score:**
```
score = (similarity × 1.0) +
        (coherence × 0.5) -
        (drift × 0.3) +
        (anchor × 0.4)
```

**Event Anchors:**
```javascript
const eventAnchors = {
  conflict: ['מלחמה', 'קרב', 'אויב', 'נלחם'],      // War/Battle
  movement: ['הלך', 'יצא', 'בא', 'נסע'],          // Walk/Go/Travel
  speech: ['אמר', 'דבר', 'קרא', 'ענה'],           // Say/Speak
  creation: ['ברא', 'עשה', 'יצר', 'כון'],         // Create/Make
  destruction: ['שבר', 'הרס', 'כלה', 'אבד'],      // Destroy/Break
  covenant: ['ברית', 'שבע', 'אות', 'חק'],         // Covenant/Oath
  judgment: ['שפט', 'דין', 'משפט', 'צדק'],        // Judge/Justice
  blessing: ['ברך', 'טוב', 'חסד', 'שלום'],        // Bless/Good
  curse: ['קלל', 'ארר', 'רע', 'שנא'],             // Curse/Evil
  transformation: ['הפך', 'שנה', 'חדש', 'נהפך']   // Transform/Change
};
```

**Usage:**
```javascript
const scorer = getScorer();
await scorer.initialize();

const scored = await scorer.scoreCandidates(
  candidates,
  'משה יצא ממצרים',  // Situation
  {
    eventType: 'movement',
    weightSimilarity: 1.0,
    weightCoherence: 0.5,
    weightDrift: 0.3,
    weightAnchor: 0.4
  }
);

// Result: candidates sorted by totalScore (descending)
```

### Stage 4: Semantic Clustering

**Module**: `engines/tsirufim/clustering.js`

**Goal**: Group similar words into thematic clusters ("semantic attractors").

**Algorithms:**

#### K-Means Clustering

**Best for**: Known number of clusters, fast performance

```javascript
import { KMeansClustering } from './engines/tsirufim/clustering.js';

const kmeans = new KMeansClustering(k=5, maxIterations=100);
const result = await kmeans.fit(words, embeddings);

// Result:
// {
//   clusters: [
//     { words: ['משה', 'שמה'], centroid: [...], size: 2, density: 0.34 },
//     { words: ['המש', 'אמש'], centroid: [...], size: 2, density: 0.29 },
//     ...
//   ],
//   labels: [0, 0, 1, 1, ...],  // Cluster assignment per word
//   centroids: [[...], [...], ...],
//   k: 5
// }
```

**Algorithm Steps:**
1. Initialize K centroids using k-means++ (probability-weighted)
2. Assign each point to nearest centroid
3. Update centroids as mean of assigned points
4. Repeat steps 2-3 until convergence (or max iterations)

**Complexity**: O(n × k × d × iterations)
- n = number of words
- k = number of clusters
- d = embedding dimension (64)
- iterations ≈ 10-30 typically

#### DBSCAN Clustering

**Best for**: Unknown number of clusters, density-based, identifies noise

```javascript
import { DBSCANClustering } from './engines/tsirufim/clustering.js';

const dbscan = new DBSCANClustering(epsilon=0.5, minPoints=3);
const result = await dbscan.fit(words, embeddings);

// Result:
// {
//   clusters: [...]  // Only dense clusters
//   noise: { words: ['...'], size: 5 },  // Outliers
//   numClusters: 3  // Auto-determined
// }
```

**Parameters:**
- `epsilon`: Maximum distance for neighborhood
- `minPoints`: Minimum points to form dense region

**Algorithm:**
1. For each unvisited point:
   - Find neighbors within epsilon distance
   - If neighbors ≥ minPoints: Start new cluster, expand recursively
   - Else: Mark as noise
2. Points not in any cluster = noise

**Complexity**: O(n²) or O(n log n) with spatial indexing

#### Hierarchical Clustering

**Best for**: Understanding cluster relationships, dendrograms

```javascript
import { HierarchicalClustering } from './engines/tsirufim/clustering.js';

const hierarchical = new HierarchicalClustering(linkage='average');
const result = await hierarchical.fit(words, embeddings, numClusters=5);

// Result includes dendrogram for visualization
```

**Linkage Methods:**
- `single`: Min distance between clusters (elongated clusters)
- `complete`: Max distance (compact clusters)
- `average`: Average distance (balanced)

### Stage 5: Visualization

**Module**: `engines/tsirufim/visualization.js`

**Goal**: Interactive 2D visualization of semantic space.

**Components:**

#### Semantic Space Visualizer

```javascript
import { createSemanticVisualizer } from './engines/tsirufim/visualization.js';

const viz = createSemanticVisualizer('container-id');
viz.initialize();
viz.render(clusterResult, embeddings2D);
```

**Features:**
- D3.js scatter plot
- Color-coded clusters
- Interactive tooltips (word, cluster, score)
- Click to select words
- Zoom/pan controls

**Dimensionality Reduction:**
```javascript
import { PCAProjector } from './engines/tsirufim/visualization.js';

// Project 64D embeddings to 2D
const projected2D = PCAProjector.project(embeddings);
// [{x: 0.234, y: -0.567}, ...]
```

**Current**: Random projection (fast approximation)
**Future**: t-SNE or UMAP (higher quality, slower)

#### Network Graph Visualizer

```javascript
import { createNetworkVisualizer } from './engines/tsirufim/visualization.js';

const netViz = createNetworkVisualizer('container-id');
netViz.render(words, similarityMatrix, threshold=0.5);
```

**Features:**
- Force-directed graph layout
- Edges represent semantic similarity
- Draggable nodes
- Edge thickness = similarity strength

### Complete Workflow Example

```javascript
// 1. Generate permutations
const generator = getPermutationGenerator();
await generator.initialize();
const candidates = await generator.generate('בראשית', {
  minLength: 3,
  maxLength: 6,
  requireDictionary: true,
  minConfidence: 0.4
});

// 2. Extract embeddings
const embeddings = getEmbeddings();
await embeddings.initialize();
const vectors = await embeddings.getEmbeddings(candidates.map(c => c.word));

// 3. Score candidates
const scorer = getScorer();
await scorer.initialize();
const scored = await scorer.scoreCandidates(
  candidates,
  'בראשית ברא אלהים את השמים ואת הארץ',
  { eventType: 'creation' }
);

// 4. Cluster
const clusterResult = await clusterKMeans(scored.map(s => s.word), 5);

// 5. Visualize
const viz = createSemanticVisualizer('viz-container');
const projected = PCAProjector.project(vectors);
viz.render(clusterResult, projected);

console.log('Analysis complete!');
console.log(`Found ${scored.length} permutations in ${clusterResult.clusters.length} clusters`);
```

### Performance Metrics

| Stage | Input Size | Time (approx) |
|-------|-----------|---------------|
| Permutation Generation | 5 letters | 100-200ms |
| Embedding Extraction | 100 words | 50-100ms |
| Contextual Scoring | 100 words | 100-200ms |
| K-Means Clustering | 100 words | 50-150ms |
| 2D Projection | 100 words | 20-50ms |
| Visualization Render | 100 words | 50-100ms |
| **Total** | **5 letters → 100 words** | **~500ms** |

**Browser Requirements:**
- Modern browser (Chrome 90+, Firefox 88+, Safari 15.4+)
- IndexedDB support
- Compression Streams API
- ES6 module support

---

## Core Search Tools

### ELS (Equidistant Letter Sequence) Search

**File**: `bible-codes.html`

**Method**: Find words encoded at fixed skip intervals in consonantal text.

**Example:**
```
Text:  ב ר א ש י ת ב ר א א ל ה י ם
Skip = 2:  ^     ^     ^     ^
Letters:   ב     ש     ב     א  → "בשבא" (not a word)

Skip = 7:  ^           ^           ^
Letters:   ב           א           ם  → "באם"
```

**Search Options:**
- Search term (Hebrew)
- Min/max skip distance
- Search direction (forward, backward, both)
- Book selection

**Precomputed Hashes:**
- Common terms cached for instant results
- File: `data/precomputed-terms.json`

**Performance:**
- Full Torah scan: ~2-5 seconds (Web Worker)
- Precomputed terms: <100ms

### Text Search

**File**: `text-search.html`

**Features:**
- Keyword/phrase search
- First/last letter filtering
- Pattern matching (regex)
- Consonantal vs full text modes
- Auto-suggestions

**Root Integration** (NEW):
```javascript
// Enable root-based search expansion
import { expandQuery } from './engines/root-integration.js';

const expansion = await expandQuery('דבר');
// {
//   original: 'דבר',
//   root: 'דבר',
//   related: ['דבר', 'מדבר', 'דברים', 'וידבר', 'דברי', ...],
//   confidence: 1.0
// }

// Search all related words
for (const word of expansion.related) {
  searchWord(word);
}
```

### Gematria Calculator

**File**: `gematria.html`

**Methods:**

| Method | Description | Example |
|--------|-------------|---------|
| Standard | א=1, ב=2, ..., ת=400 | אדם = 1+4+40 = 45 |
| Reduced | Sum digits iteratively | 45 → 4+5 = 9 |
| Ordinal | א=1, ב=2, ..., ת=22 | אדם = 1+4+13 = 18 |

**Features:**
- Calculate gematria for any text
- Search verses/words by value
- Range search (e.g., 100-200)
- Statistical analysis

**Root Integration** (NEW):
```javascript
// Calculate root gematria
import { getRootExtractor } from './engines/roots.js';
import { calculateGematria } from './engines/gematria.js';

const extractor = getRootExtractor();
const rootData = await extractor.extractRoot('דברים');
const rootGematria = calculateGematria(rootData.root, 'standard');

console.log(`Root: ${rootData.root}, Gematria: ${rootGematria}`);
// Root: דבר, Gematria: 206
```

### Acronym/Notarikon

**File**: `acronym.html`

**Methods:**

| Method | Hebrew | Description | Example |
|--------|--------|-------------|---------|
| Roshei Teivot | ראשי תיבות | First letters | בראשית = ב ר א ש י ת |
| Sofei Teivot | סופי תיבות | Last letters | בראשית = ת ת ת ת ת ת |
| Middle | אמצעיות | Middle letters | - |
| Alternating | לסירוגין | Every other letter | - |

**Features:**
- Extract acronyms from verses
- Search by acronym pattern
- Book-wide analysis
- Meaningful acronym detection

**Root Integration** (NEW):
```javascript
// Extract acronym and get roots
const acronym = extractAcronym('בראשית ברא אלהים');  // 'בבא'

const rootData = await extractRoot(acronym);
console.log(`Acronym root: ${rootData.root}`);
```

---

## Database Architecture

### Character-Level Canonical Database

**Philosophy**: Store smallest semantic unit (character) with all metadata. Derive everything else as views.

#### Chars Table

**Schema:**
```javascript
{
  id: INTEGER,                  // Global ordinal (0..~1.2M)
  book: SMALLINT,               // 1..39
  chapter: SMALLINT,
  verse: SMALLINT,
  verse_char_index: SMALLINT,   // 0-based within verse
  word_index: SMALLINT,
  char_index_in_word: SMALLINT,

  base_char: CHAR(1),           // א-ת only
  final_form: BOOLEAN,          // Is final letter (ך ם ן ף ץ)

  niqqud: STRING,               // Unicode combining marks
  taamim: STRING,               // Cantillation marks
  alt_taamim: STRING,           // Alternate (Aseret HaDibrot, etc.)

  has_niqqud: BOOLEAN,
  has_taamim: BOOLEAN,
  has_alt_taamim: BOOLEAN,

  gematria_standard: SMALLINT,
  gematria_reduced: SMALLINT,
  gematria_ordinal: SMALLINT,

  word_id: INTEGER,
  verse_id: INTEGER
}
```

**Storage:**
- File: `data/{book}-chars.json.gz` (39 files)
- Total: ~1.2M characters
- Compressed size: ~21 MB (all books)
- Uncompressed: ~630 MB

**Queries:**
```javascript
// Get character by global ID
const char = await db.chars.get(12345);

// Get all characters in verse
const verse_chars = await db.chars
  .where('verse_id')
  .equals(verse_id)
  .toArray();

// Get consonantal text for ELS
const consonants = await db.chars
  .where('book')
  .equals(1)  // Genesis
  .toArray()
  .then(chars => chars.map(c => c.base_char).join(''));
```

#### Words Table

**Schema:**
```javascript
{
  word_id: INTEGER,
  book: SMALLINT,
  chapter: SMALLINT,
  verse: SMALLINT,
  word_index: SMALLINT,

  word_text_consonantal: STRING,
  word_text_full: STRING,       // With niqqud
  word_length_chars: SMALLINT,

  first_char_id: INTEGER,
  last_char_id: INTEGER,

  gematria_standard: SMALLINT
}
```

**Storage:**
- File: `data/{book}-words.json.gz` (39 files)
- Total: ~309K words
- Compressed size: ~15 MB (all books)

#### Verses Table

**Schema:**
```javascript
{
  verse_id: INTEGER,
  book: SMALLINT,
  chapter: SMALLINT,
  verse: SMALLINT,

  verse_text_consonantal: STRING,
  verse_text_full: STRING,

  char_count: SMALLINT,
  word_count: SMALLINT,

  gematria_standard: SMALLINT
}
```

**Storage:**
- File: `data/{book}-verses.json.gz` (39 files)
- Total: ~23K verses
- Compressed size: ~3 MB (all books)

### Root Lexicon

**File**: `data/embeddings/hebrew-roots.json.gz`

**Schema:**
```javascript
{
  "word": {
    "root": "שרש",
    "binyan": "qal|nifal|piel|...",
    "pos": "verb|noun|...",
    "confidence": 0.0-1.0,
    "metadata": {
      "normalized": "normalized_form",
      "stripped": "stripped_form"
    }
  }
}
```

**Statistics:**
- 56,118 word entries
- 11,468 unique roots
- 691 KB compressed
- ~15 MB uncompressed

### IndexedDB Schema

**Database Name**: `BibleAnalysis`
**Version**: 3 (with dictionary stores)

**Object Stores:**
1. `chars` (keyPath: 'id', indexes: book, verse_id, word_id)
2. `words` (keyPath: 'word_id', indexes: verse_id, book)
3. `verses` (keyPath: 'verse_id', indexes: book, chapter)
4. `roots` (keyPath: 'word', indexes: root, binyan, pos)
5. `definitions` (keyPath: 'word', indexes: root, source)
6. `embeddings` (keyPath: 'word', indexes: model)
7. `rootFeatures` (keyPath: 'root', indexes: category)

**Initialization:**
```javascript
import { openDictionaryDB } from './db/dictionary-schema.js';
import { getDictionaryLoader } from './db/dictionary-loader.js';

// Open database
const db = await openDictionaryDB('BibleAnalysis');

// Load data
const loader = getDictionaryLoader();
await loader.loadAll((store, loaded, total) => {
  console.log(`Loading ${store}: ${loaded}/${total}`);
});
```

### Data Build Process

**Build Scripts** (Python, local only):

#### build-database.py

```bash
python3 build-database.py --books all --output data/
```

**Process:**
1. Parse Masoretic Text (Unicode with niqqud/taamim)
2. Normalize Unicode (NFD)
3. Iterate: verse → word → character
4. Assign global IDs, calculate gematria
5. Write compressed JSON files

**Output:**
- `{book}-chars.json.gz`
- `{book}-words.json.gz`
- `{book}-verses.json.gz`

#### build-root-lexicon.py

```bash
python3 build-root-lexicon.py
```

**Process:**
1. Load all `*-words.json.gz` files
2. Extract unique words (~56K)
3. Apply morphological analysis:
   - Strip affixes
   - Detect binyan patterns
   - Extract tri/quad-literal roots
4. Write `hebrew-roots.json.gz`

**Time:** ~1-2 minutes for full Tanakh

---

## API Reference

### Root Extraction API

#### getRootExtractor()

```javascript
import { getRootExtractor } from './engines/roots.js';

const extractor = getRootExtractor();
```

Returns singleton `HebrewRootExtractor` instance.

#### extractor.initialize()

```javascript
await extractor.initialize();
```

Loads root lexicon from `data/embeddings/hebrew-roots.json.gz`.

**Returns**: Promise<void>

#### extractor.extractRoot(word, aggressive=true)

```javascript
const result = await extractor.extractRoot('מדברים', true);
```

**Parameters:**
- `word` (string): Hebrew word (with or without niqqud)
- `aggressive` (boolean): Use aggressive affix stripping (default: true)

**Returns**: Promise<Object>
```javascript
{
  root: 'דבר',           // Tri/quad-literal root
  binyan: 'piel',        // Verbal stem (or null)
  pos: null,             // Part of speech (future)
  method: 'lexicon',     // 'lexicon', 'lexicon-stripped', 'heuristic'
  confidence: 1.0,       // 0.0-1.0
  original: 'מדברים'     // Original word (if heuristic)
}
```

#### extractor.extractRoots(words)

```javascript
const results = await extractor.extractRoots(['משה', 'אהרן', 'מרים']);
```

**Parameters:**
- `words` (Array<string>): Array of Hebrew words

**Returns**: Promise<Array<Object>> - Array of root extraction results

#### extractor.getWordsWithRoot(root)

```javascript
const words = extractor.getWordsWithRoot('דבר');
// ['דבר', 'מדבר', 'דברים', 'וידבר', ...]
```

**Parameters:**
- `root` (string): Hebrew root to search

**Returns**: Array<string> - Words with this root

#### extractor.isKnownWord(word)

```javascript
const known = extractor.isKnownWord('משה');  // true
```

**Parameters:**
- `word` (string): Hebrew word

**Returns**: boolean - True if word in lexicon

#### extractor.getStats()

```javascript
const stats = extractor.getStats();
// {
//   totalWords: 56118,
//   uniqueRoots: 11468,
//   binyans: ['qal', 'nifal', 'piel', 'hifil', 'hitpael'],
//   posCategories: []
// }
```

**Returns**: Object - Lexicon statistics

### Tsirufim API

#### Permutation Generator

```javascript
import { getPermutationGenerator } from './engines/tsirufim/permutations.js';

const generator = getPermutationGenerator();
await generator.initialize();

const candidates = await generator.generate('משה', {
  minLength: 2,
  maxLength: 4,
  requireDictionary: true,
  requireRoot: true,
  minConfidence: 0.3,
  allowDuplicates: false
});
```

#### Embeddings

```javascript
import { getEmbeddings } from './engines/tsirufim/embeddings.js';

const embeddings = getEmbeddings();
await embeddings.initialize();

const vector = await embeddings.getEmbedding('משה');  // Float32Array(64)
const similarity = await embeddings.semanticSimilarity('משה', 'אהרן');  // 0.7234
```

#### Scoring

```javascript
import { getScorer } from './engines/tsirufim/scoring.js';

const scorer = getScorer();
await scorer.initialize();

const scored = await scorer.scoreCandidates(
  candidates,
  'משה יצא ממצרים',
  { eventType: 'movement' }
);
```

#### Clustering

```javascript
import { clusterKMeans, clusterDBSCAN } from './engines/tsirufim/clustering.js';

// K-Means
const kmeans = await clusterKMeans(words, k=5);

// DBSCAN
const dbscan = await clusterDBSCAN(words, epsilon=0.5, minPoints=3);
```

#### Visualization

```javascript
import { createSemanticVisualizer, PCAProjector } from './engines/tsirufim/visualization.js';

const viz = createSemanticVisualizer('container-id');
viz.initialize();

const projected = PCAProjector.project(embeddings);
viz.render(clusterResult, projected);
```

### Integration API

```javascript
import { getRootIntegration } from './engines/root-integration.js';

const integration = getRootIntegration();
await integration.initialize();

// Expand query
const expansion = await integration.expandQuery('דבר');

// Enrich results
const enriched = await integration.enrichResults(searchResults);

// Group by root
const grouped = integration.groupByRoot(enrichedResults);

// Get statistics
const stats = await integration.getStatistics(['משה', 'אהרן', 'מרים']);
```

---

## User Guides

### Quick Start: Tsirufim Analysis

**Goal**: Analyze semantic permutations of a Hebrew word or phrase.

**Steps:**

1. Open `tsirufim.html`

2. Enter letters in the "אותיות למיון" field:
   ```
   Example: משה
   ```

3. (Optional) Add context in "הקשר/מצב":
   ```
   Example: משה יצא ממצרים
   ```

4. (Optional) Select event type:
   ```
   Example: Movement
   ```

5. Adjust settings:
   - Min/max length: 2-6 letters
   - Confidence threshold: 0.3
   - Check "רק מילים מהמילון" for dictionary words only
   - Check "חייב שורש מזוהה" for known roots only

6. Choose clustering method:
   - K-Means (fast, requires K)
   - DBSCAN (auto-detects clusters)
   - Hierarchical (dendrogram)

7. Click "🎯 צור פרמוטציות"

8. View results:
   - **Results Tab**: All valid permutations with scores
   - **Visualization Tab**: 2D semantic space
   - **Clusters Tab**: Grouped by theme
   - **Analysis Tab**: Statistics

**Interpretation:**
- High-scoring words are semantically related to situation
- Clusters represent thematic groups
- Proximity in visualization = semantic similarity

### Advanced: Root-Based Text Search

**Goal**: Find all words derived from the same root.

**Steps:**

1. Open `text-search.html`

2. Enable root-based search:
   ```
   Toggle: 🌱 חיפוש מבוסס-שורש
   ```

3. Enter search term:
   ```
   Example: דבר
   ```

4. System will:
   - Extract root: דבר
   - Find related words: דבר, מדבר, דברים, וידבר, etc.
   - Search all related words

5. Results show:
   - Original search term
   - Root expansion (related words)
   - All verses containing any related word
   - Root badge for each result

### Building Custom Analysis

**Goal**: Create custom analysis using API.

**Example: Find roots with high gematria:**

```javascript
import { getRootExtractor } from './engines/roots.js';
import { calculateGematria } from './engines/gematria.js';
import { openDictionaryDB } from './db/dictionary-schema.js';

// Initialize
const extractor = getRootExtractor();
await extractor.initialize();

const db = await openDictionaryDB();

// Get all words
const words = await db.words
  .where('book').equals(1)
  .toArray();

// Extract roots and calculate gematria
const rootGematria = {};
for (const word of words) {
  const rootData = await extractor.extractRoot(word.word_text_consonantal);
  const value = calculateGematria(rootData.root, 'standard');

  if (!rootGematria[rootData.root] || rootGematria[rootData.root] < value) {
    rootGematria[rootData.root] = value;
  }
}

// Sort by gematria
const sorted = Object.entries(rootGematria)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log('Top 20 roots by gematria:');
sorted.forEach(([root, value]) => {
  console.log(`${root}: ${value}`);
});
```

---

## Technical Implementation Details

### Character Normalization

**Unicode Normalization Form:**
- Use NFD (Canonical Decomposition) for all Hebrew text
- Separates base letters from combining marks (niqqud, taamim)

```javascript
function normalizeHebrew(text) {
  // Normalize to NFD
  let normalized = text.normalize('NFD');

  // Remove niqqud (U+0591 - U+05C7)
  normalized = normalized.replace(/[\u0591-\u05C7]/g, '');

  // Convert final letters
  const finalMap = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  normalized = normalized.split('').map(c => finalMap[c] || c).join('');

  return normalized;
}
```

### Gematria Calculation

**Standard (Mispar Hechrechi):**
```javascript
function calculateGematria(text, method='standard') {
  const values = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
    'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90  // Finals same as regular
  };

  let sum = 0;
  for (const char of text) {
    sum += values[char] || 0;
  }

  if (method === 'reduced') {
    // Sum digits until single digit
    while (sum >= 10) {
      sum = sum.toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
    }
  } else if (method === 'ordinal') {
    // Use position in alphabet (א=1, ב=2, ..., ת=22)
    const ordinals = {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 10, 'כ': 11, 'ל': 12, 'מ': 13, 'נ': 14, 'ס': 15, 'ע': 16, 'פ': 17, 'צ': 18,
      'ק': 19, 'ר': 20, 'ש': 21, 'ת': 22,
      'ך': 11, 'ם': 13, 'ן': 14, 'ף': 17, 'ץ': 18
    };
    sum = 0;
    for (const char of text) {
      sum += ordinals[char] || 0;
    }
  }

  return sum;
}
```

### IndexedDB Batch Insertion

**Optimization for large datasets:**

```javascript
async function batchInsert(db, storeName, entries, batchSize=1000) {
  let inserted = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      for (const entry of batch) {
        store.put(entry);  // Note: put() not add() for upsert
      }

      tx.oncomplete = () => {
        inserted += batch.length;
        console.log(`Inserted ${inserted}/${entries.length}`);
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  return inserted;
}
```

**Why batching?**
- Prevents memory overflow
- Allows progress tracking
- Avoids blocking UI thread

### Service Worker Caching

**File**: `sw.js`

```javascript
const CACHE_VERSION = 'v2.0';
const CACHE_NAME = `bible-analysis-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/bible-codes.html',
  '/text-search.html',
  '/gematria.html',
  '/acronym.html',
  '/tsirufim.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

const ENGINE_MODULES = [
  '/engines/roots.js',
  '/engines/gematria.js',
  '/engines/search.js',
  '/engines/tsirufim/permutations.js',
  '/engines/tsirufim/embeddings.js',
  '/engines/tsirufim/scoring.js',
  '/engines/tsirufim/clustering.js',
  '/engines/tsirufim/visualization.js'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...STATIC_ASSETS, ...ENGINE_MODULES]);
    })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Fetch: Cache-first for static, network-first for data
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/data/')) {
    // Network-first for data files (may update)
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

### Web Worker for ELS Search

**Why?** ELS search is CPU-intensive and blocks UI thread.

**Implementation:**

```javascript
// Main thread (bible-codes.html)
const elsWorker = new Worker('engines/els.worker.js');

elsWorker.postMessage({
  action: 'search',
  term: 'משה',
  text: torahText,
  minSkip: -100,
  maxSkip: 100
});

elsWorker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    updateProgress(e.data.percent);
  } else if (e.data.type === 'result') {
    displayResults(e.data.matches);
  }
};

// Worker thread (engines/els.worker.js)
self.onmessage = (e) => {
  const { action, term, text, minSkip, maxSkip } = e.data;

  if (action === 'search') {
    const matches = [];
    const totalSkips = maxSkip - minSkip + 1;
    let processed = 0;

    for (let skip = minSkip; skip <= maxSkip; skip++) {
      if (skip === 0) continue;

      // Search with this skip
      for (let start = 0; start < text.length; start++) {
        if (matchesELS(text, term, start, skip)) {
          matches.push({ start, skip });
        }
      }

      // Report progress every 10 skips
      processed++;
      if (processed % 10 === 0) {
        self.postMessage({
          type: 'progress',
          percent: (processed / totalSkips * 100).toFixed(1)
        });
      }
    }

    self.postMessage({
      type: 'result',
      matches: matches
    });
  }
};

function matchesELS(text, term, start, skip) {
  let pos = start;
  for (let i = 0; i < term.length; i++) {
    if (pos >= text.length || text[pos] !== term[i]) {
      return false;
    }
    pos += Math.abs(skip);
  }
  return true;
}
```

---

## Performance & Optimization

### Memory Usage

| Component | Size (MB) | Notes |
|-----------|-----------|-------|
| Root Lexicon | ~15 | Uncompressed in RAM |
| Chars (1 book) | ~15-50 | Varies by book size |
| Words (1 book) | ~5-15 | - |
| Verses (1 book) | ~1-3 | - |
| Embeddings Cache | Variable | Grows with usage |
| **Total** | **50-100** | Typical usage |

**Browser Quotas:**
- Chrome/Edge: ~60% of free disk space
- Firefox: ~50% of global storage limit
- Safari: 1 GB default (can request more)

**Monitoring:**
```javascript
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  const percent = (estimate.usage / estimate.quota * 100).toFixed(2);
  console.log(`Using ${estimate.usage} bytes of ${estimate.quota} (${percent}%)`);
}
```

### Loading Time

| Operation | Time (ms) | Notes |
|-----------|-----------|-------|
| Load root lexicon | ~100 | 691 KB decompression |
| Load 1 book (chars) | ~200-500 | ~1-3 MB decompression |
| Load 1 book (words) | ~100-200 | ~0.5-1 MB |
| Initialize root extractor | ~100 | Lexicon load |
| Initialize embeddings | ~50 | No pre-trained yet |
| **Total cold start** | **~1-2s** | First page load |
| **Subsequent loads** | **<100ms** | Cached in IndexedDB |

### Search Performance

| Search Type | Input Size | Time (ms) | Notes |
|-------------|-----------|-----------|-------|
| Root extraction | 1 word | <1 | Lexicon lookup O(1) |
| Root extraction | 100 words | 50-100 | Batch processing |
| Text search | 1 verse | <10 | Simple pattern match |
| Text search | Full book | 500-1000 | Full scan |
| Gematria calculation | 1 word | <1 | Simple arithmetic |
| Gematria search | Full book | 200-500 | Indexed lookup |
| ELS search | Full Torah | 2000-5000 | Web Worker (non-blocking) |
| Tsirufim (5 letters) | ~100 perms | 500-1000 | Full pipeline |

### Optimization Techniques

#### 1. Lazy Loading

```javascript
// Don't load all books at once
async function loadBook(bookId) {
  if (loadedBooks.has(bookId)) return;

  const chars = await loadCompressed(`data/${getBookName(bookId)}-chars.json.gz`);
  await db.chars.bulkPut(chars);

  loadedBooks.add(bookId);
}

// Load on demand
async function searchInBook(bookId, term) {
  await loadBook(bookId);  // Ensure book is loaded
  // ... perform search
}
```

#### 2. Caching

```javascript
// Cache embeddings
class HebrewEmbeddings {
  constructor() {
    this.cache = new Map();  // word → embedding
  }

  async getEmbedding(word) {
    if (this.cache.has(word)) {
      return this.cache.get(word);  // O(1) lookup
    }

    const embedding = await this.generateFeatureEmbedding(word);
    this.cache.set(word, embedding);
    return embedding;
  }
}
```

#### 3. Web Workers

```javascript
// Offload heavy computations
const worker = new Worker('heavy-computation.worker.js');
worker.postMessage({ task: 'compute', data: largeDataset });
worker.onmessage = (e) => {
  displayResults(e.data.result);
};

// UI remains responsive!
```

#### 4. IndexedDB Indexes

```javascript
// Create indexes for fast queries
db.createObjectStore('chars', { keyPath: 'id' });
  .createIndex('verse_id', 'verse_id', { unique: false });  // ← Fast verse lookups
  .createIndex('book', 'book', { unique: false });          // ← Fast book lookups

// Query with index
const verseChars = await db.chars
  .where('verse_id')        // Uses index
  .equals(12345)
  .toArray();               // Fast!
```

#### 5. Compression

```javascript
// Use gzip for all data files
// Compression ratio: ~30:1 for text

// Before: 630 MB uncompressed
// After: 21 MB compressed
// Savings: 97%!
```

### Mobile Optimization

**Considerations:**
- Limited RAM (1-4 GB)
- Slower CPU
- Touch interface
- Slower network

**Strategies:**
1. **Progressive Loading**: Load only visible content
2. **Aggressive Caching**: Cache everything after first load
3. **Reduced Embeddings**: Use 32-dim instead of 64-dim
4. **Simplified Clustering**: Use K-Means (fastest)
5. **Touch Gestures**: Swipe, pinch-to-zoom on visualizations

---

## Future Enhancements

### Phase 6: Advanced NLP

#### 1. Pre-trained Hebrew Embeddings

**Goal**: Higher-quality semantic vectors

**Approach:**
- Train word2vec/FastText on Biblical + Rabbinic corpus
- 100-300 dimensions
- Capture contextual meaning

**Benefits:**
- Improved semantic similarity accuracy (~95% vs ~70%)
- Better clustering
- More meaningful permutation analysis

**Size**: ~50-100 MB compressed

**Timeline**: Next major release

#### 2. AlephBERT Integration

**Goal**: State-of-the-art Hebrew NLP

**Approach:**
- Use pre-trained AlephBERT (Hebrew BERT)
- Contextual embeddings (per-word-in-context)
- Fine-tune on Biblical text

**Benefits:**
- ~98% accuracy for root extraction
- Disambiguate homographs
- POS tagging
- Named entity recognition

**Challenges:**
- Model size: ~400 MB
- Inference time: ~50ms per sentence
- Requires TensorFlow.js or ONNX Runtime

**Timeline**: Future consideration

#### 3. Morphological Analyzer

**Goal**: Full morphological decomposition

**Approach:**
- Integrate YAP or similar analyzer
- WASM compilation for browser
- Real-time analysis

**Benefits:**
- Accurate binyan detection
- POS tagging
- Tense/person/gender/number

**Timeline**: Medium priority

### Phase 7: Visualization Enhancements

#### 1. t-SNE / UMAP

**Goal**: Better 2D projection

**Current**: Random projection (fast, low quality)
**Upgrade**: t-SNE or UMAP (slower, high quality)

**Benefits:**
- Clearer cluster separation
- Better semantic space representation

**Library**: umap-js or tensorflow.js

#### 2. 3D Visualization

**Goal**: Explore semantic space in 3D

**Approach:**
- Three.js or D3.js 3D
- Interactive rotation/zoom
- VR support (future)

#### 3. Network Analysis

**Goal**: Graph-based semantic relationships

**Approach:**
- Build semantic similarity graph
- Community detection algorithms
- Centrality analysis
- Pathfinding between concepts

**Use Case**: "Find semantic path from משה to פרעה"

### Phase 8: Cross-Reference System

#### 1. Talmud/Midrash Integration

**Goal**: Link Biblical verses to rabbinic commentary

**Approach:**
- Index Sefaria API references
- Local JSON for offline
- Cross-link verses ↔ commentary

**Benefits:**
- Deeper contextual understanding
- Traditional interpretation layer

#### 2. Zohar Integration

**Goal**: Kabbalistic analysis layer

**Approach:**
- Link verses to Zohar passages
- Gematria-based connections
- Sefirot mapping

#### 3. Modern Translations

**Goal**: Multi-language support

**Approach:**
- English, Spanish, French, Russian translations
- Side-by-side display
- Translation-aware search

### Phase 9: Collaborative Features

#### 1. Save & Share

**Goal**: Save analyses and share with others

**Approach:**
- Export to JSON
- Import saved analyses
- Share via URL (encode in hash)

#### 2. Annotations

**Goal**: User notes and commentary

**Approach:**
- Local storage of user annotations
- Attach to verses/words
- Export/import

#### 3. Community Database

**Goal**: Shared discoveries

**Approach:**
- Optional cloud sync
- Community-contributed insights
- Upvoting/discussion

**Challenges**: Requires backend (not pure static site)

### Phase 10: Advanced Statistical Analysis

#### 1. ELS Statistical Significance

**Goal**: Quantify probability of ELS findings

**Approach:**
- Monte Carlo simulation
- Randomization tests
- P-value calculation

**Reference**: WRR methodology (1994 paper)

#### 2. Gematria Statistical Analysis

**Goal**: Identify statistically significant gematria matches

**Approach:**
- Expected value distribution
- Z-score calculation
- Multiple hypothesis correction

#### 3. Tsirufim Significance Testing

**Goal**: Quantify likelihood of semantic clusters

**Approach:**
- Baseline: random letter permutations
- Compare cluster quality metrics
- Permutation testing

---

## Contributing

### Development Setup

1. **Clone Repository:**
```bash
git clone https://github.com/bible-codes/bible-codes.github.io.git
cd bible-codes.github.io
```

2. **Local Web Server:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

3. **Build Data (if modifying):**
```bash
# Requires Python 3.8+
python3 build-database.py --books all
python3 build-root-lexicon.py
```

### Code Structure

```
/
├── index.html              # Main dashboard
├── bible-codes.html        # ELS search
├── text-search.html        # Text search
├── gematria.html           # Gematria calculator
├── acronym.html            # Acronym/notarikon
├── tsirufim.html           # Semantic permutations
├── test-roots.html         # Root extraction test
│
├── engines/
│   ├── roots.js            # Root extraction
│   ├── gematria.js         # Gematria engine
│   ├── search.js           # Text search
│   ├── root-integration.js # Integration helper
│   └── tsirufim/
│       ├── permutations.js
│       ├── embeddings.js
│       ├── scoring.js
│       ├── clustering.js
│       └── visualization.js
│
├── db/
│   ├── schema.js           # IndexedDB schema
│   ├── loader.js           # Data loader
│   ├── dictionary-schema.js
│   └── dictionary-loader.js
│
├── data/
│   ├── *-chars.json.gz     # Character data (39 books)
│   ├── *-words.json.gz     # Word data (39 books)
│   ├── *-verses.json.gz    # Verse data (39 books)
│   └── embeddings/
│       └── hebrew-roots.json.gz  # Root lexicon
│
├── build-database.py       # Data generation
├── build-root-lexicon.py   # Root lexicon generation
│
└── sw.js                   # Service worker
```

### Coding Standards

**JavaScript:**
- ES6 modules
- Async/await (no callbacks)
- JSDoc comments
- Descriptive variable names

**Example:**
```javascript
/**
 * Extract Hebrew root from word
 * @param {string} word - Hebrew word
 * @returns {Promise<Object>} Root data
 */
async function extractRoot(word) {
  // ...
}
```

**Python:**
- PEP 8 style
- Type hints
- Docstrings

### Testing

**Manual Testing:**
1. Test on multiple browsers (Chrome, Firefox, Safari)
2. Test on mobile devices
3. Test offline mode (disable network)
4. Test with large datasets

**Automated Testing** (future):
- Unit tests for engines
- Integration tests for database
- E2E tests for UI flows

### Pull Request Process

1. Fork repository
2. Create feature branch (`feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

**PR Checklist:**
- [ ] Code follows style guidelines
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Documentation updated (if applicable)
- [ ] No console errors
- [ ] Performance acceptable

### Bug Reports

**Template:**
```
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Browser: [e.g. Chrome 120]
- OS: [e.g. Windows 11]
- Device: [e.g. Desktop]

**Additional context**
Any other relevant information.
```

---

## License

See LICENSE file in repository.

---

## Credits

**Developer**: Aharon (roni762583@protonmail.com)

**Acknowledgments:**
- Doron Witztum, Eliyahu Rips, Yoav Rosenberg (Bible Codes research)
- Sefaria.org (Hebrew text API)
- D3.js community (visualization library)
- AlephBERT team (Hebrew NLP research)

**Biblical Text**: Masoretic Text (public domain)

**Libraries:**
- D3.js (BSD 3-Clause)
- IndexedDB (Browser native API)

---

## Contact

- **Email**: roni762583@protonmail.com
- **GitHub**: https://github.com/bible-codes/bible-codes.github.io
- **Issues**: https://github.com/bible-codes/bible-codes.github.io/issues

---

*Last Updated: January 12, 2026*
*Version: 2.0*
*Status: Production Ready* 🟢
