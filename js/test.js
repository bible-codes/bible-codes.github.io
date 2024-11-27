document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.querySelector('.btn');
  const searchTermInput = document.getElementById('st1');
  const minSkipInput = document.getElementById('minSkip');
  const maxSkipInput = document.getElementById('maxSkip');
  const resultContainer = document.getElementById('test');

  searchButton.addEventListener('click', () => {
    const searchTerm = searchTermInput.value.trim();
    let minSkip = parseInt(minSkipInput.value);
    let maxSkip = parseInt(maxSkipInput.value);

    if (isNaN(minSkip) || isNaN(maxSkip) || minSkip > maxSkip) {
      alert("Minimum value must be less than or equal to Maximum value.");
      minSkipInput.value = -100;
      maxSkipInput.value = 100;
      minSkip = -100;
      maxSkip = 100;
      return;
    }

    if (searchTerm === "") {
      alert("Please enter a search term.");
      return;
    }

    resultContainer.textContent = `Searching for "${searchTerm}" within range ${minSkip} to ${maxSkip}...`;
    resultContainer.style.color = "blue"; // Optional: Change color to indicate process
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = "Processing, please wait...";
    resultContainer.appendChild(loadingMessage);

    // Simulate a delay to mimic a real search process (replace this with actual searching)
    setTimeout(() => {
      const results = performELSSearchWithOptimization(searchTerm, minSkip, maxSkip);
      loadingMessage.remove(); // Remove loading message after search
      displayResults(results);
    }, 1000); // Simulated delay (1 second)
  });

  function performELSSearchWithOptimization(term, min, max) {
    const text = "mocktextfromtorah"; // Replace this with your text
    const results = [];
    const prehashTable = prehashFrequentTerms(text, term.length);

    for (let skip = min; skip <= max; skip++) {
      if (skip === 0) {
        results.push(...kmpSearch(text, term, 0));
      } else {
        results.push(...searchWithSkipOptimized(term, text, skip, prehashTable));
      }
    }
    return results;
  }

  function prehashFrequentTerms(text, length) {
    const table = {};
    for (let i = 0; i <= text.length - length; i++) {
      const substr = text.substring(i, i + length);
      table[substr] = table[substr] || [];
      table[substr].push(i);
    }
    return table;
  }

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

  function searchWithSkipOptimized(term, text, skip, prehashTable) {
    const results = [];
    const adjustedSkip = Math.abs(skip);
    const direction = skip > 0 ? 'right' : 'left';

    for (let i = 0; i < text.length; i++) {
      if (prehashTable[term] && prehashTable[term].includes(i)) {
        results.push(`Found "${term}" directly from prehash with skip ${skip} starting at index ${i}`);
      } else {
        let candidate = '';
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

  function displayResults(results) {
    if (results.length === 0) {
      resultContainer.innerHTML += "<br>No results found.";
    } else {
      resultContainer.innerHTML += "<br>" + results.join('<br>');
    }
  }
});
