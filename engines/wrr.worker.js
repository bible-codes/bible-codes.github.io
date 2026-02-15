// =============================================================================
// WRR 1994 Experiment — Web Worker
// =============================================================================
//
// Runs the full WRR experiment off the main thread for responsive UI.
// Supports two actions:
//   'run'             — Run the main experiment (per-rabbi proximity)
//   'permutation-test' — Run aggregate permutation test for P-value
//
// Message protocol:
//   IN:  { action:'run', genesisNorm, rabbis, skipCap, letterFreqs }
//   OUT: { type:'rabbi-done', rabbiId, completed, total, maxDw, result }
//   OUT: { type:'complete' }
//   OUT: { type:'error', message }
//
//   IN:  { action:'permutation-test', genesisNorm, rabbis, skipCap,
//          letterFreqs, numPermutations, actualGeoMean }
//   OUT: { type:'perm-progress', completed, total, betterCount, currentPValue }
//   OUT: { type:'perm-complete', pValue, numPermutations, betterCount,
//          distribution }
//   OUT: { type:'error', message }
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

// ---- Search both forward and backward ELS (|skip| >= 2) ----
// Backward ELS (negative skip) is equivalent to searching the reversed term
// with positive skip. The letter POSITIONS are what matter for distance.
function wrrFindELSBoth(text, termNorm, maxSkip, cache) {
  const cacheKey = termNorm + ':' + maxSkip;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const forward = wrrFindELS(text, termNorm, maxSkip);
  const rev = [...termNorm].reverse().join('');
  let results;
  if (rev === termNorm) {
    // Palindrome — backward search finds same occurrences
    results = forward;
  } else {
    const backward = wrrFindELS(text, rev, maxSkip);
    results = forward.concat(backward);
  }
  cache.set(cacheKey, results);
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

// ---- Fisher-Yates shuffle (in-place) ----
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---- Run one experiment pass: compute best proximity per rabbi ----
// Returns array of { rabbiId, dist } for rabbis that matched.
// nameHitsMap/dateHitsMap: pre-computed ELS hits keyed by normalized term.
function runOnePass(rabbis, nameHitsMap, dateHitsMap, dateAssignments) {
  const results = [];
  for (let ri = 0; ri < rabbis.length; ri++) {
    const rabbi = rabbis[ri];
    const dates = dateAssignments[ri];
    if (!dates || dates.length === 0) continue;

    let bestDist = Infinity;
    for (const nameNorm of rabbi.nameNorms) {
      const nameHits = nameHitsMap.get(nameNorm);
      if (!nameHits || nameHits.length === 0) continue;
      for (const dateNorm of dates) {
        const dateHits = dateHitsMap.get(dateNorm);
        if (!dateHits || dateHits.length === 0) continue;
        const pair = wrrBestProximity(nameHits, dateHits);
        if (pair && pair.dist < bestDist) bestDist = pair.dist;
      }
    }
    if (bestDist < Infinity) {
      results.push({ rabbiId: rabbi.id, dist: bestDist });
    }
  }
  return results;
}

// ---- Compute geometric mean of distances ----
function geoMean(results) {
  if (results.length === 0) return Infinity;
  let logSum = 0;
  for (const r of results) logSum += Math.log(r.dist);
  return Math.exp(logSum / results.length);
}

// ---- Main message handler ----
self.onmessage = function(e) {
  const { action } = e.data;

  if (action === 'run') {
    runExperiment(e.data);
  } else if (action === 'permutation-test') {
    runPermutationTest(e.data);
  }
};

// ---- ACTION: run — Main WRR experiment ----
function runExperiment(data) {
  const { genesisNorm, rabbis, skipCap, letterFreqs } = data;
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

        // Search both forward and backward ELS
        const nameHits = wrrFindELSBoth(genesisNorm, nameNorm, dName, elsCache);
        if (nameHits.length === 0) continue;

        for (const dateRaw of rabbi.dates) {
          const dateNorm = normalizeSofiot(dateRaw.replace(/\s+/g, ''));
          if (dateNorm.length < 2) continue;

          const dDate = wrrMaxSkip(dateNorm, L, letterFreqs, skipCap);
          if (dDate > maxDw) maxDw = dDate;

          const dateHits = wrrFindELSBoth(genesisNorm, dateNorm, dDate, elsCache);
          if (dateHits.length === 0) continue;

          const pair = wrrBestProximity(nameHits, dateHits);
          if (pair && pair.dist < bestDist) {
            bestDist = pair.dist;
            bestResult = { ...pair, nameStr: nameRaw, dateStr: dateRaw };
          }
        }
      }

      completed++;

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
}

// ---- ACTION: permutation-test — Aggregate permutation test for P-value ----
//
// Algorithm:
// 1. Pre-compute all ELS hits for all unique name/date forms (once)
// 2. Run actual experiment to get actual geometric mean
// 3. For N permutations: shuffle date assignments, compute geometric mean
// 4. P-value = (count of permutations with geoMean <= actual) / N
//
// Key optimization: ELS search is done ONCE for all unique terms.
// Each permutation only re-computes proximity measures (~100ms each).
function runPermutationTest(data) {
  const { genesisNorm, rabbis, skipCap, letterFreqs,
          numPermutations, actualGeoMean } = data;

  try {
    const L = genesisNorm.length;
    const rabbisWithDates = rabbis.filter(r => r.dates.length > 0);
    const elsCache = new Map();

    // Step 1: Pre-process rabbis — normalize all name/date forms
    const processedRabbis = [];
    const allDateNorms = []; // one array of normalized date arrays per rabbi

    for (const rabbi of rabbisWithDates) {
      const nameNorms = [];
      for (const nameRaw of rabbi.names) {
        const nn = normalizeSofiot(nameRaw.replace(/\s+/g, ''));
        if (nn.length >= 2) nameNorms.push(nn);
      }
      const dateNorms = [];
      for (const dateRaw of rabbi.dates) {
        const dn = normalizeSofiot(dateRaw.replace(/\s+/g, ''));
        if (dn.length >= 2) dateNorms.push(dn);
      }
      processedRabbis.push({ id: rabbi.id, nameNorms, dateNorms });
      allDateNorms.push(dateNorms);
    }

    // Step 2: Pre-compute all ELS hits for every unique name and date form
    self.postMessage({
      type: 'perm-progress', completed: 0, total: numPermutations,
      betterCount: 0, currentPValue: 1, phase: 'precomputing'
    });

    const nameHitsMap = new Map();  // normalized name → hits[]
    const dateHitsMap = new Map();  // normalized date → hits[]

    for (const r of processedRabbis) {
      for (const nn of r.nameNorms) {
        if (!nameHitsMap.has(nn)) {
          const d = wrrMaxSkip(nn, L, letterFreqs, skipCap);
          nameHitsMap.set(nn, wrrFindELSBoth(genesisNorm, nn, d, elsCache));
        }
      }
      for (const dn of r.dateNorms) {
        if (!dateHitsMap.has(dn)) {
          const d = wrrMaxSkip(dn, L, letterFreqs, skipCap);
          dateHitsMap.set(dn, wrrFindELSBoth(genesisNorm, dn, d, elsCache));
        }
      }
    }

    // Step 3: Verify actual geometric mean with pre-computed hits
    const actualResults = runOnePass(processedRabbis, nameHitsMap, dateHitsMap, allDateNorms);
    const actualGM = geoMean(actualResults);

    // Step 4: Run permutation test
    let betterCount = 0;
    const distribution = new Float64Array(numPermutations);
    const progressInterval = Math.max(1, Math.floor(numPermutations / 100));

    // Create a flat pool of all date arrays for shuffling
    const datePool = allDateNorms.slice(); // shallow copy

    for (let p = 0; p < numPermutations; p++) {
      // Shuffle date assignments: Fisher-Yates on the datePool
      shuffle(datePool);

      // Run experiment with shuffled dates
      const permResults = runOnePass(processedRabbis, nameHitsMap, dateHitsMap, datePool);
      const permGM = geoMean(permResults);
      distribution[p] = permGM;

      if (permGM <= actualGM) betterCount++;

      // Report progress periodically
      if ((p + 1) % progressInterval === 0 || p === numPermutations - 1) {
        self.postMessage({
          type: 'perm-progress',
          completed: p + 1,
          total: numPermutations,
          betterCount,
          currentPValue: betterCount / (p + 1),
          phase: 'permuting'
        });
      }
    }

    // Sort distribution for reporting
    const sortedDist = Array.from(distribution).sort((a, b) => a - b);

    // Sample distribution for histogram (max 200 points)
    const sampleSize = Math.min(200, sortedDist.length);
    const step = Math.max(1, Math.floor(sortedDist.length / sampleSize));
    const sampledDist = [];
    for (let i = 0; i < sortedDist.length; i += step) {
      sampledDist.push(sortedDist[i]);
    }

    self.postMessage({
      type: 'perm-complete',
      pValue: betterCount / numPermutations,
      numPermutations,
      betterCount,
      actualGeoMean: actualGM,
      distribution: sampledDist,
      median: sortedDist[Math.floor(sortedDist.length / 2)],
      mean: sortedDist.reduce((s, v) => s + v, 0) / sortedDist.length
    });

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
}
