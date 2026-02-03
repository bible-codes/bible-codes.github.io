document.addEventListener('DOMContentLoaded', () => {
  // Search elements
  const searchButton = document.querySelector('#search-btn');
  const searchTermInput = document.getElementById('st1');
  const searchTerm2Input = document.getElementById('st2');
  const minSkipInput = document.getElementById('min-range');
  const maxSkipInput = document.getElementById('max-range');
  const resultContainer = document.getElementById('search-results');
  const offlineIndicator = document.getElementById('offline-indicator');

  // Multi-term elements
  const multiTermEnabled = document.getElementById('multi-term-enabled');
  const multiTermInputs = document.getElementById('multi-term-inputs');
  const maxDistanceInput = document.getElementById('max-distance');
  const sameSkipOnly = document.getElementById('same-skip-only');
  const proximityResultsContainer = document.getElementById('proximity-results-container');
  const proximityResults = document.getElementById('proximity-results');

  // Matrix modal elements
  const matrixModal = document.getElementById('matrix-modal');
  const matrixGrid = document.getElementById('matrix-grid');
  const matrixClose = document.getElementById('matrix-close');
  const matrixTitle = document.getElementById('matrix-title');
  const matrixInfo = document.getElementById('matrix-info');
  const rowsBeforeInput = document.getElementById('rows-before');
  const rowsAfterInput = document.getElementById('rows-after');
  const regenerateBtn = document.getElementById('regenerate-matrix');
  const legendTerm1 = document.getElementById('legend-term1');
  const legendTerm2 = document.getElementById('legend-term2');
  const legendTerm2Item = document.getElementById('legend-term2-item');
  const legendBothItem = document.getElementById('legend-both-item');

  let torahText = ""; // Global variable to hold the Torah text
  let currentResult = null; // Currently displayed result in matrix
  let currentResult2 = null; // Second term result for proximity view
  let verseIndex = null; // Verse boundary index for attribution

  // ==================== VERSE BOUNDARY DATA ====================
  // Torah verse boundaries (cumulative character counts)
  // This maps character positions to book/chapter/verse
  // Generated from the Torah text structure

  // Load verse index on startup
  loadVerseIndex();

  async function loadVerseIndex() {
    try {
      const response = await fetch('data/torah-verse-index.json');
      if (response.ok) {
        verseIndex = await response.json();
        console.log('Verse index loaded successfully');
      }
    } catch (error) {
      console.log('Verse index not available, verse attribution disabled');
    }
  }

  /**
   * Get verse reference for a character position
   * @param {number} charIndex - Global character index
   * @returns {string} Verse reference like "Genesis 1:1" or null if not available
   */
  function getVerseForPosition(charIndex) {
    if (!verseIndex || !verseIndex.verses) return null;

    // Binary search for the verse containing this character
    const verses = verseIndex.verses;
    let left = 0;
    let right = verses.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (verses[mid].start <= charIndex) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }

    if (left >= 0 && left < verses.length) {
      const verse = verses[left];
      if (charIndex >= verse.start && charIndex < verse.end) {
        return `${verse.book} ${verse.chapter}:${verse.verse}`;
      }
    }

    return null;
  }

  /**
   * Get verse attribution for an ELS result
   * @param {Object} result - ELS search result
   * @returns {Array} Array of {letter, position, verse} objects
   */
  function getVerseAttribution(result) {
    const attribution = [];
    const patternLen = result.pattern.length;

    for (let i = 0; i < patternLen; i++) {
      const pos = result.startIndex + (i * result.skip);
      const verse = getVerseForPosition(pos);
      attribution.push({
        letter: result.pattern[i],
        position: pos,
        verse: verse || `pos ${pos}`
      });
    }

    return attribution;
  }

  // ==================== MULTI-TERM TOGGLE ====================

  if (multiTermEnabled) {
    multiTermEnabled.addEventListener('change', () => {
      if (multiTermEnabled.checked) {
        multiTermInputs.classList.add('active');
      } else {
        multiTermInputs.classList.remove('active');
        proximityResultsContainer.style.display = 'none';
      }
    });
  }

  // ==================== ONLINE STATUS ====================

  function updateOnlineStatus() {
    if (navigator.onLine) {
      offlineIndicator.classList.add('hidden');
    } else {
      offlineIndicator.classList.remove('hidden');
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // ==================== LOAD TORAH TEXT ====================

  fetch('data/torahNoSpaces.txt')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load text file: ${response.status} - ${response.statusText}`);
      }
      return response.text();
    })
    .then((text) => {
      torahText = text;
      console.log('Torah text loaded successfully.');
    })
    .catch((error) => {
      console.error('Error loading Torah text:', error);
      resultContainer.textContent = 'Error: Failed to fetch the Torah text. Please ensure the file exists.';
    });

  // ==================== SEARCH BUTTON ====================

  if (!searchButton || !searchTermInput || !minSkipInput || !maxSkipInput || !resultContainer) {
    console.error('Missing required elements. Please check your HTML structure.');
    return;
  }

  searchButton.addEventListener('click', () => {
    const searchTerm = searchTermInput.value.trim();
    const searchTerm2 = searchTerm2Input ? searchTerm2Input.value.trim() : '';
    let minSkip = parseInt(minSkipInput.value);
    let maxSkip = parseInt(maxSkipInput.value);
    const isMultiTerm = multiTermEnabled && multiTermEnabled.checked && searchTerm2;

    // Validate skip range
    if (isNaN(minSkip) || isNaN(maxSkip) || minSkip > maxSkip) {
      alert("Minimum value must be less than or equal to Maximum value.");
      minSkipInput.value = -100;
      maxSkipInput.value = 100;
      return;
    }

    // Validate search terms
    if (searchTerm === "") {
      alert("Please enter a search term.");
      return;
    }

    if (isMultiTerm && searchTerm2 === "") {
      alert("Please enter a second search term for proximity search.");
      return;
    }

    // Clear previous results
    resultContainer.innerHTML = '';
    proximityResultsContainer.style.display = 'none';

    // Show loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('result-item');

    if (isMultiTerm) {
      loadingElement.innerHTML = '<span class="loading-spinner"></span> Searching for "' + searchTerm +
                                 '" and "' + searchTerm2 + '" with skips from ' + minSkip + ' to ' + maxSkip + '...';
    } else {
      loadingElement.innerHTML = '<span class="loading-spinner"></span> Searching for "' + searchTerm +
                                 '" with skips from ' + minSkip + ' to ' + maxSkip + '...';
    }
    resultContainer.appendChild(loadingElement);

    // Save search to history
    saveSearchToHistory(searchTerm, minSkip, maxSkip);

    // Perform search
    setTimeout(() => {
      if (isMultiTerm) {
        performMultiTermSearch(searchTerm, searchTerm2, minSkip, maxSkip, torahText, loadingElement);
      } else {
        performSearch(searchTerm, minSkip, maxSkip, torahText, loadingElement);
      }
    }, 100);
  });

  // ==================== SEARCH HISTORY ====================

  function saveSearchToHistory(term, minSkip, maxSkip) {
    try {
      const searchHistory = JSON.parse(localStorage.getItem('bibleCodeSearchHistory') || '[]');
      searchHistory.push({
        term,
        minSkip,
        maxSkip,
        timestamp: new Date().toISOString()
      });
      while (searchHistory.length > 20) {
        searchHistory.shift();
      }
      localStorage.setItem('bibleCodeSearchHistory', JSON.stringify(searchHistory));
    } catch (error) {
      console.error('Failed to save search to history:', error);
    }
  }

  // ==================== SINGLE TERM SEARCH ====================

  async function performSearch(term, minSkip, maxSkip, text, loadingElement) {
    try {
      const results = await window.searchAlgorithms.performELSSearch(term, text, minSkip, maxSkip, true);
      loadingElement.remove();
      displayResults(results, term);
    } catch (error) {
      console.error('Search error:', error);
      loadingElement.innerHTML = `<strong>Error:</strong> ${error.message}`;
    }
  }

  // ==================== MULTI-TERM PROXIMITY SEARCH ====================

  async function performMultiTermSearch(term1, term2, minSkip, maxSkip, text, loadingElement) {
    try {
      // Search for both terms
      const results1 = await window.searchAlgorithms.performELSSearch(term1, text, minSkip, maxSkip, true);
      const results2 = await window.searchAlgorithms.performELSSearch(term2, text, minSkip, maxSkip, true);

      loadingElement.remove();

      // Get proximity settings
      const maxDistance = parseInt(maxDistanceInput.value) || 1000;
      const requireSameSkip = sameSkipOnly && sameSkipOnly.checked;

      // Find proximity pairs
      const proximityPairs = findProximityPairs(results1, results2, maxDistance, requireSameSkip);

      // Display results
      displayProximityResults(proximityPairs, term1, term2);
      displayResults(results1, term1, 'term1');
      displayResults(results2, term2, 'term2', true); // append = true

    } catch (error) {
      console.error('Multi-term search error:', error);
      loadingElement.innerHTML = `<strong>Error:</strong> ${error.message}`;
    }
  }

  /**
   * Find pairs of results from two terms that are within proximity threshold
   * @param {Array} results1 - Results for term 1
   * @param {Array} results2 - Results for term 2
   * @param {number} maxDistance - Maximum character distance
   * @param {boolean} requireSameSkip - Only match if skip values are equal
   * @returns {Array} Array of proximity pairs sorted by distance
   */
  function findProximityPairs(results1, results2, maxDistance, requireSameSkip) {
    const pairs = [];

    for (const r1 of results1) {
      for (const r2 of results2) {
        // Check skip requirement
        if (requireSameSkip && Math.abs(r1.skip) !== Math.abs(r2.skip)) {
          continue;
        }

        // Calculate various distance metrics
        const startToStart = Math.abs(r1.startIndex - r2.startIndex);
        const endToEnd = Math.abs(r1.endIndex - r2.endIndex);
        const startToEnd = Math.abs(r1.startIndex - r2.endIndex);
        const endToStart = Math.abs(r1.endIndex - r2.startIndex);

        // Minimum distance between the two patterns
        const minDistance = Math.min(startToStart, endToEnd, startToEnd, endToStart);

        // Check if they overlap
        const overlap = (r1.startIndex <= r2.endIndex && r2.startIndex <= r1.endIndex) ||
                       (r2.startIndex <= r1.endIndex && r1.startIndex <= r2.endIndex);

        if (minDistance <= maxDistance || overlap) {
          pairs.push({
            result1: r1,
            result2: r2,
            distance: overlap ? 0 : minDistance,
            overlap: overlap,
            skipMatch: Math.abs(r1.skip) === Math.abs(r2.skip),
            combinedSkip: Math.abs(r1.skip) === Math.abs(r2.skip) ? Math.abs(r1.skip) : null
          });
        }
      }
    }

    // Sort by distance (closest first), then by skip match
    pairs.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.skipMatch !== b.skipMatch) return b.skipMatch - a.skipMatch;
      return 0;
    });

    return pairs;
  }

  /**
   * Display proximity pairs in the UI
   */
  function displayProximityResults(pairs, term1, term2) {
    if (pairs.length === 0) {
      proximityResultsContainer.style.display = 'block';
      proximityResults.innerHTML = '<p>No proximity pairs found within the specified distance.</p>';
      return;
    }

    proximityResultsContainer.style.display = 'block';
    proximityResults.innerHTML = `<p>Found <strong>${pairs.length}</strong> proximity pairs (sorted by distance):</p>`;

    // Show top 20 pairs
    const displayPairs = pairs.slice(0, 20);

    displayPairs.forEach((pair, index) => {
      const pairDiv = document.createElement('div');
      pairDiv.classList.add('proximity-pair');

      const distanceText = pair.overlap ?
        '<span class="distance">OVERLAPPING!</span>' :
        `Distance: <span class="distance">${pair.distance.toLocaleString()}</span> chars`;

      const skipInfo = pair.skipMatch ?
        ` | Same skip: ${pair.combinedSkip}` :
        ` | Skips: ${pair.result1.skip}, ${pair.result2.skip}`;

      pairDiv.innerHTML = `
        <div>${distanceText}${skipInfo}</div>
        <div class="terms">
          <span class="term-info t1">"${term1}" at index ${pair.result1.startIndex.toLocaleString()}</span>
          <span class="term-info t2">"${term2}" at index ${pair.result2.startIndex.toLocaleString()}</span>
        </div>
      `;

      // Click to show both in matrix
      pairDiv.addEventListener('click', () => {
        showDualTermMatrix(pair.result1, pair.result2, term1, term2);
      });

      proximityResults.appendChild(pairDiv);
    });

    if (pairs.length > 20) {
      const moreInfo = document.createElement('p');
      moreInfo.style.fontStyle = 'italic';
      moreInfo.style.marginTop = '10px';
      moreInfo.textContent = `... and ${pairs.length - 20} more pairs not shown.`;
      proximityResults.appendChild(moreInfo);
    }
  }

  // ==================== DISPLAY RESULTS ====================

  function displayResults(results, searchTerm, termClass = 'term1', append = false) {
    if (!append) {
      const resultHeader = document.createElement('div');
      resultHeader.style.fontWeight = 'bold';
      resultHeader.style.marginBottom = '10px';

      if (!results || results.length === 0) {
        resultHeader.textContent = `No results found for "${searchTerm}".`;
        resultContainer.appendChild(resultHeader);
        return;
      }

      resultHeader.textContent = `Found ${results.length} matches for "${searchTerm}":`;
      resultContainer.appendChild(resultHeader);
    } else if (results && results.length > 0) {
      // Add separator for second term results
      const separator = document.createElement('hr');
      separator.style.margin = '20px 0';
      resultContainer.appendChild(separator);

      const resultHeader = document.createElement('div');
      resultHeader.style.fontWeight = 'bold';
      resultHeader.style.marginBottom = '10px';
      resultHeader.style.color = termClass === 'term2' ? '#00838f' : '#f57c00';
      resultHeader.textContent = `Found ${results.length} matches for "${searchTerm}":`;
      resultContainer.appendChild(resultHeader);
    }

    if (!results || results.length === 0) return;

    // Group results by skip value
    const resultsBySkip = {};
    results.forEach(result => {
      if (!resultsBySkip[result.skip]) {
        resultsBySkip[result.skip] = [];
      }
      resultsBySkip[result.skip].push(result);
    });

    // Display results grouped by skip
    Object.keys(resultsBySkip).sort((a, b) => Number(a) - Number(b)).forEach(skip => {
      const skipResults = resultsBySkip[skip];

      const skipHeader = document.createElement('div');
      skipHeader.classList.add('result-group-header');

      if (skip === '1') {
        skipHeader.innerHTML = `<strong>Open Text (Forward)</strong> - Normal sequential reading (${skipResults.length} match${skipResults.length !== 1 ? 'es' : ''})`;
        skipHeader.style.backgroundColor = '#fffbea';
        skipHeader.style.border = '1px solid #f59e0b';
        skipHeader.style.padding = '8px';
        skipHeader.style.borderRadius = '4px';
      } else if (skip === '-1') {
        skipHeader.innerHTML = `<strong>Open Text (Backward)</strong> - Reverse sequential reading (${skipResults.length} match${skipResults.length !== 1 ? 'es' : ''})`;
        skipHeader.style.backgroundColor = '#e8f5e9';
        skipHeader.style.border = '1px solid #4caf50';
        skipHeader.style.padding = '8px';
        skipHeader.style.borderRadius = '4px';
      } else {
        skipHeader.textContent = `Skip ${skip} (${skipResults.length} match${skipResults.length !== 1 ? 'es' : ''})`;
      }

      resultContainer.appendChild(skipHeader);

      skipResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item', 'clickable');
        if (termClass === 'term2') {
          resultItem.style.borderLeftColor = '#00bcd4';
        }

        // Get verse attribution
        const attribution = getVerseAttribution(result);
        const uniqueVerses = [...new Set(attribution.map(a => a.verse))];
        const verseList = uniqueVerses.slice(0, 5).join(', ') +
                         (uniqueVerses.length > 5 ? ` +${uniqueVerses.length - 5} more` : '');

        const resultText = document.createElement('div');
        resultText.innerHTML = `
          <strong>Found:</strong> "${result.pattern}"
          <br><strong>Algorithm:</strong> ${result.algorithm}
          <br><strong>Starting at:</strong> index ${result.startIndex.toLocaleString()}
          <br><strong>Context:</strong> <span dir="rtl" class="context-text">${getTextContext(torahText, result)}</span>
          ${verseIndex ? `<div class="verse-attribution"><strong>Verses:</strong> ${verseList}</div>` : ''}
          <div class="view-matrix-hint">Click to view matrix</div>
        `;

        resultItem.appendChild(resultText);
        resultItem.addEventListener('click', () => {
          showMatrixView(result, searchTerm, termClass);
        });

        resultContainer.appendChild(resultItem);
      });
    });

    resultContainer.parentElement.scrollIntoView({ behavior: 'smooth' });
  }

  // ==================== TEXT CONTEXT ====================

  function getTextContext(text, result) {
    const contextSize = 10;
    const absSkip = Math.abs(result.skip);

    if (result.skip === 0) {
      const start = Math.max(0, result.startIndex - contextSize);
      const end = Math.min(text.length, result.endIndex + contextSize + 1);
      const prefix = text.substring(start, result.startIndex);
      const match = text.substring(result.startIndex, result.endIndex + 1);
      const suffix = text.substring(result.endIndex + 1, end);
      return `${prefix}<mark>${match}</mark>${suffix}`;
    }

    let matchIndices = [];
    for (let i = 0; i < result.pattern.length; i++) {
      const idx = result.startIndex + (i * result.skip);
      matchIndices.push(idx);
    }

    const minIdx = Math.max(0, Math.min(...matchIndices) - (contextSize * absSkip));
    const maxIdx = Math.min(text.length - 1, Math.max(...matchIndices) + (contextSize * absSkip));

    let highlightedContext = '';
    for (let i = minIdx; i <= maxIdx; i += absSkip) {
      if (matchIndices.includes(i)) {
        highlightedContext += `<mark>${text[i]}</mark>`;
      } else if (text[i]) {
        highlightedContext += text[i];
      }
    }

    return highlightedContext;
  }

  // ==================== MATRIX VIEW (SINGLE TERM) ====================

  function showMatrixView(result, searchTerm, termClass = 'term1') {
    currentResult = result;
    currentResult2 = null;

    // Update modal info
    matrixTitle.textContent = `ELS Matrix: "${result.pattern}"`;
    matrixInfo.textContent = `Skip: ${result.skip} | Start Index: ${result.startIndex.toLocaleString()}`;

    // Update legend
    legendTerm1.textContent = `"${searchTerm}"`;
    legendTerm2Item.style.display = 'none';
    legendBothItem.style.display = 'none';

    // Generate and display the matrix
    generateMatrix(result, null, termClass);

    // Show modal
    matrixModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ==================== MATRIX VIEW (DUAL TERM) ====================

  function showDualTermMatrix(result1, result2, term1, term2) {
    currentResult = result1;
    currentResult2 = result2;

    // Update modal info
    matrixTitle.textContent = `ELS Matrix: "${term1}" + "${term2}"`;

    const distText = Math.abs(result1.startIndex - result2.startIndex) === 0 ?
                    'Overlapping' :
                    `Distance: ${Math.abs(result1.startIndex - result2.startIndex).toLocaleString()}`;
    matrixInfo.textContent = `${term1} skip: ${result1.skip} | ${term2} skip: ${result2.skip} | ${distText}`;

    // Update legend
    legendTerm1.textContent = `"${term1}"`;
    legendTerm2.textContent = `"${term2}"`;
    legendTerm2Item.style.display = 'flex';
    legendBothItem.style.display = 'flex';

    // Generate matrix with both terms
    generateDualMatrix(result1, result2);

    // Show modal
    matrixModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ==================== GENERATE MATRIX (SINGLE TERM) ====================

  function generateMatrix(result, result2 = null, termClass = 'term1') {
    const absSkip = Math.abs(result.skip);
    const rowWidth = absSkip;
    const patternLen = result.pattern.length;

    const rowsBefore = parseInt(rowsBeforeInput.value) || 5;
    const rowsAfter = parseInt(rowsAfterInput.value) || 5;
    const totalRows = rowsBefore + patternLen + rowsAfter;

    const firstLetterRow = Math.floor(result.startIndex / rowWidth);
    const firstLetterCol = result.startIndex % rowWidth;

    const matrixStartRow = Math.max(0, firstLetterRow - rowsBefore);
    const matrixStartIndex = matrixStartRow * rowWidth;

    const patternColumn = firstLetterCol;

    // Calculate indices for term 1
    const term1Indices = new Set();
    for (let i = 0; i < patternLen; i++) {
      term1Indices.add(result.startIndex + (i * result.skip));
    }

    // Build the grid
    matrixGrid.innerHTML = '';
    matrixGrid.style.gridTemplateColumns = `repeat(${rowWidth}, 28px)`;

    for (let row = 0; row < totalRows; row++) {
      const rowStartIndex = matrixStartIndex + (row * rowWidth);
      if (rowStartIndex >= torahText.length) break;

      for (let col = 0; col < rowWidth; col++) {
        const charIndex = rowStartIndex + col;

        if (charIndex >= torahText.length) {
          const cell = document.createElement('div');
          cell.classList.add('matrix-cell');
          cell.textContent = '';
          matrixGrid.appendChild(cell);
          continue;
        }

        const char = torahText[charIndex];
        const cell = document.createElement('div');
        cell.classList.add('matrix-cell');
        cell.textContent = char;

        // Add verse info if available
        const verse = getVerseForPosition(charIndex);
        if (verse) {
          cell.setAttribute('data-verse', `${verse} | idx: ${charIndex}`);
        } else {
          cell.title = `Index: ${charIndex}`;
        }

        // Highlight term 1
        if (term1Indices.has(charIndex)) {
          cell.classList.add('highlighted', 'term1');
        }
        // Context column
        else if (col === patternColumn) {
          cell.classList.add('context');
        }

        matrixGrid.appendChild(cell);
      }
    }
  }

  // ==================== GENERATE MATRIX (DUAL TERM) ====================

  function generateDualMatrix(result1, result2) {
    // Use the larger absolute skip for row width, or use result1's skip
    const absSkip1 = Math.abs(result1.skip);
    const absSkip2 = Math.abs(result2.skip);

    // Use the skip of the first term for row width (shows term1 vertically)
    const rowWidth = absSkip1;

    // Calculate positions
    const allPositions = [];

    for (let i = 0; i < result1.pattern.length; i++) {
      allPositions.push(result1.startIndex + (i * result1.skip));
    }
    for (let i = 0; i < result2.pattern.length; i++) {
      allPositions.push(result2.startIndex + (i * result2.skip));
    }

    const minPos = Math.min(...allPositions);
    const maxPos = Math.max(...allPositions);

    // Calculate rows needed
    const rowsBefore = parseInt(rowsBeforeInput.value) || 5;
    const rowsAfter = parseInt(rowsAfterInput.value) || 5;

    const firstRow = Math.floor(minPos / rowWidth);
    const lastRow = Math.floor(maxPos / rowWidth);
    const patternRows = lastRow - firstRow + 1;

    const matrixStartRow = Math.max(0, firstRow - rowsBefore);
    const matrixEndRow = lastRow + rowsAfter;
    const totalRows = matrixEndRow - matrixStartRow + 1;
    const matrixStartIndex = matrixStartRow * rowWidth;

    // Calculate indices for both terms
    const term1Indices = new Set();
    for (let i = 0; i < result1.pattern.length; i++) {
      term1Indices.add(result1.startIndex + (i * result1.skip));
    }

    const term2Indices = new Set();
    for (let i = 0; i < result2.pattern.length; i++) {
      term2Indices.add(result2.startIndex + (i * result2.skip));
    }

    // Build the grid
    matrixGrid.innerHTML = '';
    matrixGrid.style.gridTemplateColumns = `repeat(${rowWidth}, 28px)`;

    for (let row = 0; row < totalRows; row++) {
      const rowStartIndex = matrixStartIndex + (row * rowWidth);
      if (rowStartIndex >= torahText.length) break;

      for (let col = 0; col < rowWidth; col++) {
        const charIndex = rowStartIndex + col;

        if (charIndex >= torahText.length || charIndex < 0) {
          const cell = document.createElement('div');
          cell.classList.add('matrix-cell');
          cell.textContent = '';
          matrixGrid.appendChild(cell);
          continue;
        }

        const char = torahText[charIndex];
        const cell = document.createElement('div');
        cell.classList.add('matrix-cell');
        cell.textContent = char;

        // Add verse info
        const verse = getVerseForPosition(charIndex);
        if (verse) {
          cell.setAttribute('data-verse', `${verse} | idx: ${charIndex}`);
        } else {
          cell.title = `Index: ${charIndex}`;
        }

        // Highlight both terms
        const isTerm1 = term1Indices.has(charIndex);
        const isTerm2 = term2Indices.has(charIndex);

        if (isTerm1) cell.classList.add('term1');
        if (isTerm2) cell.classList.add('term2');

        matrixGrid.appendChild(cell);
      }
    }
  }

  // ==================== MATRIX MODAL CONTROLS ====================

  function closeMatrixView() {
    matrixModal.classList.remove('active');
    document.body.style.overflow = '';
    currentResult = null;
    currentResult2 = null;
  }

  if (matrixClose) {
    matrixClose.addEventListener('click', closeMatrixView);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && matrixModal.classList.contains('active')) {
      closeMatrixView();
    }
  });

  if (matrixModal) {
    matrixModal.addEventListener('click', (e) => {
      if (e.target === matrixModal) {
        closeMatrixView();
      }
    });
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      if (currentResult && currentResult2) {
        generateDualMatrix(currentResult, currentResult2);
      } else if (currentResult) {
        generateMatrix(currentResult);
      }
    });
  }
});
