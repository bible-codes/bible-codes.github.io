# Hebrew Root Extraction System

Comprehensive client-side Hebrew root (שורש) extraction engine for Biblical and Modern Hebrew.

## Overview

This system extracts tri-literal and quad-literal Hebrew roots from words using a two-tier approach:

1. **Precomputed Lexicon** (primary): Fast lookup of ~56K Biblical Hebrew words
2. **Morphological Heuristics** (fallback): Pattern-based extraction for unknown words

## Components

### 1. Root Extraction Module (`engines/roots.js`)

Client-side JavaScript module for root extraction.

**Key Features:**
- Async initialization with lazy loading
- Batch processing support
- Confidence scoring
- Binyan (verbal stem) detection
- Morphological normalization

**Usage:**

```javascript
import { getRootExtractor } from './engines/roots.js';

// Initialize
const extractor = getRootExtractor();
await extractor.initialize();

// Extract single root
const result = await extractor.extractRoot('מדברים');
console.log(result);
// {
//   root: 'דבר',
//   binyan: 'piel',
//   pos: null,
//   method: 'lexicon',
//   confidence: 1.0
// }

// Extract multiple roots
const results = await extractor.extractRoots(['השמים', 'והארץ', 'ויאמר']);

// Find words with a specific root
const words = extractor.getWordsWithRoot('דבר');

// Check if word is in lexicon
const known = extractor.isKnownWord('ברא');

// Get statistics
const stats = extractor.getStats();
```

### 2. Root Lexicon (`data/embeddings/hebrew-roots.json.gz`)

Precomputed root mappings for Biblical Hebrew corpus.

**Statistics:**
- **56,118 word entries** (all unique words from Tanakh)
- **11,468 unique roots** identified
- **4 binyans detected**: qal, nifal, hifil, hitpael
- **691 KB compressed** size
- **~10-15 MB uncompressed** in memory

**Structure:**

```json
{
  "word": {
    "root": "שרש",
    "binyan": "qal|nifal|piel|...",
    "pos": "verb|noun|...",
    "confidence": 0.0-1.0,
    "metadata": { ... }
  }
}
```

### 3. Dictionary Schema (`db/dictionary-schema.js`)

IndexedDB schema for linguistic data storage.

**Object Stores:**
- `roots`: Word → root mappings (56K entries)
- `definitions`: Word definitions (Biblical + Modern)
- `embeddings`: Semantic word vectors
- `rootFeatures`: Root-level semantic features

### 4. Dictionary Loader (`db/dictionary-loader.js`)

Async loader for dictionary data into IndexedDB.

**Usage:**

```javascript
import { getDictionaryLoader } from './db/dictionary-loader.js';

const loader = getDictionaryLoader();

// Load all dictionary data
await loader.loadAll((store, loaded, total) => {
  console.log(`Loading ${store}: ${loaded}/${total}`);
});

// Load specific stores
await loader.loadRoots();
await loader.loadDefinitions();

// Check status
const status = await loader.getStatus();
```

### 5. Build Script (`build-root-lexicon.py`)

Python script to generate root lexicon from word database.

**Usage:**

```bash
python3 build-root-lexicon.py
```

**Process:**
1. Loads all `*-words.json.gz` files from `data/`
2. Extracts unique words
3. Applies morphological analysis
4. Generates `data/embeddings/hebrew-roots.json.gz`

### 6. Test Interface (`test-roots.html`)

Interactive web interface for testing root extraction.

**Features:**
- Single word testing
- Batch word testing
- Example word sets
- Confidence visualization
- Statistics dashboard

**Access:** Open `test-roots.html` in browser (requires local web server for CORS)

## Extraction Methods

### Lexicon Lookup (Primary)

Fast O(1) lookup in precomputed lexicon.

**Confidence:** 1.0 (exact match) or 0.9 (stripped match)

### Heuristic Extraction (Fallback)

Pattern-based extraction using Hebrew morphology rules.

**Rules:**

| Word Length | Method | Example |
|-------------|--------|---------|
| 3 letters | Already tri-literal | דבר → דבר |
| 4 letters | Strip binyan prefix | נשבר → שבר |
| 4 letters | Check reduplication | פרפר → פר |
| 5+ letters | Extract middle 3 | מדברים → דבר |

**Confidence:** 0.3-0.7 depending on pattern strength

### Affix Stripping

**Prefixes:** ה, ו, ב, כ, ל, מ, ש

**Suffixes:** ים, ות, יהם, הם, כם, נו, ה, י, ך, ו, ת

## Binyan Detection

Simplified binyan (verbal stem) detection:

| Binyan | Pattern | Example |
|--------|---------|---------|
| Qal | פָּעַל | דבר |
| Nifal | נִפְעַל | נשבר |
| Piel | פִּעֵל | דבר |
| Hifil | הִפְעִיל | הקדים |
| Hitpael | הִתְפַּעֵל | התפלל |

**Note:** Without niqqud, binyan detection is approximate.

## Performance

### Memory Usage

- **Lexicon (uncompressed):** ~10-15 MB
- **IndexedDB storage:** ~700 KB (compressed on disk)
- **Runtime overhead:** Minimal (<1 MB)

### Speed

- **Lexicon lookup:** <1 ms per word
- **Heuristic extraction:** <1 ms per word
- **Batch processing (1000 words):** ~100-200 ms

### Browser Compatibility

- **Chrome/Edge:** Full support
- **Firefox:** Full support
- **Safari:** Full support (iOS 15.4+)
- **Requires:** IndexedDB, Compression Streams API

## Integration with Tsirufim

The root extraction system is designed for semantic permutation analysis:

```javascript
import { getRootExtractor } from './engines/roots.js';

// Extract roots from permutation candidates
const candidates = ['משה', 'שמה', 'המש', 'שהם'];
const extractor = getRootExtractor();
const roots = await extractor.extractRoots(candidates);

// Build semantic features
const semanticFeatures = roots.map(r => ({
  word: r.original,
  root: r.root,
  rootEmbedding: getEmbedding(r.root),
  binyan: r.binyan,
  confidence: r.confidence
}));

// Cluster by root similarity
const clusters = clusterByRoot(semanticFeatures);
```

## Future Enhancements

### High Priority

1. **AlephBERT Integration**
   - Use pre-trained Hebrew BERT for contextual root extraction
   - Improves accuracy to 95%+ (vs current ~70%)
   - Requires loading transformer model (~400 MB)

2. **Niqqud-Aware Analysis**
   - Parse vowel points for accurate binyan detection
   - Distinguish homographs (דבר vs דָּבָר)

3. **POS Tagging**
   - Integrate part-of-speech tagger
   - Improve extraction for nouns vs verbs

### Medium Priority

4. **Modern Hebrew Support**
   - Expand lexicon with modern vocabulary
   - Handle neologisms and slang

5. **Rabbinic Hebrew**
   - Add Mishnaic and Talmudic roots
   - Handle Aramaic cognates

6. **Root Semantic Features**
   - Categorize roots (action, state, object)
   - Build root similarity network

### Low Priority

7. **Etymology Data**
   - Link to root origins
   - Show related Semitic roots

8. **Usage Statistics**
   - Frequency counts per root
   - Distribution across Biblical books

## Technical Architecture

```
User Query
    ↓
getRootExtractor()
    ↓
Initialize → Load hebrew-roots.json.gz
    ↓
extractRoot(word)
    ↓
1. Normalize (remove niqqud, final letters)
    ↓
2. Lexicon Lookup
    ├─ Found → Return (confidence: 1.0)
    └─ Not Found → Continue
         ↓
3. Strip Affixes + Lexicon Lookup
    ├─ Found → Return (confidence: 0.9)
    └─ Not Found → Continue
         ↓
4. Heuristic Extraction
    ├─ Detect binyan pattern
    ├─ Apply morphological rules
    └─ Return (confidence: 0.3-0.7)
```

## Troubleshooting

### Lexicon Not Loading

**Symptom:** Console warning: "Root lexicon not found, using heuristic mode only"

**Causes:**
- Missing `data/embeddings/hebrew-roots.json.gz`
- CORS blocking (must use web server, not `file://`)
- Compression Streams API not supported (old browser)

**Solution:**
```bash
# Rebuild lexicon
python3 build-root-lexicon.py

# Start local server
python3 -m http.server 8000
# Open http://localhost:8000/test-roots.html
```

### Low Confidence Scores

**Symptom:** Many results with confidence < 0.5

**Cause:** Word not in Biblical lexicon (modern Hebrew, typo, or rare form)

**Solutions:**
1. Add modern Hebrew dictionary
2. Manual correction of typos
3. Accept lower confidence for exploratory analysis

### Memory Issues

**Symptom:** Browser crashes or slows down

**Cause:** Loading full lexicon on low-memory device

**Solution:**
```javascript
// Load only when needed
const extractor = getRootExtractor();
// Don't call initialize() until user action

// Or use Web Worker
const worker = new Worker('root-extractor.worker.js');
```

## Contributing

To improve the root extraction accuracy:

1. **Add training data**: Annotate more words with correct roots
2. **Improve heuristics**: Refine pattern matching rules
3. **Add dictionary sources**: Integrate Even-Shoshan, Klein, etc.
4. **Machine learning**: Train custom Hebrew morphological analyzer

## License

Part of the Hebrew Bible Analysis Suite - See main project for license.

## References

- [Hebrew Morphology](https://en.wikipedia.org/wiki/Hebrew_grammar#Verbs)
- [Binyan System](https://en.wikipedia.org/wiki/Binyan)
- [AlephBERT](https://huggingface.co/onlplab/alephbert-base)
- [YAP Morphological Analyzer](https://github.com/OnlpLab/yap)
