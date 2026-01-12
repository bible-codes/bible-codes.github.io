/**
 * Root Extraction Integration for Acronym/Notarikon Tool
 *
 * Adds root analysis of extracted acronyms and meaningful pattern detection
 *
 * Instructions:
 * 1. Add mobile CSS: <link rel="stylesheet" href="css/mobile-optimized.css">
 * 2. Add at top of page: <script type="module" src="integrations/acronym-root-integration.js"></script>
 * 3. Mobile navigation will be initialized automatically
 */

import { getRootIntegration } from '../engines/root-integration.js';
import { initMobileNav } from '../js/mobile-nav.js';

let rootIntegration = null;

/**
 * Initialize root integration for acronym tool
 */
async function initRootIntegration() {
  console.log('Initializing root integration for acronym tool...');

  // Initialize mobile nav
  initMobileNav();

  // Initialize root integration
  rootIntegration = getRootIntegration();
  await rootIntegration.initialize();

  // Enhance extracted acronym display
  enhanceAcronymDisplay();

  // Enhance search results
  enhanceSearchResults();

  console.log('Acronym root integration ready!');
}

/**
 * Enhance acronym extraction display with root analysis
 */
function enhanceAcronymDisplay() {
  const extractResults = document.getElementById('extractResults');
  if (!extractResults) return;

  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        await analyzeExtractedAcronym(extractResults);
      }
    }
  });

  observer.observe(extractResults, { childList: true, subtree: true });
}

/**
 * Analyze extracted acronym for root information
 */
async function analyzeExtractedAcronym(container) {
  const acronymElement = container.querySelector('.acronym-text');
  if (!acronymElement) return;

  // Check if already analyzed
  if (acronymElement.dataset.rootAnalyzed) return;
  acronymElement.dataset.rootAnalyzed = 'true';

  const acronymText = acronymElement.textContent.trim();
  if (!acronymText) return;

  try {
    // Extract root of the acronym
    const rootData = await rootIntegration.rootExtractor.extractRoot(acronymText);

    // Check if acronym is a known word
    const isKnownWord = rootIntegration.rootExtractor.isKnownWord(acronymText);

    // Create root analysis section
    const analysisDiv = document.createElement('div');
    analysisDiv.className = 'root-analysis';
    analysisDiv.style.cssText = `
      background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    `;

    let analysisHTML = '<h3 style="color: white; margin-bottom: 15px;">🌱 Root Analysis</h3>';

    if (isKnownWord) {
      analysisHTML += `
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div style="font-size: 1.3em; margin-bottom: 10px;">
            ✨ <strong>This acronym is a known word!</strong>
          </div>
          <p>
            The extracted acronym "<strong>${acronymText}</strong>" exists as a word in the Hebrew lexicon,
            which may indicate a meaningful pattern or intentional encoding.
          </p>
        </div>
      `;
    }

    if (rootData && rootData.root) {
      analysisHTML += `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
            <strong>Root (שורש):</strong><br>
            <span style="font-size: 1.4em; font-family: 'David Libre', serif;">${rootData.root}</span>
          </div>
          <div>
            <strong>Binyan:</strong><br>
            ${rootData.binyan || 'Unknown'}
          </div>
          <div>
            <strong>Confidence:</strong><br>
            ${(rootData.confidence * 100).toFixed(0)}%
          </div>
          <div>
            <strong>Status:</strong><br>
            ${isKnownWord ? '✅ Known Word' : '⚠️ Heuristic'}
          </div>
        </div>
      `;

      // Get related words with same root
      const relatedWords = await rootIntegration.rootExtractor.getWordsWithRoot(rootData.root, 15);

      if (relatedWords && relatedWords.length > 1) {
        analysisHTML += `
          <div style="margin-top: 20px; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
            <strong>Related Words (Same Root):</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
              ${relatedWords.slice(0, 15).map(word => `
                <span style="
                  background: rgba(255,255,255,0.3);
                  padding: 6px 12px;
                  border-radius: 4px;
                  font-family: 'David Libre', serif;
                  font-size: 1.1em;
                ">${word}</span>
              `).join('')}
              ${relatedWords.length > 15 ? `<span style="padding: 6px;">+${relatedWords.length - 15} more</span>` : ''}
            </div>
          </div>
        `;
      }
    } else {
      analysisHTML += `
        <p>Unable to extract root for this acronym. It may be too short or not follow standard Hebrew morphology.</p>
      `;
    }

    analysisDiv.innerHTML = analysisHTML;

    // Insert after acronym display
    const acronymDisplay = container.querySelector('.acronym-display');
    if (acronymDisplay) {
      acronymDisplay.after(analysisDiv);
    } else {
      container.insertBefore(analysisDiv, container.firstChild);
    }

  } catch (error) {
    console.error('Error analyzing acronym:', error);
  }
}

/**
 * Enhance search results with root information
 */
function enhanceSearchResults() {
  const searchResults = document.getElementById('searchResults');
  if (!searchResults) return;

  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        await enhanceResultCards(searchResults);
      }
    }
  });

  observer.observe(searchResults, { childList: true, subtree: true });
}

/**
 * Enhance result cards with root badges
 */
async function enhanceResultCards(container) {
  const resultCards = container.querySelectorAll('.result-card');

  for (const card of resultCards) {
    // Check if already enhanced
    if (card.dataset.rootEnhanced) continue;
    card.dataset.rootEnhanced = 'true';

    // Get acronym text
    const acronymElement = card.querySelector('.result-acronym');
    if (!acronymElement) continue;

    const acronymText = acronymElement.textContent.trim();
    if (!acronymText) continue;

    try {
      // Extract root
      const rootData = await rootIntegration.rootExtractor.extractRoot(acronymText);
      const isKnownWord = rootIntegration.rootExtractor.isKnownWord(acronymText);

      // Add root badge
      const rootBadge = document.createElement('div');
      rootBadge.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
        color: white;
        border-radius: 5px;
        font-size: 0.9em;
      `;

      let badgeHTML = '';

      if (isKnownWord) {
        badgeHTML += `<div style="font-weight: bold; margin-bottom: 5px;">✨ Known Word!</div>`;
      }

      if (rootData && rootData.root) {
        badgeHTML += `
          🌱 Root: ${rootData.root} |
          ${rootData.binyan || 'Unknown'} |
          ${(rootData.confidence * 100).toFixed(0)}% confidence
        `;
      } else {
        badgeHTML += '⚠️ No root detected';
      }

      rootBadge.innerHTML = badgeHTML;
      card.appendChild(rootBadge);

    } catch (error) {
      console.error('Error enhancing result card:', error);
    }
  }

  // Add "Group by Root" button
  addGroupByRootButton(container);
}

/**
 * Add "Group by Root" button to search results
 */
function addGroupByRootButton(container) {
  // Check if button already exists
  if (container.querySelector('.group-by-root-btn')) return;

  const resultCards = container.querySelectorAll('.result-card');
  if (resultCards.length === 0) return;

  // Create button
  const button = document.createElement('button');
  button.className = 'group-by-root-btn action-btn';
  button.textContent = '📊 קבץ לפי שורש (Group by Root)';
  button.style.cssText = 'margin: 15px auto; display: block; max-width: 400px;';

  button.onclick = async () => {
    button.disabled = true;
    button.textContent = '⏳ מקבץ...';

    try {
      await groupAcronymsByRoot(container);
    } catch (error) {
      console.error('Error grouping by root:', error);
      alert('שגיאה בקיבוץ לפי שורש');
    } finally {
      button.disabled = false;
      button.textContent = '📊 קבץ לפי שורש (Group by Root)';
    }
  };

  // Insert at top of results
  const resultsTitle = container.querySelector('h3');
  if (resultsTitle) {
    resultsTitle.after(button);
  } else {
    container.insertBefore(button, container.firstChild);
  }
}

/**
 * Group acronyms by their root
 */
async function groupAcronymsByRoot(container) {
  const resultCards = Array.from(container.querySelectorAll('.result-card'));
  if (resultCards.length === 0) return;

  // Extract all acronyms
  const acronyms = [];
  resultCards.forEach(card => {
    const acronymElement = card.querySelector('.result-acronym');
    if (acronymElement) {
      acronyms.push(acronymElement.textContent.trim());
    }
  });

  // Get unique acronyms
  const uniqueAcronyms = [...new Set(acronyms)];

  // Extract roots
  const rootPromises = uniqueAcronyms.slice(0, 100).map(acronym =>
    rootIntegration.rootExtractor.extractRoot(acronym)
  );
  const rootDataArray = await Promise.all(rootPromises);

  // Group by root
  const groups = {};
  const knownWords = [];

  rootDataArray.forEach((data, idx) => {
    const acronym = uniqueAcronyms[idx];
    const root = data.root;
    const isKnown = rootIntegration.rootExtractor.isKnownWord(acronym);

    if (isKnown) {
      knownWords.push({ acronym, root, binyan: data.binyan });
    }

    if (!root) return;

    if (!groups[root]) {
      groups[root] = {
        root: root,
        acronyms: new Set(),
        binyan: data.binyan,
        count: 0
      };
    }
    groups[root].acronyms.add(acronym);
    groups[root].count++;
  });

  // Sort by count
  const sortedGroups = Object.values(groups)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 roots

  // Display grouped results
  displayGroupedAcronyms(container, sortedGroups, knownWords);
}

/**
 * Display grouped acronyms
 */
function displayGroupedAcronyms(container, groups, knownWords) {
  // Create or get grouped container
  let groupedDiv = container.querySelector('.grouped-by-root');
  if (!groupedDiv) {
    groupedDiv = document.createElement('div');
    groupedDiv.className = 'grouped-by-root result-display';
    groupedDiv.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      border: 2px solid #43cea2;
    `;
    container.appendChild(groupedDiv);
  }

  // Build HTML
  let html = '<h3 style="color: #185a9d; margin-bottom: 20px;">📊 תוצאות לפי שורש</h3>';

  // Show known words first
  if (knownWords.length > 0) {
    html += `
      <div style="margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 10px;">
        <h4 style="color: white; margin-bottom: 15px;">✨ Known Words (${knownWords.length})</h4>
        <p style="margin-bottom: 15px;">These acronyms exist as actual words in the Hebrew lexicon:</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${knownWords.slice(0, 20).map(item => `
            <span style="
              background: rgba(255,255,255,0.3);
              padding: 8px 16px;
              border-radius: 5px;
              font-family: 'David Libre', serif;
              font-size: 1.2em;
            ">${item.acronym}</span>
          `).join('')}
          ${knownWords.length > 20 ? `<span style="padding: 8px;">+${knownWords.length - 20} more</span>` : ''}
        </div>
      </div>
    `;
  }

  // Show grouped by root
  groups.forEach((group, idx) => {
    const acronyms = Array.from(group.acronyms).slice(0, 10);

    html += `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-right: 4px solid #43cea2;">
        <div style="font-size: 1.2em; font-weight: bold; color: #185a9d; margin-bottom: 10px;">
          ${idx + 1}. שורש: ${group.root}
          <span style="color: #43cea2;">
            | ${group.count} acronyms
            ${group.binyan ? `| ${group.binyan}` : ''}
          </span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${acronyms.map(acronym => `
            <span style="
              background: white;
              padding: 8px 14px;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
              font-family: 'David Libre', serif;
              font-size: 1.2em;
            ">${acronym}</span>
          `).join('')}
          ${group.count > 10 ? `<span style="color: #666; padding: 8px;">+${group.count - 10} more</span>` : ''}
        </div>
      </div>
    `;
  });

  groupedDiv.innerHTML = html;

  // Scroll to grouped results
  groupedDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRootIntegration);
} else {
  initRootIntegration();
}

// Export for external use
export { initRootIntegration };
