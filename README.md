# Hebrew Bible Analysis Suite - Complete Documentation

**Version**: 3.1
**Last Updated**: February 6, 2026
**Status**: Production Ready

---

## Table of Contents

1. [Project History & Vision](#1-project-history--vision)
   - 1.1 [Background](#11-background)
   - 1.2 [Academic Foundation](#12-academic-foundation)
   - 1.3 [Project Goals](#13-project-goals)
   - 1.4 [Development Timeline](#14-development-timeline)

2. [System Overview](#2-system-overview)
   - 2.1 [Architecture](#21-architecture)
   - 2.2 [Technology Stack](#22-technology-stack)
   - 2.3 [File Structure](#23-file-structure)
   - 2.4 [Current Features](#24-current-features)

3. [Methodology & Algorithms](#3-methodology--algorithms)
   - 3.1 [ELS (Equidistant Letter Sequences)](#31-els-equidistant-letter-sequences)
   - 3.2 [Gematria Calculations](#32-gematria-calculations)
   - 3.3 [Acronym/Notarikon Analysis](#33-acronymnotarikon-analysis)
   - 3.4 [Hebrew Root Extraction](#34-hebrew-root-extraction)
   - 3.5 [Tsirufim - Semantic Permutations](#35-tsirufim---semantic-permutations)

4. [Technical Architecture](#4-technical-architecture)
   - 4.1 [Character-Level Database](#41-character-level-database)
   - 4.2 [ELS Index System](#42-els-index-system)
   - 4.3 [Unified Dictionary System](#43-unified-dictionary-system)
   - 4.4 [IndexedDB Storage](#44-indexeddb-storage)

5. [System Operations](#5-system-operations)
   - 5.1 [Installation & Setup](#51-installation--setup)
   - 5.2 [PWA Features](#52-pwa-features)
   - 5.3 [Offline Capabilities](#53-offline-capabilities)
   - 5.4 [Service Worker](#54-service-worker)

6. [User Instructions](#6-user-instructions)
   - 6.1 [ELS Bible Codes Search](#61-els-bible-codes-search)
   - 6.2 [Text Search](#62-text-search)
   - 6.3 [Gematria Calculator](#63-gematria-calculator)
   - 6.4 [Acronym Tool](#64-acronym-tool)
   - 6.5 [Tsirufim Analysis](#65-tsirufim-analysis)
   - 6.6 [Matrix View](#66-matrix-view)
   - 6.7 [Book View](#67-book-view)
   - 6.8 [Dictionary Browser](#68-dictionary-browser)

7. [API Reference](#7-api-reference)
   - 7.1 [Root Extraction API](#71-root-extraction-api)
   - 7.2 [ELS Index API](#72-els-index-api)
   - 7.3 [Dictionary Service API](#73-dictionary-service-api)
   - 7.4 [Database Query API](#74-database-query-api)

8. [Development Guide](#8-development-guide)
   - 8.1 [Local Development](#81-local-development)
   - 8.2 [Building Data Files](#82-building-data-files)
   - 8.3 [Testing](#83-testing)
   - 8.4 [Contributing](#84-contributing)

9. [Recent Changes](#9-recent-changes)
   - 9.1 [February 2026 Updates](#91-february-2026-updates)
   - 9.2 [January 2026 Updates](#92-january-2026-updates)

10. [References](#10-references)

---

## 1. Project History & Vision

### 1.1 Background

The Hebrew Bible Analysis Suite is a comprehensive, browser-based platform for exploring the Hebrew Bible (Tanakh) through multiple analytical lenses. The project combines traditional Torah study tools with modern computational analysis, all running entirely in the browser with full offline capability.

**Project Link**: [bible-codes.github.io](https://bible-codes.github.io/)

**Core Philosophy**: Character-level canonical database with derived views for all analysis modes (ELS, gematria, notarikon, letter counts, cantillation variants).

### 1.2 Academic Foundation

The ELS (Equidistant Letter Sequence) research is based on peer-reviewed academic work:

**Primary Reference**:
> Witztum, Doron, Eliyahu Rips, and Yoav Rosenberg. "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, vol. 9, no. 3, 1994, pp. 429-438.

**Torah Text Source**:
- **Edition**: Koren Edition (exact text used by Rips et al., 1994)
- **Total Letters**: 304,805
- **Final Letters (ךםןףץ)**: 20,106
- **Form**: Ketiv (written form)
- **SHA-256**: `b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226`

**Algorithm References**:
- Knuth, D. E., Morris, J. H., & Pratt, V. R. (1977). "Fast Pattern Matching in Strings." *SIAM Journal on Computing*.
- Boyer, R. S., & Moore, J. S. (1977). "A Fast String Searching Algorithm." *Communications of the ACM*.

### 1.3 Project Goals

| Goal | Importance | Status |
|------|------------|--------|
| Offline-First Architecture | Critical | Complete |
| Character-Level Database | Critical | Complete |
| Multiple Analysis Methods | Critical | 85% Complete |
| Traditional Study Tools | High | Complete |
| Advanced Computational Analysis | High | Complete |
| Mobile-First Responsive Design | High | Complete |
| PWA Installation | Medium | Complete |

### 1.4 Development Timeline

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation & Infrastructure | Complete |
| Phase 2 | Database Infrastructure | Complete |
| Phase 3 | Core Search Engines | Complete |
| Phase 4 | UI Development | Complete |
| Phase 5 | Advanced Features | 85% Complete |
| Phase 5.5 | Tsirufim Semantic Engine | Complete |
| Phase 5.6 | PWA & i18n | Complete |
| Phase 6 | Testing & Optimization | In Progress |
| Phase 7 | Documentation & Release | In Progress |

---

## 2. System Overview

### 2.1 Architecture

```
+---------------------------------------------------------------+
|                      USER'S BROWSER                            |
|                                                                |
|  +---------------+  +---------------+  +---------------+       |
|  |   UI Layer    |  |  Tool Pages   |  |   Service     |       |
|  |   (HTML/CSS)  |  |  (HTML+JS)    |  |   Worker      |       |
|  +-------+-------+  +-------+-------+  +-------+-------+       |
|          |                  |                  |                |
|  +-------+------------------+------------------+--------+      |
|  |              Application Logic (ES6 Modules)         |      |
|  |                                                      |      |
|  |  +----------+  +-----------+  +------------------+  |      |
|  |  |  Search  |  | Gematria  |  |    Tsirufim      |  |      |
|  |  |  Engines |  |  Engine   |  | (Permutations +  |  |      |
|  |  +----------+  +-----------+  |   Clustering)    |  |      |
|  |                               +------------------+  |      |
|  |  +-----------------------------------------------+  |      |
|  |  |          Root Extraction Engine               |  |      |
|  |  |  - Lexicon Lookup (56K words)                 |  |      |
|  |  |  - Morphological Heuristics                   |  |      |
|  |  |  - Binyan Detection                           |  |      |
|  |  +-----------------------------------------------+  |      |
|  |  +-----------------------------------------------+  |      |
|  |  |          ELS Index Service                    |  |      |
|  |  |  - Precomputed occurrences (41.8M)            |  |      |
|  |  |  - Instant proximity lookups                  |  |      |
|  |  |  - Cluster discovery                          |  |      |
|  |  +-----------------------------------------------+  |      |
|  +------------------------------------------------------+      |
|                                                                |
|  +----------------------------------------------------------+  |
|  |                  IndexedDB Storage                        |  |
|  |  +------------+  +------------+  +------------+          |  |
|  |  |   chars    |  |   words    |  |   verses   |          |  |
|  |  |  ~1.2M     |  |  ~309K     |  |  ~23K      |          |  |
|  |  +------------+  +------------+  +------------+          |  |
|  |  +------------+  +------------+  +------------+          |  |
|  |  |   roots    |  | dictionary |  | els-index  |          |  |
|  |  |  ~56K      |  |  ~82K      |  |  ~52K      |          |  |
|  |  +------------+  +------------+  +------------+          |  |
|  +----------------------------------------------------------+  |
+---------------------------------------------------------------+
                              |
                              | Loads from GitHub Pages (CDN)
                              v
+---------------------------------------------------------------+
|  data/*.json.gz              engines/*.js                      |
|  - chars.json.gz             - roots.js                        |
|  - words.json.gz             - gematria.js                     |
|  - verses.json.gz            - search.js                       |
|  - els-index-50.json.gz      - els-index.js                    |
|  - hebrew-unified.json.gz    - tsirufim/*.js                   |
+---------------------------------------------------------------+
```

### 2.2 Technology Stack

**Frontend**:
- Pure JavaScript (ES6 modules)
- HTML5 + CSS3
- D3.js (visualization)
- No framework dependencies (vanilla JS)

**Data Storage**:
- IndexedDB (client-side database)
- Compression Streams API (gzip decompression)
- Service Worker (offline caching)

**Build Tools** (Python - local only):
- `build-database.py`: Generate character/word/verse databases
- `build-root-lexicon.py`: Generate root mappings
- `build-els-index.py`: Generate precomputed ELS index
- `build-unified-dict.py`: Merge dictionary sources

**Deployment**:
- GitHub Pages (static hosting)
- PWA Manifest (installable app)
- Service Worker (offline capability)

### 2.3 File Structure

```
/
+-- index.html                  # Main dashboard
+-- bible-codes.html            # ELS search (unified: scan + index + dictionary)
+-- text-search.html            # Hebrew text search
+-- gematria.html               # Gematria calculator
+-- acronym.html                # Notarikon/acronym tool
+-- tsirufim.html               # Semantic permutations
+-- matrix-view.html            # Matrix visualization
+-- book-view.html              # Traditional reader
+-- test-roots.html             # Root extraction testing
+-- test-db.html                # Database testing
+-- test-dictionaries.html      # Dictionary testing
+-- test-els-index.html         # ELS index testing
|
+-- data/
|   +-- torahNoSpaces.txt       # Raw Torah text (304,805 letters)
|   +-- precomputed-terms.json  # ELS hash tables
|   +-- *-chars.json.gz         # Character database (5 Torah books)
|   +-- *-words.json.gz         # Word data (39 books)
|   +-- *-verses.json.gz        # Verse data (39 books)
|   +-- els-index/
|   |   +-- els-index-50-min4.json.gz   # ELS index (skip +/-50)
|   |   +-- els-index-20-min4.json.gz   # ELS index (skip +/-20)
|   +-- dictionaries/
|   |   +-- unified/
|   |   |   +-- hebrew-unified.json.gz    # 82K entries
|   |   |   +-- inflection-map.json.gz    # 50K mappings
|   |   +-- openscriptures-bdb.json.gz    # 6.9K entries
|   |   +-- strongs-hebrew.json.gz        # 6.2K entries
|   |   +-- hebrew-wiktionary.json.gz     # 27.6K entries
|   +-- embeddings/
|       +-- hebrew-roots.json.gz          # 56K word dictionary
|
+-- engines/
|   +-- search.js               # Text search engine
|   +-- gematria.js             # Gematria calculations
|   +-- acronym.js              # Acronym/notarikon engine
|   +-- roots.js                # Hebrew root extraction
|   +-- root-integration.js     # Root integration helpers
|   +-- matrix.js               # Matrix visualization
|   +-- letter-analysis.js      # Letter frequency analysis
|   +-- els-index.js            # ELS index query engine
|   +-- dictionary-service.js   # Dictionary service
|   +-- els.worker.js           # ELS Web Worker
|   +-- tsirufim/               # Semantic permutation suite
|       +-- permutations.js
|       +-- embeddings.js
|       +-- scoring.js
|       +-- clustering.js
|       +-- visualization.js
|
+-- db/
|   +-- schema.js               # IndexedDB schema
|   +-- loader.js               # Data loading utilities
|   +-- query.js                # Database queries
|   +-- dictionary-schema.js    # Dictionary DB schema
|   +-- dictionary-loader.js    # Dictionary loading
|
+-- js/
|   +-- test.js                 # ELS main logic
|   +-- load-torah.js           # Torah text loader
|   +-- search-algorithms.js    # KMP & Boyer-Moore
|   +-- i18n.js                 # Internationalization
|   +-- pwa-install.js          # PWA install prompt
|   +-- mobile-nav.js           # Mobile navigation
|
+-- css/
|   +-- mobile-optimized.css    # Mobile-first styles
|
+-- tools/
|   +-- build-database.py       # Character DB builder
|   +-- build-koren-database.py # Koren text builder
|   +-- validate-text.py        # Text validation
|   +-- build-root-lexicon.py   # Root lexicon builder
|   +-- build-els-index.py      # ELS index builder
|   +-- build-unified-dict.py   # Dictionary merger
|   +-- build-wiktionary-dict.py # Wiktionary parser
|
+-- sw.js                       # Service worker
+-- manifest.json               # PWA manifest
+-- styles.css                  # Global styles
```

### 2.4 Current Features

#### Active Tools

| Tool | File | Description |
|------|------|-------------|
| ELS Bible Codes | `bible-codes.html` | Unified ELS search with N-term scan, index lookup, and dictionary modes |
| Text Search | `text-search.html` | Pattern matching with regex support |
| Gematria | `gematria.html` | Multiple calculation methods |
| Acronym | `acronym.html` | First/last letter extraction |
| Tsirufim | `tsirufim.html` | Semantic permutation analysis |
| Matrix View | `matrix-view.html` | Grid visualization |
| Book View | `book-view.html` | Traditional reader |
| Dictionary | (in bible-codes.html) | 260K word browser |

#### Platform Features

- **Hebrew/English Toggle**: Language switch on index page
- **PWA Installable**: Standalone app on any device
- **Fully Offline**: All tools work without internet
- **260K Hebrew Dictionary**: Unified multi-source dictionary
- **Precomputed ELS Index**: Instant proximity lookups
- **N-Term Cluster Discovery**: Find smallest regions containing all search terms
- **Verse Attribution**: Book/chapter/verse shown for every ELS hit

---

## 3. Methodology & Algorithms

### 3.1 ELS (Equidistant Letter Sequences)

#### Definition

An **ELS (Equidistant Letter Sequence)** with skip *d* starting at position *p* is a sequence of letters at positions:

**p, p+d, p+2d, p+3d, ..., p+(n-1)d**

where *n* is the length of the search term.

#### Skip Value Conventions

| Skip Value | Definition | Status | Label |
|------------|------------|--------|-------|
| **0** | Same position repeated | Excluded | Meaningless |
| **+1** | Forward sequential | Included | "Open Text (forward)" |
| **-1** | Backward sequential | Included | "Open Text (backward)" |
| **|skip| >= 2** | True ELS | Included | "Skip +/-n" |

#### Bidirectional Search

**Forward Skip (d > 0)**:
Extract positions p, p+d, p+2d, p+3d, ...

**Backward Skip (d < 0)**:
Extract positions p, p-|d|, p-2|d|, p-3|d|, ...

**Example** with text positions 0-21:
- Skip +3, Start 0: positions 0, 3, 6, 9, 12, 15
- Skip -3, Start 21: positions 21, 18, 15, 12, 9, 6, 3, 0

These extract **different letter sequences**.

#### Algorithm Implementation

The search uses two complementary algorithms:

1. **KMP (Knuth-Morris-Pratt)**: O(n+m) guaranteed linear performance
2. **Boyer-Moore**: Often faster in practice, good for longer patterns

**Process**:
1. For each skip value in range:
2. Iterate through equivalence classes (0 to |skip|-1)
3. Extract sequence at positions based on skip direction
4. Apply KMP/Boyer-Moore pattern matching
5. Convert sequence indices back to text positions
6. Merge and deduplicate results

#### Performance

| Operation | Time |
|-----------|------|
| Open text (skip=0) | <100ms |
| Single skip value | ~50ms |
| Range -100 to +100 | ~10-15 seconds |
| With precomputed hashes | <500ms |

### 3.2 Gematria Calculations

#### Methods

| Method | Description | Example (אדם) |
|--------|-------------|---------------|
| **Standard** | א=1, ב=2, ..., ת=400 | 1+4+40 = 45 |
| **Reduced** | Sum digits iteratively | 45 -> 4+5 = 9 |
| **Ordinal** | א=1, ב=2, ..., ת=22 | 1+4+13 = 18 |

#### Letter Values (Standard)

```
א=1   ב=2   ג=3   ד=4   ה=5   ו=6   ז=7   ח=8   ט=9
י=10  כ=20  ל=30  מ=40  נ=50  ס=60  ע=70  פ=80  צ=90
ק=100 ר=200 ש=300 ת=400

Final forms: ך=20, ם=40, ן=50, ף=80, ץ=90 (same as regular)
```

### 3.3 Acronym/Notarikon Analysis

#### Extraction Methods

| Method | Hebrew | Description |
|--------|--------|-------------|
| Roshei Teivot | ראשי תיבות | First letters of each word |
| Sofei Teivot | סופי תיבות | Last letters of each word |
| Middle | אמצעיות | Middle letters |
| Alternating | לסירוגין | Every other letter |

### 3.4 Hebrew Root Extraction

#### Two-Tier Approach

1. **Precomputed Lexicon** (primary): Fast O(1) lookup of 56,118 Biblical words
2. **Morphological Heuristics** (fallback): Pattern-based extraction

#### Lexicon Statistics

- **56,118 word entries** (all unique words from Tanakh)
- **11,468 unique roots** identified
- **4 binyans detected**: qal, nifal, hifil, hitpael
- **691 KB compressed** size

#### Extraction Process

```
User Query
    |
    v
1. Normalize (remove niqqud, convert final letters)
    |
    v
2. Lexicon Lookup
    |-- Found --> Return (confidence: 1.0)
    |-- Not Found --> Continue
         |
         v
3. Strip Affixes + Lexicon Lookup
    |-- Found --> Return (confidence: 0.9)
    |-- Not Found --> Continue
         |
         v
4. Heuristic Extraction
    |-- Detect binyan pattern
    |-- Apply morphological rules
    |-- Return (confidence: 0.3-0.7)
```

#### Affix Stripping

**Prefixes**: ה, ו, ב, כ, ל, מ, ש

**Suffixes**: ים, ות, יהם, הם, כם, נו, ה, י, ך

#### Binyan Detection

| Binyan | Pattern | Example |
|--------|---------|---------|
| Qal | פָּעַל | דבר |
| Nifal | נִפְעַל | נשבר |
| Piel | פִּעֵל | דבר (intensive) |
| Hifil | הִפְעִיל | הקדים |
| Hitpael | הִתְפַּעֵל | התפלל |

### 3.5 Tsirufim - Semantic Permutations

#### Concept

**צירופים** (Tsirufim) = "Combinations/Permutations"

In Hebrew, letters composing words that describe a situation can recombine to spell out related concepts and details.

#### Processing Pipeline

```
Input Letters (e.g., "משה")
        |
        v
+-------------------------------+
|  Stage 1: Generate Candidates |
|  - All permutations           |
|  - Dictionary validation      |
|  - Morphological filtering    |
+---------------+---------------+
                |
                v
      Valid Words (e.g., משה, שמה, המש)
                |
                v
+-------------------------------+
|  Stage 2: Extract Features    |
|  - Hebrew roots               |
|  - Gematria values            |
|  - Morphological features     |
+---------------+---------------+
                |
                v
      Feature Vectors (64-dim)
                |
                v
+-------------------------------+
|  Stage 3: Contextual Scoring  |
|  - Similarity to situation    |
|  - Event-type anchors         |
|  - Semantic coherence         |
+---------------+---------------+
                |
                v
      Scored Candidates
                |
                v
+-------------------------------+
|  Stage 4: Semantic Clustering |
|  - K-Means / DBSCAN           |
|  - Identify thematic groups   |
+---------------+---------------+
                |
                v
      Thematic Clusters
                |
                v
+-------------------------------+
|  Stage 5: Visualization       |
|  - 2D projection (PCA)        |
|  - Interactive D3.js          |
+-------------------------------+
```

#### 64-Dimensional Feature Vector

```
Indices 0-2:   Gematria Features (normalized)
  [0] Standard gematria / 5000
  [1] Reduced gematria / 100
  [2] Ordinal gematria / 500

Indices 3-4:   Root Features
  [3] Root gematria / 1500
  [4] Root confidence (0.0-1.0)

Index 5:       Word Length / 10.0

Indices 6-12:  Binyan Encoding (one-hot)
  [6] qal, [7] nifal, [8] piel, [9] pual,
  [10] hifil, [11] hufal, [12] hitpael

Indices 13-16: Letter Composition
  [13] Guttural ratio (א ה ח ע)
  [14] Weak ratio (א ה ו י)
  [15] Emphatic ratio (ט צ ק)
  [16] Dominant letter frequency

Indices 17-26: Additional features...
Indices 27-63: Reserved / Padding
```

#### Clustering Algorithms

1. **K-Means**: Known number of clusters, fast
2. **DBSCAN**: Auto-detects clusters, identifies noise
3. **Hierarchical**: Shows cluster relationships

---

## 4. Technical Architecture

### 4.1 Character-Level Database

#### Design Philosophy

**Canonical unit = single Unicode character occurrence in Tanakh**

All features (words, verses, gematria, ELS, acronyms) are **derived views** over this base table.

#### Character Table Schema

```javascript
{
  id: INTEGER,                  // Global ordinal (0..304,805)
  book: SMALLINT,               // 1..39
  chapter: SMALLINT,
  verse: SMALLINT,
  verse_char_index: SMALLINT,   // 0-based within verse
  word_index: SMALLINT,
  char_index_in_word: SMALLINT,

  base_char: CHAR(1),           // א-ת only
  final_form: BOOLEAN,          // ך ם ן ף ץ

  niqqud: STRING,               // Unicode combining marks
  taamim: STRING,               // Cantillation marks
  alt_taamim: STRING,           // Alternate (Aseret HaDibrot)

  gematria_standard: SMALLINT,
  gematria_reduced: SMALLINT,
  gematria_ordinal: SMALLINT,

  word_id: INTEGER,
  verse_id: INTEGER
}
```

#### Storage Statistics

| Data Type | Total Records | Compressed Size |
|-----------|---------------|-----------------|
| Characters | ~1.2M | ~21 MB |
| Words | ~309K | ~15 MB |
| Verses | ~23K | ~3 MB |

### 4.2 ELS Index System

#### Concept

A precomputed index of ALL dictionary word occurrences at ALL ELS skip values across the entire Torah. Transforms expensive real-time searches into instant lookups.

#### Index Schema

```javascript
{
  "metadata": {
    "version": "1.0",
    "torah_hash": "b65394d28c85...",
    "skip_range": [-50, 50],
    "total_words": 51493,
    "total_occurrences": 41800000
  },
  "index": {
    "אב": [
      [1234, 1],      // position 1234, skip 1
      [5678, 50],     // position 5678, skip 50
      ...
    ],
    "אברהם": [...],
    ...
  }
}
```

#### Index Statistics

| Skip Range | Words Indexed | Occurrences | File Size |
|------------|---------------|-------------|-----------|
| +/-20 | 56K | ~25M | 53 MB |
| +/-50 | 52K | ~42M | 39 MB |

#### Query Operations

- **Single Word Lookup**: O(1) - instant
- **Proximity Search**: O(n) - find words near position
- **Pair Proximity**: O(n*m) - min distance between two words
- **Cluster Discovery**: O(k*n) - find related terms

### 4.3 Unified Dictionary System

#### Multi-Source Architecture

| Source | Entries | Description |
|--------|---------|-------------|
| BDB (Open Scriptures) | 6,893 | Verified Biblical Hebrew |
| Strong's Concordance | 6,243 | Cross-referenced to verses |
| Hebrew Wiktionary | 27,598 | Modern + Biblical |
| Tanakh Extracted | 56,118 | All Biblical word forms |
| **Unified Total** | **82,151** | Deduplicated superset |

#### Inflection Mapping

- **50,037 inflected forms** linked to lemmas
- Enables: lookup any conjugated form -> get root/lemma

#### Era Classification

| Era | Count | Description |
|-----|-------|-------------|
| Biblical | 9,340 | Tanakh vocabulary |
| Modern | 19,602 | Contemporary Hebrew |
| Rabbinic | 2,022 | Talmudic/Mishnaic |
| Medieval | 39 | Medieval Hebrew |

### 4.4 IndexedDB Storage

#### Database Schema

**Database Name**: `BibleAnalysis`
**Version**: 3

**Object Stores**:
1. `chars` - Character data (keyPath: 'id')
2. `words` - Word data (keyPath: 'word_id')
3. `verses` - Verse data (keyPath: 'verse_id')
4. `roots` - Root mappings (keyPath: 'word')
5. `definitions` - Word definitions (keyPath: 'word')
6. `metadata` - Load status and app state

#### Storage Quotas

| Browser | Typical Quota |
|---------|---------------|
| Chrome/Edge | ~60% of free disk |
| Firefox | ~50% of global limit |
| Safari | 1 GB default |

---

## 5. System Operations

### 5.1 Installation & Setup

#### Web Access
Visit [bible-codes.github.io](https://bible-codes.github.io/)

#### PWA Installation

**Desktop (Chrome/Edge)**:
1. Click install icon in address bar
2. Or: Menu > Install Hebrew Bible Analysis Suite

**Mobile (iOS)**:
1. Safari > Share > Add to Home Screen

**Mobile (Android)**:
1. Chrome > Menu > Install app

#### Local Development

```bash
# Clone repository
git clone https://github.com/bible-codes/bible-codes.github.io.git
cd bible-codes.github.io

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

### 5.2 PWA Features

- **Installable**: Add to home screen, runs standalone
- **Offline**: All tools work without internet
- **Fast**: Service worker caches all assets
- **Responsive**: Mobile-first design

### 5.3 Offline Capabilities

Once installed, the following work offline:
- All search tools (ELS, text, gematria, acronym)
- Dictionary lookups (260K words)
- ELS index queries (precomputed)
- Matrix visualization
- Book reader

**Data loaded on first use**:
- Torah text: ~300KB
- Character database: ~21MB (per book)
- ELS index: ~39MB
- Dictionary: ~5.3MB

### 5.4 Service Worker

**Current Version**: v5.4

**Cache Strategy**:
- **Static assets**: Cache-first (fast)
- **Data files**: Network-first with cache fallback

**Cached Resources**:
- All HTML pages
- All JavaScript modules
- All CSS files
- Torah data files
- Dictionary files
- ELS index files
- PWA icons

---

## 6. User Instructions

### 6.1 ELS Bible Codes Search

The unified ELS search page (`bible-codes.html`) offers three modes:

#### Index Lookup Mode (Recommended)

**Best for**: Quick proximity searches between known terms

1. Select "Index Lookup" tab
2. Enter Hebrew terms (comma-separated)
3. Click "Search Index"
4. View proximity pairs ranked by distance
5. Click any pair to see inline matrix

**Features**:
- Instant results from precomputed index
- Proximity ranking (closest pairs first)
- Click to view matrix visualization

#### Full Scan Mode

**Best for**: Custom skip ranges, N-term cluster discovery, finding all occurrences

1. Select "Full Scan" tab
2. Enter up to 8 search terms (click "+ Add Term" for more)
3. Set skip range (default: -100 to +100)
4. Click "Search" (use "Cancel" to abort long scans)
5. View cluster results sorted by smallest bounding region

**Features**:
- **N-Term Search**: Up to 8 terms searched independently across all skip values
- **Cluster Ranking**: When 2+ terms are used, results are ranked by the smallest region ("cluster") containing at least one hit from every term (sliding window algorithm, O(M log M))
- **Verse Attribution**: Each hit shows which Torah verses contribute its letters (loaded from character database covering Genesis through Deuteronomy)
- **8-Color Palette**: Each term gets a distinct color (amber, cyan, deep orange, green, pink, indigo, brown, blue-grey); overlapping cells shown in purple
- **N-Term Matrix**: Click any cluster or individual result to see an inline matrix with all terms highlighted in their respective colors; tooltips show verse references
- **Session Save/Load**: Save scan terms and results to localStorage for later retrieval
- **Export**: JSON export of all results and clusters, plus PNG image download of the matrix view
- **Cancel Support**: Abort long scans mid-progress with the Cancel button
- Custom skip range (default -100 to +100, skip 0 excluded)
- Progress percentage shown during scan

**Cluster Algorithm**:
1. All hits from all terms are merged into one array, tagged by term index
2. Sorted by position in the Torah text
3. A sliding window expands right until all terms are present, then shrinks left to minimize span
4. Clusters with span <= 10,000 characters are recorded
5. Results are sorted by span ascending, deduplicated, and limited to top 200

**Single-Term Mode**: When only one term is entered, results are shown as a simple list (no clusters), each clickable for matrix view

#### Dictionary Mode

**Best for**: Browsing available terms, exploring vocabulary

1. Select "Dictionary" tab
2. Filter by: source, era, or search text
3. Browse paginated results
4. Click any word to search it in ELS index

**Features**:
- 260K+ Hebrew words
- Filter by era (Biblical, Modern, etc.)
- Filter by source (BDB, Wiktionary, etc.)
- Click-to-search integration

#### Matrix View

When viewing ELS results (both Index and Scan modes):
1. Click any proximity pair, cluster, or individual result
2. Matrix appears inline below results
3. In **Index Mode**: Yellow = Term 1, Cyan = Term 2, Purple = Overlap
4. In **Scan Mode (N-term)**: Each of up to 8 terms gets a distinct color:
   - Term 1: Amber (#ffc107)
   - Term 2: Cyan (#00bcd4)
   - Term 3: Deep Orange (#ff5722)
   - Term 4: Green (#4caf50)
   - Term 5: Pink (#e91e63)
   - Term 6: Indigo (#3f51b5)
   - Term 7: Brown (#795548)
   - Term 8: Blue-grey (#607d8b)
   - Overlap (2+ terms): Purple (#9c27b0)
5. Hover cells for verse reference tooltips (e.g., "Genesis 12:3")
6. Click "Download PDF" to export matrix as PNG image
7. Grid width is determined by the largest |skip| value among displayed terms

### 6.2 Text Search

1. Go to `text-search.html`
2. Enter Hebrew search term
3. Select search mode:
   - **Exact**: Exact string match
   - **Pattern**: Regex support
   - **First/Last**: Letter position filters
4. Choose text mode:
   - **Consonantal**: Letters only
   - **Full**: With niqqud
5. Click "Search"

**Advanced**: Enable root-based expansion to find all forms of a root.

### 6.3 Gematria Calculator

1. Go to `gematria.html`
2. Enter Hebrew word or phrase
3. View calculations:
   - Standard value
   - Reduced value
   - Ordinal value
4. Search for matching words:
   - Enter a number
   - Choose method
   - Find all words/verses with that value

### 6.4 Acronym Tool

1. Go to `acronym.html`
2. Enter verse or phrase
3. Select extraction method:
   - First letters (Roshei Teivot)
   - Last letters (Sofei Teivot)
   - Middle letters
   - Alternating
4. View acronym results
5. Search for meaningful patterns

### 6.5 Tsirufim Analysis

1. Go to `tsirufim.html`
2. Enter letters for permutation
3. (Optional) Add context/situation
4. (Optional) Select event type
5. Adjust settings:
   - Min/max length
   - Confidence threshold
   - Dictionary validation
6. Select clustering method
7. Click "Generate Permutations"
8. View results in tabs:
   - Results: All valid permutations
   - Visualization: 2D semantic space
   - Clusters: Grouped by theme
   - Analysis: Statistics

### 6.6 Matrix View

1. Go to `matrix-view.html`
2. Set parameters:
   - Start position or verse
   - Width (characters per row)
   - Height (number of rows)
3. Click "Generate Matrix"
4. Optional: Search for ELS within matrix
5. Export to text file

### 6.7 Book View

1. Go to `book-view.html`
2. Select book (Torah, Prophets, or Writings)
3. Select chapter
4. Toggle options:
   - Show verse numbers
   - Show niqqud
   - Show taamim
5. Use search box for text within chapter
6. Navigate with Previous/Next buttons

### 6.8 Dictionary Browser

1. Go to `bible-codes.html` > Dictionary tab
2. Filter options:
   - **Source**: BDB, Strong's, Wiktionary, All
   - **Era**: Biblical, Modern, Rabbinic, All
   - **Search**: Free text search
3. Browse paginated results
4. Click word to search in ELS index

---

## 7. API Reference

### 7.1 Root Extraction API

```javascript
import { getRootExtractor } from './engines/roots.js';

// Initialize
const extractor = getRootExtractor();
await extractor.initialize();

// Extract single root
const result = await extractor.extractRoot('מדברים');
// { root: 'דבר', binyan: 'piel', confidence: 1.0, method: 'lexicon' }

// Extract multiple roots
const results = await extractor.extractRoots(['משה', 'אהרן']);

// Find words with specific root
const words = extractor.getWordsWithRoot('דבר');
// ['דבר', 'מדבר', 'דברים', ...]

// Check if word exists
const known = extractor.isKnownWord('משה');  // true

// Get statistics
const stats = extractor.getStats();
// { totalWords: 56118, uniqueRoots: 11468, ... }
```

### 7.2 ELS Index API

```javascript
import { getElsIndexService, initElsIndex } from './engines/els-index.js';

// Initialize
await initElsIndex('data/els-index/els-index-50-min4.json.gz');
const service = getElsIndexService();

// Find all occurrences of a word
const occs = service.findWord('משה');
// [{pos: 1234, skip: 5}, {pos: 2345, skip: -10}, ...]

// Find words near a position
const nearby = service.findNearby(50000, 1000);
// All words within 1000 characters of position 50000

// Get proximity between two words
const prox = service.pairProximity('משה', 'אהרן');
// { distance: 42, word1: {...}, word2: {...} }

// Compute proximity matrix
const matrix = service.computeProximityMatrix(['משה', 'אהרן', 'פרעה']);

// Discover cluster around seed word
const cluster = service.discoverCluster('משה', 1000);
// { seed, center, words: [...], totalOccurrences }

// Get statistical significance
const sig = service.significanceScore('משה');
// { observed, expected, zScore, significant }
```

### 7.3 Dictionary Service API

```javascript
import { getDictionaryService, initDictionaries } from './engines/dictionary-service.js';

// Initialize with sources
await initDictionaries(['unified', 'bdb', 'strongs']);
const dictService = getDictionaryService();

// Look up word
const entry = dictService.lookup('אברהם');
// { word, root, definitions, era, sources, ... }

// Get lemma for inflected form
const lemma = dictService.getLemma('אבדו');
// { lemma: 'אבד', root: 'אבד' }

// Search by era
const biblical = dictService.searchByEra('biblical', 50);

// Get all inflections
const forms = dictService.getInflections('אבד');
// ['אבד', 'אבדה', 'אבדו', ...]

// Check if word exists
const exists = dictService.isKnownWord('שלום');  // true

// Get all words
const allWords = dictService.getAllWords();  // Set of 82K+ words
```

### 7.4 Database Query API

```javascript
import { loadBook } from './db/loader.js';
import { getVersesByBook, getCharacterRange } from './db/query.js';

// Load a book
await loadBook('genesis');

// Get all verses from a book
const verses = await getVersesByBook(1);

// Get characters in range
const chars = await getCharacterRange(0, 999);

// Get verse by reference
const verse = await getVerseByRef(1, 1, 1);  // Genesis 1:1

// Get characters in verse
const verseChars = await getCharactersInVerse(verseId);
```

---

## 8. Development Guide

### 8.1 Local Development

```bash
# Clone
git clone https://github.com/bible-codes/bible-codes.github.io.git
cd bible-codes.github.io

# Start server (required for ES modules and CORS)
python3 -m http.server 8000

# Or use VS Code Live Server extension

# Open browser
open http://localhost:8000
```

### 8.2 Building Data Files

#### Character Database

```bash
cd tools
python3 build-database.py --books all --output ../data/
```

#### Root Lexicon

```bash
python3 build-root-lexicon.py
# Output: data/embeddings/hebrew-roots.json.gz
```

#### ELS Index

```bash
python3 build-els-index.py --skip-range 50 --min-length 4
# Output: data/els-index/els-index-50-min4.json.gz
```

#### Unified Dictionary

```bash
python3 build-unified-dict.py
# Output: data/dictionaries/unified/hebrew-unified.json.gz
```

### 8.3 Testing

#### Manual Testing

1. Test all tools on Chrome, Firefox, Safari
2. Test on mobile devices (iOS Safari, Android Chrome)
3. Test offline mode (disable network)
4. Test PWA installation

#### Test Pages

- `test-db.html`: Database functionality
- `test-roots.html`: Root extraction
- `test-dictionaries.html`: Dictionary service
- `test-els-index.html`: ELS index queries

### 8.4 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Test thoroughly
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open Pull Request

**Coding Standards**:
- ES6+ JavaScript
- JSDoc comments for public functions
- No framework dependencies
- Mobile-first CSS

---

## 9. Recent Changes

### 9.1 February 2026 Updates

#### February 6, 2026: N-Term ELS Scan with Cluster Ranking

**Upgraded Full Scan mode** from fixed 2-term to arbitrary N-term search (up to 8 terms), with smallest-cluster ranking and verse attribution:

- **Dynamic N-Term UI**: Add/remove scan terms dynamically, each with color-coded swatch
- **Sliding Window Cluster Finder**: O(M log M) algorithm that merges all hits by position, finds minimal-span windows containing at least one hit from every term, deduplicates, and returns the top 200 tightest clusters
- **Verse Attribution**: Loads Torah character database (5 books, ~304K chars) to provide book/chapter/verse for each ELS hit position; displayed in result lists, cluster tags, matrix legend, and cell tooltips
- **8-Color Matrix**: Each term rendered in a distinct color (amber, cyan, deep orange, green, pink, indigo, brown, blue-grey); overlapping cells in purple
- **Session Save/Load**: Save and restore scan terms + results to localStorage
- **Export**: JSON export of all results/clusters; PNG image download of matrix view
- **Cancel Button**: Abort long scans mid-progress with percentage indicator
- **Dead Code Cleanup**: Removed duplicate `openScanMatrix`, unused `renderModalMatrix`, and modal HTML/CSS

**Files Changed**:
- `bible-codes.html`: Major rewrite of scan mode (HTML, CSS, JS)
- `PROGRESS.md`: Updated with session details
- `README.md`: Updated with new feature documentation
- `ALGORITHM.md`: Updated with cluster algorithm documentation

**Key Functions Added**:
- `findClusters(terms, allResults, maxSpan)` — sliding window cluster discovery
- `loadCharDB()` — Torah character database loader for verse attribution
- `getVersesForHit(pos, skip, termLen)` — verse lookup for each ELS hit
- `renderScanMatrix(hits)` — N-term matrix renderer with `posMap<position, Set<termIdx>>`
- `addScanTerm()` / `removeScanTerm()` — dynamic term entry management
- `saveScanSession()` / `loadScanSession()` — session persistence
- `downloadMatrixPDF()` — canvas-rendered PNG export

#### February 4, 2026: Unified ELS Interface

**Combined bible-codes.html and els-explorer.html** into single unified interface:

- **Three Mode Tabs**: Index Lookup, Full Scan, Dictionary
- **Clean Color Scheme**: Solid blue (#1e5aa8) replacing gradient colors
- **Simplified Naming**: Removed "Advanced" and other fluff words
- **Inline Matrix View**: Matrix displays below results (not popup)
- **Proximity Pairs**: Scan results show combined pairs ranked by distance
- **Dictionary Integration**: Click any word to search in ELS index
- **Session Save/Load**: Preserve state across sessions

**Files Changed**:
- `bible-codes.html`: Major refactor, combined functionality
- `index.html`: Updated tool links
- `sw.js`: Removed els-explorer.html from cache

#### February 3, 2026: ELS Index System

**Complete precomputed ELS index** for instant lookups:

- **51,493 words indexed** from unified dictionary
- **41.8 million occurrences** at skip +/-50
- **O(1) lookups** for word occurrences
- **Proximity calculations**: Find closest word pairs
- **Cluster discovery**: Find related terms near seed word
- **Statistical significance**: Z-score calculations

**New Files**:
- `tools/build-els-index.py`
- `engines/els-index.js`
- `test-els-index.html`
- `data/els-index/els-index-50-min4.json.gz`

#### February 3, 2026: Unified Dictionary

**Multi-source Hebrew dictionary** with 82,151 entries:

- **BDB**: 6,893 verified Biblical entries
- **Strong's**: 6,243 concordance entries
- **Wiktionary**: 27,598 modern + Biblical
- **Inflection Map**: 50,037 form->lemma mappings
- **Era Classification**: Biblical, Modern, Rabbinic, Medieval

**New Files**:
- `tools/build-unified-dict.py`
- `tools/build-wiktionary-dict.py`
- `engines/dictionary-service.js`
- `data/dictionaries/unified/hebrew-unified.json.gz`
- `data/dictionaries/unified/inflection-map.json.gz`

#### February 2, 2026: ELS Algorithm Fix

**Critical bug fix** in bidirectional ELS search:

- **Fixed**: Skip +d and -d now extract different sequences
- **Excluded**: Skip +/-1 (redundant with open text)
- **Labeled**: Clear distinction between open text and true ELS
- **Cache**: Bumped to v4.2 to force refresh

**New Files**:
- `ALGORITHM.md`: Comprehensive algorithm documentation
- `CHANGES-2026-02-02.md`: Detailed change log

### 9.2 January 2026 Updates

#### January 13, 2026: Advanced Features

- **Matrix View System**: Complete grid visualization with ELS search
- **Book View**: Traditional reader with chapter navigation
- **Letter Analysis Engine**: Frequency analysis (UI pending)
- **Feature Assessment**: Comprehensive gap analysis

#### January 12, 2026: Root System & Tsirufim

- **Root Extraction**: 56K word lexicon with binyan detection
- **Tsirufim Engine**: Complete 5-module semantic permutation system
- **Mobile-First CSS**: Responsive design with 44px touch targets
- **Integration Module**: Root-based query expansion

---

## 10. References

### Academic

1. Witztum, D., Rips, E., & Rosenberg, Y. (1994). "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, 9(3), 429-438.

2. Knuth, D. E., Morris, J. H., & Pratt, V. R. (1977). "Fast Pattern Matching in Strings." *SIAM Journal on Computing*, 6(2), 323-350.

3. Boyer, R. S., & Moore, J. S. (1977). "A Fast String Searching Algorithm." *Communications of the ACM*, 20(10), 762-772.

### Data Sources

- **Torah Text**: Koren Edition (304,805 letters)
- **BDB Dictionary**: Open Scriptures Project
- **Wiktionary**: Hebrew Wiktionary XML dump
- **Strong's**: Open source concordance data

### Tools & Libraries

- **D3.js**: Data visualization
- **IndexedDB**: Browser database
- **Compression Streams API**: Gzip decompression
- **Service Worker API**: Offline caching

### Related Projects

- [bible-codes.github.io](https://github.com/bible-codes/bible-codes.github.io) - This repository
- [bible-data-science.github.io](https://github.com/roni762583/bible-data-science.github.io) - Jupyter notebooks

---

## Contact

- **Developer**: Aharon
- **Email**: roni762583@gmail.com
- **GitHub**: [bible-codes](https://github.com/bible-codes)
- **Issues**: [GitHub Issues](https://github.com/bible-codes/bible-codes.github.io/issues)

---

*Last Updated: February 6, 2026*
*Version: 3.1*
*Status: Production Ready*
