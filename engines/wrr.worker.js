// =============================================================================
// WRR 1994 Experiment — Web Worker
// =============================================================================
//
// Runs the full WRR experiment off the main thread for responsive UI.
// Supports three actions:
//   'run'              — Basic experiment (per-rabbi proximity, geometric mean)
//   'permutation-test' — Aggregate permutation test on geometric mean
//   'run-wrr-full'     — Full WRR replication with c(w,w') perturbation statistic,
//                         P₁/P₂ statistics, and optional permutation test
// =============================================================================

'use strict';

// ---- Sofit normalization (duplicated from main thread — Option A tradeoff) ----
const SOFIT_MAP = { '\u05DA':'\u05DB', '\u05DD':'\u05DE', '\u05DF':'\u05E0', '\u05E3':'\u05E4', '\u05E5':'\u05E6' };
function normalizeSofiot(s) {
  return s.replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/g, ch => SOFIT_MAP[ch]);
}

// ---- Dynamic skip range D(w) ----
// D(w) = smallest D such that cumulative expected ELS count >= 10
// Expected per skip d: E(w,d) = (L-(k-1)d) * P(w)  for d = 2..D
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

// ---- SL (String of Letters) search: consecutive letters (skip=1) ----
// Used in WRR2 for category expressions. Also searches reversed term.
function findSL(text, termNorm) {
  const results = [];
  let idx = text.indexOf(termNorm);
  while (idx !== -1) {
    results.push({ pos: idx, skip: 1, len: termNorm.length });
    idx = text.indexOf(termNorm, idx + 1);
  }
  const rev = [...termNorm].reverse().join('');
  if (rev !== termNorm) {
    idx = text.indexOf(rev);
    while (idx !== -1) {
      results.push({ pos: idx, skip: 1, len: termNorm.length });
      idx = text.indexOf(rev, idx + 1);
    }
  }
  return results;
}

// ---- 2D Euclidean distance on cylindrical array ----
function wrr2DDist(p1, p2, w) {
  const r1 = Math.floor(p1 / w), c1 = p1 % w;
  const r2 = Math.floor(p2 / w), c2 = p2 % w;
  const dr = r1 - r2;
  const dcRaw = Math.abs(c1 - c2);
  const dc = Math.min(dcRaw, w - dcRaw);  // cylindrical wrapping
  return Math.sqrt(dr * dr + dc * dc);
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

// =============================================================================
// WRR 1994 Faithful Replication — c(w,w') Perturbation Statistic
// =============================================================================
// Reference: Witztum, Rips, Rosenberg (1994) "Equidistant Letter Sequences
// in the Book of Genesis", Statistical Science 9(3):429–438
//
// Key formulas:
//   h_i = round(|d|/i) for i=1..10 — row lengths for cylinder wrapping
//   δ(e,e',h) = min 2D Euclidean distance on cylinder of width h (with wrapping)
//   ω(e,e') = max over all h of 1/δ(e,e',h) — proximity measure
//   w(e) = Γ(T_e)/Γ(G) — domain-of-minimality weight for ELS occurrence e
//     T_e = maximal text segment containing e with no smaller-|skip| ELS for w
//   ε(w,w') = Σ w(e)·ω(e,e') over all ELS pairs (e of w, e' of w')
//   c(w,w') = v/m — rank of actual ε among 125 spatial perturbations
//     where v = (# strictly >) + (# tied)/2, m = # valid perturbations (≥10)
//   Perturbation: shift last 3 letter POSITIONS by cumulative (x, x+y, x+y+z)
//     for (x,y,z) ∈ {-2..2}³ (125 triples total)
//   P₁ = binomial tail: P(Bin(N, 0.2) ≥ k) where k = #{c_i < 0.2}
//   P₂ = Gamma CDF: e^{-t} · Σ_{j=0}^{N-1} t^j/j! where t = -Σln(c_i)
//   Overall P = 2·min(P₁, P₂)
// =============================================================================

// ---- Get position array for an ELS hit ----
function hitPositions(hit) {
  const pos = new Array(hit.len);
  for (let i = 0; i < hit.len; i++) pos[i] = hit.pos + i * hit.skip;
  return pos;
}

// ---- Row lengths h_i = round(|d|/i) for i=1..10 from both ELS skips ----
// For WRR1 (ELS↔ELS), h values from both skips gives resonance in both directions.
function getHValues(skip1, skip2) {
  const hSet = new Set();
  const abs1 = Math.abs(skip1), abs2 = Math.abs(skip2);
  for (let i = 1; i <= 10; i++) {
    const h1 = Math.round(abs1 / i);
    if (h1 >= 2) hSet.add(h1);
    if (abs2 !== abs1) {
      const h2 = Math.round(abs2 / i);
      if (h2 >= 2) hSet.add(h2);
    }
  }
  return [...hSet];
}

// ---- Min 2D distance between two position arrays on cylinder width h ----
// Per WRR paper: cylindrical wrapping — column distance wraps around.
function minDist2D(pos1, pos2, h) {
  let bestSq = Infinity;
  for (let a = 0; a < pos1.length; a++) {
    const ra = Math.floor(pos1[a] / h), ca = pos1[a] % h;
    for (let b = 0; b < pos2.length; b++) {
      const rb = Math.floor(pos2[b] / h), cb = pos2[b] % h;
      const dr = ra - rb;
      const dcRaw = Math.abs(ca - cb);
      const dc = Math.min(dcRaw, h - dcRaw);  // cylindrical wrapping
      const dSq = dr * dr + dc * dc;
      if (dSq < bestSq) bestSq = dSq;
    }
  }
  return Math.sqrt(bestSq);
}

// ---- ω(e,e') = max over h of 1/δ(e,e',h) ----
// Used by WRR2 Nations (ω = max, per WRR2 paper formulation)
function omega(pos1, pos2, hValues) {
  let maxOmega = 0;
  for (let hi = 0; hi < hValues.length; hi++) {
    const delta = minDist2D(pos1, pos2, hValues[hi]);
    if (delta > 0) {
      const o = 1 / delta;
      if (o > maxOmega) maxOmega = o;
    }
  }
  return maxOmega;
}

// =============================================================================
// WRR 1994 Paper Exact Formulas (Section A.1, p.434-435)
// =============================================================================
// δ_h(e,e') = f² + f'² + t²
//   f  = 2D distance between consecutive letters of e on cylinder width h
//   f' = 2D distance between consecutive letters of e' on cylinder width h
//   t  = minimum 2D distance between any letter of e and any letter of e'
// μ_h(e,e') = 1/δ_h(e,e')
// σ(e,e') = Σ_{i=1}^{10} μ_{h_i}(e,e') + Σ_{i=1}^{10} μ_{h'_i}(e,e')
//   where h_i = round(|d|/i), h'_i = round(|d'|/i)
// =============================================================================

// ---- f: 2D distance between first two consecutive letters of an ELS on cylinder ----
// For an ELS with positions [p0, p1, ...], f = dist(p0, p1) on cylinder of width h.
// This measures how "spread out" the ELS letters are in the array.
function elsConsecutiveDist(positions, h) {
  if (positions.length < 2) return 0;
  const r1 = Math.floor(positions[0] / h), c1 = positions[0] % h;
  const r2 = Math.floor(positions[1] / h), c2 = positions[1] % h;
  const dr = r1 - r2;
  const dcRaw = Math.abs(c1 - c2);
  const dc = Math.min(dcRaw, h - dcRaw);  // cylindrical wrapping
  return Math.sqrt(dr * dr + dc * dc);
}

// ---- σ(e,e'): WRR 1994 paper's proximity measure (sum, not max) ----
// Sums μ = 1/δ over h_i from BOTH ELS skips (up to 20 terms total).
// Paper p.435: σ(e,e') := Σ_{i=1}^{10} μ_{h_i} + Σ_{i=1}^{10} μ_{h'_i}
function sigma(pos1, pos2, skip1, skip2) {
  let sum = 0;
  const abs1 = Math.abs(skip1), abs2 = Math.abs(skip2);

  // h_i from first ELS's skip (i = 1..10)
  for (let i = 1; i <= 10; i++) {
    const h = Math.round(abs1 / i);
    if (h < 2) continue;
    const f = elsConsecutiveDist(pos1, h);
    const fPrime = elsConsecutiveDist(pos2, h);
    const t = minDist2D(pos1, pos2, h);
    const delta = f * f + fPrime * fPrime + t * t;
    if (delta > 0) sum += 1 / delta;
  }

  // h'_i from second ELS's skip (i = 1..10)
  for (let i = 1; i <= 10; i++) {
    const h = Math.round(abs2 / i);
    if (h < 2) continue;
    const f = elsConsecutiveDist(pos1, h);
    const fPrime = elsConsecutiveDist(pos2, h);
    const t = minDist2D(pos1, pos2, h);
    const delta = f * f + fPrime * fPrime + t * t;
    if (delta > 0) sum += 1 / delta;
  }

  return sum;
}

// ---- Domain-of-minimality weight w(e) = Γ(T_e) / Γ(G) ----
// For each ELS e with skip d, T_e is the maximal contiguous text segment
// containing e that does NOT contain any other ELS for the same word w
// with |skip| < |d|. Since competitors have smaller span ((k-1)*skip_bar <
// (k-1)*d), they constrain T_e from the left or right but can never be
// "wider" than e. If a competitor fits entirely within e's span, e is
// dominated and gets weight 0.
function computeRho(hits, textLen) {
  const n = hits.length;
  if (n === 0) return [];
  if (n === 1) return new Float64Array([1.0]);

  const k = hits[0].len;
  const rhos = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const eSkip = hits[i].skip;
    const eLo = hits[i].pos;
    const eHi = hits[i].pos + (k - 1) * eSkip;

    let aMin = 0;              // tightest left bound for T_e
    let bMax = textLen - 1;    // tightest right bound for T_e
    let dominated = false;

    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      if (hits[j].skip >= eSkip) continue; // only strictly smaller skips compete

      const barLo = hits[j].pos;
      const barHi = hits[j].pos + (k - 1) * hits[j].skip;

      // Case: competitor entirely within e's span → e is dominated
      if (barLo >= eLo && barHi <= eHi) {
        dominated = true;
        break;
      }

      // Left constraint: competitor ends within or before e's span end
      // (barLo < eLo because if barLo >= eLo AND barHi <= eHi → Case above)
      if (barHi <= eHi) {
        aMin = Math.max(aMin, barLo + 1);
      }

      // Right constraint: competitor starts within or after e's span start
      // (barHi > eHi because if barLo >= eLo AND barHi <= eHi → Case above)
      if (barLo >= eLo) {
        bMax = Math.min(bMax, barHi - 1);
      }
    }

    if (dominated || aMin > eLo || bMax < eHi) {
      rhos[i] = 0;
    } else {
      rhos[i] = (bMax - aMin + 1) / textLen;
    }
  }

  return rhos;
}

// ---- ε(w,w') = Σ w(e)·proximity(e,e') across all name×date ELS pair combinations ----
// When useSigma=true (WRR1 1994): uses paper's σ formula (sum of 1/δ, δ=f²+f'²+t²)
// When useSigma=false (WRR2): uses ω formula (max of 1/t)
// When nameRhos is provided, each name ELS occurrence is weighted by its
// domain-of-minimality fraction. Without nameRhos, all weights default to 1.
function epsilon(namePositions, nameSkips, datePositions, dateSkips, nameRhos, useSigma) {
  let total = 0;
  for (let ni = 0; ni < namePositions.length; ni++) {
    const w = nameRhos ? nameRhos[ni] : 1;
    if (w === 0) continue;  // skip zero-weight (dominated) hits
    for (let di = 0; di < datePositions.length; di++) {
      if (useSigma) {
        total += w * sigma(namePositions[ni], datePositions[di], nameSkips[ni], dateSkips[di]);
      } else {
        const hVals = getHValues(nameSkips[ni], dateSkips[di]);
        total += w * omega(namePositions[ni], datePositions[di], hVals);
      }
    }
  }
  return total;
}

// ---- Perturb last 3 ELS positions by cumulative (x, x+y, x+y+z) ----
// Returns new position array, or null if out of bounds.
// For words with k < 3, perturbs fewer positions:
//   k >= 3: shift last 3 by (x, x+y, x+y+z)  [standard WRR]
//   k = 2:  shift last 2 by (x, x+y)
//   k = 1:  shift last 1 by (x)
function perturbPositions(positions, x, y, z, textLen) {
  const k = positions.length;
  if (k === 0) return null;

  const perturbed = positions.slice();
  if (k >= 3) {
    perturbed[k - 3] += x;
    perturbed[k - 2] += x + y;
    perturbed[k - 1] += x + y + z;
    for (let i = k - 3; i < k; i++) {
      if (perturbed[i] < 0 || perturbed[i] >= textLen) return null;
    }
  } else if (k === 2) {
    perturbed[0] += x;
    perturbed[1] += x + y;
    for (let i = 0; i < k; i++) {
      if (perturbed[i] < 0 || perturbed[i] >= textLen) return null;
    }
  } else { // k === 1
    perturbed[0] += x;
    if (perturbed[0] < 0 || perturbed[0] >= textLen) return null;
  }
  return perturbed;
}

// ---- c(w,w') — perturbation-based proximity rank ----
// Small c means actual proximity is unusually good (close to 0 = very significant).
// WRR tie-breaking: v = (# strictly greater) + (# tied) / 2
// WRR threshold: c is undefined when m < 10 (return null to exclude pair).
// useSigma=true (WRR1): use paper's σ (sum of 1/δ, δ=f²+f'²+t²)
// useSigma=false (WRR2): use ω (max of 1/t)
function computeC(nameHits, dateHits, textLen, useDoM, useSigma) {
  // Pre-compute positions and skips
  const namePos = nameHits.map(hitPositions);
  const nameSkips = nameHits.map(h => h.skip);
  const datePos = dateHits.map(hitPositions);
  const dateSkips = dateHits.map(h => h.skip);

  // Domain-of-minimality weights for name ELS occurrences (WRR2 only)
  const nameRhos = useDoM ? computeRho(nameHits, textLen) : null;

  const actualEps = epsilon(namePos, nameSkips, datePos, dateSkips, nameRhos, useSigma);
  if (actualEps === 0) return 1.0;

  let strictlyGreater = 0, ties = 0, m = 0;

  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -2; z <= 2; z++) {
        // Perturb all name hits with same (x,y,z)
        const pertNamePos = [];
        let valid = true;
        for (let ni = 0; ni < namePos.length; ni++) {
          const pp = perturbPositions(namePos[ni], x, y, z, textLen);
          if (!pp) { valid = false; break; }
          pertNamePos.push(pp);
        }
        if (!valid) continue;

        m++;
        // Same rho weights apply to perturbed positions (rho is a property
        // of the original ELS occurrence, not the perturbed variant)
        const pertEps = epsilon(pertNamePos, nameSkips, datePos, dateSkips, nameRhos, useSigma);
        if (pertEps > actualEps) strictlyGreater++;
        else if (pertEps === actualEps) ties++;
      }
    }
  }

  // WRR threshold: m must be >= 10 for a reliable c value
  if (m < 10) return null;

  // WRR tie-breaking: half of tied values count as "exceeding"
  const v = strictlyGreater + ties / 2;
  return v / m;
}

// ---- Binomial tail helper: P(Bin(N, p) ≥ k) ----
function binomialTail(N, p, k) {
  if (k === 0) return 1.0;
  if (k > N) return 0.0;
  let pTail = 0;
  const logP = Math.log(p), log1P = Math.log(1 - p);
  for (let j = k; j <= N; j++) {
    let logProb = 0;
    for (let i = 0; i < j; i++) logProb += Math.log(N - i) - Math.log(i + 1);
    logProb += j * logP + (N - j) * log1P;
    pTail += Math.exp(logProb);
  }
  return Math.min(pTail, 1.0);
}

// ---- Gamma upper-tail helper: e^{-t} · Σ_{j=0}^{N-1} t^j/j! ----
function gammaTail(cVals) {
  const N = cVals.length;
  if (N === 0) return 1.0;
  const safeC = cVals.map(c => Math.max(c, 1e-10));
  let t = 0;
  for (const c of safeC) t -= Math.log(c);
  if (t <= 0) return 1.0;
  let sum = 0, term = 1;
  for (let j = 0; j < N; j++) {
    sum += term;
    term *= t / (j + 1);
  }
  return Math.min(Math.max(Math.exp(-t) * sum, 0), 1.0);
}

// ---- P₁: binomial tail P(Bin(N, 0.2) ≥ k₁) where k₁ = #{c ≤ 0.2} ----
// Paper p.436: "k be the number of word pairs for which c(w,w') ≤ 1/5"
function computeP1(cValues) {
  const N = cValues.length;
  if (N === 0) return 1.0;
  const k = cValues.filter(c => c <= 0.2).length;
  return binomialTail(N, 0.2, k);
}

// ---- P₂: Gamma tail on all c values ----
function computeP2(cValues) {
  return gammaTail(cValues);
}

// ---- P₃: binomial tail P(Bin(N, 0.1) ≥ k₃) where k₃ = #{c < 0.1} ----
// ---- Main message handler ----
self.onmessage = function(e) {
  const { action } = e.data;

  if (action === 'run') {
    runExperiment(e.data);
  } else if (action === 'permutation-test') {
    runPermutationTest(e.data);
  } else if (action === 'run-wrr-full') {
    runWRRFull(e.data);
  } else if (action === 'run-wrr2-nations') {
    runWRR2Nations(e.data);
  }
};

// ---- ACTION: run — Main WRR experiment ----
function runExperiment(data) {
  const { genesisNorm, rabbis, skipCap, letterFreqs, expressionMode } = data;
  const useSL = expressionMode === 'sl';
  try {
    const L = genesisNorm.length;
    const rabbisWithDates = rabbis.filter(r => r.dates && r.dates.length > 0);
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

          let dateHits;
          if (useSL) {
            // WRR2: expressions searched as consecutive letters (SL)
            dateHits = findSL(genesisNorm, dateNorm);
          } else {
            const dDate = wrrMaxSkip(dateNorm, L, letterFreqs, skipCap);
            if (dDate > maxDw) maxDw = dDate;
            dateHits = wrrFindELSBoth(genesisNorm, dateNorm, dDate, elsCache);
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
          numPermutations, actualGeoMean, expressionMode } = data;
  const useSL = expressionMode === 'sl';

  try {
    const L = genesisNorm.length;
    const rabbisWithDates = rabbis.filter(r => r.dates && r.dates.length > 0);
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

    // Step 2: Pre-compute all ELS hits for names, and ELS or SL hits for dates/expressions
    self.postMessage({
      type: 'perm-progress', completed: 0, total: numPermutations,
      betterCount: 0, currentPValue: 1, phase: 'precomputing'
    });

    const nameHitsMap = new Map();  // normalized name → hits[]
    const dateHitsMap = new Map();  // normalized date/expression → hits[]

    for (const r of processedRabbis) {
      for (const nn of r.nameNorms) {
        if (!nameHitsMap.has(nn)) {
          const d = wrrMaxSkip(nn, L, letterFreqs, skipCap);
          nameHitsMap.set(nn, wrrFindELSBoth(genesisNorm, nn, d, elsCache));
        }
      }
      for (const dn of r.dateNorms) {
        if (!dateHitsMap.has(dn)) {
          if (useSL) {
            dateHitsMap.set(dn, findSL(genesisNorm, dn));
          } else {
            const d = wrrMaxSkip(dn, L, letterFreqs, skipCap);
            dateHitsMap.set(dn, wrrFindELSBoth(genesisNorm, dn, d, elsCache));
          }
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

// =============================================================================
// ACTION: run-wrr-full — Full WRR replication with c(w,w') statistic
// =============================================================================
//
// Message protocol:
//   IN:  { action:'run-wrr-full', genesisNorm, rabbis, skipCap, letterFreqs,
//          runPermTest, numPermutations }
//   OUT: { type:'wrr-phase', phase, message }
//   OUT: { type:'wrr-rabbi-done', completed, total, result }
//   OUT: { type:'wrr-complete', rabbiResults, cValues, p1, p2, overallP }
//   OUT: { type:'wrr-perm-precompute-progress', completed, total }
//   OUT: { type:'wrr-perm-progress', completed, total, betterCount, currentPValue }
//   OUT: { type:'wrr-perm-complete', pValue, numPermutations, betterCount }
//
function runWRRFull(data) {
  const { genesisNorm, rabbis, skipCap, letterFreqs,
          runPermTest, numPermutations, use58Filter = true } = data;

  try {
    const L = genesisNorm.length;
    const rabbisWithDates = rabbis.filter(r => r.dates.length > 0);
    const elsCache = new Map();

    // ---- Phase 1: Find all ELS hits ----
    self.postMessage({
      type: 'wrr-phase', phase: 'els-search',
      message: 'Finding ELS occurrences (forward + backward)...'
    });

    const processed = [];

    for (const rabbi of rabbisWithDates) {
      const nameNorms = [], nameHitsArr = [];
      for (const nameRaw of rabbi.names) {
        const nn = normalizeSofiot(nameRaw.replace(/\s+/g, ''));
        if (nn.length < 2) continue;
        const dw = wrrMaxSkip(nn, L, letterFreqs, skipCap);
        const hits = wrrFindELSBoth(genesisNorm, nn, dw, elsCache);
        nameNorms.push(nn);
        nameHitsArr.push(hits);
      }

      const dateNorms = [], dateHitsArr = [];
      for (const dateRaw of rabbi.dates) {
        const dn = normalizeSofiot(dateRaw.replace(/\s+/g, ''));
        if (dn.length < 2) continue;
        const dw = wrrMaxSkip(dn, L, letterFreqs, skipCap);
        const hits = wrrFindELSBoth(genesisNorm, dn, dw, elsCache);
        dateNorms.push(dn);
        dateHitsArr.push(hits);
      }

      processed.push({
        id: rabbi.id, en: rabbi.en,
        names: rabbi.names, dates: rabbi.dates,
        nameNorms, dateNorms, nameHitsArr, dateHitsArr
      });
    }

    // ---- Phase 2: Compute c(w,w') for each rabbi ----
    // WRR paper (p.436): only word pairs where BOTH name and date are 5-8 chars.
    // Also compute separate c-values for non-"Rabbi" appellation subset (for P₃/P₄).
    self.postMessage({
      type: 'wrr-phase', phase: 'computing-c',
      message: 'Computing c(w,w\') perturbation statistics (125 perturbations each)...'
    });

    const rabbiResults = [];
    let completed = 0;
    let totalPairsConsidered = 0, pairsFiltered = 0;

    for (const r of processed) {
      let bestC = null, bestNameIdx = -1, bestDateIdx = -1;
      let bestNameHitCount = 0, bestDateHitCount = 0;
      // Separate tracking for non-"רבי" prefix appellations (for P₃/P₄)
      let bestC_noRabbi = null, bestNameIdx_noRabbi = -1, bestDateIdx_noRabbi = -1;

      for (let ni = 0; ni < r.nameHitsArr.length; ni++) {
        if (r.nameHitsArr[ni].length === 0) continue;
        const nameLen = r.nameNorms[ni].length;
        if (use58Filter && (nameLen < 5 || nameLen > 8)) { pairsFiltered++; continue; }
        const isRabbiPrefix = r.nameNorms[ni].startsWith('\u05E8\u05D1\u05D9'); // רבי

        for (let di = 0; di < r.dateHitsArr.length; di++) {
          if (r.dateHitsArr[di].length === 0) continue;
          const dateLen = r.dateNorms[di].length;
          if (use58Filter && (dateLen < 5 || dateLen > 8)) { pairsFiltered++; continue; }
          totalPairsConsidered++;

          const c = computeC(r.nameHitsArr[ni], r.dateHitsArr[di], L, false, true);

          // Best c across ALL appellations
          if (c !== null && (bestC === null || c < bestC)) {
            bestC = c;
            bestNameIdx = ni;
            bestDateIdx = di;
            bestNameHitCount = r.nameHitsArr[ni].length;
            bestDateHitCount = r.dateHitsArr[di].length;
          }
          // Best c for non-"Rabbi" appellations only (for P₃/P₄)
          if (!isRabbiPrefix && c !== null && (bestC_noRabbi === null || c < bestC_noRabbi)) {
            bestC_noRabbi = c;
            bestNameIdx_noRabbi = ni;
            bestDateIdx_noRabbi = di;
          }
        }
      }

      completed++;
      const result = {
        rabbiId: r.id, en: r.en, c: bestC, c_noRabbi: bestC_noRabbi,
        name: bestNameIdx >= 0 ? r.names[bestNameIdx] : null,
        date: bestDateIdx >= 0 ? r.dates[bestDateIdx] : null,
        nameHitCount: bestNameHitCount,
        dateHitCount: bestDateHitCount
      };
      rabbiResults.push(result);

      self.postMessage({
        type: 'wrr-rabbi-done', completed, total: processed.length, result
      });
    }

    // ---- Phase 3: Compute P₁–P₄ ----
    // P₁/P₂: all appellations.  P₃/P₄: non-"Rabbi" appellations only.
    // WRR paper: P = 4·min(P₁, P₂, P₃, P₄) — Bonferroni correction for 4 statistics.
    const cValues = rabbiResults.filter(r => r.c !== null && r.c < 1.0).map(r => r.c);
    const cValues_noRabbi = rabbiResults.filter(r => r.c_noRabbi !== null && r.c_noRabbi < 1.0).map(r => r.c_noRabbi);

    const p1 = computeP1(cValues);
    const p2 = computeP2(cValues);
    const p3 = cValues_noRabbi.length > 0 ? computeP1(cValues_noRabbi) : 1.0;
    const p4 = cValues_noRabbi.length > 0 ? computeP2(cValues_noRabbi) : 1.0;
    const overallP = 4 * Math.min(p1, p2, p3, p4);

    self.postMessage({
      type: 'wrr-complete',
      rabbiResults, cValues, p1, p2, p3, p4, overallP,
      cValues_noRabbi,
      matchedCount: cValues.length,
      matchedCount_noRabbi: cValues_noRabbi.length,
      totalRabbis: processed.length,
      totalPairsConsidered, pairsFiltered
    });

    // ---- Phase 4: Optional permutation test ----
    if (runPermTest && numPermutations > 0) {
      runWRRPermTestFull(processed, overallP, numPermutations, L, false, use58Filter, true);
    }

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
}

// ---- Permutation test using c(w,w') — pre-compute then shuffle ----
// WRR 5-8 char filter and P₃/P₄ (non-Rabbi subset) applied throughout.
// useSigma: true for WRR1 (paper's σ formula), false for WRR2 (ω formula)
function runWRRPermTestFull(processed, actualOverallP, numPermutations, textLen, useDoM, use58Filter = true, useSigma = false) {
  const N = processed.length;

  // Step 1: Pre-compute c for ALL possible (rabbi_i names, rabbi_j dates) pairings
  // Two matrices: all appellations, and non-"רבי" prefix only.
  self.postMessage({
    type: 'wrr-phase', phase: 'perm-precompute',
    message: `Pre-computing c values for all ${N}x${N} name-date pairings...`
  });

  const cMatrix = new Array(N);          // best c using ALL appellations
  const cMatrix_noRabbi = new Array(N);   // best c using non-"רבי" appellations only
  const RABBI_PREFIX = '\u05E8\u05D1\u05D9'; // רבי

  for (let ni = 0; ni < N; ni++) {
    cMatrix[ni] = new Array(N).fill(null);
    cMatrix_noRabbi[ni] = new Array(N).fill(null);

    for (let di = 0; di < N; di++) {
      let bestC = null, bestC_nr = null;

      for (let nf = 0; nf < processed[ni].nameHitsArr.length; nf++) {
        if (processed[ni].nameHitsArr[nf].length === 0) continue;
        const nameLen = processed[ni].nameNorms[nf].length;
        if (use58Filter && (nameLen < 5 || nameLen > 8)) continue;
        const isRabbiPrefix = processed[ni].nameNorms[nf].startsWith(RABBI_PREFIX);

        for (let df = 0; df < processed[di].dateHitsArr.length; df++) {
          if (processed[di].dateHitsArr[df].length === 0) continue;
          const dateLen = processed[di].dateNorms[df].length;
          if (use58Filter && (dateLen < 5 || dateLen > 8)) continue;

          const c = computeC(
            processed[ni].nameHitsArr[nf],
            processed[di].dateHitsArr[df],
            textLen,
            useDoM,
            useSigma
          );
          if (c !== null && (bestC === null || c < bestC)) bestC = c;
          if (!isRabbiPrefix && c !== null && (bestC_nr === null || c < bestC_nr)) bestC_nr = c;
        }
      }
      cMatrix[ni][di] = bestC;
      cMatrix_noRabbi[ni][di] = bestC_nr;
    }

    self.postMessage({
      type: 'wrr-perm-precompute-progress',
      completed: ni + 1, total: N,
      message: `Pre-computed pairings for rabbi ${ni + 1}/${N}`
    });
  }

  // Step 2: Run permutations — shuffle date assignments, look up c values
  self.postMessage({
    type: 'wrr-phase', phase: 'permuting',
    message: `Running ${numPermutations.toLocaleString()} permutations...`
  });

  let betterCount = 0;
  const progressInterval = Math.max(1, Math.floor(numPermutations / 100));
  const dateIndices = Array.from({ length: N }, (_, i) => i);

  for (let p = 0; p < numPermutations; p++) {
    shuffle(dateIndices);

    // Collect c values for this permutation
    const permC = [], permC_nr = [];
    for (let i = 0; i < N; i++) {
      const c = cMatrix[i][dateIndices[i]];
      if (c !== null && c < 1.0) permC.push(c);
      const c_nr = cMatrix_noRabbi[i][dateIndices[i]];
      if (c_nr !== null && c_nr < 1.0) permC_nr.push(c_nr);
    }

    const permP1 = computeP1(permC);
    const permP2 = computeP2(permC);
    const permP3 = permC_nr.length > 0 ? computeP1(permC_nr) : 1.0;
    const permP4 = permC_nr.length > 0 ? computeP2(permC_nr) : 1.0;
    const permP = 4 * Math.min(permP1, permP2, permP3, permP4);

    if (permP <= actualOverallP) betterCount++;

    if ((p + 1) % progressInterval === 0 || p === numPermutations - 1) {
      self.postMessage({
        type: 'wrr-perm-progress',
        completed: p + 1, total: numPermutations,
        betterCount, currentPValue: betterCount / (p + 1)
      });
    }
  }

  self.postMessage({
    type: 'wrr-perm-complete',
    pValue: betterCount / numPermutations,
    numPermutations, betterCount, actualOverallP
  });
}

// =============================================================================
// ACTION: run-wrr2-nations — WRR2 Nations experiment (ELS names × SL expressions)
// =============================================================================
// Same c(w,w') methodology as WRR1, but:
//   - Nation names (w)  → ELS search (|skip| ≥ 2)
//   - Expressions (w')  → SL search (consecutive letters, skip=1)
// Reuses computeC(), P-statistics, and permutation test infrastructure.
//
function runWRR2Nations(data) {
  const { genesisNorm, nations, skipCap, letterFreqs,
          runPermTest, numPermutations } = data;

  try {
    const L = genesisNorm.length;
    const nationsWithExpr = nations.filter(n => n.expressions && n.expressions.length > 0);
    const elsCache = new Map();

    // ---- Phase 1: Find all ELS hits (names) and SL hits (expressions) ----
    self.postMessage({
      type: 'wrr-phase', phase: 'els-search',
      message: 'Finding ELS (nation names) and SL (category expressions)...'
    });

    const processed = [];

    for (const nation of nationsWithExpr) {
      const nameNorms = [], nameHitsArr = [];
      for (const nameRaw of nation.names) {
        const nn = normalizeSofiot(nameRaw.replace(/\s+/g, ''));
        if (nn.length < 2) continue;
        const dw = wrrMaxSkip(nn, L, letterFreqs, skipCap);
        const hits = wrrFindELSBoth(genesisNorm, nn, dw, elsCache);
        nameNorms.push(nn);
        nameHitsArr.push(hits);
      }

      // SL search for category expressions (consecutive letters in text)
      const dateNorms = [], dateHitsArr = [];
      for (const exprRaw of nation.expressions) {
        const en = normalizeSofiot(exprRaw.replace(/\s+/g, ''));
        if (en.length < 2) continue;
        const hits = findSL(genesisNorm, en);
        dateNorms.push(en);
        dateHitsArr.push(hits);
      }

      // Use dateHitsArr/dateNorms field names for compatibility with permutation test
      processed.push({
        id: nation.id, en: nation.en,
        names: nation.names, dates: nation.expressions,
        nameNorms, dateNorms, nameHitsArr, dateHitsArr
      });
    }

    // ---- Phase 2: Compute c(w,w') for each nation ----
    // WRR 5-8 character filter applied to word pairs.
    self.postMessage({
      type: 'wrr-phase', phase: 'computing-c',
      message: 'Computing c(w,w\') perturbation statistics (125 perturbations each)...'
    });

    const rabbiResults = [];
    let completed = 0;

    for (const r of processed) {
      let bestC = null, bestNameIdx = -1, bestDateIdx = -1;
      let bestNameHitCount = 0, bestDateHitCount = 0;

      for (let ni = 0; ni < r.nameHitsArr.length; ni++) {
        if (r.nameHitsArr[ni].length === 0) continue;
        const nameLen = r.nameNorms[ni].length;
        if (nameLen < 5 || nameLen > 8) continue;  // WRR 5-8 filter
        for (let di = 0; di < r.dateHitsArr.length; di++) {
          if (r.dateHitsArr[di].length === 0) continue;
          const dateLen = r.dateNorms[di].length;
          if (dateLen < 5 || dateLen > 8) continue;  // WRR 5-8 filter
          const c = computeC(r.nameHitsArr[ni], r.dateHitsArr[di], L, true, false);
          if (c !== null && (bestC === null || c < bestC)) {
            bestC = c;
            bestNameIdx = ni;
            bestDateIdx = di;
            bestNameHitCount = r.nameHitsArr[ni].length;
            bestDateHitCount = r.dateHitsArr[di].length;
          }
        }
      }

      completed++;
      const result = {
        rabbiId: r.id, en: r.en, c: bestC,
        name: bestNameIdx >= 0 ? r.names[bestNameIdx] : null,
        date: bestDateIdx >= 0 ? r.dates[bestDateIdx] : null,
        nameHitCount: bestNameHitCount,
        dateHitCount: bestDateHitCount
      };
      rabbiResults.push(result);

      self.postMessage({
        type: 'wrr-rabbi-done', completed, total: processed.length, result
      });
    }

    // ---- Phase 3: Compute P₁, P₂ (WRR2 nations uses 2-statistic) ----
    const cValues = rabbiResults.filter(r => r.c !== null && r.c < 1.0).map(r => r.c);
    const p1 = computeP1(cValues);
    const p2 = computeP2(cValues);
    const overallP = 2 * Math.min(p1, p2);

    self.postMessage({
      type: 'wrr-complete',
      rabbiResults, cValues, p1, p2, overallP,
      matchedCount: cValues.length,
      totalRabbis: processed.length
    });

    // ---- Phase 4: Optional permutation test ----
    // Reuses runWRRPermTestFull — processed data has compatible field names
    if (runPermTest && numPermutations > 0) {
      runWRRPermTestFull(processed, overallP, numPermutations, L, true);
    }

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
}
