# Hebrew Bible Analysis Suite 📜

## Project Link
Visit the app at [bible-codes.github.io](https://bible-codes.github.io/)

---

## Overview

Welcome to the **Hebrew Bible Analysis Suite** – a comprehensive, browser-based platform for exploring the Hebrew Bible through multiple analytical lenses. This unified application combines traditional Torah study tools with modern computational analysis, all running entirely in your browser with full offline capability.

---

## 🎯 Current Features

### 🔴 Active Tool

- **ELS Bible Codes Search** ([bible-codes.html](https://bible-codes.github.io/bible-codes.html))
  - Equidistant Letter Sequence (ELS) searches
  - **Text**: Koren Edition (exact 304,805 letters used by Rips et al., 1994)
  - **Multi-term proximity search** - find two terms close together
  - **Verse attribution** - shows which verses contribute each letter
  - Clickable matrix view with dual-term highlighting
  - Precomputed hashes for common phrases
  - **SHA-256 Verified**: `b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226`

### 🟡 Planned Tools (In Development)

- **Matrix Term Discovery** (NEW)
  - Discover additional ELS terms within a matrix region
  - Dictionary-based search (56,118 Hebrew words + biblical names/places)
  - Statistical significance calculation (WRR methodology)
  - See `docs/MATRIX-DISCOVERY-PLAN.md` for full specification

- **Hebrew Text Search** ([text-search.html](https://bible-codes.github.io/text-search.html))
  - Advanced pattern matching with regex support
  - First/last letter filtering
  - Auto-suggestions
  - Consonantal and full text modes

- **Gematria Calculator** ([gematria.html](https://bible-codes.github.io/gematria.html))
  - Multiple calculation methods (standard, reduced, ordinal)
  - Search by value or range
  - Find matching words
  - Statistical analysis

- **Acronym/Notarikon** ([acronym.html](https://bible-codes.github.io/acronym.html))
  - Extract Roshei Teivot (first letters) and Sofei Teivot (last letters)
  - Search by acronym pattern
  - Book-wide analysis
  - Multiple extraction methods

- **Tsirufim - Semantic Permutations** ([tsirufim.html](https://bible-codes.github.io/tsirufim.html))
  - Advanced Hebrew letter permutation analysis
  - ML-powered semantic clustering (HDBSCAN)
  - D3.js interactive visualization
  - 56K+ word dictionary validation

- **Matrix View** ([matrix-view.html](https://bible-codes.github.io/matrix-view.html))
  - Rectangular character grid visualization
  - Configurable dimensions and starting position
  - ELS search within matrix
  - Export to text file

- **Book View** ([book-view.html](https://bible-codes.github.io/book-view.html))
  - Traditional book-style Hebrew reader
  - Chapter/verse navigation
  - Toggle niqqud and cantillation marks
  - All 39 books of Tanach

- **Root Extraction** ([test-roots.html](https://bible-codes.github.io/test-roots.html))
  - Hebrew root identification (triliteral/quadriliteral)
  - 56K word dictionary
  - Binyan detection and confidence scoring

- **Letter & Word Analysis** - Character-level statistical analysis (engine complete)
- **Cantillation Viewer** - Taamim analysis including alternate traditions
- **Cross-Reference Index** - Links to Talmud, Midrash, and Zohar citations

### 🌐 Platform Features
- **Hebrew/English Toggle** - Switch language on index page (EN/עב button)
- **PWA Installable** - Install as standalone app on any device with prominent install banner
- **Fully Offline** - All tools work without internet
- **56K Hebrew Dictionary** - Local dictionary for word validation and root extraction

---

## ⚡ Key Features

### Comprehensive Analysis Tools
- **ELS Search**: Fast, efficient Equidistant Letter Sequence searches
- **Text Search**: Keyword, phrase, and pattern matching
- **Gematria**: Multiple calculation methods with value-based searches
- **Notarikon**: First/last letter extraction and acronym analysis
- **Statistical Analysis**: Letter counts, word patterns, structural queries

### Technical Excellence
- **100% Client-Side**: No server required, runs entirely in browser
- **Fully Offline Capable**: PWA architecture enables complete offline functionality - all searches, calculations, and analysis work without internet
- **Character-Level Database**: Future-proof architecture using IndexedDB (50-100MB storage)
- **Web Workers**: Heavy computations (ELS, text search) run in background threads for responsive UI
- **Cross-Platform**: Works on desktop, tablet, and mobile devices
- **Installable**: Add to home screen and run as standalone app

### Data Features
- **Niqqud Aware**: Supports vowel points in searches
- **Taamim Support**: Cantillation marks analysis
- **Alternate Traditions**: Support for variant readings (e.g., Aseret HaDibrot)
- **Precomputed Values**: Fast lookups for common searches
- **Compressed Storage**: Efficient data storage for offline use

---

## 🔧 Technology Stack

### Frontend
- **JavaScript (ES6+)**: Core application logic
- **IndexedDB**: Large dataset storage and querying (50-100MB practical limit)
- **Web Workers**: Background processing for heavy searches (ELS, full-text)
- **Service Worker**: Offline caching and PWA functionality
- **WebAssembly (WASM)**: Optional high-performance compute for future optimizations

### Data Architecture
- **Character-Level Database**: Canonical storage of every Hebrew letter
- **Derived Views**: Words, verses, and analysis built on character data
- **Precomputed Indices**: Gematria values, letter positions, skip patterns
- **Compressed JSON**: Efficient storage and transfer

### Search Algorithms
- **KMP & Boyer-Moore**: Optimized string matching with bidirectional support
- **Hash-Based Lookups**: Fast ELS pattern detection
- **Indexed Queries**: Efficient database operations

#### ELS (Equidistant Letter Sequence) Implementation

**Skip Value Conventions (Corrected):**
- **ELS = 0**: Meaningless (same position repeated) - excluded
- **ELS = +1**: Open text forward (normal reading) - included, clearly labeled
- **ELS = -1**: Open text backward (reverse reading) - included, clearly labeled
- **|ELS| ≥ 2**: True equidistant letter sequences

**Bidirectional Search:**
- **Positive skip (+d)**: Extract positions p, p+d, p+2d, ... (forward direction)
- **Negative skip (-d)**: Extract positions p, p-d, p-2d, ... (backward direction)

This implementation follows the academic standard established by Witztum, Rips, and Rosenberg (1994) in "Equidistant Letter Sequences in the Book of Genesis" (*Statistical Science*), properly handling both forward and backward ELS patterns while including open text occurrences for context.

**Algorithm Details:**
1. **Forward Search (skip > 0)**: Iterate through each equivalence class (0 to skip-1), extract sequence at positions startPos, startPos+skip, startPos+2×skip, ..., then apply KMP/Boyer-Moore
2. **Backward Search (skip < 0)**: Start from highest position in each equivalence class, extract backward at positions startPos, startPos-skip, startPos-2×skip, ..., then apply KMP/Boyer-Moore
3. **Open Text (skip = 0)**: Direct KMP search on full text, labeled distinctly in results

---

## 🚀 Architecture

### Database Schema

The application uses a character-level canonical database where each Hebrew letter is a record:

```javascript
Character Record {
  id: global position (0..304,805)
  book, chapter, verse, word_index
  base_char, final_form
  niqqud, taamim, alt_taamim
  gematria_standard, gematria_reduced, gematria_ordinal
}
```

This enables:
- ELS searches via global position
- First/last letter queries
- Gematria calculations
- Cantillation analysis
- Statistical queries

### File Structure
```
/
├── index.html                  # Main dashboard
├── bible-codes.html            # ELS search tool
├── text-search.html            # Hebrew text search
├── gematria.html               # Gematria calculator
├── acronym.html                # Notarikon/acronym tool
├── tsirufim.html               # Semantic permutations
├── matrix-view.html            # Matrix visualization
├── book-view.html              # Traditional reader
├── CLAUDE.md                   # Implementation plan & algorithm details
├── README.md                   # Project documentation
├── PROGRESS.md                 # Implementation progress tracking
│
├── data/                       # Torah text and precomputed data
│   ├── torahNoSpaces.txt       # Raw Torah text (304,805 letters)
│   ├── precomputed-terms.json  # ELS hash tables
│   ├── *-chars.json.gz         # Character-level database (5 Torah books)
│   ├── *-words.json.gz         # Word-level data
│   ├── *-verses.json.gz        # Verse-level data
│   └── embeddings/             # Dictionary and embeddings
│       └── hebrew-roots.json.gz  # 56K Hebrew word dictionary
│
├── docs/                       # Documentation
│   └── MATRIX-DISCOVERY-PLAN.md  # Matrix term discovery specification
│
├── tools/                      # Build and validation tools
│   ├── build-koren-database.py   # Build char database from Koren text
│   └── validate-text.py          # Validate Torah text integrity
│
├── engines/                    # Search and analysis engines
│   ├── search.js               # Text search engine
│   ├── gematria.js             # Gematria calculations
│   ├── acronym.js              # Acronym/notarikon engine
│   ├── roots.js                # Hebrew root extraction
│   ├── matrix.js               # Matrix visualization
│   ├── letter-analysis.js      # Letter frequency analysis
│   └── tsirufim/               # Semantic permutation suite (5 modules)
│
├── db/                         # Database layer
│   ├── schema.js               # IndexedDB schema
│   ├── loader.js               # Data loading utilities
│   ├── query.js                # Database queries
│   ├── dictionary-schema.js    # Dictionary DB schema
│   └── dictionary-loader.js    # Dictionary loading
│
├── js/                         # Core JavaScript
│   ├── test.js                 # ELS main logic
│   ├── load-torah.js           # Torah text loader
│   ├── search-algorithms.js    # KMP & Boyer-Moore implementations
│   ├── i18n.js                 # Internationalization (Hebrew/English)
│   └── pwa-install.js          # PWA install prompt
│
└── torah-codes/                # Python reference implementation
```

---

## 📚 Background and Inspiration

This project builds on research into Bible codes and computational text analysis:

- **Witztum, Doron, et al.** "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, vol. 9, no. 3, 1994, pp. 429–38. JSTOR.
- Works by Michael Drosnin and Jeffrey Satinover on hidden codes
- Traditional Jewish approaches to gematria and notarikon
- Modern computational linguistics and statistical analysis

---

## 🌟 Open Source

This project is **open source and free to use**. Contributions are welcome!

### Related Projects
- [Bible Codes App](https://github.com/bible-codes/bible-codes.github.io) - This repository
- [Bible Data Science](https://github.com/roni762583/bible-data-science.github.io) - Jupyter notebooks and research tools

---

## 🤝 Contributing

We welcome contributions of all kinds:

1. **Fork the Repository**: Start by forking this project
2. **Submit Issues**: Report bugs or request features in [Issues](https://github.com/bible-codes/bible-codes.github.io/issues)
3. **Open Pull Requests**: Submit PRs for bug fixes or new features
4. **Improve Documentation**: Help make the project more accessible
5. **Share Ideas**: Suggest new analysis tools or features

### Development Setup

See [CLAUDE.md](CLAUDE.md) for detailed implementation plans and architecture documentation.

---

## 📖 Usage

1. **Visit** [bible-codes.github.io](https://bible-codes.github.io/)
2. **Choose a tool** from the dashboard
3. **Install as PWA** (optional) for offline use
4. **Explore** the Hebrew Bible with powerful analysis tools

---

## 📧 Contact

- **Email**: roni762583@gmail.com
- **GitHub**: [bible-codes](https://github.com/bible-codes)

---

## 📄 License

See [LICENSE](LICENSE) for details.

---

*Last Updated: 2026-02-03*

Thank you for exploring the Hebrew Bible Analysis Suite!
