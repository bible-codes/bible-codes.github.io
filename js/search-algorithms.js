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
 * Boyer-Moore search algorithm for efficient string matching
 * @param {string} text - The text to search in
 * @param {string} pattern - The pattern to search for
 * @param {number} skip - Skip value (for ELS)
 * @return {Array} Array of result messages
 */
function boyerMooreSearch(text, pattern, skip) {
  const results = [];

  // Skip of 0 makes no sense in Boyer-Moore context
  if (skip === 0) {
    return results;
  }

  // Use absolute skip value for iteration
  const absSkip = Math.abs(skip);
  const direction = skip > 0 ? 'right' : 'left';

  // Skip analysis doesn't work the same way with ELS search, 
  // so we adapt the algorithm for ELS purposes

  for (let startPos = 0; startPos < absSkip; startPos++) {
    // For each possible starting position within the skip range
    let sequenceText = '';
    
    // Extract characters at skip distance
    for (let i = startPos; i < text.length; i += absSkip) {
      sequenceText += text[i];
    }
    
    // Now search for pattern in this extracted sequence
    const badCharTable = buildBadCharTable(pattern);
    const goodSuffixTable = buildGoodSuffixTable(pattern);
    
    let i = 0;
    while (i <= sequenceText.length - pattern.length) {
      let j = pattern.length - 1;
      
      // Check pattern from right to left
      while (j >= 0 && pattern[j] === sequenceText[i + j]) {
        j--;
      }
      
      // If pattern was found
      if (j < 0) {
        results.push({
          algorithm: 'Boyer-Moore',
          pattern: pattern,
          skip: skip,
          startIndex: startPos + (i * absSkip),
          endIndex: startPos + ((i + pattern.length - 1) * absSkip),
          message: `Found "${pattern}" with skip ${skip} ${direction} starting at index ${startPos + (i * absSkip)}`
        });
        
        // Move to the next position
        i += (pattern.length >= 2) ? goodSuffixTable[0] : 1;
      } else {
        // Use maximum of bad character and good suffix rules
        const badCharShift = Math.max(1, j - badCharTable[sequenceText.charCodeAt(i + j)]);
        const goodSuffixShift = goodSuffixTable[j];
        i += Math.max(badCharShift, goodSuffixShift);
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
        return precomputedResults; // Return early if we found precomputed results
      }
    } catch (error) {
      console.log('Error with precomputed hashes, falling back to dynamic search:', error);
    }
  }
  
  // For each skip value in the range
  for (let skip = minSkip; skip <= maxSkip; skip++) {
    // Skip 0 is a special case - just direct text search
    if (skip === 0) {
      results.push(...kmpSearch(text, term, 0));
    } else {
      // For non-zero skips, use both algorithms for best results
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
  }
  
  return results;
}

/**
 * KMP search adapted for ELS with skip
 * @param {string} text - The text to search in
 * @param {string} pattern - The pattern to search for
 * @param {number} skip - Skip value
 * @return {Array} Array of result objects
 */
function kmpSearchWithSkip(text, pattern, skip) {
  const results = [];
  const absSkip = Math.abs(skip);
  const direction = skip > 0 ? 'right' : 'left';
  
  for (let startPos = 0; startPos < absSkip; startPos++) {
    // Create a sequence with the given skip
    let sequenceText = '';
    for (let i = startPos; i < text.length; i += absSkip) {
      sequenceText += text[i];
    }
    
    // Use KMP to search in this sequence
    const kmpResults = kmpSearch(sequenceText, pattern, 0); // skip is 0 because we're already skipping in the sequence
    
    // Convert sequence positions back to original text positions
    for (const result of kmpResults) {
      results.push({
        algorithm: 'KMP-ELS',
        pattern: pattern,
        skip: skip,
        startIndex: startPos + (result.startIndex * absSkip),
        endIndex: startPos + (result.endIndex * absSkip),
        message: `Found "${pattern}" with skip ${skip} ${direction} starting at index ${startPos + (result.startIndex * absSkip)}`
      });
    }
  }
  
  return results;
}

// Export functions to global scope
window.searchAlgorithms = {
  kmpSearch,
  boyerMooreSearch,
  performELSSearch
};