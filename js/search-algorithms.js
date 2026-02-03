/**
 * Bible Codes App - Search Algorithms Module
 * Contains implementations of various string search algorithms
 * used for Equidistant Letter Sequence (ELS) detection
 */

/**
 * KMP (Knuth-Morris-Pratt) Search Algorithm for efficient exact pattern matching
 * @param {string} text - The text to search in
 * @param {string} pattern - The pattern to search for
 * @param {number} skip - Skip value (for ELS)
 * @return {Array} Array of result messages
 */
function kmpSearch(text, pattern, skip) {
  const results = [];
  const lps = computeLPSArray(pattern);
  let i = 0; // Index for text
  let j = 0; // Index for pattern

  while (i < text.length) {
    if (pattern[j] === text[i]) {
      i++;
      j++;
    }
    if (j === pattern.length) {
      results.push({
        algorithm: 'KMP',
        pattern: pattern,
        skip: skip,
        startIndex: i - j,
        endIndex: i - 1,
        message: `Found "${pattern}" with skip ${skip} at index ${i - j}`
      });
      j = lps[j - 1];
    } else if (i < text.length && pattern[j] !== text[i]) {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }
  return results;
}

/**
 * Compute the Longest Proper Prefix which is also Suffix array
 * Used by KMP algorithm
 * @param {string} pattern - The pattern to analyze
 * @return {Array} LPS array
 */
function computeLPSArray(pattern) {
  const lps = Array(pattern.length).fill(0);
  let length = 0;
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[length]) {
      length++;
      lps[i] = length;
      i++;
    } else {
      if (length !== 0) {
        length = lps[length - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
}

/**
 * Boyer-Moore search algorithm for efficient string matching with ELS
 * Implements proper bidirectional search per Rips et al. (1994)
 * @param {string} text - The text to search in
 * @param {string} pattern - The pattern to search for
 * @param {number} skip - Skip value (positive = forward, negative = backward)
 * @return {Array} Array of result messages
 */
function boyerMooreSearch(text, pattern, skip) {
  const results = [];

  // Skip of 0 makes no sense in Boyer-Moore context
  if (skip === 0) {
    return results;
  }

  const absSkip = Math.abs(skip);
  const badCharTable = buildBadCharTable(pattern);
  const goodSuffixTable = buildGoodSuffixTable(pattern);

  if (skip > 0) {
    // Forward skip: positions p, p+d, p+2d, ...
    for (let startPos = 0; startPos < absSkip; startPos++) {
      let sequenceText = '';
      let sequencePositions = [];

      // Extract forward sequence
      for (let i = startPos; i < text.length; i += absSkip) {
        sequenceText += text[i];
        sequencePositions.push(i);
      }

      // Boyer-Moore search in the extracted sequence
      let i = 0;
      while (i <= sequenceText.length - pattern.length) {
        let j = pattern.length - 1;

        while (j >= 0 && pattern[j] === sequenceText[i + j]) {
          j--;
        }

        if (j < 0) {
          results.push({
            algorithm: 'Boyer-Moore-ELS',
            pattern: pattern,
            skip: skip,
            startIndex: sequencePositions[i],
            endIndex: sequencePositions[i + pattern.length - 1],
            message: `Found "${pattern}" with skip ${skip} (forward) starting at index ${sequencePositions[i]}`
          });

          i += (pattern.length >= 2) ? goodSuffixTable[0] : 1;
        } else {
          const badCharShift = Math.max(1, j - badCharTable[sequenceText.charCodeAt(i + j)]);
          const goodSuffixShift = goodSuffixTable[j];
          i += Math.max(badCharShift, goodSuffixShift);
        }
      }
    }
  } else {
    // Backward skip: positions p, p-d, p-2d, ...
    for (let classOffset = 0; classOffset < absSkip; classOffset++) {
      let sequenceText = '';
      let sequencePositions = [];

      // Find the highest starting position in this equivalence class
      let startPos = classOffset;
      while (startPos + absSkip < text.length) {
        startPos += absSkip;
      }

      // Extract backward sequence
      for (let i = startPos; i >= 0; i -= absSkip) {
        sequenceText += text[i];
        sequencePositions.push(i);
      }

      // Boyer-Moore search in the extracted sequence
      let i = 0;
      while (i <= sequenceText.length - pattern.length) {
        let j = pattern.length - 1;

        while (j >= 0 && pattern[j] === sequenceText[i + j]) {
          j--;
        }

        if (j < 0) {
          results.push({
            algorithm: 'Boyer-Moore-ELS',
            pattern: pattern,
            skip: skip,
            startIndex: sequencePositions[i],
            endIndex: sequencePositions[i + pattern.length - 1],
            message: `Found "${pattern}" with skip ${skip} (backward) starting at index ${sequencePositions[i]}`
          });

          i += (pattern.length >= 2) ? goodSuffixTable[0] : 1;
        } else {
          const badCharShift = Math.max(1, j - badCharTable[sequenceText.charCodeAt(i + j)]);
          const goodSuffixShift = goodSuffixTable[j];
          i += Math.max(badCharShift, goodSuffixShift);
        }
      }
    }
  }

  return results;
}

/**
 * Build the bad character table for Boyer-Moore algorithm
 * @param {string} pattern - The pattern to analyze
 * @return {Array} Bad character shift table
 */
function buildBadCharTable(pattern) {
  const table = new Array(256).fill(pattern.length);
  
  for (let i = 0; i < pattern.length - 1; i++) {
    table[pattern.charCodeAt(i)] = pattern.length - 1 - i;
  }
  
  return table;
}

/**
 * Build the good suffix table for Boyer-Moore algorithm
 * @param {string} pattern - The pattern to analyze
 * @return {Array} Good suffix shift table
 */
function buildGoodSuffixTable(pattern) {
  const m = pattern.length;
  const table = new Array(m).fill(0);
  
  // Case 1: The suffix appears elsewhere in pattern
  const suffixes = computeSuffixes(pattern);
  
  let j = 0;
  for (let i = m - 1; i >= 0; i--) {
    if (suffixes[i] === i + 1) {
      for (; j < m - 1 - i; j++) {
        if (table[j] === 0) {
          table[j] = m - 1 - i;
        }
      }
    }
  }
  
  // Case 2: Some substring of the suffix appears at beginning
  for (let i = 0; i < m - 1; i++) {
    table[m - 1 - suffixes[i]] = m - 1 - i;
  }
  
  return table;
}

/**
 * Compute suffix array for Boyer-Moore's good suffix rule
 * @param {string} pattern - The pattern to analyze
 * @return {Array} Suffix array
 */
function computeSuffixes(pattern) {
  const m = pattern.length;
  const suffixes = new Array(m).fill(0);
  
  let f = 0, g = m - 1;
  
  for (let i = m - 2; i >= 0; i--) {
    if (i > g && suffixes[i + m - 1 - f] < i - g) {
      suffixes[i] = suffixes[i + m - 1 - f];
    } else {
      if (i < g) g = i;
      f = i;
      while (g >= 0 && pattern[g] === pattern[g + m - 1 - f]) {
        g--;
      }
      suffixes[i] = f - g;
    }
  }
  
  return suffixes;
}

/**
 * Fetch precomputed results for common terms from our JSON data
 * @param {string} term - The search term
 * @param {number} minSkip - Minimum skip value
 * @param {number} maxSkip - Maximum skip value
 * @return {Array} Array of precomputed results
 */
async function fetchPrecomputedResults(term, minSkip, maxSkip) {
  // Check if we have the precomputed data in cache
  if (!window.precomputedTermsData) {
    try {
      const response = await fetch('data/precomputed-terms.json');
      if (!response.ok) {
        throw new Error('Failed to load precomputed terms');
      }
      // Store the data in memory for future searches
      window.precomputedTermsData = await response.json();
    } catch (error) {
      console.error('Error loading precomputed terms:', error);
      return [];
    }
  }
  
  // Check if the term exists in our precomputed data
  const termData = window.precomputedTermsData?.terms?.[term];
  if (!termData || !termData.results || termData.results.length === 0) {
    return [];
  }
  
  // Filter results by skip range
  return termData.results.filter(result => 
    result.skip >= minSkip && result.skip <= maxSkip
  );
}

/**
 * Perform ELS search with specified skip range
 *
 * Skip Value Definitions (corrected interpretation):
 * - skip = 0: Meaningless (same position repeated: p, p, p...) - EXCLUDED
 * - skip = +1: Open text forward (positions p, p+1, p+2...) - INCLUDED, labeled
 * - skip = -1: Open text backward (positions p, p-1, p-2...) - INCLUDED, labeled
 * - |skip| >= 2: True ELS (Equidistant Letter Sequences) per Rips et al. (1994)
 *
 * Note: Academic standard (Rips et al. 1994) requires |d| > 1 for true ELS,
 * which excludes both ±1 (open text). However, we include them as "open text"
 * for reference, clearly labeled to distinguish from true hidden codes.
 *
 * @param {string} term - Search term
 * @param {string} text - Text to search in
 * @param {number} minSkip - Minimum skip value
 * @param {number} maxSkip - Maximum skip value
 * @param {boolean} usePrecomputedHashes - Whether to use precomputed hash tables
 * @return {Array} Combined search results
 */
async function performELSSearch(term, text, minSkip, maxSkip, usePrecomputedHashes = true) {
  const results = [];

  // First try to use precomputed hashes if available
  if (usePrecomputedHashes) {
    try {
      const precomputedResults = await fetchPrecomputedResults(term, minSkip, maxSkip);
      if (precomputedResults && precomputedResults.length > 0) {
        console.log(`Found ${precomputedResults.length} precomputed results for "${term}"`);
        // Filter out skip=0 (meaningless), keep ±1 (open text) and |skip|>=2
        return precomputedResults.filter(r => r.skip !== 0);
      }
    } catch (error) {
      console.log('Error with precomputed hashes, falling back to dynamic search:', error);
    }
  }

  // For each skip value in the range
  for (let skip = minSkip; skip <= maxSkip; skip++) {
    // Skip 0 is meaningless (same position repeated) - EXCLUDE
    if (skip === 0) {
      continue;
    }

    // Handle skip ±1 (open text - forward/backward reading)
    if (Math.abs(skip) === 1) {
      // Use direct search for open text (more efficient than ELS extraction)
      if (skip === 1) {
        // Forward reading (normal text)
        const openTextResults = kmpSearch(text, term, 0);
        openTextResults.forEach(result => {
          result.algorithm = 'Open Text (forward)';
          result.skip = 1;
          result.isOpenText = true;
        });
        results.push(...openTextResults);
      } else {
        // Backward reading (reverse text) - skip = -1
        // Need to reverse the text and search
        const reversedText = text.split('').reverse().join('');
        const reverseResults = kmpSearch(reversedText, term, 0);
        reverseResults.forEach(result => {
          result.algorithm = 'Open Text (backward)';
          result.skip = -1;
          result.isOpenText = true;
          // Convert reversed indices back to original text positions
          result.startIndex = text.length - 1 - result.startIndex;
          result.endIndex = text.length - 1 - result.endIndex;
          // Swap start/end since we're going backward
          [result.startIndex, result.endIndex] = [result.endIndex, result.startIndex];
        });
        results.push(...reverseResults);
      }
      continue;
    }

    // True ELS: |skip| >= 2
    const kmpResults = kmpSearchWithSkip(text, term, skip);
    const bmResults = boyerMooreSearch(text, term, skip);

    // Merge results, removing duplicates
    const combinedResults = [...kmpResults];

    // Only add Boyer-Moore results that don't overlap with KMP results
    for (const bmResult of bmResults) {
      if (!combinedResults.some(kr => kr.startIndex === bmResult.startIndex)) {
        combinedResults.push(bmResult);
      }
    }

    results.push(...combinedResults);
  }

  return results;
}

/**
 * KMP search adapted for ELS with skip
 * Implements proper bidirectional search per Rips et al. (1994)
 * @param {string} text - The text to search in
 * @param {string} pattern - The pattern to search for
 * @param {number} skip - Skip value (positive = forward, negative = backward)
 * @return {Array} Array of result objects
 */
function kmpSearchWithSkip(text, pattern, skip) {
  const results = [];
  const absSkip = Math.abs(skip);

  if (skip > 0) {
    // Forward skip: positions p, p+d, p+2d, ...
    // Iterate through each equivalence class (0 to absSkip-1)
    for (let startPos = 0; startPos < absSkip; startPos++) {
      let sequenceText = '';
      let sequencePositions = [];

      // Extract forward sequence
      for (let i = startPos; i < text.length; i += absSkip) {
        sequenceText += text[i];
        sequencePositions.push(i);
      }

      // Search in this sequence
      const kmpResults = kmpSearch(sequenceText, pattern, 0);

      // Convert sequence positions back to original text positions
      for (const result of kmpResults) {
        results.push({
          algorithm: 'KMP-ELS',
          pattern: pattern,
          skip: skip,
          startIndex: sequencePositions[result.startIndex],
          endIndex: sequencePositions[result.endIndex],
          message: `Found "${pattern}" with skip ${skip} (forward) starting at index ${sequencePositions[result.startIndex]}`
        });
      }
    }
  } else {
    // Backward skip: positions p, p-d, p-2d, ...
    // Iterate through equivalence classes, but starting from high positions
    for (let classOffset = 0; classOffset < absSkip; classOffset++) {
      let sequenceText = '';
      let sequencePositions = [];

      // Find the highest starting position in this equivalence class
      // Class i contains positions: i, i+absSkip, i+2*absSkip, ...
      // Start from the highest position in this class
      let startPos = classOffset;
      while (startPos + absSkip < text.length) {
        startPos += absSkip;
      }

      // Extract backward sequence from this starting position
      for (let i = startPos; i >= 0; i -= absSkip) {
        sequenceText += text[i];
        sequencePositions.push(i);
      }

      // Search in this sequence
      const kmpResults = kmpSearch(sequenceText, pattern, 0);

      // Convert sequence positions back to original text positions
      for (const result of kmpResults) {
        results.push({
          algorithm: 'KMP-ELS',
          pattern: pattern,
          skip: skip,
          startIndex: sequencePositions[result.startIndex],
          endIndex: sequencePositions[result.endIndex],
          message: `Found "${pattern}" with skip ${skip} (backward) starting at index ${sequencePositions[result.startIndex]}`
        });
      }
    }
  }

  return results;
}

/**
 * Implementation Notes:
 *
 * Skip Value Convention (CORRECTED):
 * - ELS = 0: Meaningless (positions p, p, p... = same char repeated) - EXCLUDED
 * - ELS = +1: Open text forward (positions p, p+1, p+2...) - INCLUDED, labeled
 * - ELS = -1: Open text backward (positions p, p-1, p-2...) - INCLUDED, labeled
 * - |ELS| >= 2: True equidistant letter sequences - INCLUDED
 *
 * Open text (ELS=±1) is included in results but clearly labeled as "Open Text (forward/backward)"
 * to distinguish from true hidden ELS codes. Forward (+1) finds normal text, backward (-1)
 * finds reverse patterns.
 *
 * Bidirectional Search:
 * - Positive skip (+d): Extract positions p, p+d, p+2d, ... (forward)
 * - Negative skip (-d): Extract positions p, p-d, p-2d, ... (backward)
 * This properly implements the Rips et al. (1994) definition where positive and
 * negative skips yield different sequences.
 *
 * Academic Note:
 * Rips et al. (1994) technically requires |d| > 1, excluding ±1 as "open text."
 * We include them for completeness but label them clearly to avoid confusion with
 * true hidden codes (|skip| >= 2).
 */

// Export functions to global scope
window.searchAlgorithms = {
  kmpSearch,
  boyerMooreSearch,
  performELSSearch
};