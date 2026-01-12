# JerusalemHills Tsirufim (צירופים) - Code Analysis

## Overview

The JerusalemHills permutation tool is a **basic anagram solver** that generates all possible word combinations from Hebrew input letters and validates them against Hebrew Wiktionary. It's a foundation we can build upon for our more advanced semantic analysis system.

**Source**: https://github.com/JerusalemHills/jerusalemhills.github.io/tree/main/games/permutations

---

## Architecture Analysis

### 1. Core Components

#### A. Input System (`permutations.html`)
```html
<!-- Dynamic input boxes with +/- controls -->
<div id="input-container">
    <input type="text" placeholder="Enter Hebrew letters">
    <button onclick="addInputBox()">+</button>
</div>
```

**Features**:
- Multiple input boxes (add with `+`, remove with `-`)
- Virtual Hebrew keyboard with 3 rows
- Final letter normalization (ם→מ, ן→נ, etc.)
- Cursor position tracking for keyboard input

#### B. Permutation Generator (`app.js`)

**Core Algorithm**:
```javascript
function permute(chars, length, prefix = "") {
    if (prefix.length === length) return [prefix];
    const permutations = [];
    for (let i = 0; i < chars.length; i++) {
        const newChars = chars.slice(0, i).concat(chars.slice(i + 1));
        permutations.push(...permute(newChars, length, prefix + chars[i]));
    }
    return permutations;
}
```

**Algorithm**: Recursive backtracking
- **Complexity**: O(n!) for full permutations
- **Optimization**: Length filtering (skip 2-char, 3-char)
- **No pruning**: Generates ALL permutations, then validates

**Process Flow**:
1. Collect all input letters
2. For each length (2 to n):
   - Generate all permutations of that length
   - For each permutation:
     - Check Wiktionary API
     - If definition exists, add to results

#### C. Dictionary Validation

**API**: Hebrew Wiktionary
```javascript
async function searchWiktionary(term) {
    const url = `https://he.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=extracts&format=json&origin=*`;
    // Returns definition or null
}
```

**Limitations**:
- **Rate limits**: One API call per permutation
- **Network dependent**: Requires internet connection
- **No offline mode**: Cannot work as PWA
- **No semantic analysis**: Simple exists/doesn't exist check

#### D. User Interface

**Controls**:
- Start/Stop search buttons
- Status indicator (Running/Stopped)
- Download results as .txt
- Length filter checkboxes (skip 2-char, 3-char)

**Output**:
- Fixed-height scrollable div (450px)
- Results appear as: `Word: אב - Definition: father`
- Duplicate prevention

---

## What This Implementation Does Well

### ✅ Strengths

1. **Clean UI/UX**
   - Virtual keyboard with Hebrew layout
   - Multiple input boxes
   - Real-time status updates
   - Downloadable results

2. **Final Letter Handling**
   - Automatically normalizes final forms (ם→מ, ן→נ, ך→כ, ף→פ, ץ→צ)
   - Essential for Hebrew text processing

3. **Async Processing**
   - Non-blocking API calls
   - User can stop search mid-process
   - Progressive result display

4. **Duplicate Prevention**
   - Tracks results to avoid showing same word twice

5. **Length Filtering**
   - Skip short words (2-3 chars)
   - Reduces noise

---

## What's Missing (For Our Advanced Version)

### ❌ Gaps

1. **No Offline Capability**
   - Requires network for Wiktionary
   - Not PWA-compatible

2. **No Combinatorial Pruning**
   - Generates ALL permutations first
   - Then validates (wasteful)
   - Should prune invalid combinations early

3. **No Semantic Analysis**
   - Binary: word exists or doesn't
   - No relevance scoring
   - No contextual meaning
   - No clustering

4. **No Root-Based Validation**
   - Doesn't check morphological validity
   - No שורש (root) + בניין (pattern) logic

5. **No Embeddings**
   - No word vectors
   - No semantic similarity
   - No latent space representation

6. **No Clustering**
   - All results flat
   - No thematic grouping
   - No semantic directions

7. **Performance Issues**
   - O(n!) complexity with no optimization
   - For 10 letters: 3,628,800 permutations
   - API call per permutation = very slow

8. **Limited Dictionary**
   - Only Wiktionary (incomplete)
   - No Biblical Hebrew
   - No names/places
   - No Modern Hebrew slang

---

## What We Can Reuse

### 🔄 Reusable Components

#### 1. **UI Framework** (60% reusable)
```javascript
// Input management
function addInputBox() { ... }          // ✅ Reuse as-is
function transformFinalLetters() { ... } // ✅ Reuse as-is

// Virtual keyboard
const hebrewLetters = [...]             // ✅ Reuse layout
function createVirtualKeyboard() { ... } // ✅ Reuse with modifications
```

#### 2. **Core Permutation Algorithm** (70% reusable)
```javascript
function permute(chars, length, prefix) // ✅ Keep core logic
                                        // ⚠️ Add pruning
                                        // ⚠️ Add early termination
```

#### 3. **Final Letter Mapping** (100% reusable)
```javascript
const finalToNonFinal = {
    'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ'
};
```

#### 4. **UI State Management** (80% reusable)
```javascript
let isRunning = false;          // ✅ Reuse pattern
function updateStatusIndicator() // ✅ Reuse
function stopSearch()           // ✅ Reuse
function downloadResults()      // ✅ Extend with JSON/CSV
```

---

## Recommendations for Our Implementation

### Phase 1: Port Basic Version (Week 1)
**Goal**: Working basic permutation tool

1. **Copy UI components**:
   - `permutations.html` → `tsirufim.html`
   - Virtual keyboard
   - Input management
   - Final letter handling

2. **Replace dictionary**:
   - Remove Wiktionary API
   - Load local Hebrew dictionary (JSON)
   - Use IndexedDB for offline storage

3. **Optimize permutation**:
   - Add dictionary lookup during generation
   - Prune invalid branches early
   - Use Web Worker for non-blocking

**Result**: Basic offline anagram solver (~2 days work)

---

### Phase 2: Add Combinatorial Optimization (Week 2)
**Goal**: Fast permutation with intelligent pruning

1. **Implement trie data structure**:
   - Store dictionary as prefix tree
   - O(1) validity check during generation
   - Only explore valid prefixes

2. **Add morphological validation**:
   - Root extraction (שורש identification)
   - Pattern matching (בניין validation)
   - Reject impossible combinations

3. **Gematria bounds**:
   - Filter by reasonable gematria range
   - Precompute value during generation

**Result**: 10-100x faster generation (~3 days work)

---

### Phase 3: Embedding System (Week 3-4)
**Goal**: Semantic representation of words

1. **Acquire/train embeddings**:
   ```javascript
   // Option A: Use pre-trained
   const embedding = await loadFastTextHebrew('word');

   // Option B: Train on Tanakh
   const model = trainWord2Vec(tanakhWords, {
       dimensions: 100,
       window: 5,
       minCount: 2
   });
   ```

2. **Root-based features**:
   ```javascript
   function extractRootFeatures(word) {
       const root = identifyRoot(word);    // שורש
       const binyan = identifyBinyan(word); // בניין
       return {
           root_vector: rootEmbeddings[root],
           binyan_vector: binyanEmbeddings[binyan],
           morphology: analyzeMorphology(word)
       };
   }
   ```

3. **Symbolic features**:
   ```javascript
   function addSymbolicFeatures(word, embedding) {
       return {
           ...embedding,
           gematria_standard: calculateGematria(word),
           gematria_reduced: calculateGematriaReduced(word),
           pos_likelihood: estimatePOS(word),
           temporal_signal: detectTemporalMarkers(word)
       };
   }
   ```

**Result**: Every word has 100-200 dimensional vector (~1-2 weeks work)

---

### Phase 4: Contextual Scoring (Week 5)
**Goal**: Relevance to original situation

1. **Situation embedding**:
   ```javascript
   function createSituationEmbedding(originalWords) {
       const vectors = originalWords.map(w => getEmbedding(w));
       return meanVector(vectors); // Centroid
   }
   ```

2. **Relevance scorer**:
   ```javascript
   function scoreRelevance(candidateWord, situationEmbed, otherWords) {
       const wordEmbed = getEmbedding(candidateWord);

       // Cosine similarity to situation
       const situationScore = cosineSimilarity(wordEmbed, situationEmbed);

       // Coherence with other found words
       const coherenceScore = meanCosineSimilarity(
           wordEmbed,
           otherWords.map(w => getEmbedding(w))
       );

       // Semantic drift penalty
       const driftPenalty = distance(wordEmbed, situationEmbed) > 0.7 ? 0.5 : 1.0;

       return situationScore * 0.6 + coherenceScore * 0.4 * driftPenalty;
   }
   ```

3. **Event-type anchors**:
   ```javascript
   const eventAnchors = {
       conflict: meanVector(['מלחמה', 'קרב', 'ריב']),
       movement: meanVector(['הלך', 'בוא', 'יצא']),
       judgment: meanVector(['משפט', 'דין', 'צדק']),
       union: meanVector(['חתן', 'כלה', 'ברית'])
   };

   function matchEventType(word) {
       const embed = getEmbedding(word);
       return Object.entries(eventAnchors).map(([type, anchor]) => ({
           type,
           score: cosineSimilarity(embed, anchor)
       }));
   }
   ```

**Result**: Scored, ranked results by relevance (~1 week work)

---

### Phase 5: Clustering & Visualization (Week 6-7)
**Goal**: Discover semantic patterns

1. **Clustering**:
   ```javascript
   // Using ML.js HDBSCAN
   import { HDBSCAN } from 'ml-hdbscan';

   function clusterResults(words, embeddings) {
       const clusterer = new HDBSCAN({
           minClusterSize: 3,
           minSamples: 2
       });

       const clusters = clusterer.fit(embeddings);

       return {
           labels: clusters.labels,
           clusterCount: Math.max(...clusters.labels) + 1,
           noise: clusters.labels.filter(l => l === -1).length
       };
   }
   ```

2. **Semantic directions**:
   ```javascript
   function extractSemanticDirections(cluster) {
       // PCA on cluster embeddings
       const pca = new PCA(cluster.embeddings);
       const components = pca.getEigenvectors();

       return {
           primary: components[0],    // Dominant direction
           secondary: components[1],  // Second strongest
           variance: pca.getExplainedVariance()
       };
   }
   ```

3. **D3.js Visualization**:
   ```javascript
   function visualizeSemanticSpace(words, embeddings, clusters) {
       // Project to 2D with t-SNE or UMAP
       const projected = tsne(embeddings, { dimensions: 2 });

       // D3.js scatter plot
       const svg = d3.select('#semantic-space')
           .append('svg')
           .attr('width', 800)
           .attr('height', 600);

       svg.selectAll('circle')
           .data(projected)
           .enter()
           .append('circle')
           .attr('cx', d => d[0] * 400 + 400)
           .attr('cy', d => d[1] * 300 + 300)
           .attr('r', 5)
           .attr('fill', d => clusterColors[clusters[d.index]])
           .on('mouseover', showWordTooltip);

       // Draw cluster boundaries
       // Draw semantic direction arrows
   }
   ```

**Result**: Interactive semantic explorer (~2 weeks work)

---

## Technical Specifications

### Required Libraries

```json
{
  "dependencies": {
    "ml.js": "^6.0.0",              // Machine learning (clustering, PCA)
    "tensorflow.js": "^4.0.0",      // Neural networks (embeddings)
    "d3": "^7.0.0",                 // Visualization
    "numeric": "^1.2.6",            // Linear algebra
    "compromise": "^14.0.0"         // NLP utilities (optional)
  }
}
```

### Data Requirements

1. **Hebrew Dictionary** (5-10 MB)
   - Biblical Hebrew (~8,000 words)
   - Modern Hebrew (~50,000 words)
   - Names/places (~5,000 entries)
   - Format: JSON with definitions

2. **Word Embeddings** (20-50 MB)
   - FastText Hebrew (pre-trained): 300 dimensions
   - Tanakh Word2Vec: 100 dimensions
   - Root embeddings: 50 dimensions
   - Format: Binary or JSON

3. **Morphological Data** (2-5 MB)
   - Root-pattern mappings (שורש-משקל)
   - Binyan rules
   - Prefix/suffix tables
   - Format: JSON

### Performance Targets

| Metric | Target | Current (Basic) |
|--------|--------|-----------------|
| Permutation generation | 10,000/sec | 1,000/sec |
| Dictionary lookup | O(1) | O(n) API call |
| Embedding lookup | <1ms | N/A |
| Clustering (1000 words) | <5 sec | N/A |
| Visualization render | <2 sec | N/A |
| Memory usage | <100 MB | <10 MB |

---

## Integration with Our Database

### Leverage Existing Infrastructure

```javascript
// Use our character-level DB
async function generateFromVerse(book, chapter, verse) {
    const context = await getVerseContext(book, chapter, verse);
    const consonants = context.verse.verse_text_consonantal;

    // Generate permutations
    const words = await generatePermutations(
        consonants.split(''),
        { minLength: 3, maxLength: 8 }
    );

    // Score against verse context
    const situationEmbed = await createSituationEmbedding(
        context.words.map(w => w.word_text_consonantal)
    );

    const scored = words.map(w => ({
        word: w,
        relevance: scoreRelevance(w, situationEmbed, context.words),
        gematria: calculateGematria(w)
    }));

    return scored.sort((a, b) => b.relevance - a.relevance);
}
```

---

## Summary: What to Build

### MVP (Minimum Viable Product) - 2 weeks
1. Port basic UI from JerusalemHills
2. Offline dictionary (IndexedDB)
3. Optimized permutation with pruning
4. Working tsirufim.html page

### Enhanced Version - 4 weeks
5. Hebrew word embeddings
6. Contextual scoring
7. Basic clustering

### Full Vision - 8 weeks
8. Advanced semantic analysis
9. Interactive D3.js visualization
10. Integration with all tools (ELS, Gematria, etc.)

---

## Code Reuse Strategy

### Keep from JerusalemHills:
- ✅ Virtual Hebrew keyboard (100%)
- ✅ Input box management (100%)
- ✅ Final letter mapping (100%)
- ✅ UI state management (80%)
- ✅ Core permutation algorithm (70%)

### Replace/Enhance:
- ❌ Wiktionary API → Offline dictionary
- ❌ Simple validation → Morphological + Semantic
- ❌ Flat results → Clustered + Scored
- ❌ No visualization → D3.js semantic space

### Add New:
- ➕ Word embeddings system
- ➕ Root-based analysis
- ➕ Contextual scoring engine
- ➕ Clustering algorithms
- ➕ Semantic visualization
- ➕ Integration with Bible database

---

## Next Steps

1. **Immediate**: Copy `permutations.html` → `tsirufim.html`
2. **Week 1**: Build offline dictionary loader
3. **Week 2**: Optimize permutation engine
4. **Week 3**: Research Hebrew embedding sources
5. **Week 4**: Implement scoring system
6. **Week 5**: Add clustering
7. **Week 6**: Build visualization
8. **Week 7**: Integration testing
9. **Week 8**: Polish and documentation

---

*Analysis completed: 2026-01-12*
*Source code: https://github.com/JerusalemHills/jerusalemhills.github.io*
