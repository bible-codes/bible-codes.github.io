# Phase 2 Implementation Plan: Database Infrastructure

**Date**: 2026-01-11
**Status**: Phase 1 ✅ COMPLETED | Phase 2 🟡 IN PROGRESS

---

## Current State Analysis

### ✅ What We Have (Phase 1 Complete)

#### Structure & Documentation
- [x] Unified dashboard (index.html)
- [x] ELS search tool (bible-codes.html)
- [x] Comprehensive CLAUDE.md with full architecture
- [x] Updated README.md with PWA details
- [x] Service worker (sw.js) for offline caching
- [x] PWA manifest (manifest.json)

#### Existing Data & Code
- [x] Torah text (data/torahNoSpaces.txt - 610KB, consonantal only)
- [x] Precomputed ELS terms (data/precomputed-terms.json)
- [x] ELS search algorithms (js/search-algorithms.js)
  - KMP search implementation
  - Boyer-Moore implementation
  - Hash-based lookups
- [x] Torah text loader (js/load-torah.js)
- [x] Basic UI integration (js/test.js)

#### Reference Materials
- [x] Python ELS engine in torah-codes/ subdirectory
  - Full Tanach texts (Koren, Leningrad, MAM versions)
  - Character-by-character parsing modules
  - Gematria calculation modules
  - JSON formatted texts with verse structure

---

## 🔴 Critical Gaps

### Missing Infrastructure
- [ ] **No IndexedDB implementation** - Need entire DB layer
- [ ] **No character-level database** - Core architecture not built
- [ ] **No data ingestion pipeline** - No way to generate char/word/verse tables
- [ ] **No directory structure** - Missing db/, engines/, ui/ directories
- [ ] **No Web Workers** - Heavy searches will block UI

### Missing Data
- [ ] **chars.json.gz** - Character-level database (target: ~10-50MB)
- [ ] **words.json.gz** - Word table with metadata
- [ ] **verses.json.gz** - Verse table with references
- [ ] **No niqqud/taamim data** - Only consonantal text available
- [ ] **No full Tanach** - Only Torah (5 books), need all 24 books

### Current Limitations
- **ELS only works on Torah** (not full Tanach)
- **No gematria calculations** implemented
- **No text search** beyond ELS
- **No verse navigation**
- **No structured data access**

---

## Phase 2: Database Infrastructure - Prioritized Tasks

### 🔴 **Priority 1: Minimum Viable Database** (Week 1)

Goal: Get a working character database with Genesis only as proof-of-concept

#### Task 2.1: Create Directory Structure
```bash
mkdir -p db engines ui tools
```

**Files to create:**
- `db/schema.js` - IndexedDB schema definitions
- `db/loader.js` - Load data into IndexedDB
- `db/query.js` - Query utilities
- `tools/build-database.py` - Python data ingestion script

#### Task 2.2: Design IndexedDB Schema (db/schema.js)
```javascript
// Database name: BibleAnalysisDB
// Version: 1

// Object Stores:
// 1. chars - character table (global id as key)
// 2. words - word table (word_id as key)
// 3. verses - verse table (verse_id as key)
// 4. metadata - app metadata

// Indices:
// chars: by book, by chapter, by verse, by char
// words: by book, by chapter, by verse, by gematria
// verses: by book, by chapter, by gematria
```

**Deliverable**: `db/schema.js` with schema version 1

#### Task 2.3: Build Data Ingestion Script (Python)
**Input**:
- `torah-codes/texts/text_koren_1genesis.txt` (or similar)

**Output**:
- `data/genesis-chars.json` - Character array for Genesis
- `data/genesis-words.json` - Word array for Genesis
- `data/genesis-verses.json` - Verse array for Genesis

**Script**: `tools/build-database.py`

```python
# Pseudocode
# 1. Read Genesis text file
# 2. Parse into book/chapter/verse/word structure
# 3. Iterate each character:
#    - Assign global id
#    - Extract base char (א-ת)
#    - Extract niqqud (if present)
#    - Calculate gematria
#    - Store position metadata
# 4. Build word table (aggregate chars)
# 5. Build verse table (aggregate words)
# 6. Output JSON files
```

**Deliverable**: 3 JSON files for Genesis (~1-2MB total)

#### Task 2.4: Implement IndexedDB Loader (db/loader.js)
```javascript
// Functions:
// - initDatabase() - Create/open database
// - loadChars(jsonData) - Load character table
// - loadWords(jsonData) - Load word table
// - loadVerses(jsonData) - Load verse table
// - getLoadStatus() - Check what's loaded
```

**Deliverable**: `db/loader.js` with async data loading

#### Task 2.5: Create Simple Query API (db/query.js)
```javascript
// Basic queries:
// - getCharById(id)
// - getCharsByVerse(book, chapter, verse)
// - getWord(wordId)
// - getVerse(book, chapter, verse)
// - searchByGematria(value, method)
```

**Deliverable**: `db/query.js` with query functions

#### Task 2.6: Test Page for Database
Create `test-db.html` to verify:
- Database loads
- Queries work
- Performance is acceptable

---

### 🟡 **Priority 2: Core Search Engines** (Week 2)

#### Task 2.7: Text Search Engine (engines/search.js)
- Keyword search across verses
- Pattern matching
- First/last letter filtering
- Uses IndexedDB query API

#### Task 2.8: Gematria Engine (engines/gematria.js)
- Calculate gematria (standard, reduced, ordinal)
- Search by value
- Word and verse level

#### Task 2.9: ELS Web Worker (engines/els.worker.js)
- Port existing ELS code to Web Worker
- Use IndexedDB from worker context
- Progress callbacks
- Cancellable searches

---

### 🟢 **Priority 3: Scale to Full Torah** (Week 3)

#### Task 2.10: Expand Data Pipeline
- Process all 5 books of Torah
- Generate chars.json.gz (compressed)
- Implement lazy loading by book

#### Task 2.11: Performance Testing
- Test on mobile devices
- Optimize queries
- Measure IndexedDB quota usage

---

## Success Criteria for Phase 2

### Minimum Viable Product (MVP)
- [ ] IndexedDB schema implemented and tested
- [ ] Genesis loaded into database
- [ ] Character-level queries working
- [ ] Simple text search functional
- [ ] Gematria calculations working
- [ ] Database size < 5MB for Genesis

### Stretch Goals
- [ ] Full Torah (5 books) in database
- [ ] ELS search using Web Worker
- [ ] Gematria search by value
- [ ] Performance < 100ms for simple queries

---

## Technical Decisions

### Text Source
**Decision**: Use Koren text from torah-codes/texts/
**Reason**: Already have it, pure Hebrew consonants, well-structured

**Alternative**: Leningrad Codex (has JSON structure already)
**Consideration**: JSON format easier to parse, includes verse structure

### Database Size Strategy
**Target**: 10-20MB for full Torah, 50-100MB for full Tanach
**Approach**:
- Use compressed JSON (gzip)
- Load on first app run
- Cache in IndexedDB

### Niqqud/Taamim
**Phase 2 Decision**: Skip for now, use consonantal text only
**Future**: Add in Phase 5 when we have bandwidth

---

## Risks & Mitigations

### Risk 1: IndexedDB Quota
**Mitigation**: Test early, implement quota monitoring, provide user feedback

### Risk 2: Performance on Mobile
**Mitigation**: Test on low-end Android, optimize queries, use Web Workers

### Risk 3: Data Pipeline Complexity
**Mitigation**: Start with Genesis only, iterate on one book before scaling

### Risk 4: Unicode Normalization
**Mitigation**: Test NFD normalization, document Hebrew character handling

---

## Next Immediate Steps

1. **Create directory structure** (5 min)
   ```bash
   mkdir -p db engines ui tools
   ```

2. **Draft db/schema.js** (1 hour)
   - Define object stores
   - Define indices
   - Write init function

3. **Draft tools/build-database.py** (2-3 hours)
   - Parse Genesis text
   - Build character array
   - Output JSON

4. **Test with sample data** (30 min)
   - Load 1 chapter into IndexedDB
   - Verify structure
   - Test query performance

5. **Document findings** (30 min)
   - Update this plan
   - Note any blockers

---

## Resources Needed

### From torah-codes/ Project
- [x] Genesis text file (text_koren_1genesis.txt or text_leningrad_1genesis.json)
- [ ] Understanding of verse structure
- [ ] Gematria calculation logic (can port from Python)

### New Development
- [ ] IndexedDB expertise (browser API)
- [ ] Web Worker implementation
- [ ] Data compression (gzip in browser)

---

## Timeline Estimate

| Task | Hours | Priority |
|------|-------|----------|
| Directory setup | 0.1 | 🔴 |
| Schema design | 1 | 🔴 |
| Data ingestion script | 3 | 🔴 |
| IndexedDB loader | 2 | 🔴 |
| Query API | 2 | 🔴 |
| Test page | 1 | 🔴 |
| Text search engine | 3 | 🟡 |
| Gematria engine | 2 | 🟡 |
| ELS Web Worker | 4 | 🟡 |
| Scale to full Torah | 3 | 🟢 |
| **Total** | **21 hours** | |

**Realistic Timeline**: 2-3 weeks part-time

---

*Last Updated: 2026-01-11*
