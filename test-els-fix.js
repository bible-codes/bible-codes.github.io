/**
 * Quick Test Script for ELS Bidirectional Fix
 * Run this in browser console on bible-codes.html page
 *
 * Usage:
 * 1. Open bible-codes.html
 * 2. Open console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Check output
 */

(async function testELSFix() {
  console.log('=== ELS Bidirectional Search Test ===\n');

  // Check if search algorithms are loaded
  if (typeof window.searchAlgorithms === 'undefined') {
    console.error('❌ search-algorithms.js not loaded!');
    return;
  }

  console.log('✅ search-algorithms.js loaded\n');

  // Test with simple text
  const testText = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 26 chars
  const testPattern = "AFK"; // Should be found at skip +5

  console.log('Test Text:', testText);
  console.log('Test Pattern:', testPattern);
  console.log('Expected: skip +5 finds "AFK" at positions [0,5,10]');
  console.log('Expected: skip -5 finds different sequence\n');

  // Test forward search (skip +5)
  console.log('--- Testing Skip +5 (Forward) ---');
  const forwardResults = await window.searchAlgorithms.performELSSearch(
    testPattern,
    testText,
    5,
    5,
    false
  );

  console.log(`Results for +5: ${forwardResults.length} found`);
  forwardResults.forEach(r => {
    console.log(`  Start: ${r.startIndex}, End: ${r.endIndex}, Algorithm: ${r.algorithm}`);
  });

  // Test backward search (skip -5)
  console.log('\n--- Testing Skip -5 (Backward) ---');
  const backwardResults = await window.searchAlgorithms.performELSSearch(
    testPattern,
    testText,
    -5,
    -5,
    false
  );

  console.log(`Results for -5: ${backwardResults.length} found`);
  backwardResults.forEach(r => {
    console.log(`  Start: ${r.startIndex}, End: ${r.endIndex}, Algorithm: ${r.algorithm}`);
  });

  // Compare
  console.log('\n--- Comparison ---');
  if (forwardResults.length === 0 && backwardResults.length === 0) {
    console.log('⚠️  No results for either direction (might be expected for this pattern)');
  } else if (forwardResults.length > 0 && backwardResults.length > 0) {
    const forwardStart = forwardResults[0].startIndex;
    const backwardStart = backwardResults[0].startIndex;

    if (forwardStart === backwardStart) {
      console.log('❌ FAIL: Both directions found same starting index!');
      console.log('   This indicates bidirectional search is NOT working');
    } else {
      console.log('✅ PASS: Different starting indices for +5 vs -5');
      console.log(`   Forward: ${forwardStart}, Backward: ${backwardStart}`);
    }
  }

  // Test skip exclusion
  console.log('\n--- Testing Skip Exclusion ---');
  console.log('Searching range -2 to +2 (should exclude ±1, include 0 and ±2)\n');

  const rangeResults = await window.searchAlgorithms.performELSSearch(
    testPattern,
    testText,
    -2,
    2,
    false
  );

  const skipValues = [...new Set(rangeResults.map(r => r.skip))].sort((a,b) => a-b);
  console.log('Skip values found:', skipValues);

  if (skipValues.includes(1) || skipValues.includes(-1)) {
    console.log('❌ FAIL: Skip ±1 found (should be excluded)');
  } else {
    console.log('✅ PASS: Skip ±1 properly excluded');
  }

  // Check open text labeling
  const openTextResults = rangeResults.filter(r => r.skip === 0);
  if (openTextResults.length > 0) {
    const hasOpenTextLabel = openTextResults[0].algorithm.includes('Open Text');
    if (hasOpenTextLabel) {
      console.log('✅ PASS: Skip 0 labeled as "Open Text"');
    } else {
      console.log('❌ FAIL: Skip 0 not properly labeled');
    }
  }

  console.log('\n=== Test Complete ===');
  console.log('\nIf you see FAIL messages:');
  console.log('1. Hard refresh the page (Ctrl+Shift+R)');
  console.log('2. Check service worker version is v4.2');
  console.log('3. Clear cache and try again');
  console.log('4. See CACHE-CLEAR-INSTRUCTIONS.md for help\n');
})();
