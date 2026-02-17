/**
 * ELS Scan Web Worker — streams ALL results to IndexedDB
 *
 * No result caps. Hits are flushed to IndexedDB in batches during search,
 * keeping worker memory low. Main thread reads from IndexedDB after scan.
 *
 * Messages IN:
 *   { action: 'scan', torahText, terms, termAlts, minSkip, maxSkip }
 *   { action: 'cancel' }
 *
 * Messages OUT:
 *   { type: 'progress', formsSearched, totalForms, termIdx, primary, hitsSoFar }
 *   { type: 'term-done', primary, termIdx, totalTerms, hitCount, bestSkip, bestPos }
 *   { type: 'complete', totalTerms }
 *   { type: 'cancelled' }
 *   { type: 'error', error }
 */

const SCAN_DB_NAME = 'ELSScanResults';
const SCAN_DB_VER = 1;
const FLUSH_SIZE = 500;

let cancelled = false;

self.onmessage = function(e) {
  const { action } = e.data;
  if (action === 'scan') {
    cancelled = false;
    runScan(e.data).catch(err => {
      self.postMessage({ type: 'error', error: err.message });
    });
  } else if (action === 'cancel') {
    cancelled = true;
  }
};

// --- IndexedDB helpers ---

function openScanDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SCAN_DB_NAME, SCAN_DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('hits')) {
        const store = db.createObjectStore('hits', { autoIncrement: true });
        store.createIndex('by_term', 'term', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function clearStore(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('hits', 'readwrite');
    tx.objectStore('hits').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function flushBatch(db, buffer) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('hits', 'readwrite');
    const store = tx.objectStore('hits');
    for (const hit of buffer) store.put(hit);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- ELS search ---

function findELS(normText, term, skip, ch0Pos) {
  const results = [];
  const len = normText.length;
  const k = term.length;

  if (skip === 1) {
    let idx = 0;
    while ((idx = normText.indexOf(term, idx)) !== -1) {
      results.push(idx);
      idx++;
    }
  } else if (skip > 0) {
    const maxStart = len - (k - 1) * skip;
    for (const s of ch0Pos) {
      if (s >= maxStart) break;
      let match = true;
      for (let i = 1; i < k; i++) {
        if (normText[s + i * skip] !== term[i]) { match = false; break; }
      }
      if (match) results.push(s);
    }
  } else {
    // Negative skip: start must be high enough that s + (k-1)*skip >= 0
    const minStart = (k - 1) * (-skip);
    const maxEnd = len - 1;
    for (const s of ch0Pos) {
      if (s < minStart) continue;
      let match = true;
      for (let i = 1; i < k; i++) {
        const pos = s + i * skip;
        if (pos < 0 || pos >= len || normText[pos] !== term[i]) { match = false; break; }
      }
      if (match) results.push(s);
    }
  }
  return results;
}

// --- Main scan loop ---

async function runScan({ torahText, terms, termAlts, minSkip, maxSkip }) {
  const db = await openScanDB();
  await clearStore(db);

  let totalForms = 0;
  for (const t of terms) totalForms += (termAlts[t] || [t]).length;
  let formsSearched = 0;
  const totalSkipRange = maxSkip - minSkip || 1;

  for (let ti = 0; ti < terms.length; ti++) {
    if (cancelled) { db.close(); self.postMessage({ type: 'cancelled' }); return; }

    const primary = terms[ti];
    const alts = termAlts[primary] || [primary];
    let buffer = [];
    let hitCount = 0;
    let bestSkip = Infinity;
    let bestPos = 0;

    for (const form of alts) {
      if (cancelled) { db.close(); self.postMessage({ type: 'cancelled' }); return; }

      // Pre-compute positions of first character for ~22x speedup
      const ch0 = form[0];
      const ch0Pos = [];
      for (let i = 0; i < torahText.length; i++) {
        if (torahText[i] === ch0) ch0Pos.push(i);
      }

      let skipsDoneInForm = 0;
      for (let skip = minSkip; skip <= maxSkip; skip++) {
        if (cancelled) { db.close(); self.postMessage({ type: 'cancelled' }); return; }
        if (skip === 0) continue;

        const found = findELS(torahText, form, skip, ch0Pos);
        for (const pos of found) {
          buffer.push({ term: primary, pos, skip, form });
          hitCount++;
          if (Math.abs(skip) < Math.abs(bestSkip)) {
            bestSkip = skip;
            bestPos = pos;
          }
        }

        // Flush buffer to IndexedDB when full
        if (buffer.length >= FLUSH_SIZE) {
          await flushBatch(db, buffer);
          buffer = [];
        }

        skipsDoneInForm++;
        if (skipsDoneInForm % 100 === 0) {
          self.postMessage({
            type: 'progress',
            formsSearched: formsSearched + (skipsDoneInForm / totalSkipRange),
            totalForms,
            termIdx: ti,
            primary,
            hitsSoFar: hitCount
          });
        }
      }

      formsSearched++;
      self.postMessage({
        type: 'progress',
        formsSearched,
        totalForms,
        termIdx: ti,
        primary,
        hitsSoFar: hitCount
      });
    }

    // Flush remaining buffer
    if (buffer.length > 0) {
      await flushBatch(db, buffer);
      buffer = [];
    }

    self.postMessage({
      type: 'term-done',
      primary,
      termIdx: ti,
      totalTerms: terms.length,
      hitCount,
      bestSkip: hitCount > 0 ? bestSkip : null,
      bestPos: hitCount > 0 ? bestPos : null
    });
  }

  db.close();
  self.postMessage({ type: 'complete', totalTerms: terms.length });
}
