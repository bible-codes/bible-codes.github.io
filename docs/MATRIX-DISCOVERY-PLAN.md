# Matrix Term Discovery & Statistical Significance - Technical Plan

## Overview

This document outlines the design for discovering additional ELS terms within a defined matrix region and calculating their statistical significance, following the methodology of Witztum, Rips, and Rosenberg (WRR, 1994).

---

## 1. Problem Statement

Given:
- One or more primary ELS search results (e.g., "אברהם" and "שרה" found in proximity)
- A defined matrix region around these results

Find:
- Additional valid Hebrew terms (words, names, dates) appearing as ELS within the matrix
- Statistical measure of how significant these findings are vs. chance

---

## 2. The WRR Methodology (Statistical Science, 1994)

### 2.1 Key Concepts

**Expected Frequency of a Word**:
For a word W of length L with letters w₁, w₂, ..., wₗ appearing in a text of length N:

```
Expected occurrences ≈ N × ∏(freq(wᵢ)) / skip_range
```

Where:
- `freq(wᵢ)` = frequency of letter wᵢ in the text
- Longer words = exponentially less likely

**Proximity Measure**:
WRR defined proximity as the minimum "distance" between two ELS patterns in the 2D matrix representation. The matrix width equals the skip value.

**Statistical Test**:
1. Define a list of word pairs (e.g., famous rabbis + their birth/death dates)
2. Search for each pair in the Torah
3. Measure the proximity of found pairs
4. Compare to control texts (permuted Torah)
5. Calculate P-value: probability of observing such proximity by chance

### 2.2 Control Texts

WRR used permutations of the Torah:
- Same letters, different arrangement
- Preserves letter frequencies
- Destroys any "designed" patterns

Methods:
1. **Random permutation**: Shuffle all letters
2. **Word permutation**: Shuffle words within verses
3. **Verse permutation**: Shuffle verses within chapters

---

## 3. Proposed Architecture

### 3.1 Data Structures

```javascript
// Matrix region definition
interface MatrixRegion {
  centerPosition: number;      // Center of the region
  radius: number;              // Characters before/after center
  primaryResults: ELSResult[]; // The results that defined this region
  skipRange: {min: number, max: number}; // Skip values to search
}

// Discovery result
interface DiscoveredTerm {
  term: string;                // The Hebrew word
  termType: 'word' | 'name' | 'place' | 'date' | 'user';
  startIndex: number;          // Position in text
  skip: number;                // ELS skip value
  positions: number[];         // All letter positions
  distanceToCenter: number;    // Distance from matrix center
  proximityToPrimary: number;  // Min distance to primary terms
  expectedOccurrences: number; // Statistical expectation
  significance: number;        // P-value or z-score
}

// Statistical analysis
interface StatisticalReport {
  region: MatrixRegion;
  primaryTerms: string[];
  discoveredTerms: DiscoveredTerm[];
  overallSignificance: number;
  controlComparison: {
    observedProximity: number;
    expectedProximity: number;
    pValue: number;
  };
}
```

### 3.2 Dictionary/Lexicon Structure

```javascript
// Dictionary categories
const TERM_CATEGORIES = {
  // Hebrew words (existing 56K dictionary)
  words: {
    source: 'data/hebrew-dictionary.json',
    minLength: 4,  // Skip very short words
    maxLength: 10,
  },

  // Biblical names
  names: {
    source: 'data/biblical-names.json',
    // ~3000 names from Tanach
    // Include: אברהם, יצחק, יעקב, משה, דוד, שלמה, etc.
  },

  // Place names
  places: {
    source: 'data/biblical-places.json',
    // Jerusalem, Egypt, Babylon, etc.
    // Hebrew: ירושלים, מצרים, בבל
  },

  // Hebrew dates
  dates: {
    source: 'data/hebrew-dates.json',
    // Generate: כה תשרי, יד אדר, etc.
    // Include year numbers: התשפו, etc.
  },

  // User-defined terms
  user: {
    source: 'localStorage',
    // Terms the user wants to search for
  }
};
```

### 3.3 Algorithm: Matrix Term Discovery

```javascript
async function discoverTermsInMatrix(region: MatrixRegion, options: DiscoveryOptions) {
  const results: DiscoveredTerm[] = [];

  // 1. Load dictionary terms filtered by length
  const terms = await loadFilteredDictionary(options.categories, {
    minLength: options.minTermLength || 4,
    maxLength: options.maxTermLength || 10,
  });

  // 2. For each term, search within the matrix region
  for (const term of terms) {
    // Calculate valid skip range for this term within the region
    const maxSkip = Math.floor(region.radius * 2 / term.length);
    const skipRange = {
      min: Math.max(2, region.skipRange.min),
      max: Math.min(maxSkip, region.skipRange.max)
    };

    // 3. Search for ELS occurrences
    const occurrences = searchELSInRegion(
      term,
      region.centerPosition - region.radius,
      region.centerPosition + region.radius,
      skipRange
    );

    // 4. Calculate statistics for each occurrence
    for (const occ of occurrences) {
      const proximity = calculateProximityToPrimary(occ, region.primaryResults);
      const expected = calculateExpectedOccurrences(term, region);
      const significance = calculateSignificance(occ, expected, proximity);

      results.push({
        term: term.text,
        termType: term.category,
        startIndex: occ.startIndex,
        skip: occ.skip,
        positions: occ.positions,
        distanceToCenter: Math.abs(occ.centerPosition - region.centerPosition),
        proximityToPrimary: proximity,
        expectedOccurrences: expected,
        significance: significance
      });
    }
  }

  // 5. Sort by significance
  results.sort((a, b) => a.significance - b.significance);

  return results;
}
```

### 3.4 Statistical Calculations

```javascript
// Letter frequencies in Koren Torah (304,805 letters)
const LETTER_FREQUENCIES = {
  'א': 27059 / 304805,  // ~0.0888
  'ב': 16345 / 304805,  // ~0.0536
  'ג': 2109 / 304805,   // ~0.0069
  'ד': 7032 / 304805,   // ~0.0231
  'ה': 28056 / 304805,  // ~0.0920
  'ו': 30513 / 304805,  // ~0.1001
  'ז': 2198 / 304805,   // ~0.0072
  'ח': 7189 / 304805,   // ~0.0236
  'ט': 1804 / 304805,   // ~0.0059
  'י': 31531 / 304805,  // ~0.1034
  'כ': 11968 / 304805,  // ~0.0393
  'ך': 3358 / 304805,   // ~0.0110
  'ל': 21570 / 304805,  // ~0.0708
  'מ': 25090 / 304805,  // ~0.0823
  'ם': 10624 / 304805,  // ~0.0349
  'נ': 14126 / 304805,  // ~0.0463
  'ן': 4259 / 304805,   // ~0.0140
  'ס': 1833 / 304805,   // ~0.0060
  'ע': 11250 / 304805,  // ~0.0369
  'פ': 4805 / 304805,   // ~0.0158
  'ף': 830 / 304805,    // ~0.0027
  'צ': 3962 / 304805,   // ~0.0130
  'ץ': 1035 / 304805,   // ~0.0034
  'ק': 4695 / 304805,   // ~0.0154
  'ר': 18125 / 304805,  // ~0.0595
  'ש': 15595 / 304805,  // ~0.0512
  'ת': 17950 / 304805,  // ~0.0589
};

/**
 * Calculate expected occurrences of a word as ELS
 * Based on letter frequencies and search parameters
 */
function calculateExpectedOccurrences(term, region) {
  const textLength = region.radius * 2;
  const skipRange = region.skipRange.max - region.skipRange.min + 1;

  // Probability of finding this specific letter sequence
  let letterProb = 1;
  for (const letter of term) {
    letterProb *= LETTER_FREQUENCIES[letter] || 0.01;
  }

  // Number of possible starting positions × skip values
  const opportunities = textLength * skipRange;

  // Expected = opportunities × probability
  return opportunities * letterProb;
}

/**
 * Calculate significance (p-value) of finding a term
 * Using Poisson distribution approximation
 */
function calculateSignificance(occurrence, expectedCount, proximity) {
  // If expected < 1, finding even one is significant
  // Use Poisson probability: P(X ≥ 1) = 1 - e^(-λ)
  const poissonProb = 1 - Math.exp(-expectedCount);

  // Adjust for proximity (closer = more significant)
  // This is a simplification - WRR used more complex measures
  const proximityFactor = 1 / (1 + proximity / 1000);

  return poissonProb * proximityFactor;
}

/**
 * Calculate proximity between two ELS patterns
 * Using 2D matrix distance (WRR method)
 */
function calculateProximity(result1, result2) {
  // In the matrix view, vertical distance = 1 row = skip positions
  // Horizontal distance = 1 column = 1 position

  const skip = Math.max(Math.abs(result1.skip), Math.abs(result2.skip));

  // Find minimum distance between any two letters
  let minDist = Infinity;

  for (const pos1 of result1.positions) {
    for (const pos2 of result2.positions) {
      const linearDist = Math.abs(pos1 - pos2);
      const row1 = Math.floor(pos1 / skip);
      const col1 = pos1 % skip;
      const row2 = Math.floor(pos2 / skip);
      const col2 = pos2 % skip;

      // 2D Euclidean distance in matrix
      const matrixDist = Math.sqrt(
        Math.pow(row1 - row2, 2) + Math.pow(col1 - col2, 2)
      );

      minDist = Math.min(minDist, matrixDist);
    }
  }

  return minDist;
}
```

---

## 4. Data Requirements

### 4.1 Biblical Names Dictionary

Need to create `data/biblical-names.json`:

```json
{
  "patriarchs": ["אברהם", "יצחק", "יעקב", "ישראל"],
  "matriarchs": ["שרה", "רבקה", "רחל", "לאה"],
  "moses_era": ["משה", "אהרן", "מרים", "יהושע", "כלב"],
  "judges": ["דבורה", "גדעון", "שמשון", "שמואל"],
  "kings": ["שאול", "דוד", "שלמה", "רחבעם", "ירבעם"],
  "prophets": ["אליהו", "אלישע", "ישעיהו", "ירמיהו", "יחזקאל"],
  // ... hundreds more
}
```

### 4.2 Place Names Dictionary

Need to create `data/biblical-places.json`:

```json
{
  "israel": ["ירושלים", "חברון", "שכם", "בית אל", "שילה"],
  "nations": ["מצרים", "בבל", "אשור", "פרס", "מדי"],
  "geography": ["ירדן", "כנען", "גלעד", "הגליל", "הנגב"],
  // ...
}
```

### 4.3 Hebrew Dates

Generate programmatically:

```javascript
// Hebrew months
const MONTHS = ['תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
                'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'];

// Day numbers (א-ל for 1-30)
const DAYS = ['א', 'ב', 'ג', ..., 'ל'];

// Generate all date combinations: "כה תשרי", "יד אדר", etc.
```

---

## 5. User Interface Design

### 5.1 Matrix Discovery Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Matrix Term Discovery                                       │
├─────────────────────────────────────────────────────────────┤
│  Primary Terms: אברהם (skip: 50) + שרה (skip: -23)          │
│  Matrix Region: positions 45,230 - 47,890 (2,660 chars)     │
├─────────────────────────────────────────────────────────────┤
│  Search Options:                                             │
│  ☑ Hebrew Words (56K)     ☑ Biblical Names                  │
│  ☑ Place Names            ☑ Hebrew Dates                    │
│  ☐ User Terms: [________________] [Add]                      │
│                                                              │
│  Min Length: [4] Max Length: [8] Skip Range: [-100] to [100]│
│                                                              │
│  [🔍 Discover Terms]                                         │
├─────────────────────────────────────────────────────────────┤
│  Results (sorted by significance):                           │
│                                                              │
│  1. יצחק (Isaac) - skip: 47, p=0.0023 ⭐⭐⭐                │
│     Distance to אברהם: 12 chars | Verse: Gen 22:9           │
│     [View in Matrix]                                         │
│                                                              │
│  2. חברון (Hebron) - skip: -31, p=0.0156 ⭐⭐               │
│     Distance to שרה: 34 chars | Verse: Gen 23:2             │
│     [View in Matrix]                                         │
│                                                              │
│  3. מערה (Cave) - skip: 22, p=0.0412 ⭐                     │
│     Proximity to primary: 67 chars                           │
│     [View in Matrix]                                         │
│                                                              │
│  ... [Show More]                                             │
├─────────────────────────────────────────────────────────────┤
│  Statistical Summary:                                        │
│  • 47 terms found in matrix region                          │
│  • 8 terms with p < 0.05 (significant)                      │
│  • Overall cluster significance: p = 0.0012                 │
│  [📊 Full Statistical Report]                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Multi-Term Matrix View

Show all discovered terms in a single matrix with color-coded highlighting:
- Primary term 1: Yellow
- Primary term 2: Cyan
- Discovered terms: Different colors per term
- Overlapping letters: Special indicator

---

## 6. Implementation Phases

### Phase 1: Foundation (Est. 4-6 hours)
- [ ] Create letter frequency constants
- [ ] Implement expected occurrence calculation
- [ ] Implement basic significance calculation
- [ ] Create matrix region data structure

### Phase 2: Dictionary Data (Est. 2-3 hours)
- [ ] Create biblical names JSON (~500 names)
- [ ] Create place names JSON (~200 places)
- [ ] Create Hebrew date generator
- [ ] Integrate with existing 56K word dictionary

### Phase 3: Discovery Engine (Est. 4-6 hours)
- [ ] Implement `discoverTermsInMatrix()` function
- [ ] Implement constrained ELS search (within region)
- [ ] Implement proximity calculation
- [ ] Performance optimization (Web Worker)

### Phase 4: Statistical Analysis (Est. 3-4 hours)
- [ ] Implement Poisson-based significance
- [ ] Implement control text generation
- [ ] Implement comparison against controls
- [ ] Generate statistical reports

### Phase 5: User Interface (Est. 4-6 hours)
- [ ] Create discovery panel UI
- [ ] Create multi-term matrix view
- [ ] Create statistical report view
- [ ] Mobile-responsive design

### Phase 6: Testing & Refinement (Est. 2-3 hours)
- [ ] Test with known WRR examples
- [ ] Performance testing
- [ ] User experience refinement

**Total Estimated Effort**: 19-28 hours

---

## 7. Technical Considerations

### 7.1 Performance
- Dictionary search could be slow (56K+ terms × multiple skips)
- Solution: Web Worker + chunked processing + progress indicator
- Consider: Pre-filter dictionary by starting letter based on region

### 7.2 Memory
- Loading full dictionary in browser: ~5-10MB
- Matrix region typically: 1-10K characters
- Should be manageable

### 7.3 Statistical Validity
- Simplified calculations may not match WRR exactly
- Consider: Implement full WRR proximity measure for "official" results
- Note: Any statistical analysis is controversial in Torah codes research

---

## 8. Future Enhancements

1. **Control Text Comparison**: Generate permuted texts, run same analysis
2. **Monte Carlo Simulation**: Run thousands of random searches for P-value
3. **Export Reports**: PDF/CSV export of statistical findings
4. **Save/Load Analyses**: Persist discovery sessions
5. **Collaborative Features**: Share interesting findings

---

## 9. References

1. Witztum, Rips, Rosenberg. "Equidistant Letter Sequences in the Book of Genesis." Statistical Science, 1994.
2. McKay, Bar-Natan, et al. "Solving the Bible Code Puzzle." Statistical Science, 1999. (Critical response)
3. Haralick. "Testing the Torah Code Hypothesis." 2006.

---

*Document created: 2026-02-03*
*Status: Planning phase - awaiting approval to proceed*
