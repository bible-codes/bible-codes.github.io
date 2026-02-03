# Cache Clear Instructions - ELS Bidirectional Fix

## Problem

The browser's service worker cached the old version of `search-algorithms.js`. Even though the code was fixed, the browser was still using the old cached version.

## Solution Applied

Updated service worker cache version from `v4.1` → `v4.2`

---

## How to Clear Cache and Test (Choose One Method)

### Method 1: Hard Refresh (Simplest)

**Chrome/Edge/Brave:**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Firefox:**
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- Mac: `Cmd + Option + E` (empty cache), then `Cmd + R` (refresh)

### Method 2: Manual Cache Clear (More Thorough)

1. Open Developer Tools (`F12` or `Ctrl+Shift+I`)
2. Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
3. On left sidebar, find **Service Workers**
4. Click **Unregister** next to the service worker
5. Still in Application/Storage tab, click **Clear storage** button
6. Reload page (`F5`)

### Method 3: Incognito/Private Mode (Quick Test)

- Open the site in an incognito/private window
- No cache will be used
- Good for quick verification

---

## Verification Steps

### 1. Check Service Worker Version

Open console (`F12` → Console tab) and look for:
```
Service Worker: Installing v4.2...
Service Worker: Activating v4.2...
```

If you see `v4.1` or `v4.0`, the cache hasn't been cleared yet.

### 2. Test Bidirectional Search

**Test Case 1: "זבידה"**
- Search range: `-50` to `50`
- Expected behavior:
  - Skip `0`: 1 result (open text) - yellow highlighted
  - Skip `+2` through `+50`: Potential forward ELS results
  - Skip `-2` through `-50`: Potential backward ELS results
  - **Skip +50 and -50 should have DIFFERENT results** (or both empty)
  - No skip `±1` results (excluded)

**Test Case 2: "יגרשהדות"**
- Search range: `-10` to `10`
- Expected behavior:
  - Skip `0`: 1 result at index 46100 (open text)
  - Skip `±1`: No results (excluded)
  - Skip `±2` through `±10`: May have results, but different for + vs -

### 3. Check Result Display

For skip = 0:
- ✅ Yellow highlighted box
- ✅ Label: "Open Text (ELS=0) - Plain sequential reading"
- ✅ Algorithm shows: "Open Text (ELS=0)"

For skip ≠ 0:
- ✅ Algorithm shows: "KMP-ELS" or "Boyer-Moore-ELS"
- ✅ Message includes "(forward)" for positive skip
- ✅ Message includes "(backward)" for negative skip

---

## Diagnostic Test Page

Open `test-bidirectional.html` in your browser:
```
file:///path/to/bible-codes.github.io/test-bidirectional.html
```

Or if deployed:
```
https://bible-codes.github.io/test-bidirectional.html
```

**What to check:**
1. Visual display shows different sequences for +5 vs -5
2. Browser console shows `Forward === Backward? false`

---

## Still Seeing Duplicates?

If after clearing cache you still see identical results for +50 and -50:

### Debug Steps:

1. **Open Console** (`F12` → Console tab)

2. **Run this test:**
```javascript
// Test the extraction function directly
const text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Forward extraction
let forwardSeq = '';
for (let i = 0; i < text.length; i += 5) {
  forwardSeq += text[i];
}
console.log('Forward (+5):', forwardSeq);

// Backward extraction
let startPos = 0;
while (startPos + 5 < text.length) startPos += 5;
let backwardSeq = '';
for (let i = startPos; i >= 0; i -= 5) {
  backwardSeq += text[i];
}
console.log('Backward (-5):', backwardSeq);

console.log('Are they equal?', forwardSeq === backwardSeq);
```

**Expected output:**
```
Forward (+5): AFKPUZ
Backward (-5): ZUPKFA
Are they equal? false
```

3. **Check actual search-algorithms.js loaded:**
```javascript
// In console, check if the file has the bidirectional logic
console.log(window.searchAlgorithms.performELSSearch.toString().includes('backward'));
// Should return: true
```

4. **Verify no syntax errors:**
```javascript
// Check if functions are defined
console.log(typeof window.searchAlgorithms);
console.log(typeof window.searchAlgorithms.performELSSearch);
// Both should be: "object" and "function"
```

---

## If Problem Persists

### Report These Details:

1. **Browser and version:**
   - Example: Chrome 120.0.6099.216

2. **Service worker version in console:**
   - Look for "Service Worker: Activating v..."

3. **Test search results:**
   - Search term: "יגרשהדות"
   - Range: -10 to 10
   - Number of results for skip +5:
   - Number of results for skip -5:
   - Are they identical? (Yes/No)
   - Starting indices for both:

4. **Console test results:**
   - Paste output of the debug test above

5. **Screenshot (if possible)**

---

## Technical Details

### What Changed:

**File:** `js/search-algorithms.js`

**Function:** `kmpSearchWithSkip()` (lines 371-442)

**Forward (skip > 0):**
```javascript
for (let i = startPos; i < text.length; i += absSkip) {
  sequenceText += text[i];  // Positions: 0, 5, 10, 15, ...
}
```

**Backward (skip < 0):**
```javascript
// Find highest position first
let startPos = classOffset;
while (startPos + absSkip < text.length) {
  startPos += absSkip;
}
// Extract backward
for (let i = startPos; i >= 0; i -= absSkip) {
  sequenceText += text[i];  // Positions: 25, 20, 15, 10, ...
}
```

**Result:** Different sequences → different ELS findings

---

## Quick Checklist

Before reporting issues, verify:
- [ ] Hard refreshed page (`Ctrl+Shift+R`)
- [ ] Checked service worker version is v4.2
- [ ] No JavaScript errors in console
- [ ] Tested with "זבידה" in range -50 to 50
- [ ] Verified skip ±1 are excluded (no results)
- [ ] Checked skip 0 shows yellow "Open Text" label
- [ ] Ran diagnostic test in `test-bidirectional.html`

---

*Last Updated: 2026-02-02*
*Fix Version: v4.2*
