document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.querySelector('#search-btn');
  const searchTermInput = document.getElementById('st1');
  const minSkipInput = document.getElementById('min-range');
  const maxSkipInput = document.getElementById('max-range');
  const resultContainer = document.getElementById('search-results');
  const offlineIndicator = document.getElementById('offline-indicator');
  let torahText = ""; // Global variable to hold the Torah text

  // Check online status on load and when it changes
  function updateOnlineStatus() {
    if (navigator.onLine) {
      offlineIndicator.classList.add('hidden');
    } else {
      offlineIndicator.classList.remove('hidden');
    }
  }
  
  // Add event listeners for online/offline events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial check
  updateOnlineStatus();

  // Fetch the Torah text file
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

  // Check if all required elements exist before proceeding
  if (!searchButton || !searchTermInput || !minSkipInput || !maxSkipInput || !resultContainer) {
    console.error('Missing required elements. Please check your HTML structure.');
    return;
  }

  // Event listener for the search button
  searchButton.addEventListener('click', () => {
    const searchTerm = searchTermInput.value.trim();
    let minSkip = parseInt(minSkipInput.value);
    let maxSkip = parseInt(maxSkipInput.value);

    // Validate skip range
    if (isNaN(minSkip) || isNaN(maxSkip) || minSkip > maxSkip) {
      alert("Minimum value must be less than or equal to Maximum value.");
      minSkipInput.value = -100;
      maxSkipInput.value = 100;
      minSkip = -100;
      maxSkip = 100;
      return;
    }

    // Validate search term
    if (searchTerm === "") {
      alert("Please enter a search term.");
      return;
    }

    // Clear previous results
    resultContainer.innerHTML = '';

    // Show loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('result-item');
    loadingElement.innerHTML = '<span class="loading-spinner"></span> Searching for "' + searchTerm + 
                               '" with skips from ' + minSkip + ' to ' + maxSkip + '...';
    resultContainer.appendChild(loadingElement);

    // Save search to history (useful for offline capabilities)
    saveSearchToHistory(searchTerm, minSkip, maxSkip);

    // Use Web Worker for non-blocking search (if supported)
    if (window.Worker) {
      // In the future, we can implement a worker - for now use setTimeout to avoid blocking UI
      setTimeout(() => {
        performSearch(searchTerm, minSkip, maxSkip, torahText, loadingElement);
      }, 100);
    } else {
      // Fallback for browsers that don't support Web Workers
      performSearch(searchTerm, minSkip, maxSkip, torahText, loadingElement);
    }
  });

  // Function to save search to history using localStorage
  function saveSearchToHistory(term, minSkip, maxSkip) {
    try {
      const searchHistory = JSON.parse(localStorage.getItem('bibleCodeSearchHistory') || '[]');
      
      // Add new search to history
      searchHistory.push({
        term,
        minSkip,
        maxSkip,
        timestamp: new Date().toISOString()
      });
      
      // Keep only the latest 20 searches
      while (searchHistory.length > 20) {
        searchHistory.shift();
      }
      
      // Save back to localStorage
      localStorage.setItem('bibleCodeSearchHistory', JSON.stringify(searchHistory));
    } catch (error) {
      console.error('Failed to save search to history:', error);
    }
  }

  // Function to perform search and display results - updated for async
  async function performSearch(term, minSkip, maxSkip, text, loadingElement) {
    try {
      // Use our external search algorithms module with async support
      const results = await window.searchAlgorithms.performELSSearch(term, text, minSkip, maxSkip, true);
      
      // Remove loading indicator
      loadingElement.remove();
      
      // Display results
      displayResults(results);
      
    } catch (error) {
      console.error('Search error:', error);
      loadingElement.innerHTML = `<strong>Error:</strong> ${error.message}`;
    }
  }

  // Function to display search results with enhanced formatting
  function displayResults(results) {
    const resultHeader = document.createElement('div');
    resultHeader.style.fontWeight = 'bold';
    resultHeader.style.marginBottom = '10px';
    
    if (!results || results.length === 0) {
      resultHeader.textContent = 'No results found.';
      resultContainer.appendChild(resultHeader);
      return;
    }
    
    // Group results by skip value for better organization
    const resultsBySkip = {};
    let totalResults = 0;
    
    results.forEach(result => {
      totalResults++;
      if (!resultsBySkip[result.skip]) {
        resultsBySkip[result.skip] = [];
      }
      resultsBySkip[result.skip].push(result);
    });
    
    resultHeader.textContent = `Found ${totalResults} matches:`;
    resultContainer.appendChild(resultHeader);
    
    // Display results grouped by skip
    Object.keys(resultsBySkip).sort((a, b) => Number(a) - Number(b)).forEach(skip => {
      const skipResults = resultsBySkip[skip];
      
      // Create a header for this skip value
      const skipHeader = document.createElement('div');
      skipHeader.classList.add('result-group-header');
      skipHeader.textContent = `Skip ${skip} (${skipResults.length} match${skipResults.length !== 1 ? 'es' : ''})`;
      resultContainer.appendChild(skipHeader);
      
      // Display each result
      skipResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        
        // Create message with details
        const resultText = document.createElement('div');
        resultText.innerHTML = `
          <strong>Found:</strong> "${result.pattern}" 
          <br><strong>Algorithm:</strong> ${result.algorithm}
          <br><strong>Starting at:</strong> index ${result.startIndex}
          <br><strong>Context:</strong> <span dir="rtl" class="context-text">${getTextContext(torahText, result)}</span>
        `;
        
        resultItem.appendChild(resultText);
        resultContainer.appendChild(resultItem);
      });
    });
    
    // Scroll to results
    resultContainer.parentElement.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Function to get text context around a match
  function getTextContext(text, result) {
    const contextSize = 10; // Characters to show before and after
    const absSkip = Math.abs(result.skip);
    const direction = result.skip > 0 ? 'right' : 'left';
    let highlightedContext = '';
    
    // Handle skip=0 differently (regular text)
    if (result.skip === 0) {
      const start = Math.max(0, result.startIndex - contextSize);
      const end = Math.min(text.length, result.endIndex + contextSize + 1);
      const prefix = text.substring(start, result.startIndex);
      const match = text.substring(result.startIndex, result.endIndex + 1);
      const suffix = text.substring(result.endIndex + 1, end);
      
      return `${prefix}<mark>${match}</mark>${suffix}`;
    }
    
    // For non-zero skips, show the pattern with highlighting
    let matchIndices = [];
    for (let i = 0; i < result.pattern.length; i++) {
      const idx = result.startIndex + (i * absSkip);
      matchIndices.push(idx);
    }
    
    // Extend context before and after
    const minIdx = Math.max(0, result.startIndex - (contextSize * absSkip));
    const maxIdx = Math.min(text.length - 1, result.endIndex + (contextSize * absSkip));
    
    // Build highlighted text
    for (let i = minIdx; i <= maxIdx; i += absSkip) {
      if (matchIndices.includes(i)) {
        highlightedContext += `<mark>${text[i]}</mark>`;
      } else {
        highlightedContext += text[i];
      }
    }
    
    return highlightedContext;
  }
});
