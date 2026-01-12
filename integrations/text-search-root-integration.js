/**
 * Root Extraction Integration for Text Search
 *
 * Add this module to text-search.html to enable root-based search
 *
 * Instructions:
 * 1. Add mobile CSS: <link rel="stylesheet" href="css/mobile-optimized.css">
 * 2. Add at top of page: <script type="module" src="integrations/text-search-root-integration.js"></script>
 * 3. Ensure text-search.html exports its search function as window.performTextSearch
 */

import { getRootIntegration } from '../engines/root-integration.js';
import { initMobileNav } from '../js/mobile-nav.js';

let rootIntegration = null;
let rootSearchEnabled = false;
let originalSearchFunction = null;

/**
 * Initialize root integration
 */
async function initRootIntegration() {
  console.log('Initializing root integration for text search...');

  // Initialize mobile nav
  initMobileNav();

  // Initialize root integration
  rootIntegration = getRootIntegration();
  await rootIntegration.initialize();

  // Add root search toggle to search form
  addRootSearchToggle();

  // Wrap original search function
  wrapSearchFunction();

  console.log('Root integration ready!');
}

/**
 * Add root search toggle to the search form
 */
function addRootSearchToggle() {
  const searchForm = document.querySelector('.search-form') ||
                    document.querySelector('form') ||
                    document.querySelector('.search-container');

  if (!searchForm) {
    console.warn('Could not find search form to add root toggle');
    return;
  }

  // Create toggle using integration helper
  const toggle = rootIntegration.createRootSearchToggle((enabled) => {
    rootSearchEnabled = enabled;
    console.log('Root search:', enabled ? 'enabled' : 'disabled');
  });

  // Insert before search button or at end of form
  const searchButton = searchForm.querySelector('button[type="submit"]') ||
                      searchForm.querySelector('.search-btn');

  if (searchButton) {
    searchButton.parentNode.insertBefore(toggle, searchButton);
  } else {
    searchForm.appendChild(toggle);
  }
}

/**
 * Wrap the original search function to add root expansion
 */
function wrapSearchFunction() {
  // Save original search function
  originalSearchFunction = window.performTextSearch || window.search || window.doSearch;

  if (!originalSearchFunction) {
    console.warn('Original search function not found. Root expansion may not work.');
    return;
  }

  // Create wrapped version
  window.performTextSearch = async function(query, options = {}) {
    let searchTerms = [query];
    let expansionDisplay = null;

    // If root search enabled, expand query
    if (rootSearchEnabled && query && query.trim()) {
      try {
        const expansion = await rootIntegration.expandQuery(query.trim());

        if (expansion && expansion.related && expansion.related.length > 1) {
          searchTerms = [expansion.original, ...expansion.related.slice(0, 20)]; // Limit to 20

          // Create expansion display
          expansionDisplay = rootIntegration.createExpansionDisplay(expansion);

          console.log(`Root search: expanded "${query}" to ${searchTerms.length} related words`);
        }
      } catch (error) {
        console.error('Root expansion error:', error);
        // Continue with original query if expansion fails
      }
    }

    // Perform searches for all terms
    let allResults = [];
    for (const term of searchTerms) {
      try {
        // Call original search function
        const results = await originalSearchFunction.call(this, term, options);

        // Add results (avoid duplicates by verse ID)
        if (Array.isArray(results)) {
          for (const result of results) {
            const isDuplicate = allResults.some(r =>
              r.verse_id === result.verse_id ||
              r.verseId === result.verseId ||
              (r.book === result.book && r.chapter === result.chapter && r.verse === result.verse)
            );

            if (!isDuplicate) {
              allResults.push(result);
            }
          }
        }
      } catch (error) {
        console.error(`Search error for term "${term}":`, error);
      }
    }

    // Enrich results with root data
    if (allResults.length > 0) {
      try {
        allResults = await enrichSearchResults(allResults);
      } catch (error) {
        console.error('Error enriching results:', error);
      }
    }

    // Display expansion info if available
    if (expansionDisplay) {
      const resultsContainer = document.querySelector('.results-container') ||
                              document.querySelector('#results') ||
                              document.querySelector('.results');

      if (resultsContainer) {
        // Remove previous expansion displays
        const oldExpansion = resultsContainer.querySelector('.root-expansion');
        if (oldExpansion) {
          oldExpansion.remove();
        }

        // Insert new expansion display at top
        resultsContainer.insertBefore(expansionDisplay, resultsContainer.firstChild);
      }
    }

    // Add group by root button
    addGroupByRootButton(allResults);

    return allResults;
  };
}

/**
 * Enrich search results with root data
 */
async function enrichSearchResults(results) {
  const enriched = [];

  for (const result of results) {
    try {
      // Extract words from result text
      const text = result.text || result.verse_text || result.verseText || '';
      const words = text.split(/\s+/).filter(w => w.length > 0);

      // Get root data for first few words (for performance)
      const wordSample = words.slice(0, 5);
      const rootPromises = wordSample.map(word =>
        rootIntegration.rootExtractor.extractRoot(word)
      );

      const roots = await Promise.all(rootPromises);

      // Add root info to result
      enriched.push({
        ...result,
        _roots: roots,
        _mainRoot: roots[0]?.root || null,
        _hasRootData: true
      });
    } catch (error) {
      console.error('Error enriching result:', error);
      enriched.push(result);
    }
  }

  return enriched;
}

/**
 * Add "Group by Root" button to results
 */
function addGroupByRootButton(results) {
  if (!results || results.length === 0) return;

  const resultsContainer = document.querySelector('.results-container') ||
                          document.querySelector('#results');

  if (!resultsContainer) return;

  // Check if button already exists
  if (document.getElementById('group-by-root-btn')) return;

  // Create button
  const button = document.createElement('button');
  button.id = 'group-by-root-btn';
  button.className = 'btn btn-secondary';
  button.textContent = '📊 קבץ לפי שורש (Group by Root)';
  button.style.cssText = 'margin: 10px 0;';

  button.onclick = () => groupResultsByRoot(results);

  // Insert after expansion or at top of results
  const expansion = resultsContainer.querySelector('.root-expansion');
  if (expansion) {
    expansion.after(button);
  } else {
    resultsContainer.insertBefore(button, resultsContainer.firstChild);
  }
}

/**
 * Group and display results by root
 */
async function groupResultsByRoot(results) {
  const resultsContainer = document.querySelector('.results-container') ||
                          document.querySelector('#results');

  if (!resultsContainer) return;

  // Show loading
  const button = document.getElementById('group-by-root-btn');
  if (button) {
    button.disabled = true;
    button.textContent = '⏳ מקבץ...';
  }

  try {
    // Extract all words from results
    const allWords = [];
    results.forEach(result => {
      const text = result.text || result.verse_text || result.verseText || '';
      const words = text.split(/\s+/).filter(w => w.length > 0);
      allWords.push(...words);
    });

    // Get unique words
    const uniqueWords = [...new Set(allWords)];

    // Extract roots
    const rootData = await rootIntegration.rootExtractor.extractRoots(uniqueWords.slice(0, 100));

    // Group by root
    const groups = {};
    rootData.forEach((data, idx) => {
      const root = data.root;
      if (!groups[root]) {
        groups[root] = {
          root: root,
          words: new Set(),
          count: 0
        };
      }
      groups[root].words.add(uniqueWords[idx]);
      groups[root].count++;
    });

    // Sort by count
    const sortedGroups = Object.values(groups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 roots

    // Display grouped results
    displayGroupedResults(sortedGroups);

  } catch (error) {
    console.error('Error grouping by root:', error);
    alert('שגיאה בקיבוץ לפי שורש');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '📊 קבץ לפי שורש (Group by Root)';
    }
  }
}

/**
 * Display grouped results
 */
function displayGroupedResults(groups) {
  const resultsContainer = document.querySelector('.results-container') ||
                          document.querySelector('#results');

  if (!resultsContainer) return;

  // Create grouped view container
  let groupedContainer = document.getElementById('grouped-results');
  if (!groupedContainer) {
    groupedContainer = document.createElement('div');
    groupedContainer.id = 'grouped-results';
    groupedContainer.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 2px solid #667eea;
    `;

    resultsContainer.appendChild(groupedContainer);
  }

  // Build HTML
  let html = '<h3 style="color: #667eea; margin-bottom: 15px;">📊 תוצאות לפי שורש</h3>';

  groups.forEach((group, idx) => {
    const words = Array.from(group.words).slice(0, 10); // Show first 10 words

    html += `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-right: 4px solid #667eea;">
        <div style="font-size: 1.2em; font-weight: bold; color: #667eea; margin-bottom: 10px;">
          ${idx + 1}. שורש: ${group.root} (${group.count} מילים)
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${words.map(word => `
            <span style="
              background: white;
              padding: 6px 12px;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
              font-family: 'David Libre', serif;
              font-size: 1.1em;
            ">${word}</span>
          `).join('')}
          ${group.count > 10 ? `<span style="color: #666; padding: 6px;">+${group.count - 10} עוד</span>` : ''}
        </div>
      </div>
    `;
  });

  groupedContainer.innerHTML = html;

  // Scroll to grouped results
  groupedContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Enhance result display with root badges
 */
function enhanceResultDisplay() {
  // Find all result items
  const resultItems = document.querySelectorAll('.result-item');

  resultItems.forEach(item => {
    // Check if already enhanced
    if (item.dataset.rootEnhanced) return;

    // Mark as enhanced
    item.dataset.rootEnhanced = 'true';

    // Get result data from data attributes or text
    const text = item.textContent;

    // Add root badge placeholder
    const badge = document.createElement('div');
    badge.className = 'result-root-info';
    badge.style.cssText = 'margin-top: 10px;';
    badge.innerHTML = '<small style="color: #999;">🌱 מנתח שורשים...</small>';

    item.appendChild(badge);

    // Extract and display root asynchronously
    extractAndDisplayRoot(text, badge);
  });
}

/**
 * Extract and display root for a result
 */
async function extractAndDisplayRoot(text, badgeElement) {
  try {
    // Extract first word
    const words = text.split(/\s+/).filter(w => /[\u0590-\u05FF]/.test(w));
    if (words.length === 0) {
      badgeElement.remove();
      return;
    }

    const firstWord = words[0].replace(/[^\u0590-\u05FF]/g, '');
    if (!firstWord) {
      badgeElement.remove();
      return;
    }

    // Extract root
    const rootData = await rootIntegration.rootExtractor.extractRoot(firstWord);

    // Create badge
    const badge = rootIntegration.createRootDisplay(rootData);
    badgeElement.innerHTML = '';
    badgeElement.appendChild(badge);

  } catch (error) {
    console.error('Error displaying root:', error);
    badgeElement.remove();
  }
}

/**
 * Add MutationObserver to enhance new results automatically
 */
function observeResults() {
  const resultsContainer = document.querySelector('.results-container') ||
                          document.querySelector('#results');

  if (!resultsContainer) return;

  const observer = new MutationObserver((mutations) => {
    enhanceResultDisplay();
  });

  observer.observe(resultsContainer, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRootIntegration);
} else {
  initRootIntegration();
}

// Observe for new results
setTimeout(observeResults, 1000);

// Export for external use
export { initRootIntegration, rootSearchEnabled };
