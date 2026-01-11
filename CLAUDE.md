# Hebrew Bible Analysis Suite - Implementation Plan

## Project Overview

**Target**: Unified GitHub Pages site (`bible-codes.github.io`) running entirely in browser with no server backend.

**Philosophy**: Character-level canonical database with derived views for all analysis modes (ELS, gematria, notarikon, letter counts, cantillation variants).

---

## Current Status

### Active Components 🔴
- **ELS Bible Codes Search** (`bible-codes.html`)
  - Pure client-side JavaScript for Equidistant Letter Sequence searches
  - Precomputed hashes and dynamic search
  - Service worker for offline caching
  - PWA support via manifest

### Repositories
- **bible-codes.github.io**: Pure client-side JS app for ELS searches ([GitHub](https://github.com/bible-codes/bible-codes.github.io))
- **bible-data-science.github.io**: Multi-file repo with Jupyter notebooks, HTML utilities (BCApp.html, heb-ocr.html, igeret.html, qa.html) ([GitHub](https://github.com/roni762583/bible-data-science.github.io))
- **torah-codes/**: Python-based ELS search engine (copied into this repo)

---

## Unified Site Requirements

### Core Functionalities to Implement

#### 1. Hebrew Bible Text Search 🟡
- Standard text search (keyword/phrase)
- Verse lookup by book/chapter/verse
- Advanced search (first/last letter anywhere, pattern search)
- Letter and word counts per verse

#### 2. Numeric Analysis 🟡
- Gematria calculation by multiple methods:
  - Standard (א=1, ב=2, ..., ת=400)
  - Reduced (sum of digits)
  - Ordinal (א=1, ב=2, ..., ת=22)
  - Final letter variants
- Search verses/words by gematria value

#### 3. Acronym/Notarikon Tools 🟡
- Extract first/last letters of each word
- Build acronym/abbreviation analysis interface
- Pattern detection and combinations

#### 4. Permutation/Anagram Tools 🟢
- Character rearrangement
- Pattern detectors
- Integration with existing anagram.html from Bible Data Science

#### 5. ELS (Bible Codes) 🔴
- Already implemented in bible-codes.html
- Expand with enhanced UI/features as needed

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

### Letter Engine
- Query by base letter
- Query by niqqud pattern
- Query by taamim presence/type

### Numeric Engine
- Gematria exact/range
- Reduced/ordinal modes
- Verse or word level aggregation

### Acronym/Notarikon Engine
- First letters across words
- Last letters across words
- Mixed strategies

### ELS Engine
- Operates on `chars.id`
- Uses only `base_char`
- Web Worker execution

### Structural Queries
- "Nth letter of Torah"
- "Middle letter of book"
- "All verses with X letters"

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
│   ├── chars.json.gz         # Character database
│   ├── words.json.gz         # Word database
│   ├── verses.json.gz        # Verse database
│   ├── torahNoSpaces.txt     # Raw Torah text (existing)
│   └── precomputed-terms.json # ELS precomputed data (existing)
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
│   └── taamim.js             # Cantillation analysis
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
| text-search.html | `chars + words` | 🟡 Planned |
| gematria.html | `words / verses` | 🟡 Planned |
| acronym.html | `words → chars` | 🟡 Planned |
| letter-analysis.html | `chars` | 🟢 Planned |
| taamim.html | `chars.taamim` | 🟢 Planned |
| cross-ref.html | External APIs/local index | 🟢 Planned |
| anagram.html | Pattern analysis | 🟢 Planned |

---

## Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Move original index.html to bible-codes.html
- [x] Create new unified index.html dashboard
- [x] Create CLAUDE.md implementation plan
- [ ] Update service worker references
- [ ] Update manifest.json for unified branding

### Phase 2: Database Infrastructure
- [ ] Design IndexedDB schema
- [ ] Create data ingestion scripts (Python)
- [ ] Generate chars.json.gz, words.json.gz, verses.json.gz
- [ ] Implement IndexedDB loader
- [ ] Create database query utilities

### Phase 3: Core Search Engines
- [ ] Implement text search engine
- [ ] Implement gematria calculator
- [ ] Implement acronym/notarikon engine
- [ ] Optimize ELS engine with new database

### Phase 4: UI Development
- [ ] Create text-search.html
- [ ] Create gematria.html
- [ ] Create acronym.html
- [ ] Create verse detail view component
- [ ] Implement navigation between tools

### Phase 5: Advanced Features
- [ ] Letter analysis tool
- [ ] Cantillation viewer
- [ ] Cross-reference linking
- [ ] Anagram solver
- [ ] Web Worker optimization

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

## PWA Considerations

### Advantages
- IndexedDB persistence (large datasets)
- Offline Torah access
- Faster repeated searches
- Web Workers allowed
- Background caching

### Limitations
- ~50–100MB practical storage limit
- iOS Safari constraints (still workable)
- Client memory limits for large searches

### Strategies
- Compressed indices
- Incremental loading
- Pagination for large result sets
- Web Worker offloading

---

## Feature Map Summary

| Feature | Page | Client JS | Precomputed Data | PWA | Status |
|---------|------|-----------|-----------------|-----|--------|
| Hebrew text search | ✓ | ✓ | Bible JSON | ✓ | 🟡 Planned |
| Verse lookup | ✓ | ✓ | Bible JSON | ✓ | 🟡 Planned |
| Gematria | ✓ | ✓ | Precomputed table | ✓ | 🟡 Planned |
| Acronym/Notarikon | ✓ | ✓ | n/a | ✓ | 🟡 Planned |
| ELS search | ✓ | ✓ | Precomputed hashes | ✓ | 🔴 Active |
| Cross-Reference Links | ✓ | APIs/local index | local JSON | ✓ | 🟢 Planned |
| Letter analysis | ✓ | ✓ | Character DB | ✓ | 🟢 Planned |
| Taamim viewer | ✓ | ✓ | Character DB | ✓ | 🟢 Planned |
| Anagram solver | ✓ | ✓ | n/a | ✓ | 🟢 Planned |
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

- **Developer**: Aharon (roni762583@protonmail.com)
- **GitHub**: [bible-codes/bible-codes.github.io](https://github.com/bible-codes/bible-codes.github.io)
- **Related**: [bible-data-science.github.io](https://github.com/roni762583/bible-data-science.github.io)

---

*Last Updated: 2026-01-11*
