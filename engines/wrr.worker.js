// =============================================================================
// WRR 1994 Experiment — Web Worker (Option A: text passed via postMessage)
// =============================================================================
//
// Runs the full WRR experiment off the main thread for responsive UI.
// Receives Genesis text + rabbi data + config, posts per-rabbi results back.
//
// Message protocol:
//   IN:  { action:'run', genesisNorm, rabbis, skipCap, letterFreqs }
//   OUT: { type:'rabbi-done', rabbiId, completed, total, maxDw, result }
//   OUT: { type:'complete' }
//   OUT: { type:'error', message }
//
// OPTION B NEXT STEPS (future upgrade for c(w,w') and permutation tests):
// -------------------------------------------------------------------------
// This Worker uses Option A: all data passed via postMessage (~100KB).
// For advanced features requiring large data access, upgrade to Option B:
//
// 1. Convert to module Worker: new Worker('wrr.worker.js', { type:'module' })
//    - Enables import of shared engines (els-index.js, dictionary-service.js)
//    - Requires Chrome 80+, Firefox 114+, Safari 15+ (no IE11)
//
// 2. Access IndexedDB directly from Worker:
//    - Load charDatabase for verse attribution inside Worker
//    - Load dictionary for candidate validation
//    - No postMessage overhead for large datasets
//
// 3. c(w,w') perturbation statistic (125 variants per pair):
//    - Worker generates letter-substitution perturbations autonomously
//    - Re-searches each perturbation (125 × full ELS search per pair)
//    - Computes c(w,w') = rank(actual Δ) / 125
//    - Requires ~30 min computation; Worker keeps UI fully responsive
//
// 4. Aggregate permutation test (1000-100000 shuffles):
//    - Worker randomly permutes rabbi↔date assignments
//    - Re-runs full experiment per permutation
//    - Computes P-value = rank(actual aggregate) / N_permutations
//    - Could use multiple Workers in parallel (one per CPU core)
//
// 5. Shared data via SharedArrayBuffer (optional perf boost):
//    - Requires Cross-Origin-Isolation headers (COOP + COEP)
//    - GitHub Pages doesn't support these natively
//    - Would need a service worker to inject headers
//    - Eliminates postMessage copy overhead for large transfers
// =============================================================================

'use strict';

// ---- Sofit normalization (duplicated from main thread — Option A tradeoff) ----
const SOFIT_MAP = { '\u05DA':'\u05DB', '\u05DD':'\u05DE', '\u05DF':'\u05E0', '\u05E3':'\u05E4', '\u05E5':'\u05E6' };
function normalizeSofiot(s) {
  return s.replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/g, ch => SOFIT_MAP[ch]);
}

// ---- Dynamic skip range D(w) ----
function wrrMaxSkip(termNorm, L, letterFreqs, cap) {
  const k = termNorm.length;
  let logP = 0;
  for (const ch of termNorm) {
    const f = letterFreqs[ch];
    if (!f) return 2;
    logP += Math.log(f / L);
  }
  const pMatch = Math.exp(logP);
  let cumExpected = 0;
  for (let d = 2; d <= cap; d++) {
    const validStarts = L - (k - 1) * d;
    if (validStarts <= 0) return Math.max(d - 1, 2);
    cumExpected += validStarts * pMatch;
    if (cumExpected >= 10) return d;
  }
  return cap;
}

// ---- Optimized ELS search with first-character filter ----
function wrrFindELS(text, termNorm, maxSkip) {
  const k = termNorm.length;
  const L = text.length;
  const results = [];
  const ch0 = termNorm[0];
  const ch0Pos = [];
  for (let i = 0; i < L; i++) {
    if (text[i] === ch0) ch0Pos.push(i);
  }
  for (let d = 2; d <= maxSkip; d++) {
    const maxStart = L - (k - 1) * d;
    if (maxStart <= 0) break;
    for (const s of ch0Pos) {
      if (s >= maxStart) break;
      let match = true;
      for (let i = 1; i < k; i++) {
        if (text[s + i * d] !== termNorm[i]) { match = false; break; }
      }
      if (match) results.push({ pos: s, skip: d, len: k });
    }
  }
  return results;
}

// ---- 2D Euclidean distance on cylindrical array ----
function wrr2DDist(p1, p2, w) {
  const r1 = Math.floor(p1 / w), c1 = p1 % w;
  const r2 = Math.floor(p2 / w), c2 = p2 % w;
  return Math.sqrt((r1 - r2) * (r1 - r2) + (c1 - c2) * (c1 - c2));
}

// ---- Min 2D distance between two ELS words ----
function wrrPairDist(h1, h2) {
  let minDist = Infinity;
  const pos1 = [];
  for (let i = 0; i < h1.len; i++) pos1.push(h1.pos + i * h1.skip);
  const pos2 = [];
  for (let i = 0; i < h2.len; i++) pos2.push(h2.pos + i * h2.skip);
  const widths = new Set();
  if (h1.skip >= 2) widths.add(h1.skip);
  if (h2.skip >= 2) widths.add(h2.skip);
  for (const w of widths) {
    for (const a of pos1) {
      for (const b of pos2) {
        const d = wrr2DDist(a, b, w);
        if (d < minDist) minDist = d;
      }
    }
  }
  return minDist;
}

// ---- Best proximity across all name×date hit combinations ----
function wrrBestProximity(nameHits, dateHits) {
  let best = { dist: Infinity, nameHit: null, dateHit: null };
  for (const nh of nameHits) {
    for (const dh of dateHits) {
      const d = wrrPairDist(nh, dh);
      if (d < best.dist) best = { dist: d, nameHit: nh, dateHit: dh };
    }
  }
  return best.dist < Infinity ? best : null;
}

// ---- Main message handler ----
self.onmessage = function(e) {
  const { action, genesisNorm, rabbis, skipCap, letterFreqs } = e.data;

  if (action !== 'run') return;

  try {
    const L = genesisNorm.length;
    const rabbisWithDates = rabbis.filter(r => r.dates.length > 0);
    const elsCache = new Map();
    let completed = 0;

    for (const rabbi of rabbisWithDates) {
      let bestResult = null;
      let bestDist = Infinity;
      let maxDw = 0;

      for (const nameRaw of rabbi.names) {
        const nameNorm = normalizeSofiot(nameRaw.replace(/\s+/g, ''));
        if (nameNorm.length < 2) continue;

        const dName = wrrMaxSkip(nameNorm, L, letterFreqs, skipCap);
        if (dName > maxDw) maxDw = dName;

        const nameCacheKey = nameNorm + ':' + dName;
        let nameHits = elsCache.get(nameCacheKey);
        if (!nameHits) {
          nameHits = wrrFindELS(genesisNorm, nameNorm, dName);
          elsCache.set(nameCacheKey, nameHits);
        }
        if (nameHits.length === 0) continue;

        for (const dateRaw of rabbi.dates) {
          const dateNorm = normalizeSofiot(dateRaw.replace(/\s+/g, ''));
          if (dateNorm.length < 2) continue;

          const dDate = wrrMaxSkip(dateNorm, L, letterFreqs, skipCap);
          if (dDate > maxDw) maxDw = dDate;

          const dateCacheKey = dateNorm + ':' + dDate;
          let dateHits = elsCache.get(dateCacheKey);
          if (!dateHits) {
            dateHits = wrrFindELS(genesisNorm, dateNorm, dDate);
            elsCache.set(dateCacheKey, dateHits);
          }
          if (dateHits.length === 0) continue;

          const pair = wrrBestProximity(nameHits, dateHits);
          if (pair && pair.dist < bestDist) {
            bestDist = pair.dist;
            bestResult = { ...pair, nameStr: nameRaw, dateStr: dateRaw };
          }
        }
      }

      completed++;

      // Post per-rabbi result to main thread
      self.postMessage({
        type: 'rabbi-done',
        rabbiId: rabbi.id,
        en: rabbi.en,
        completed,
        total: rabbisWithDates.length,
        maxDw,
        result: bestResult ? {
          dist: bestDist,
          name: bestResult.nameStr,
          date: bestResult.dateStr,
          nameSkip: bestResult.nameHit.skip,
          dateSkip: bestResult.dateHit.skip,
          namePos: bestResult.nameHit.pos,
          datePos: bestResult.dateHit.pos
        } : null
      });
    }

    self.postMessage({ type: 'complete' });

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};
