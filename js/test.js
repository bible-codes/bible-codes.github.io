document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.querySelector('.btn');
  const searchTermInput = document.getElementById('st1');
  const minSkipInput = document.getElementById('minSkipInput'); // Updated to match HTML
  const maxSkipInput = document.getElementById('maxSkipInput'); // Updated to match HTML
  const resultContainer = document.getElementById('test');
  let torahText = ""; // Global variable to hold the Torah text

  // Fetch the Torah text file
  fetch('../data/torahNoSpaces.txt')
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

    // Display search initiation message
    resultContainer.textContent = `Searching for "${searchTerm}" within range ${minSkip} to ${maxSkip}...`;
    resultContainer.style.color = "blue"; // Optional: Indicate loading with color
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = "Processing, please wait...";
    resultContainer.appendChild(loadingMessage);

    // Simulate a delay for demonstration purposes (replace with actual search logic)
    setTimeout(() => {
      const results = performELSSearchWithOptimization(searchTerm, minSkip, maxSkip);
      loadingMessage.remove(); // Remove the loading message
      displayResults(results);
    }, 1000); // 1-second simulated delay
  });

  // Function to perform the optimized ELS search
  function performELSSearchWithOptimization(term, min, max) {
    const results = [];

    // Prehash frequent terms for optimization
    const prehashTable = prehashFrequentTerms(torahText, term.length);

    for (let skip = min; skip <= max; skip++) {
      if (skip === 0) {
        results.push(...kmpSearch(torahText, term, 0));
      } else {
        results.push(...searchWithSkipOptimized(term, torahText, skip, prehashTable));
      }
    }
    return results;
  }

  // Function to prehash substrings of a specific length
  function prehashFrequentTerms(text, length) {
    const table = {};
    for (let i = 0; i <= text.length - length; i++) {
      const substr = text.substring(i, i + length);
      table[substr] = table[substr] || [];
      table[substr].push(i);
    }
    return table;
  }

  // KMP search algorithm for exact matches
  function kmpSearch(text, pattern, skip) {
    const results = [];
    const lps = computeLPSArray(pattern);
    let i = 0;
    let j = 0;

    while (i < text.length) {
      if (pattern[j] === text[i]) {
        i++;
        j++;
      }
      if (j === pattern.length) {
        results.push(`Found "${pattern}" with skip ${skip} at index ${i - j}`);
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

  // Compute the LPS array for the KMP algorithm
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

  // Optimized search with skip
  function searchWithSkipOptimized(term, text, skip, prehashTable) {
    const results = [];
    const adjustedSkip = Math.abs(skip);
    const direction = skip > 0 ? 'right' : 'left';

    for (let i = 0; i < text.length; i++) {
      let candidate = '';

      if (prehashTable[term] && prehashTable[term].includes(i)) {
        results.push(`Found "${term}" directly from prehash with skip ${skip} starting at index ${i}`);
      } else {
        for (let j = i; j < text.length && candidate.length < term.length; j += adjustedSkip) {
          candidate += text[j];
        }
        if (candidate === term) {
          results.push(`Found "${term}" skipping ${skip} ${direction} starting at index ${i}`);
        }
      }
    }
    return results;
  }

  // Function to display search results
  function displayResults(results) {
    if (results.length === 0) {
      resultContainer.innerHTML += "<br>No results found.";
    } else {
      resultContainer.innerHTML += "<br>" + results.join('<br>');
    }
  }
});
