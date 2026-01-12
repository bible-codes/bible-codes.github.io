# Reusable Components from JerusalemHills Tsirufim

## Quick Reference: What to Copy

### 🟢 Copy As-Is (100% Reusable)

#### 1. Final Letter Normalization
```javascript
// File: engines/tsirufim/hebrew-utils.js
const finalToNonFinal = {
    'ם': 'מ',
    'ן': 'נ',
    'ץ': 'צ',
    'ף': 'פ',
    'ך': 'כ'
};

function transformFinalLetters(input) {
    return input.replace(/[םןץףך]/g, char => finalToNonFinal[char]);
}
```

**Why**: Essential for Hebrew text processing. Works perfectly.

---

#### 2. Hebrew Virtual Keyboard Layout
```javascript
// File: ui/hebrew-keyboard.js
const hebrewLetters = [
    ['ק', 'ר', 'א', 'ט', 'ו', 'נ', 'ם', 'פ'],
    ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
    ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ']
];
```

**Why**: Standard QWERTY-Hebrew layout. User-tested.

---

### 🟡 Adapt (70-80% Reusable)

#### 3. Input Box Management
```javascript
// File: ui/input-manager.js
// COPY: Basic structure
function addInputBox() {
    const container = document.getElementById("input-container");
    const row = document.createElement("div");
    row.className = "input-row";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter Hebrew letters";

    const addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.onclick = addInputBox;

    const removeButton = document.createElement("button");
    removeButton.textContent = "-";
    removeButton.onclick = () => container.removeChild(row);

    row.appendChild(input);
    row.appendChild(addButton);
    row.appendChild(removeButton);
    container.appendChild(row);
}

// ENHANCE: Add data binding for reactive updates
```

**Changes needed**:
- Add Vue/React reactivity (optional)
- Connect to our state management
- Add validation feedback

---

#### 4. Virtual Keyboard Component
```javascript
// File: ui/hebrew-keyboard.js
// COPY: Core structure (lines 218-304 from app.js)
function createVirtualKeyboard() {
    const keyboardContainer = document.createElement("div");
    keyboardContainer.id = "virtual-keyboard";

    // ... (copy full implementation)

    return keyboardContainer;
}

// ENHANCE: Make it a reusable component
export class HebrewKeyboard {
    constructor(targetInputSelector) {
        this.target = document.querySelector(targetInputSelector);
        this.element = createVirtualKeyboard();
    }

    mount(parentElement) {
        parentElement.appendChild(this.element);
    }
}
```

**Changes needed**:
- Modularize as ES6 class
- Add customization options (layout, theme)
- Make it work with any input field

---

#### 5. Core Permutation Algorithm
```javascript
// File: engines/tsirufim/permutations.js
// COPY: Basic recursive algorithm
function permute(chars, length, prefix = "") {
    if (prefix.length === length) return [prefix];
    const permutations = [];
    for (let i = 0; i < chars.length; i++) {
        const newChars = chars.slice(0, i).concat(chars.slice(i + 1));
        permutations.push(...permute(newChars, length, prefix + chars[i]));
    }
    return permutations;
}

// ENHANCE: Add pruning and optimization
function permuteOptimized(chars, length, dictionary, prefix = "") {
    if (prefix.length === length) {
        return dictionary.has(prefix) ? [prefix] : [];
    }

    const permutations = [];
    for (let i = 0; i < chars.length; i++) {
        const testPrefix = prefix + chars[i];

        // ✅ OPTIMIZATION: Early pruning
        if (!dictionary.hasPrefix(testPrefix)) continue;

        const newChars = chars.slice(0, i).concat(chars.slice(i + 1));
        permutations.push(...permuteOptimized(newChars, length, dictionary, testPrefix));
    }
    return permutations;
}
```

**Changes needed**:
- Add dictionary-based pruning (10-100x speedup)
- Move to Web Worker for non-blocking
- Add progress callbacks
- Implement generator for memory efficiency

---

#### 6. State Management Pattern
```javascript
// File: engines/tsirufim/state.js
// COPY: Basic pattern
let state = {
    isRunning: false,
    results: [],
    currentProgress: 0
};

function updateStatusIndicator(status) {
    const indicator = document.getElementById("status-indicator");
    indicator.innerHTML = `Status: <span class="${status ? 'running' : 'stopped'}">${status ? 'Running' : 'Stopped'}</span>`;
}

// ENHANCE: Use modern state management
class TsirufimState {
    constructor() {
        this.isRunning = false;
        this.results = [];
        this.progress = 0;
        this.listeners = [];
    }

    setState(updates) {
        Object.assign(this, updates);
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => this.listeners = this.listeners.filter(l => l !== listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this));
    }
}
```

**Changes needed**:
- Add proper state management (Vuex/Redux or custom)
- Persist state to localStorage/IndexedDB
- Add undo/redo capability

---

### 🔴 Replace Completely (0% Reusable)

#### 7. Dictionary Validation
```javascript
// ❌ DON'T USE: Wiktionary API (slow, network-dependent)
async function searchWiktionary(term) {
    const url = `https://he.wiktionary.org/w/api.php?...`;
    // ... slow API call
}

// ✅ USE: Offline dictionary with trie structure
class HebrewDictionary {
    constructor(words) {
        this.trie = this.buildTrie(words);
        this.definitions = new Map(words.map(w => [w.word, w.definition]));
    }

    buildTrie(words) {
        const root = {};
        for (const {word} of words) {
            let node = root;
            for (const char of word) {
                if (!node[char]) node[char] = {};
                node = node[char];
            }
            node.$end = true;
        }
        return root;
    }

    has(word) {
        let node = this.trie;
        for (const char of word) {
            if (!node[char]) return false;
            node = node[char];
        }
        return node.$end === true;
    }

    hasPrefix(prefix) {
        let node = this.trie;
        for (const char of prefix) {
            if (!node[char]) return false;
            node = node[char];
        }
        return true; // Prefix exists in trie
    }

    getDefinition(word) {
        return this.definitions.get(word);
    }
}

// Load from IndexedDB
const dictionary = await loadDictionary();
```

**Why replace**:
- API calls are slow (1 per word = thousands of requests)
- Requires network
- Not PWA-compatible
- No prefix checking for pruning

**New approach**:
- Pre-load dictionary into IndexedDB
- Use trie for O(1) prefix checking
- 100% offline
- 10-100x faster

---

### 🆕 Add New Components (Not in Original)

#### 8. Word Embeddings System
```javascript
// File: engines/tsirufim/embeddings.js
class HebrewEmbeddings {
    constructor() {
        this.vectors = new Map();
        this.dimension = 100;
    }

    async load(source) {
        if (source === 'fasttext') {
            this.vectors = await loadFastTextHebrew();
        } else if (source === 'tanakh') {
            this.vectors = await loadTanakhWord2Vec();
        }
    }

    getVector(word) {
        if (this.vectors.has(word)) {
            return this.vectors.get(word);
        }

        // Fallback: average of character embeddings
        return this.approximateVector(word);
    }

    cosineSimilarity(word1, word2) {
        const v1 = this.getVector(word1);
        const v2 = this.getVector(word2);
        return dotProduct(v1, v2) / (norm(v1) * norm(v2));
    }
}
```

---

#### 9. Contextual Scoring Engine
```javascript
// File: engines/tsirufim/scoring.js
class RelevanceScorer {
    constructor(embeddings, situationWords) {
        this.embeddings = embeddings;
        this.situationEmbed = this.createSituationEmbedding(situationWords);
    }

    createSituationEmbedding(words) {
        const vectors = words.map(w => this.embeddings.getVector(w));
        return meanVector(vectors);
    }

    score(candidateWord, context = {}) {
        const wordEmbed = this.embeddings.getVector(candidateWord);

        // 1. Similarity to original situation
        const situationScore = this.embeddings.cosineSimilarity(
            candidateWord,
            this.situationWords
        );

        // 2. Coherence with other results
        const coherenceScore = context.otherWords
            ? meanCosineSimilarity(wordEmbed, context.otherWords.map(w => this.embeddings.getVector(w)))
            : 0;

        // 3. Event-type matching
        const eventScore = this.matchEventType(candidateWord);

        return {
            total: situationScore * 0.6 + coherenceScore * 0.3 + eventScore * 0.1,
            breakdown: { situationScore, coherenceScore, eventScore }
        };
    }

    matchEventType(word) {
        const eventAnchors = {
            conflict: ['מלחמה', 'קרב', 'ריב'],
            movement: ['הלך', 'בוא', 'יצא'],
            judgment: ['משפט', 'דין', 'צדק']
        };

        // Find best matching event type
        // Return similarity score
    }
}
```

---

#### 10. Clustering System
```javascript
// File: engines/tsirufim/clustering.js
import { HDBSCAN } from 'ml-hdbscan';

class SemanticClusterer {
    cluster(words, embeddings) {
        const clusterer = new HDBSCAN({
            minClusterSize: 3,
            minSamples: 2
        });

        const labels = clusterer.fit(embeddings);

        return {
            clusters: this.groupByLabel(words, labels),
            noise: words.filter((_, i) => labels[i] === -1),
            directions: this.extractDirections(embeddings, labels)
        };
    }

    extractDirections(embeddings, labels) {
        const uniqueLabels = [...new Set(labels)].filter(l => l !== -1);

        return uniqueLabels.map(label => {
            const clusterEmbeds = embeddings.filter((_, i) => labels[i] === label);
            const pca = new PCA(clusterEmbeds);

            return {
                label,
                primaryAxis: pca.getEigenvectors()[0],
                variance: pca.getExplainedVariance()[0]
            };
        });
    }
}
```

---

## File Organization Plan

```
engines/tsirufim/
├── hebrew-utils.js          // ✅ Final letters (copy as-is)
├── permutations.js          // 🟡 Core algorithm (adapt)
├── dictionary.js            // 🔴 New trie-based system
├── embeddings.js            // 🆕 Word vectors
├── scoring.js               // 🆕 Relevance scoring
├── clustering.js            // 🆕 Semantic clustering
└── worker.js                // 🆕 Web Worker for async

ui/
├── hebrew-keyboard.js       // 🟡 Virtual keyboard (adapt)
├── input-manager.js         // 🟡 Input boxes (adapt)
├── tsirufim-view.js         // 🆕 Main UI component
└── semantic-viz.js          // 🆕 D3.js visualization

data/embeddings/
├── hebrew-fasttext.vec      // 🆕 Pre-trained vectors
├── tanakh-w2v.json          // 🆕 Tanakh-specific
└── dictionary.json          // 🔴 Offline dictionary
```

---

## Implementation Priority

### Sprint 1: Basic Port (Week 1)
1. ✅ Copy final letter utils
2. ✅ Copy keyboard layout
3. 🟡 Adapt input management
4. 🔴 Build offline dictionary
5. 🟡 Optimize permutation algorithm

### Sprint 2: Offline & Fast (Week 2)
6. 🔴 Implement trie dictionary
7. 🔴 Add pruning to permutations
8. 🟡 Move to Web Worker
9. 🟡 Add progress tracking

### Sprint 3: Semantics (Week 3-4)
10. 🆕 Load Hebrew embeddings
11. 🆕 Build scoring engine
12. 🆕 Add contextual features

### Sprint 4: Visualization (Week 5-6)
13. 🆕 Implement clustering
14. 🆕 Build D3.js semantic space
15. 🆕 Add interactive exploration

---

## Summary

| Component | Reusability | Action | Effort |
|-----------|-------------|--------|--------|
| Final letter mapping | 100% | Copy as-is | 5 min |
| Keyboard layout | 100% | Copy as-is | 5 min |
| Virtual keyboard UI | 80% | Adapt | 2 hours |
| Input management | 70% | Adapt | 3 hours |
| Core permutation | 70% | Adapt + optimize | 1 day |
| State management | 60% | Adapt pattern | 4 hours |
| Dictionary system | 0% | Build new | 2 days |
| Embeddings | 0% | Build new | 3 days |
| Scoring | 0% | Build new | 2 days |
| Clustering | 0% | Build new | 3 days |
| Visualization | 0% | Build new | 3 days |

**Total Effort**: ~3-4 weeks for full implementation

---

*Last updated: 2026-01-12*
