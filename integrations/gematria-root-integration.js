/**
 * Root Extraction Integration for Gematria Calculator
 *
 * Adds root-level gematria calculations and root-based grouping
 *
 * Instructions:
 * 1. Add mobile CSS: <link rel="stylesheet" href="css/mobile-optimized.css">
 * 2. Add at top of page: <script type="module" src="integrations/gematria-root-integration.js"></script>
 * 3. Mobile navigation will be initialized automatically
 */

import { getRootIntegration } from '../engines/root-integration.js';
import { initMobileNav } from '../js/mobile-nav.js';
import { calculateGematria, GematriaMethod } from '../engines/gematria.js';

let rootIntegration = null;
let rootGematriaEnabled = false;
let originalPerformCalculation = null;
let originalDisplaySearchResults = null;

/**
 * Initialize root integration for gematria
 */
async function initRootIntegration() {
  console.log('Initializing root integration for gematria...');

  // Initialize mobile nav
  initMobileNav();

  // Initialize root integration
  rootIntegration = getRootIntegration();
  await rootIntegration.initialize();

  // Add root gematria toggle
  addRootGematriaToggle();

  // Enhance calculator display
  enhanceCalculatorDisplay();

  // Enhance search results display
  enhanceSearchDisplay();

  console.log('Gematria root integration ready!');
}

/**
 * Add root gematria toggle to calculator section
 */
function addRootGematriaToggle() {
  const calculatorSection = document.querySelector('.calculator-section');
  if (!calculatorSection) {
    console.warn('Calculator section not found');
    return;
  }

  // Create toggle
  const toggle = rootIntegration.createRootSearchToggle((enabled) => {
    rootGematriaEnabled = enabled;
    console.log('Root gematria:', enabled ? 'enabled' : 'disabled');

    // Recalculate if there's input
    const calcInput = document.getElementById('calcInput');
    if (calcInput && calcInput.value.trim()) {
      // Trigger existing calculation
      const calcBtn = document.getElementById('calcBtn');
      if (calcBtn) calcBtn.click();
    }
  });

  // Customize label
  const label = toggle.querySelector('label');
  if (label) {
    label.textContent = '🌱 הצג גם גימטריית שורש (Show root gematria too)';
  }

  // Insert after method selector
  const methodSelector = document.getElementById('methodSelector');
  if (methodSelector) {
    methodSelector.after(toggle);
  } else {
    calculatorSection.appendChild(toggle);
  }
}

/**
 * Enhance calculator display to show root gematria
 */
function enhanceCalculatorDisplay() {
  // Store original performCalculation if it exists
  originalPerformCalculation = window.performCalculation;

  // Intercept calculation results
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.target.id === 'gematriaCards' && rootGematriaEnabled) {
        await addRootGematriaCards();
      }
    }
  });

  const gematriaCards = document.getElementById('gematriaCards');
  if (gematriaCards) {
    observer.observe(gematriaCards, { childList: true, subtree: true });
  }
}

/**
 * Add root gematria calculation cards
 */
async function addRootGematriaCards() {
  const calcInput = document.getElementById('calcInput');
  if (!calcInput) return;

  const text = calcInput.value.trim();
  if (!text) return;

  const gematriaCards = document.getElementById('gematriaCards');
  const letterBreakdown = document.getElementById('letterBreakdown');

  try {
    // Extract root of the input text
    const rootData = await rootIntegration.rootExtractor.extractRoot(text);

    if (!rootData || !rootData.root) {
      console.log('No root found for text:', text);
      return;
    }

    // Calculate root gematria for all methods
    const rootStandard = calculateGematria(rootData.root, GematriaMethod.STANDARD);
    const rootReduced = calculateGematria(rootData.root, GematriaMethod.REDUCED);
    const rootOrdinal = calculateGematria(rootData.root, GematriaMethod.ORDINAL);

    // Add root info card
    const rootInfoCard = document.createElement('div');
    rootInfoCard.className = 'gematria-card';
    rootInfoCard.style.cssText = `
      grid-column: 1 / -1;
      background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
    `;
    rootInfoCard.innerHTML = `
      <h3>🌱 שורש / Root</h3>
      <div class="gematria-value">${rootData.root}</div>
      <p>
        Binyan: ${rootData.binyan || 'Unknown'} |
        Confidence: ${(rootData.confidence * 100).toFixed(0)}%
      </p>
    `;

    // Add root gematria cards
    const rootStandardCard = document.createElement('div');
    rootStandardCard.className = 'gematria-card';
    rootStandardCard.style.opacity = '0.9';
    rootStandardCard.innerHTML = `
      <h3>Root Standard</h3>
      <div class="gematria-value">${rootStandard}</div>
      <p>שורש: ${rootData.root}</p>
    `;

    const rootReducedCard = document.createElement('div');
    rootReducedCard.className = 'gematria-card';
    rootReducedCard.style.opacity = '0.9';
    rootReducedCard.innerHTML = `
      <h3>Root Reduced</h3>
      <div class="gematria-value">${rootReduced}</div>
      <p>שורש: ${rootData.root}</p>
    `;

    const rootOrdinalCard = document.createElement('div');
    rootOrdinalCard.className = 'gematria-card';
    rootOrdinalCard.style.opacity = '0.9';
    rootOrdinalCard.innerHTML = `
      <h3>Root Ordinal</h3>
      <div class="gematria-value">${rootOrdinal}</div>
      <p>שורש: ${rootData.root}</p>
    `;

    // Insert root cards after existing cards
    gematriaCards.appendChild(rootInfoCard);
    gematriaCards.appendChild(rootStandardCard);
    gematriaCards.appendChild(rootReducedCard);
    gematriaCards.appendChild(rootOrdinalCard);

    // Add root comparison to letter breakdown
    if (letterBreakdown) {
      const comparisonDiv = document.createElement('div');
      comparisonDiv.className = 'comparison-section';
      comparisonDiv.innerHTML = `
        <h3>השוואת מילה לשורש / Word vs Root Comparison</h3>
        <div class="comparison-grid">
          <div class="comparison-card">
            <h4>Word (מילה)</h4>
            <p><strong>${text}</strong></p>
            <p>Standard: ${calculateGematria(text, GematriaMethod.STANDARD)}</p>
            <p>Reduced: ${calculateGematria(text, GematriaMethod.REDUCED)}</p>
            <p>Ordinal: ${calculateGematria(text, GematriaMethod.ORDINAL)}</p>
          </div>
          <div class="comparison-card">
            <h4>Root (שורש)</h4>
            <p><strong>${rootData.root}</strong></p>
            <p>Standard: ${rootStandard}</p>
            <p>Reduced: ${rootReduced}</p>
            <p>Ordinal: ${rootOrdinal}</p>
            <p style="color: #43cea2; margin-top: 10px;">
              ${rootData.binyan || 'Unknown binyan'} |
              ${(rootData.confidence * 100).toFixed(0)}% confidence
            </p>
          </div>
        </div>
      `;
      letterBreakdown.appendChild(comparisonDiv);
    }

  } catch (error) {
    console.error('Error calculating root gematria:', error);
  }
}

/**
 * Enhance search results display with root information
 */
function enhanceSearchDisplay() {
  // Observe search result containers
  const resultContainers = [
    document.getElementById('exactResults'),
    document.getElementById('rangeResults'),
    document.getElementById('matchingResults')
  ];

  resultContainers.forEach(container => {
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          addRootInfoToResults(container);
        }
      }
    });

    observer.observe(container, { childList: true, subtree: true });
  });
}

/**
 * Add root information to search results
 */
async function addRootInfoToResults(container) {
  const resultCards = container.querySelectorAll('.result-card');

  for (const card of resultCards) {
    // Check if already enhanced
    if (card.dataset.rootEnhanced) continue;
    card.dataset.rootEnhanced = 'true';

    // Get the Hebrew text
    const textElement = card.querySelector('.result-text-hebrew');
    if (!textElement) continue;

    const text = textElement.textContent.trim();
    if (!text) continue;

    try {
      // Extract root
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const firstWord = words[0];

      if (!firstWord) continue;

      const rootData = await rootIntegration.rootExtractor.extractRoot(firstWord);

      if (!rootData || !rootData.root) continue;

      // Calculate root gematria
      const rootGematria = calculateGematria(rootData.root, GematriaMethod.STANDARD);

      // Add root badge
      const rootBadge = document.createElement('div');
      rootBadge.style.cssText = `
        margin-top: 10px;
        padding: 8px 12px;
        background: linear-gradient(135deg, #43cea2 0%, #185a9d 100%);
        color: white;
        border-radius: 5px;
        font-size: 0.9em;
      `;
      rootBadge.innerHTML = `
        🌱 שורש: ${rootData.root} |
        Gematria: ${rootGematria} |
        ${rootData.binyan || 'Unknown'} |
        ${(rootData.confidence * 100).toFixed(0)}% confidence
      `;

      card.appendChild(rootBadge);

    } catch (error) {
      console.error('Error adding root info to result:', error);
    }
  }

  // Add "Group by Root" button if not already present
  addGroupByRootButton(container);
}

/**
 * Add "Group by Root" button to results
 */
function addGroupByRootButton(container) {
  // Check if button already exists
  if (container.querySelector('.group-by-root-btn')) return;

  const resultCards = container.querySelectorAll('.result-card');
  if (resultCards.length === 0) return;

  // Create button
  const button = document.createElement('button');
  button.className = 'group-by-root-btn search-btn';
  button.textContent = '📊 קבץ לפי שורש (Group by Root)';
  button.style.cssText = 'margin: 15px 0; display: block;';

  button.onclick = async () => {
    button.disabled = true;
    button.textContent = '⏳ מקבץ...';

    try {
      await groupResultsByRoot(container);
    } catch (error) {
      console.error('Error grouping by root:', error);
      alert('שגיאה בקיבוץ לפי שורש');
    } finally {
      button.disabled = false;
      button.textContent = '📊 קבץ לפי שורש (Group by Root)';
    }
  };

  // Insert at top of results
  const resultsGrid = container.querySelector('.results-grid');
  if (resultsGrid) {
    container.insertBefore(button, resultsGrid);
  } else {
    container.insertBefore(button, container.firstChild);
  }
}

/**
 * Group search results by root
 */
async function groupResultsByRoot(container) {
  const resultCards = Array.from(container.querySelectorAll('.result-card'));
  if (resultCards.length === 0) return;

  // Extract all words from results
  const allWords = [];
  resultCards.forEach(card => {
    const textElement = card.querySelector('.result-text-hebrew');
    if (textElement) {
      const words = textElement.textContent.split(/\s+/).filter(w => w.length > 0);
      allWords.push(...words);
    }
  });

  // Get unique words
  const uniqueWords = [...new Set(allWords)];

  // Extract roots
  const rootPromises = uniqueWords.slice(0, 100).map(word =>
    rootIntegration.rootExtractor.extractRoot(word)
  );
  const rootDataArray = await Promise.all(rootPromises);

  // Group by root
  const groups = {};
  rootDataArray.forEach((data, idx) => {
    const root = data.root;
    if (!root) return;

    if (!groups[root]) {
      groups[root] = {
        root: root,
        words: new Set(),
        gematria: calculateGematria(root, GematriaMethod.STANDARD),
        binyan: data.binyan,
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
  displayGroupedResults(container, sortedGroups);
}

/**
 * Display grouped results by root
 */
function displayGroupedResults(container, groups) {
  // Create or get grouped container
  let groupedDiv = container.querySelector('.grouped-by-root');
  if (!groupedDiv) {
    groupedDiv = document.createElement('div');
    groupedDiv.className = 'grouped-by-root';
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
  let html = '<h3 style="color: #185a9d; margin-bottom: 15px;">📊 תוצאות לפי שורש</h3>';

  groups.forEach((group, idx) => {
    const words = Array.from(group.words).slice(0, 10);

    html += `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-right: 4px solid #43cea2;">
        <div style="font-size: 1.2em; font-weight: bold; color: #185a9d; margin-bottom: 10px;">
          ${idx + 1}. שורש: ${group.root}
          <span style="color: #43cea2;">
            | Gematria: ${group.gematria}
            | ${group.count} מילים
          </span>
        </div>
        ${group.binyan ? `<div style="color: #666; font-size: 0.9em; margin-bottom: 8px;">בניין: ${group.binyan}</div>` : ''}
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
export { initRootIntegration, rootGematriaEnabled };
