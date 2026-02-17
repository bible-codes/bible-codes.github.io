# Hebrew Bible Analysis Suite - Implementation Plan

---

## 📋 **IMPORTANT: Session-to-Session Progress Tracking**

**For detailed implementation progress, completed features, and next steps, see:**
### → **[PROGRESS.md](./PROGRESS.md)** ←

This file tracks:
- ✅ Completed features (what's already done)
- 🟡 In-progress features (what's being worked on)
- ⏳ Pending features (what's next)
- File inventory with status indicators
- Code snippets for common operations
- Session notes and observations

**Always check PROGRESS.md first when resuming work to avoid duplicating effort.**

---

## Project Overview

**Target**: Unified GitHub Pages site (`bible-codes.github.io`) running entirely in browser with no server backend.

**Philosophy**: Character-level canonical database with derived views for all analysis modes (ELS, gematria, notarikon, letter counts, cantillation variants).

---

## Current Status

### Active Components 🔴
- **ELS Bible Codes Search** (`bible-codes.html`)
  - Three modes: Index Lookup, Full Scan (default), Dictionary
  - **N-Term Scan** (up to 8 terms) with smallest-cluster ranking
  - **Batch Term Loader**: Upload .txt files or paste lists, auto-clean Hebrew names
  - **Unified Search**: One Search button handles manual + batch terms, auto-clusters
  - Sliding window cluster discovery algorithm (O(M log M))
  - Verse attribution from Torah character database (5 books)
  - **Verse Hover**: Tooltip shows full verse text, glow highlights letters in matrix
  - 8-color matrix with cell tooltips showing verse references
  - **3D Matrix View**: Three.js WebGL renderer with auto-rotate, raycasting tooltips
  - **WRR 1994 Demo** (planned): One-click replication of famous rabbi name-date experiment
  - Default skip range: ±500
  - Session save/load, JSON export, PNG matrix download
  - Service worker for offline caching, PWA support
- **Hebrew Text Search** (`text-search.html`)
  - Pattern matching with regex support
  - First/last letter filtering
  - Auto-suggestions
  - Consonantal and full text modes
- **Gematria Calculator** (`gematria.html`)
  - Multiple calculation methods (standard, reduced, ordinal)
  - Search by value or range
  - Find matching words
  - Statistical analysis
- **Acronym/Notarikon** (`acronym.html`)
  - First letters (Roshei Teivot), Last letters (Sofei Teivot)
  - Middle letters and alternating patterns
  - Search by acronym
  - Book-wide analysis

### Repositories
- **bible-codes.github.io**: Pure client-side JS app for ELS searches ([GitHub](https://github.com/bible-codes/bible-codes.github.io))
- **bible-data-science.github.io**: Multi-file repo with Jupyter notebooks, HTML utilities (BCApp.html, heb-ocr.html, igeret.html, qa.html) ([GitHub](https://github.com/roni762583/bible-data-science.github.io))
- **torah-codes/**: Python-based ELS search engine (copied into this repo)

---

## Unified Site Requirements

### Core Functionalities to Implement

#### 1. Hebrew Bible Text Search 🔴
- Standard text search (keyword/phrase)
- Verse lookup by book/chapter/verse
- Advanced search (first/last letter anywhere, pattern search)
- Letter and word counts per verse
- Auto-suggestions and regex support

#### 2. Numeric Analysis 🔴
- Gematria calculation by multiple methods:
  - Standard (א=1, ב=2, ..., ת=400)
  - Reduced (sum of digits)
  - Ordinal (א=1, ב=2, ..., ת=22)
- Search verses/words by gematria value
- Range search and statistical analysis

#### 3. Acronym/Notarikon Tools 🔴
- Extract first/last letters of each word (Roshei/Sofei Teivot)
- Build acronym/abbreviation analysis interface
- Pattern detection and combinations
- Search by acronym, book-wide analysis

#### 4. Tsirufim - Semantic Permutation Analysis 🟢
**צירופים** - Advanced Hebrew letter permutation with semantic clustering

**Problem Statement**: In Hebrew, letters composing words that describe a situation can recombine to spell out details related to those situations and real-life events. The challenge: massive combinatorial explosion, semantic relevance scoring, and extracting meaningful patterns.

**Reference Implementation**: [JerusalemHills Permutations](https://jerusalemhills.com/games/permutations/permutations.html) ([GitHub](https://github.com/JerusalemHills/jerusalemhills.github.io))

**Technical Approach**:

##### Phase 1: Combinatorial Space Reduction (Hard Constraints)
- **Dictionary validation**: Biblical, Modern Hebrew, names, places
- **Morphological validity**: Root-pattern (שורש-משקל) compatibility
- **Orthographic plausibility**: Consonantal constraints
- **Gematria bounds**: Filter extreme outliers
- **Output**: Finite candidate set from infinite possibilities

##### Phase 2: Latent Space Embedding
Each candidate word mapped to vector space using:

1. **Distributional Embeddings** (modern NLP)
   - Pre-trained Hebrew word embeddings (Tanakh, Rabbinic, Modern)
   - FastText/Word2Vec for rare word approximations
   - Contextual embeddings (BERT-Hebrew) for polysemy

2. **Root-Based Semantic Vectors** (Hebrew-specific)
   - Decompose: word → שורש (root) + בניין (binyan) + morphology
   - Feature vectors capture conceptual gravity
   - Superior to surface forms for Hebrew

3. **Symbolic Feature Extensions**
   - Gematria values (standard, reduced, ordinal)
   - POS tags / named-entity likelihood
   - Temporal/agent/action signals
   - Textual domain (legal, narrative, prophetic)
   - Concatenated/projected feature space

##### Phase 3: Contextual Scoring
Score candidates **relative to original situation**:

- **Cosine similarity** to:
  - Situation embedding (mean of original words)
  - Event-type anchors (conflict, movement, judgment, union, exile)
- **Semantic drift penalty**: Penalize distance from context
- **Coherence boost**: Reward alignment with other generated words
- **Output**: Relevance score (not truth value)

##### Phase 4: Clustering & Semantic Directions
- **Clustering**: HDBSCAN / spectral clustering on embeddings
- Each cluster ≈ **thematic attractor**
- **Principal directions** per cluster:
  - Dominant semantic axes
  - Action vs agent dimensions
  - Outcome vs cause relationships
  - Moral / legal / physical orientations
- **Output**: Navigable semantic attractors

##### Phase 5: Interpretation Layer
Not predictive, but **exploratory**:
- Recurrent narrative shapes
- Conceptual continuations
- Symbolic affordances of letter sets
- Quantified midrashic exploration

**Why This Works for Hebrew**:
- Root system provides natural semantic scaffolding
- Consonantal text reduces dimensionality
- Rich morphology = structured feature space
- Gematria adds numerical constraint layer

**Implementation Stack**:
- **Permutation engine**: Client-side combinatorics with pruning
- **Embeddings**: Pre-computed Hebrew word2vec/FastText
- **Clustering**: ML.js or TensorFlow.js for browser-based clustering
- **Visualization**: D3.js for semantic space exploration
- **Dictionary**: Preloaded Biblical + Modern Hebrew lexicon

**Integration with Existing Database**:
- Character-level DB provides source text
- Word-level data for morphological analysis
- Gematria values pre-computed
- Cross-reference to original verse contexts

#### 5. ELS (Bible Codes) 🔴
- Implemented in bible-codes.html with three modes:
  - **Index Lookup**: Instant proximity search from precomputed index (51K words, 42M occurrences)
  - **Full Scan** (default tab): Real-time N-term ELS search (up to 8 terms) with cluster ranking
  - **Dictionary**: Browse 260K Hebrew words, click to search
- **Batch Term Loader**: Upload .txt files or paste term lists, auto-clean Hebrew names (strip ranks, punctuation, parenthetical notes)
- **Unified Search**: Single Search button merges manual inputs + batch terms, deduplicates, scans all
- **N-Term Cluster Discovery**: Sliding window algorithm finds smallest bounding regions containing all search terms
- **Verse Attribution**: Torah character database provides book/chapter/verse for every ELS hit
- **Verse Hover**: Hovering a verse in the legend shows full verse text tooltip + glow highlights its letters in matrix
- **8-Color Matrix**: Multi-term visualization with tooltips
- **3D Matrix View**: Three.js WebGL rendering with OrbitControls, auto-rotate, raycasting tooltips, auto-optimal dimensions
- **WRR 1994 Experiment Demo** (planned): One-click replication of the famous 32-rabbi name-date experiment on Genesis
- **Session Persistence**: Save/load scan results, JSON export, PNG matrix download
- **Default skip range**: ±500

#### 6. Cross-Reference Linking 🟢
- Reference index of where verses appear in Talmud, Midrash, Zohar
- Link via Sefaria API or locally stored index data
- Direct links to Sefaria pages

#### 7. Offline & PWA Features 🔴
- Service worker caching (already implemented)
- Manifest + icons for installable Progressive Web App (already implemented)
- IndexedDB for large datasets (to be implemented)

---

## Architecture & Technology Stack

### Core Design Decision
**Canonical unit = single Unicode character occurrence in Tanach**

All other features (words, verses, gematria, ELS, acronyms, taamim, alt-taamim) become **derived views** over this base table.

### Storage Technology
- **IndexedDB** (primary) for large datasets, indexed queries, persistent offline storage
- **Fallback**: Preloaded compressed JSON → IndexedDB on first run
- **Service Worker**: Cache essential pages and data for offline use

### Framework
- Vanilla JS or lightweight UI framework (React/Vue compiled statically)
- Suitable for GitHub Pages + PWA
- Web Workers for heavy searches (ELS, full text filter)

---

## Character-Level Database Schema

### Character Table (`chars` store)

Each row = **one Hebrew base letter occurrence**

```javascript
{
  id: INTEGER,                  // global ordinal index, 0..~304,805
  book: SMALLINT,               // 1..24
  chapter: SMALLINT,
  verse: SMALLINT,
  verse_char_index: SMALLINT,   // 0-based within verse
  word_index: SMALLINT,         // 0-based within verse
  char_index_in_word: SMALLINT, // 0-based

  base_char: CHAR(1),           // א–ת only
  final_form: BOOLEAN,          // ך ם ן ף ץ

  niqqud: STRING,               // concatenated combining marks
  taamim: STRING,               // primary cantillation marks
  alt_taamim: STRING,           // sparse; only where variant exists

  has_niqqud: BOOLEAN,
  has_taamim: BOOLEAN,
  has_alt_taamim: BOOLEAN,

  gematria_standard: SMALLINT,
  gematria_reduced: SMALLINT,
  gematria_ordinal: SMALLINT,

  word_id: INTEGER,             // foreign key
  verse_id: INTEGER             // foreign key
}
```

**Notes**:
- Niqqud and taamim stored as **raw Unicode combining sequences** (order preserved)
- Alternate cantillation only populated where applicable (e.g., Aseret HaDibrot)
- Gematria values precomputed to accelerate queries

### Word Table (`words`)

```javascript
{
  word_id: INTEGER,
  book: SMALLINT,
  chapter: SMALLINT,
  verse: SMALLINT,
  word_index: SMALLINT,
  word_text_consonantal: STRING,
  word_text_full: STRING,       // with niqqud
  word_length_chars: SMALLINT,
  first_char_id: INTEGER,
  last_char_id: INTEGER,
  gematria_standard: SMALLINT
}
```

### Verse Table (`verses`)

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

### Why This Schema Solves Everything

| Feature | Supported By |
|---------|-------------|
| ELS (skip search) | global `id` |
| First/last letter | `char_index_in_word` |
| Acronyms | `word_index → first_char_id` |
| Final letters | `last_char_id` |
| Letter counts | `COUNT(chars)` |
| Gematria search | precomputed columns |
| Niqqud-aware search | `niqqud` column |
| Taamim-aware analysis | `taamim` |
| Alt cantillation | `alt_taamim` |
| Verse slicing | `verse_id` |
| Word slicing | `word_id` |
| PWA offline | IndexedDB |

This is the **maximally expressive representation** with minimal redundancy.

---

## Data Ingestion Pipeline (Offline Build Step)

This happens **before deployment**, not in browser.

### Inputs
- Masoretic Tanach Unicode text (with niqqud + taamim)
- Alternate cantillation source for Aseret HaDibrot

### Parser Steps
1. Normalize Unicode (NFD)
2. Iterate verse → word → character
3. Split:
   - base letter
   - niqqud combining marks
   - taamim combining marks
4. Assign global ordinal `id`
5. Assign word/verse indices
6. Populate gematria values

### Output
- `chars.json.gz`
- `words.json.gz`
- `verses.json.gz`

Loaded into IndexedDB on first app run.

---

## Client-Side Query Engines (JS Modules)

All engines run **100% client-side** with **no network dependency**. Heavy operations use **Web Workers** to prevent UI blocking.

### Letter Engine
- Query by base letter
- Query by niqqud pattern
- Query by taamim presence/type
- **Implementation**: Direct IndexedDB queries with indices
- **Performance**: Fast (indexed lookups, O(log n))

### Numeric Engine (Gematria)
- Gematria exact/range search
- Reduced/ordinal modes
- Verse or word level aggregation
- **Implementation**: Precomputed values in database
- **Performance**: Very fast (hash table lookups, O(1))

### Acronym/Notarikon Engine
- First letters across words
- Last letters across words
- Mixed strategies
- **Implementation**: IndexedDB query + client-side string ops
- **Performance**: Fast for single verse, medium for book-wide

### ELS Engine ⚡ **Web Worker Required**

**Implementation Status**: Functional in `js/search-algorithms.js` (currently runs on main thread, Web Worker version planned)

**Text Source**: Koren Edition (exact text used by Rips et al., 1994)
- **Total Letters**: 304,805
- **Final Letters**: 20,106 (ך ם ן ף ץ)
- **SHA-256**: `b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226`
- **Validation**: Run `python3 tools/validate-text.py data/`

**Skip Value Conventions** (this implementation):
- **ELS = 0**: Open text (plain sequential reading) - included and labeled distinctly
- **ELS = ±1**: Excluded (redundant with ELS=0)
- **|ELS| ≥ 2**: True equidistant letter sequences (per Rips et al. 1994)

**N-Term Scan with Cluster Ranking**:
- Search up to 8 terms simultaneously across all skip values
- Sliding window cluster discovery: O(M log M) finds smallest bounding regions containing all terms
- Results sorted by span (smallest first), deduplicated, limited to top 200
- Each cluster shows position, skip, and contributing verses for every term
- Click cluster for N-term matrix with 8-color palette + purple overlap
- Session save/load, JSON export, PNG matrix download
- Cancel button for aborting long scans

**Verse Attribution**:
- Character database (5 Torah books) provides book/chapter/verse for each position
- O(1) lookup via array index into `charDatabase[]`
- Loaded lazily on first scan via `loadCharDB()` using DecompressionStream
- Displayed in search results, cluster tags, matrix legend, and cell tooltips

**Algorithm Details**:

1. **Forward Search (skip > 0)**:
   - Iterate each equivalence class (0 to skip-1)
   - Extract sequence: positions p, p+d, p+2d, ... (forward)
   - Apply KMP and Boyer-Moore algorithms
   - Convert sequence positions back to text indices

2. **Backward Search (skip < 0)**:
   - Start from highest position in each equivalence class
   - Extract sequence: positions p, p-|d|, p-2|d|, ... (backward)
   - Apply KMP and Boyer-Moore algorithms
   - Convert sequence positions back to text indices

3. **Open Text (skip = 0)**:
   - Direct KMP search on full text
   - Labeled as "Open Text (ELS=0)" in results
   - Provides reference context for true ELS findings

**Current Implementation**:
- Uses consonantal text only (`base_char`)
- KMP (Knuth-Morris-Pratt) for efficient pattern matching
- Boyer-Moore for additional coverage
- Duplicate detection and merging
- Precomputed hash support for common terms

**Performance**:
- Open text (skip=0): Fast (O(n) via KMP)
- Single skip value: Medium (O(n/skip) per equivalence class)
- Full range (-100 to +100): Medium-slow (~200 skip values × full scan)
- Benefits from precomputed hash tables for common phrases

**Optimization Strategies**:
- Precomputed indices for common skip distances
- Web Worker implementation (planned) for non-blocking UI
- Chunked processing with progress updates
- Hash-based early exit for known patterns

### Text Search Engine ⚡ **Web Worker Recommended**
- Keyword/phrase search
- Pattern matching (regex support)
- First/last letter filtering
- **Implementation**: Web Worker for full-text scans
- **Performance**: Medium (can scan ~300k chars in <1s on desktop)

### Structural Queries
- "Nth letter of Torah"
- "Middle letter of book"
- "All verses with X letters"
- **Implementation**: Direct IndexedDB queries or precomputed metadata
- **Performance**: Very fast (O(1) for indexed queries)

### Web Worker Architecture

```javascript
// Main thread
const elsWorker = new Worker('engines/els.worker.js');
elsWorker.postMessage({ term: 'משה', minSkip: -100, maxSkip: 100 });
elsWorker.onmessage = (e) => {
  displayResults(e.data.matches);
  updateProgress(e.data.progress);
};

// Worker thread (els.worker.js)
self.onmessage = async (e) => {
  const { term, minSkip, maxSkip } = e.data;
  const db = await openIndexedDB();
  const chars = await db.getAll('chars');

  // Heavy computation here (doesn't block UI)
  for (let skip = minSkip; skip <= maxSkip; skip++) {
    const matches = findELS(chars, term, skip);
    self.postMessage({ matches, progress: calculateProgress() });
  }
};
```

This architecture ensures:
- **UI remains responsive** during heavy searches
- **Progress updates** for long operations
- **Cancellable searches** (worker can be terminated)
- **Parallel execution** (multiple workers if needed)

---

## UI/Page Structure

### File Structure
```
/
├── index.html                 # Main dashboard/navigation
├── bible-codes.html          # ELS search tool (existing)
├── text-search.html          # Hebrew text search (planned)
├── gematria.html             # Gematria calculator (planned)
├── acronym.html              # Notarikon tool (planned)
├── letter-analysis.html      # Letter/word analysis (planned)
├── taamim.html               # Cantillation viewer (planned)
├── cross-ref.html            # Cross-references (planned)
├── anagram.html              # Anagram solver (planned)
├── app.js                    # Main application logic
├── sw.js                     # Service worker
├── manifest.json             # PWA manifest
├── styles.css                # Global styles
│
├── data/
│   ├── chars.json.gz         # Character database (all 39 books)
│   ├── words.json.gz         # Word database (all 39 books)
│   ├── verses.json.gz        # Verse database (all 39 books)
│   ├── torahNoSpaces.txt     # Raw Torah text (existing)
│   ├── precomputed-terms.json # ELS precomputed data (existing)
│   └── embeddings/           # Hebrew word embeddings
│       ├── hebrew-fasttext.vec   # Pre-trained FastText
│       ├── tanakh-w2v.json       # Tanakh-specific Word2Vec
│       ├── roots-semantic.json   # Root-based features
│       └── dictionary.json       # Biblical + Modern Hebrew lexicon
│
├── db/
│   ├── schema.js             # IndexedDB schema definitions
│   └── loader.js             # Data loading utilities
│
├── engines/
│   ├── search.js             # Text search engine
│   ├── gematria.js           # Gematria calculations
│   ├── acronym.js            # Acronym/notarikon engine
│   ├── els.worker.js         # ELS search (Web Worker)
│   ├── taamim.js             # Cantillation analysis
│   └── tsirufim/             # Semantic permutation engine
│       ├── permutations.js   # Combinatorial generation
│       ├── embeddings.js     # Hebrew word embeddings
│       ├── scoring.js        # Contextual relevance scoring
│       ├── clustering.js     # Semantic clustering (HDBSCAN)
│       └── visualization.js  # D3.js semantic space viz
│
├── ui/
│   ├── verseView.js          # Verse detail component
│   ├── letterView.js         # Letter analysis component
│   └── elsView.js            # ELS results component
│
├── js/
│   ├── test.js               # Existing ELS utilities
│   ├── load-torah.js         # Torah text loader
│   └── search-algorithms.js   # Search algorithms
│
└── torah-codes/              # Python ELS engine (reference)
```

### Page Mapping

| Page | Backed By | Status |
|------|-----------|--------|
| index.html | Dashboard navigation | 🔴 Active |
| bible-codes.html | ELS search (existing) | 🔴 Active |
| text-search.html | `chars + words` | 🔴 Active |
| gematria.html | `words / verses` | 🔴 Active |
| acronym.html | `words → chars` | 🔴 Active |
| tsirufim.html | Semantic permutations + ML | 🟢 Planned |
| letter-analysis.html | `chars` | 🟢 Planned |
| taamim.html | `chars.taamim` | 🟢 Planned |
| cross-ref.html | External APIs/local index | 🟢 Planned |
| anagram.html | Pattern analysis (legacy) | 🟢 Planned |

---

## Implementation Roadmap

### Phase 1: Foundation ✅ **COMPLETED**
- [x] Move original index.html to bible-codes.html
- [x] Create new unified index.html dashboard
- [x] Create CLAUDE.md implementation plan
- [x] Update service worker references
- [x] Update manifest.json for unified branding
- [x] Update README.md with comprehensive documentation
- [x] Document PWA capabilities and best practices

### Phase 2: Database Infrastructure ✅ **COMPLETED**
- [x] Design IndexedDB schema (db/schema.js)
  - Character-level canonical storage (chars table)
  - Word-level derived data (words table)
  - Verse-level aggregated data (verses table)
  - Metadata tracking (loaded books, app state)
- [x] Create data ingestion scripts (Python)
  - build-database.py with CLI interface
  - Processes all 39 Tanach books
  - Gematria calculations (standard, reduced, ordinal)
- [x] Generate compressed data for all 39 books
  - 117 files (chars, words, verses × 39 books)
  - 630 MB uncompressed → 21 MB compressed (30.3x ratio)
  - ~1.2M characters, ~309K words, ~23K verses
- [x] Implement IndexedDB loader (db/loader.js)
  - Fetch and decompress .gz files
  - Batch insertion with progress tracking
  - Book metadata and load status management
- [x] Create database query utilities (db/query.js)
  - Character queries (by ID, verse, book, range)
  - Word queries (by ID, verse, gematria)
  - Verse queries (by reference, chapter, book)
  - Gematria search (words and verses)
  - Full context retrieval
- [x] Create test interface (test-db.html)
  - Interactive database testing
  - Performance benchmarks
  - Storage quota monitoring

### Phase 3: Core Search Engines ✅ **COMPLETED**
- [x] Implement text search engine (engines/search.js)
  - Text search with regex and pattern matching
  - First/last letter filtering
  - Auto-suggest functionality
  - Consonantal and full text modes
- [x] Implement gematria calculator (engines/gematria.js)
  - Standard, reduced, ordinal methods
  - Search by gematria value
  - Range search
  - Statistical analysis
- [x] Implement acronym/notarikon engine (engines/acronym.js)
  - First letters (Roshei Teivot)
  - Last letters (Sofei Teivot)
  - Middle letters and alternating patterns
  - Pattern analysis and meaningful acronym detection
- [x] Create ELS Web Worker (engines/els.worker.js)
  - Non-blocking background search
  - Progress updates
  - Cancellable searches

### Phase 4: UI Development ✅ **COMPLETED**
- [x] Create text-search.html
  - Hebrew text search interface
  - Search suggestions
  - Multiple search modes
  - Result highlighting
- [x] Create gematria.html
  - Interactive calculator
  - Multi-method calculation
  - Search by value or range
  - Find matching words
- [x] Create acronym.html
  - Extract acronyms from verses
  - Search by acronym pattern
  - Book-wide analysis
  - Multiple extraction methods
- [x] Update index.html dashboard
  - Link to all new tools
  - Updated status indicators

### Phase 5: Advanced Features - 80% COMPLETE
- [x] Matrix view system ✅ **COMPLETE**
- [x] Book view (traditional reader) ✅ **COMPLETE**
- [x] Root extraction system ✅ **COMPLETE**
- [x] Letter analysis engine ✅ **COMPLETE** (UI pending)
- [ ] Letter analysis UI 🔴 **NEXT PRIORITY**
- [ ] Cantillation viewer 🔴 **HIGH PRIORITY** (data ready)
- [ ] Cross-reference linking 🟡 **MEDIUM PRIORITY**
- [ ] Anagram solver 🟢 **LOW PRIORITY** (defer)
- [ ] Web Worker optimization 🟢 **FUTURE**

### Phase 5.5: Tsirufim - Semantic Permutation Engine ✅ **COMPLETE**
**צירופים** - Advanced semantic analysis of Hebrew letter permutations

#### Stage 1: Permutation Infrastructure ✅ **COMPLETE**
- [x] Combinatorial generator with pruning
- [x] Hebrew dictionary loader (Biblical + Modern - 56K words)
- [x] Root-pattern validation engine
- [x] Morphological analyzer
- [x] Gematria filtering system

#### Stage 2: Embedding System ✅ **COMPLETE**
- [x] Pre-compute Hebrew word embeddings
  - [x] Tanakh corpus integration
  - [x] FastText Hebrew support
- [x] Root-based feature extractor
  - [x] Decompose words to שורש + בניין
  - [x] Build semantic feature vectors
- [x] Symbolic feature integration
  - [x] Gematria dimensions
  - [x] POS tags / NER likelihood
  - [x] Temporal/agent/action signals

#### Stage 3: Contextual Scoring Engine ✅ **COMPLETE**
- [x] Situation embedding calculator
- [x] Cosine similarity scorer
- [x] Semantic drift penalty system
- [x] Inter-word coherence booster
- [x] Event-type anchor library

#### Stage 4: Clustering & Visualization ✅ **COMPLETE**
- [x] HDBSCAN clustering implementation (ML.js)
- [x] Principal component analysis per cluster
- [x] Semantic direction extraction
- [x] D3.js interactive visualization
  - [x] 2D/3D embedding space
  - [x] Cluster coloring and labels
  - [x] Interactive filtering
  - [x] Direction vector display

#### Stage 5: UI & Integration ✅ **COMPLETE**
- [x] Create tsirufim.html interface
- [x] Input form for situation description
- [x] Real-time permutation generation
- [x] Score/cluster display
- [x] Semantic space explorer
- [x] Export results to JSON/CSV
- [x] Integration with character database

**Files**: `tsirufim.html` + 5 engine modules (2,209 lines total)
**Status**: FLAGSHIP FEATURE - FULLY OPERATIONAL

### Phase 6: Testing & Optimization
- [ ] Performance testing on mobile/desktop
- [ ] Offline functionality validation
- [ ] Browser compatibility testing
- [ ] IndexedDB quota management
- [ ] Service worker cache optimization

### Phase 7: Documentation & Release
- [ ] Update README with full feature list
- [ ] Create user documentation
- [ ] SEO optimization
- [ ] Generate sitemap
- [ ] Public release announcement

---

## PWA Capabilities & Architecture

### What PWAs Can Do (Fully Supported)

A **PWA can run arbitrary JavaScript calculations fully offline on the device**.

#### Supported Features
- **All client-side JS execution** (same as a normal web app)
- **Heavy computations** (loops, numeric processing, string analysis)
- **Web Workers** for parallel/non-blocking computation (strongly recommended)
- **IndexedDB** for large datasets (tens of MBs)
- **Offline execution** via Service Worker caching
- **WebAssembly (WASM)** (optional) for high-performance compute

#### What "Offline" Means in Practice

Once installed or cached:
- **No network required** - all functionality available without internet
- **All JS runs locally** - computations happen on user's device
- **Data read/write** from IndexedDB / Cache API
- **Deterministic performance** based on device CPU/RAM

### Technical Limits (Important)

#### CPU
- Limited only by device hardware
- Mobile devices slower than desktop
- Heavy searches benefit from Web Workers to prevent UI blocking

#### Memory
- **JS heap**: ~1–2 GB on desktop, much lower on mobile
- **IndexedDB practical limit**: ~50–100 MB (browser-dependent)
- **Mobile constraints**: More aggressive memory limits

#### Browser API Restrictions
- **No filesystem access** beyond browser APIs (IndexedDB, Cache API)
- **No native threads** (Web Workers only)
- **Quota management** varies by browser

### Best Practices for Hebrew Bible Analysis

#### Web Worker Strategy
- Move **ELS searches** to Web Workers (avoid blocking UI)
- Move **full-scan searches** to Web Workers
- Use **dedicated workers** for database queries
- Implement **progress callbacks** for long operations

#### Data Optimization
- **Pre-index data** (ordinal char table) to avoid repeated scans
- **Chunked processing** for long searches (process in batches)
- **Cache results** of expensive queries in IndexedDB
- **Prefer integer operations** over string ops where possible
- **Compress data** before storing (gzip JSON)

#### Memory Management
- **Lazy load** character data (load books on demand)
- **Paginate results** (don't render 1000+ results at once)
- **Release references** to large objects after use
- **Monitor quota** and warn users before limits

#### Performance Optimization
- **Precompute indices**: gematria values, letter positions
- **Binary search** where possible (sorted indices)
- **Hash tables** for O(1) lookups (term → positions)
- **Debounce** user input for search fields
- **Virtualize** long lists (only render visible items)

### PWA vs Normal Web Page

| Capability | Normal Page | PWA | Notes |
|-----------|-------------|-----|-------|
| Offline JS | ❌ | ✅ | Full computation capability offline |
| IndexedDB persistence | ⚠️ | ✅ | Reliable long-term storage |
| Background caching | ❌ | ✅ | Service Worker pre-caches assets |
| Installable | ❌ | ✅ | Add to home screen, runs standalone |
| Worker reliability | ⚠️ | ✅ | Better lifecycle management |
| Push notifications | ❌ | ✅ | (optional, not needed for this app) |

### Architecture Validation

✅ **Our architecture is fully PWA-compatible**:

- **Character-level database**: Can be stored in IndexedDB
- **Gematria calculations**: Run entirely client-side with no network
- **Acronym/Notarikon**: Pure JS string operations
- **ELS searches**: Web Worker implementation for performance
- **Offline-first**: All data and code cached on first visit

### Implementation Strategy

1. **Phase 2**: Build IndexedDB schema, test with Genesis only (~10MB)
2. **Phase 3**: Implement Web Workers for search engines
3. **Phase 4**: Full Tanach data load with quota management
4. **Phase 5**: Performance profiling and optimization
5. **Phase 6**: Mobile device testing and memory tuning

### Bottom Line

A PWA is **fully capable** of running our Hebrew Tanach character-level database, gematria, acronym, and ELS computations **entirely offline on the user's device**. The architecture described is technically sound and aligned with browser capabilities.

---

## Feature Map Summary

| Feature | Page | Client JS | Precomputed Data | PWA | Status |
|---------|------|-----------|-----------------|-----|--------|
| Hebrew text search | ✓ | ✓ | Bible JSON | ✓ | 🟡 Planned |
| Verse lookup | ✓ | ✓ | Bible JSON | ✓ | 🟡 Planned |
| Gematria | ✓ | ✓ | Precomputed table | ✓ | 🟡 Planned |
| Acronym/Notarikon | ✓ | ✓ | n/a | ✓ | 🟡 Planned |
| ELS search | ✓ | ✓ | Precomputed hashes | ✓ | 🔴 Active |
| Tsirufim (צירופים) | ✓ | ✓ + ML.js | Embeddings + Dictionary | ✓ | 🟢 Planned |
| Cross-Reference Links | ✓ | APIs/local index | local JSON | ✓ | 🟢 Planned |
| Letter analysis | ✓ | ✓ | Character DB | ✓ | 🟢 Planned |
| Taamim viewer | ✓ | ✓ | Character DB | ✓ | 🟢 Planned |
| Anagram solver (basic) | ✓ | ✓ | n/a | ✓ | 🟢 Planned |
| Offline/PWA | ✓ | ✓ | n/a | ✓ | 🔴 Active |

---

## Risks & Considerations

### Technical
- Client memory limits affect large text search
  - **Mitigation**: Use compressed indices, incremental loading
- IndexedDB quota limits
  - **Mitigation**: Monitor usage, implement cleanup strategies
- Browser compatibility variations
  - **Mitigation**: Progressive enhancement, fallbacks

### Data
- Cross-reference indices may require licensing
  - **Mitigation**: Use public APIs (Sefaria), provide user-upload option
- Alternate cantillation sources
  - **Mitigation**: Start with primary taamim, add variants incrementally

### Performance
- Large searches on mobile devices
  - **Mitigation**: Web Workers, pagination, optimization

---

## Strategic Notes

This schema is **future-proof**:
- Supports Torah Codes *and* traditional Masorah studies
- Enables academic-grade statistical analysis
- Aligns with Kabbalistic methods without hardcoding mysticism
- Provides the **right abstraction layer** to build once and never regret

---

## Development Guidelines

### Code Style
- ES6+ JavaScript
- Modular architecture
- Clear separation of concerns
- Comprehensive error handling

### Performance
- Lazy loading where possible
- Debounced search inputs
- Virtualized lists for large results
- IndexedDB transaction optimization

### Accessibility
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- RTL support for Hebrew text

### Testing
- Unit tests for core engines
- Integration tests for database operations
- E2E tests for critical user flows
- Performance benchmarks

---

## Contact & Resources

- **Developer**: Aharon (roni762583@gmail.com)
- **GitHub**: [bible-codes/bible-codes.github.io](https://github.com/bible-codes/bible-codes.github.io)
- **Related**: [bible-data-science.github.io](https://github.com/roni762583/bible-data-science.github.io)

---

*Last Updated: 2026-02-17 - Auto-Save, VCR 3D Controls, Full-Viewport Layout, Torah Text Preview*
*Phase Status: 1-4 Complete (100%), Phase 5 (90%), Phase 5.5 Complete (100%)*
*Active Tools: 10 user-facing tools operational*
*Key Additions: Auto-save sessions, VCR-style 3D controls, full-viewport no-scroll layout, Torah text preview in left column*
