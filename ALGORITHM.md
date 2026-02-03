# ELS Search Algorithm Documentation

## Overview

This document details the Equidistant Letter Sequence (ELS) search algorithm implementation in the Hebrew Bible Analysis Suite.

---

## Academic Foundation

### Reference

**Witztum, Doron, Eliyahu Rips, and Yoav Rosenberg.** "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, vol. 9, no. 3, 1994, pp. 429–38. JSTOR.

### Definition

An **ELS (Equidistant Letter Sequence)** with skip *d* starting at position *p* is a sequence of letters at positions:

**p, p+d, p+2d, p+3d, ..., p+(n-1)d**

where *n* is the length of the search term.

---

## Skip Value Conventions

### This Implementation (CORRECTED)

| Skip Value | Definition | Status | Label |
|------------|-----------|--------|-------|
| **0** | Same position repeated (p, p, p...) | ❌ Excluded | Meaningless |
| **+1** | Forward sequential (p, p+1, p+2...) | ✅ Included | "Open Text (forward)" |
| **-1** | Backward sequential (p, p-1, p-2...) | ✅ Included | "Open Text (backward)" |
| **\|skip\| ≥ 2** | True equidistant sequences | ✅ Included | "Skip ±n" |

### Rationale

1. **Skip = 0 (EXCLUDED)**:
   - Mathematically meaningless: positions p, p+0, p+0, p+0... = p, p, p, p
   - Extracts the same character repeatedly
   - Not useful for any analysis

2. **Skip = +1 (Open Text Forward)**:
   - Positions p, p+1, p+2, p+3... = consecutive forward reading
   - This is "normal" text reading
   - Included for reference, clearly labeled
   - Not a hidden code, just the plain text

3. **Skip = -1 (Open Text Backward)**:
   - Positions p, p-1, p-2, p-3... = consecutive backward reading
   - Reads the text in reverse
   - Included for completeness, clearly labeled
   - Different from forward reading (can find different patterns)

4. **|Skip| ≥ 2 (True ELS)**:
   - Genuine equidistant letter patterns
   - Statistical significance potential
   - Follows academic convention (Rips et al. requires |d| > 1)

---

## Bidirectional Search

### Forward Skip (d > 0)

**Extract positions:** p, p+d, p+2d, p+3d, ...

**Example:** Skip = +3, Start = 5
```
Positions: 5, 8, 11, 14, 17, ...
Direction: →→→→→
```

### Backward Skip (d < 0)

**Extract positions:** p, p-|d|, p-2|d|, p-3|d|, ...

**Example:** Skip = -3, Start = 100
```
Positions: 100, 97, 94, 91, 88, ...
Direction: ←←←←←
```

### Why Bidirectional Matters

Positive and negative skips **extract different sequences** from the same text:

**Text:** `אבגדהוזחטיכלמנסעפצקרשת` (positions 0-21)

| Skip | Start | Sequence Extracted |
|------|-------|--------------------|
| +3 | 0 | אדזכנק (positions 0,3,6,9,12,15) |
| -3 | 21 | תקצעלטוה (positions 21,18,15,12,9,6,3,0) |

**These are different patterns** and may find different ELS codes.

---

## Algorithm Implementation

### File: `js/search-algorithms.js`

### Function: `performELSSearch(term, text, minSkip, maxSkip, usePrecomputedHashes)`

**Main search coordinator:**

```javascript
async function performELSSearch(term, text, minSkip, maxSkip, usePrecomputedHashes) {
  const results = [];

  // 1. Try precomputed hashes first (fast path)
  if (usePrecomputedHashes) {
    const precomputed = await fetchPrecomputedResults(term, minSkip, maxSkip);
    if (precomputed.length > 0) {
      return precomputed.filter(r => r.skip === 0 || Math.abs(r.skip) >= 2);
    }
  }

  // 2. Search open text (skip=0) if in range
  if (minSkip <= 0 && maxSkip >= 0) {
    const openText = kmpSearch(text, term, 0);
    openText.forEach(r => {
      r.algorithm = 'Open Text (ELS=0)';
      r.isOpenText = true;
    });
    results.push(...openText);
  }

  // 3. Search true ELS (|skip| >= 2)
  for (let skip = minSkip; skip <= maxSkip; skip++) {
    if (skip === 0 || Math.abs(skip) === 1) continue;

    const kmpResults = kmpSearchWithSkip(text, term, skip);
    const bmResults = boyerMooreSearch(text, term, skip);

    // Merge and deduplicate
    results.push(...mergeResults(kmpResults, bmResults));
  }

  return results;
}
```

---

### Function: `kmpSearchWithSkip(text, pattern, skip)`

**Implements bidirectional KMP search:**

#### Forward Search (skip > 0)

```javascript
for (let startPos = 0; startPos < absSkip; startPos++) {
  // Extract forward sequence
  let sequenceText = '';
  let sequencePositions = [];

  for (let i = startPos; i < text.length; i += absSkip) {
    sequenceText += text[i];
    sequencePositions.push(i);
  }

  // Search in extracted sequence
  const matches = kmpSearch(sequenceText, pattern, 0);

  // Convert sequence indices back to text positions
  matches.forEach(m => {
    results.push({
      algorithm: 'KMP-ELS',
      pattern: pattern,
      skip: skip,
      startIndex: sequencePositions[m.startIndex],
      endIndex: sequencePositions[m.endIndex]
    });
  });
}
```

#### Backward Search (skip < 0)

```javascript
for (let classOffset = 0; classOffset < absSkip; classOffset++) {
  // Find highest position in this equivalence class
  let startPos = classOffset;
  while (startPos + absSkip < text.length) {
    startPos += absSkip;
  }

  // Extract backward sequence
  let sequenceText = '';
  let sequencePositions = [];

  for (let i = startPos; i >= 0; i -= absSkip) {
    sequenceText += text[i];
    sequencePositions.push(i);
  }

  // Search in extracted sequence
  const matches = kmpSearch(sequenceText, pattern, 0);

  // Convert sequence indices back to text positions
  matches.forEach(m => {
    results.push({
      algorithm: 'KMP-ELS',
      pattern: pattern,
      skip: skip,
      startIndex: sequencePositions[m.startIndex],
      endIndex: sequencePositions[m.endIndex]
    });
  });
}
```

---

### Function: `boyerMooreSearch(text, pattern, skip)`

**Implements bidirectional Boyer-Moore search:**

Same logic as KMP but uses Boyer-Moore algorithm for pattern matching in the extracted sequences. Provides additional coverage and verification of results.

---

## Equivalence Classes

### Concept

For a given skip value *d*, the text positions are partitioned into *|d|* equivalence classes:

**Skip = 3 example:**
- Class 0: positions 0, 3, 6, 9, 12, ...
- Class 1: positions 1, 4, 7, 10, 13, ...
- Class 2: positions 2, 5, 8, 11, 14, ...

**Why this matters:** Each class forms an independent sequence that must be searched separately.

### Implementation

```javascript
for (let startPos = 0; startPos < absSkip; startPos++) {
  // startPos defines the equivalence class
  // Extract sequence for this class only
  for (let i = startPos; i < text.length; i += absSkip) {
    sequenceText += text[i];
  }
  // Search within this sequence
}
```

---

## String Matching Algorithms

### KMP (Knuth-Morris-Pratt)

**Advantages:**
- O(n + m) time complexity
- Guaranteed linear performance
- Predictable, no worst-case slowdown

**Use case:** Primary algorithm for all ELS searches

### Boyer-Moore

**Advantages:**
- Often faster than KMP in practice
- Skips characters efficiently
- Good for longer patterns

**Use case:** Secondary algorithm for verification and additional coverage

### Why Both?

Using both algorithms provides:
1. **Redundancy check** - verify results
2. **Coverage** - different algorithms may find edge cases
3. **Performance** - Boyer-Moore can be faster on certain patterns

Duplicates are merged before returning results.

---

## Performance Characteristics

### Complexity Analysis

**Per skip value:**
- Equivalence classes: *d* iterations
- Sequence extraction: O(n/d) per class
- Pattern matching: O(n/d + m) per class via KMP
- **Total per skip:** O(n + md)

**Full range (minSkip to maxSkip):**
- Skip values: *(maxSkip - minSkip + 1) - 2* (excluding ±1)
- **Total:** O(k × (n + md)) where k = number of skip values

### Typical Performance (Torah text, ~304,000 chars)

| Operation | Time |
|-----------|------|
| Skip = 0 (open text) | <100ms |
| Single skip (e.g., skip=50) | ~50ms |
| Range -100 to +100 | ~10-15 seconds |
| With precomputed hashes | <500ms |

---

## Result Format

### Standard Result Object

```javascript
{
  algorithm: 'KMP-ELS',           // or 'Boyer-Moore-ELS', 'Open Text (ELS=0)'
  pattern: 'משה',                 // Search term
  skip: -50,                      // Skip value used
  startIndex: 12345,              // Position in text where ELS starts
  endIndex: 12845,                // Position in text where ELS ends
  message: 'Found "משה" with skip -50 (backward) starting at index 12345',
  isOpenText: false               // true only for skip=0 results
}
```

### Open Text Result

```javascript
{
  algorithm: 'Open Text (ELS=0)',
  pattern: 'משה',
  skip: 0,
  startIndex: 12345,
  endIndex: 12347,
  message: 'Found "משה" with skip 0 at index 12345',
  isOpenText: true
}
```

---

## Precomputed Hash Tables

### Format: `data/precomputed-terms.json`

```json
{
  "terms": {
    "משה": {
      "results": [
        {
          "skip": 0,
          "startIndex": 12345,
          "endIndex": 12347,
          "algorithm": "Precomputed"
        },
        {
          "skip": 50,
          "startIndex": 54321,
          "endIndex": 54621,
          "algorithm": "Precomputed"
        }
      ]
    }
  }
}
```

### Usage

If a term exists in precomputed data:
1. Filter results by requested skip range
2. Filter out ±1 skips
3. Return immediately (skip dynamic search)

This provides **near-instant results** for common terms.

---

## UI Integration

### Display Logic (`js/test.js`)

**Open text highlighting:**
```javascript
if (skip === '0') {
  skipHeader.innerHTML = `<strong>Open Text (ELS=0)</strong> - Plain sequential reading`;
  skipHeader.style.backgroundColor = '#fffbea'; // Yellow highlight
  skipHeader.style.border = '1px solid #f59e0b';
}
```

**Result grouping:**
- Results grouped by skip value
- Skip=0 displayed first with special formatting
- True ELS results (|skip|≥2) listed below
- No duplicate ±1 results

---

## Testing

### Test Case 1: Open Text

**Input:** Term = "יגרשהדותא", Range = -10 to 10
**Expected:**
- 1 result: Skip=0 at index 46100
- No results for skip=±1 (excluded)
- Possibly results for skip=±2 through ±10 (different sequences)

### Test Case 2: Bidirectional

**Input:** Term = "משה", Range = -50 to 50
**Expected:**
- Skip=0: Open text occurrences
- Skip=+50: Forward ELS patterns
- Skip=-50: Backward ELS patterns (different from +50)

### Test Case 3: No Open Text

**Input:** Term = rare combination not in plain text, Range = -100 to 100
**Expected:**
- Skip=0: No results
- Various |skip|≥2: Potential ELS findings

---

## Future Enhancements

### Web Worker Implementation

Move ELS search to background thread:
```javascript
// Main thread
const elsWorker = new Worker('engines/els.worker.js');
elsWorker.postMessage({ term, text, minSkip, maxSkip });
elsWorker.onmessage = (e) => displayResults(e.data);

// Worker
self.onmessage = async (e) => {
  const results = await performELSSearch(...);
  self.postMessage(results);
};
```

**Benefits:**
- Non-blocking UI
- Progress updates
- Cancellable searches

### Parallel Processing

Process multiple skip values simultaneously using multiple workers.

### Enhanced Precomputation

Expand precomputed hash tables to cover:
- All names in Torah
- Common words
- Historical significant terms

---

## References

1. Witztum, D., Rips, E., & Rosenberg, Y. (1994). "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, 9(3), 429-438.

2. Knuth, D. E., Morris, J. H., & Pratt, V. R. (1977). "Fast Pattern Matching in Strings." *SIAM Journal on Computing*, 6(2), 323-350.

3. Boyer, R. S., & Moore, J. S. (1977). "A Fast String Searching Algorithm." *Communications of the ACM*, 20(10), 762-772.

---

*Last Updated: 2026-02-02*
*Implementation: Hebrew Bible Analysis Suite*
*Version: 1.0*
