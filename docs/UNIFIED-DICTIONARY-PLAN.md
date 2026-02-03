# Unified Hebrew Dictionary System - Technical Plan

## Current Status: 70% Complete ✅

**Unified Dictionary Built**: 82,151 entries with provenance tracking
**Inflection Mapping**: 50,037 inflected forms linked to lemmas
**Era Classification**: Biblical (9,340), Modern (19,602), Rabbinic (2,022), Medieval (39)
**Total PWA Size**: ~5.3 MB compressed (works 100% offline)

---

## Overview

Create a comprehensive offline Hebrew dictionary for the PWA that:
1. ✅ Merges multiple sources into a unified superset
2. ✅ Maps inflected forms to their roots
3. ✅ Tracks provenance (source dictionaries)
4. ✅ Categorizes words by era/type (Biblical, Rabbinic, Modern, Foreign)
5. ✅ Works 100% offline after initial download

---

## 1. Data Sources

### 1.1 Currently Implemented
| Source | Words | Roots | Definitions | Status |
|--------|-------|-------|-------------|--------|
| Tanakh Extracted | 56,118 | Heuristic | No | ✅ Done |
| BDB (Open Scriptures) | 6,893 | Verified | Yes | ✅ Done |
| Hebrew Wiktionary | 27,598 | 9,105 verified | Yes | ✅ Done |
| **Unified (merged)** | **82,151** | **62,779 (76%)** | Yes | ✅ Done |

### 1.2 To Be Added
| Source | Est. Words | Roots | Definitions | Priority |
|--------|-----------|-------|-------------|----------|
| Hebrew Wikipedia | ~500,000 | No | No | 🟡 MEDIUM |
| Strong's Concordance | ~8,674 | Yes | Yes | 🟡 MEDIUM |
| Even-Shoshan Dict | ~80,000 | Yes | Yes | 🟢 LOW (licensing) |

### 1.3 Source Characteristics
```
BDB (1906)          → Biblical Hebrew, academic, verified roots
Wiktionary          → Modern + Biblical, community-sourced, structured
Wikipedia           → Modern vocabulary, proper nouns, technical terms
Strong's            → Biblical Hebrew, cross-referenced to verses
Tanakh Extracted    → All Biblical word forms, heuristic analysis
```

---

## 2. Unified Schema

### 2.1 Word Entry Structure
```javascript
{
  // Primary key: normalized consonantal form
  "word": "אברהם",

  // Linguistic data
  "root": "אברהם",           // Root letters (null if unknown)
  "rootConfidence": 1.0,     // 0.0-1.0 confidence score
  "lemma": "אברהם",          // Dictionary form (for inflected words)
  "pos": "proper_noun",      // Part of speech
  "binyan": null,            // Verb pattern (for verbs)

  // Definitions (merged from all sources)
  "definitions": [
    { "text": "Abraham, patriarch", "source": "bdb", "lang": "en" },
    { "text": "אברהם אבינו", "source": "wiktionary", "lang": "he" }
  ],

  // Era/Type classification
  "era": "biblical",         // biblical | rabbinic | medieval | modern
  "type": "native",          // native | loanword | acronym | foreign
  "domain": null,            // legal | liturgical | scientific | etc.

  // Provenance tracking
  "sources": ["bdb", "wiktionary", "tanakh"],
  "sourceData": {
    "bdb": { "id": "a.ab.ac", "refs": ["Gen.12.1"] },
    "wiktionary": { "pageId": 12345 },
    "tanakh": { "occurrences": 175 }
  },

  // Cross-references
  "refs": {
    "biblical": ["Gen.12.1", "Gen.17.5"],  // Verse references
    "related": ["אברם", "אב"],              // Related words
  },

  // Metadata
  "normalized": "אברהמ",     // Consonantal, no finals
  "variants": ["אברם"],      // Spelling variants
  "frequency": {
    "tanakh": 175,           // Occurrences in Tanakh
    "modern": null           // Modern corpus frequency
  }
}
```

### 2.2 Inflection Mapping Table
```javascript
// Separate table linking inflected forms to lemmas
{
  "inflected": "אבדו",      // Inflected form
  "lemma": "אבד",           // Dictionary form
  "root": "אבד",            // Root
  "inflection": {
    "type": "verb",
    "binyan": "qal",
    "tense": "past",
    "person": 3,
    "number": "plural",
    "gender": "masculine"
  },
  "sources": ["wiktionary", "morphology"]
}
```

---

## 3. Data Pipeline

### 3.1 Extraction Phase
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   BDB XML   │    │ Wiktionary  │    │  Wikipedia  │
│   (local)   │    │   (dump)    │    │   (dump)    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Parse XML   │    │ Parse Wiki  │    │ Tokenize    │
│ Extract     │    │ Templates   │    │ Hebrew text │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│              Source-Specific JSON Files             │
│  bdb.json  |  wiktionary.json  |  wikipedia.json   │
└─────────────────────────────────────────────────────┘
```

### 3.2 Normalization Phase
```
For each word from each source:
  1. Remove niqqud (vowel points)
  2. Convert final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ)
  3. Generate normalized key
  4. Preserve original form in 'variants'
```

### 3.3 Merge Phase
```
┌─────────────────────────────────────────────────────┐
│                   Merge Algorithm                    │
├─────────────────────────────────────────────────────┤
│ 1. Create empty unified dictionary                  │
│ 2. For each source (in priority order):             │
│    a. For each word in source:                      │
│       - Normalize word → key                        │
│       - If key exists in unified:                   │
│         • Merge definitions (dedupe)                │
│         • Add source to sources[]                   │
│         • Merge sourceData                          │
│         • Take higher-confidence root               │
│         • Merge refs                                │
│       - Else:                                       │
│         • Create new entry                          │
│ 3. Build inflection→lemma mapping                   │
│ 4. Calculate frequency statistics                   │
│ 5. Classify era/type based on source presence       │
└─────────────────────────────────────────────────────┘
```

### 3.4 Classification Rules
```javascript
// Era classification
function classifyEra(entry) {
  if (entry.sources.includes('bdb') || entry.sourceData.tanakh?.occurrences > 0) {
    return 'biblical';
  }
  if (entry.sources.includes('strong')) {
    return 'biblical';
  }
  // Check Wiktionary etymology for rabbinic/medieval markers
  if (hasRabbinicMarker(entry)) return 'rabbinic';
  if (hasMedievalMarker(entry)) return 'medieval';
  return 'modern';
}

// Type classification
function classifyType(entry) {
  if (isForeignLoanword(entry)) return 'loanword';
  if (isAcronym(entry)) return 'acronym';
  if (isProperNoun(entry)) return 'proper_noun';
  return 'native';
}
```

---

## 4. Deduplication Strategy

### 4.1 Exact Duplicates
- Same normalized form from multiple sources → merge into single entry
- Track all sources in `sources[]` array

### 4.2 Variant Forms
- Spelling variants (אברהם/אברם) → link via `variants[]`
- Final/non-final letter differences → normalize, but preserve original

### 4.3 Inflection Handling
```
אבד (root) ─┬─ אבד (qal past 3ms)
            ├─ אבדה (qal past 3fs)
            ├─ אבדו (qal past 3mp)
            ├─ יאבד (qal impf 3ms)
            ├─ תאבד (qal impf 3fs)
            ├─ אובד (qal ptc ms)
            └─ ... (many more forms)
```

**Strategy**:
1. Store ALL forms in unified dictionary (for lookup/validation)
2. Link each inflected form to its lemma
3. In UI, show lemma but allow search by any form

### 4.4 Homographs
- Same spelling, different meanings/roots
- Store as single entry with multiple definition groups
- Example: בר = "son" (Aramaic) OR "grain" (Hebrew) OR "pure" (Hebrew)

---

## 5. Inflection→Root Mapping

### 5.1 Data Sources for Mapping
1. **Wiktionary**: Has conjugation tables for many verbs
2. **BDB**: Groups entries by root
3. **Morphological Analysis**: Apply Hebrew morphology rules
4. **MILA Hebrew Morphological Analyzer**: Open source tool (if available)

### 5.2 Mapping Algorithm
```javascript
async function mapInflectionToRoot(word) {
  // 1. Check Wiktionary data (highest confidence)
  const wiktionaryData = await lookupWiktionary(word);
  if (wiktionaryData?.root) {
    return { root: wiktionaryData.root, confidence: 0.95, source: 'wiktionary' };
  }

  // 2. Check BDB data
  const bdbData = await lookupBDB(word);
  if (bdbData?.root) {
    return { root: bdbData.root, confidence: 0.90, source: 'bdb' };
  }

  // 3. Apply morphological heuristics
  const heuristicRoot = applyMorphologyRules(word);
  if (heuristicRoot) {
    return { root: heuristicRoot.root, confidence: heuristicRoot.confidence, source: 'morphology' };
  }

  // 4. Fallback: word itself as potential root
  if (word.length === 3) {
    return { root: word, confidence: 0.5, source: 'guess' };
  }

  return { root: null, confidence: 0, source: null };
}
```

### 5.3 Morphology Rules (Heuristic)
```javascript
const MORPHOLOGY_RULES = {
  // Prefix stripping
  prefixes: {
    'ה': { type: 'definite_article', strip: true },
    'ו': { type: 'conjunction', strip: true },
    'ב': { type: 'preposition', strip: true },
    'כ': { type: 'preposition', strip: true },
    'ל': { type: 'preposition', strip: true },
    'מ': { type: 'preposition', strip: true },
    'ש': { type: 'relative', strip: true },
  },

  // Suffix stripping
  suffixes: {
    'ים': { type: 'masculine_plural', strip: true },
    'ות': { type: 'feminine_plural', strip: true },
    'ה': { type: 'feminine_singular', strip: true },
    'י': { type: 'possessive_1s', strip: true },
    'ך': { type: 'possessive_2ms', strip: true },
    'נו': { type: 'possessive_1p', strip: true },
    // ... more patterns
  },

  // Binyan patterns (verb forms)
  binyanim: {
    'נ___': { binyan: 'nifal', rootPositions: [1,2,3] },
    'ה___': { binyan: 'hifil', rootPositions: [1,2,3] },
    'הת___': { binyan: 'hitpael', rootPositions: [2,3,4] },
    // ... more patterns
  }
};
```

---

## 6. File Structure

### 6.1 Source Files (Build-Time)
```
data/
├── dictionaries/
│   ├── sources/
│   │   ├── bdb-raw.xml              # Original BDB
│   │   ├── wiktionary-dump.xml      # Wiktionary dump
│   │   └── wikipedia-tokens.txt     # Wikipedia word list
│   │
│   ├── processed/
│   │   ├── openscriptures-bdb.json.gz      # Processed BDB
│   │   ├── hebrew-wiktionary.json.gz       # Processed Wiktionary
│   │   ├── hebrew-wikipedia.json.gz        # Processed Wikipedia
│   │   └── tanakh-words.json.gz            # Existing Tanakh extraction
│   │
│   └── unified/
│       ├── hebrew-unified.json.gz          # Main unified dictionary
│       ├── inflection-map.json.gz          # Inflection→lemma mapping
│       └── metadata.json                   # Build info, statistics
```

### 6.2 Runtime Files (PWA)
```
data/dictionaries/
├── unified/
│   ├── hebrew-unified.json.gz      # 2,324 KB (82K entries)
│   └── inflection-map.json.gz      # 263 KB (50K mappings)
├── openscriptures-bdb.json.gz      # 115 KB (6.9K entries)
└── hebrew-wiktionary.json.gz       # 1,872 KB (27K entries)
data/embeddings/
└── hebrew-roots.json.gz            # ~700 KB (56K entries)
```

### 6.3 Actual Sizes (Achieved)
| File | Entries | Compressed |
|------|---------|------------|
| Unified Dictionary | 82,151 | 2,324 KB |
| Inflection Map | 50,037 | 263 KB |
| BDB | 6,893 | 115 KB |
| Wiktionary | 27,598 | 1,872 KB |
| Tanakh Roots | 56,118 | ~700 KB |
| **Total PWA Dictionary Data** | - | **~5.3 MB** |

---

## 7. Implementation Phases

### Phase 1: Wiktionary Integration ✅ COMPLETE
- [x] Download Hebrew Wiktionary dump (79MB uncompressed)
- [x] Parse wiki markup, extract structured data
- [x] Build wiktionary dictionary file (27,598 entries)
- [x] Test and validate

### Phase 2: Wikipedia Vocabulary 🔴 PENDING
- [ ] Download Hebrew Wikipedia dump
- [ ] Tokenize and extract unique Hebrew words
- [ ] Filter (remove numbers, foreign, short)
- [ ] Build wikipedia word list

### Phase 3: Strong's Concordance 🔴 PENDING
- [ ] Find/download Strong's Hebrew data
- [ ] Parse and structure
- [ ] Merge with BDB for verse references

### Phase 4: Merge & Deduplicate ✅ COMPLETE
- [x] Implement merge algorithm (tools/build-unified-dict.py)
- [x] Build unified dictionary (82,151 entries)
- [x] Generate inflection map (50,037 mappings)
- [x] Classify era/type (biblical, rabbinic, medieval, modern)

### Phase 5: Client Integration ✅ COMPLETE
- [x] Update dictionary-service.js with unified source
- [x] Add unified dictionary loader
- [x] Implement search across unified data
- [x] Add era-based search (searchByEra)
- [x] Add inflection map support (getLemma, getInflections)
- [x] Update test page (test-dictionaries.html)

### Phase 6: PWA Optimization ✅ COMPLETE
- [x] Optimize file sizes (~5.3MB total compressed)
- [x] Update service worker caching (v5.2)
- [x] Test offline functionality
- [ ] Performance testing (ongoing)

**Completed: ~70% | Remaining: Wikipedia + Strong's**

---

## 8. API Design

### 8.1 Dictionary Service API
```javascript
// Initialize with unified dictionary
await dictService.initialize(['unified']);

// Look up word (searches unified, returns all data)
const result = dictService.lookup('אברהם');
// Returns: { word, root, definitions, era, sources, refs, ... }

// Get root for any word form
const root = dictService.getRoot('אבדו');
// Returns: { root: 'אבד', lemma: 'אבד', confidence: 0.95 }

// Search by criteria
const words = dictService.search({
  root: 'אבד',
  era: 'biblical',
  pos: 'verb',
  limit: 50
});

// Get all words in dictionary
const allWords = dictService.getAllWords();
// Returns: Set of 100K+ words

// Check if word exists
const exists = dictService.isKnownWord('שלום');
// Returns: true/false

// Get inflections for a lemma
const forms = dictService.getInflections('אבד');
// Returns: ['אבד', 'אבדה', 'אבדו', 'יאבד', ...]
```

---

## 9. Quality Metrics

### 9.1 Coverage Goals
| Metric | Target |
|--------|--------|
| Biblical Hebrew words | 100% coverage |
| Biblical Hebrew roots | 95%+ with verified root |
| Modern Hebrew lemmas | 80%+ coverage |
| Inflection mapping | 90%+ accuracy |

### 9.2 Validation
- Cross-check BDB roots against Wiktionary
- Verify Biblical word coverage against Tanakh extraction
- Sample manual review of merged entries
- Test common word lookups

---

## 10. Future Enhancements

1. **Hebrew Academy Dictionary**: If licensing permits
2. **Talmudic Hebrew**: Add Rabbinic literature vocabulary
3. **Arabic cognates**: For etymological research
4. **User contributions**: Allow users to suggest corrections
5. **Frequency data**: Modern corpus frequency rankings

---

*Document created: 2026-02-03*
*Status: Planning - ready for implementation*
