#!/usr/bin/env node
// =============================================================================
// WRR 1994 Experiment Test Script
// =============================================================================
// Runs the full WRR experiment from the command line using the corrected formulas.
// Tests both the old (ω/max) and new (σ/sum with δ=f²+f'²+t²) implementations.
// Usage: node tools/test-wrr.js
// =============================================================================

'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// ---- Load Torah text ----
const torahRaw = fs.readFileSync(path.join(DATA_DIR, 'torahNoSpaces.txt'), 'utf8').trim();
const GENESIS_LEN = 78064;
const genesisRaw = torahRaw.slice(0, GENESIS_LEN);

// ---- Sofit normalization ----
const SOFIT_MAP = { '\u05DA':'\u05DB', '\u05DD':'\u05DE', '\u05DF':'\u05E0', '\u05E3':'\u05E4', '\u05E5':'\u05E6' };
function normalizeSofiot(s) {
  return s.replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/g, ch => SOFIT_MAP[ch]);
}

const genesisNorm = normalizeSofiot(genesisRaw);
const L = genesisNorm.length;

// ---- Load rabbi data ----
const rabbis = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'wrr-list2.json'), 'utf8'));
const rabbisWithDates = rabbis.filter(r => r.dates && r.dates.length > 0);

// ---- Compute letter frequencies ----
const letterFreqs = {};
for (const ch of genesisNorm) letterFreqs[ch] = (letterFreqs[ch] || 0) + 1;

const SKIP_CAP = 1000;

// =============================================================================
// Core functions (copied from wrr.worker.js)
// =============================================================================

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

function wrrFindELSBoth(text, termNorm, maxSkip, cache) {
  const cacheKey = termNorm + ':' + maxSkip;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const forward = wrrFindELS(text, termNorm, maxSkip);
  const rev = [...termNorm].reverse().join('');
  let results;
  if (rev === termNorm) {
    results = forward;
  } else {
    const backward = wrrFindELS(text, rev, maxSkip);
    results = forward.concat(backward);
  }
  cache.set(cacheKey, results);
  return results;
}

function hitPositions(hit) {
  const pos = new Array(hit.len);
  for (let i = 0; i < hit.len; i++) pos[i] = hit.pos + i * hit.skip;
  return pos;
}

// ---- OLD: getHValues (deduplicating) ----
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

// ---- Min 2D distance between position arrays on cylinder ----
function minDist2D(pos1, pos2, h) {
  let bestSq = Infinity;
  for (let a = 0; a < pos1.length; a++) {
    const ra = Math.floor(pos1[a] / h), ca = pos1[a] % h;
    for (let b = 0; b < pos2.length; b++) {
      const rb = Math.floor(pos2[b] / h), cb = pos2[b] % h;
      const dr = ra - rb;
      const dcRaw = Math.abs(ca - cb);
      const dc = Math.min(dcRaw, h - dcRaw);
      const dSq = dr * dr + dc * dc;
      if (dSq < bestSq) bestSq = dSq;
    }
  }
  return Math.sqrt(bestSq);
}

// ---- OLD: ω (max) ----
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

// ---- NEW: consecutive distance f ----
function elsConsecutiveDist(positions, h) {
  if (positions.length < 2) return 0;
  const r1 = Math.floor(positions[0] / h), c1 = positions[0] % h;
  const r2 = Math.floor(positions[1] / h), c2 = positions[1] % h;
  const dr = r1 - r2;
  const dcRaw = Math.abs(c1 - c2);
  const dc = Math.min(dcRaw, h - dcRaw);
  return Math.sqrt(dr * dr + dc * dc);
}

// ---- NEW: σ (sum with δ=f²+f'²+t²) ----
function sigma(pos1, pos2, skip1, skip2) {
  let sum = 0;
  const abs1 = Math.abs(skip1), abs2 = Math.abs(skip2);
  for (let i = 1; i <= 10; i++) {
    const h = Math.round(abs1 / i);
    if (h < 2) continue;
    const f = elsConsecutiveDist(pos1, h);
    const fPrime = elsConsecutiveDist(pos2, h);
    const t = minDist2D(pos1, pos2, h);
    const delta = f * f + fPrime * fPrime + t * t;
    if (delta > 0) sum += 1 / delta;
  }
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

// ---- epsilon (supports both modes) ----
function epsilon(namePositions, nameSkips, datePositions, dateSkips, nameRhos, useSigma) {
  let total = 0;
  for (let ni = 0; ni < namePositions.length; ni++) {
    const w = nameRhos ? nameRhos[ni] : 1;
    if (w === 0) continue;
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

// ---- Perturbation ----
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
  } else {
    perturbed[0] += x;
    if (perturbed[0] < 0 || perturbed[0] >= textLen) return null;
  }
  return perturbed;
}

// ---- c(w,w') ----
function computeC(nameHits, dateHits, textLen, useDoM, useSigma) {
  const namePos = nameHits.map(hitPositions);
  const nameSkips = nameHits.map(h => h.skip);
  const datePos = dateHits.map(hitPositions);
  const dateSkips = dateHits.map(h => h.skip);
  const nameRhos = null; // Not using DoM for WRR1

  const actualEps = epsilon(namePos, nameSkips, datePos, dateSkips, nameRhos, useSigma);
  if (actualEps === 0) return 1.0;

  let strictlyGreater = 0, ties = 0, m = 0;

  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -2; z <= 2; z++) {
        const pertNamePos = [];
        let valid = true;
        for (let ni = 0; ni < namePos.length; ni++) {
          const pp = perturbPositions(namePos[ni], x, y, z, textLen);
          if (!pp) { valid = false; break; }
          pertNamePos.push(pp);
        }
        if (!valid) continue;
        m++;
        const pertEps = epsilon(pertNamePos, nameSkips, datePos, dateSkips, nameRhos, useSigma);
        if (pertEps > actualEps) strictlyGreater++;
        else if (pertEps === actualEps) ties++;
      }
    }
  }

  if (m < 10) return null;
  const v = strictlyGreater + ties / 2;
  return v / m;
}

// ---- Statistics ----
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

// P₁ with FIXED threshold: <= 0.2 (was < 0.2)
function computeP1(cValues) {
  const N = cValues.length;
  if (N === 0) return 1.0;
  const k = cValues.filter(c => c <= 0.2).length;
  return binomialTail(N, 0.2, k);
}

function computeP2(cValues) {
  return gammaTail(cValues);
}

// =============================================================================
// Run experiment
// =============================================================================

function runExperiment(useSigma, label) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  Genesis: ${L} letters | Rabbis: ${rabbisWithDates.length} with dates`);
  console.log(`  useSigma=${useSigma} | Skip cap: ${SKIP_CAP} | 5-8 char filter: ON`);
  console.log('');

  const elsCache = new Map();
  const USE_58_FILTER = true;
  const RABBI_PREFIX = '\u05E8\u05D1\u05D9'; // רבי

  const results = [];
  let totalPairs = 0, filteredPairs = 0;

  for (const rabbi of rabbisWithDates) {
    const nameNorms = [], nameHitsArr = [];
    for (const nameRaw of rabbi.names) {
      const nn = normalizeSofiot(nameRaw.replace(/\s+/g, ''));
      if (nn.length < 2) continue;
      const dw = wrrMaxSkip(nn, L, letterFreqs, SKIP_CAP);
      const hits = wrrFindELSBoth(genesisNorm, nn, dw, elsCache);
      nameNorms.push(nn);
      nameHitsArr.push(hits);
    }

    const dateNorms = [], dateHitsArr = [];
    for (const dateRaw of rabbi.dates) {
      const dn = normalizeSofiot(dateRaw.replace(/\s+/g, ''));
      if (dn.length < 2) continue;
      const dw = wrrMaxSkip(dn, L, letterFreqs, SKIP_CAP);
      const hits = wrrFindELSBoth(genesisNorm, dn, dw, elsCache);
      dateNorms.push(dn);
      dateHitsArr.push(hits);
    }

    let bestC = null, bestC_noRabbi = null;
    let bestName = null, bestDate = null;

    for (let ni = 0; ni < nameHitsArr.length; ni++) {
      if (nameHitsArr[ni].length === 0) continue;
      const nameLen = nameNorms[ni].length;
      if (USE_58_FILTER && (nameLen < 5 || nameLen > 8)) { filteredPairs++; continue; }
      const isRabbiPrefix = nameNorms[ni].startsWith(RABBI_PREFIX);

      for (let di = 0; di < dateHitsArr.length; di++) {
        if (dateHitsArr[di].length === 0) continue;
        const dateLen = dateNorms[di].length;
        if (USE_58_FILTER && (dateLen < 5 || dateLen > 8)) { filteredPairs++; continue; }
        totalPairs++;

        const c = computeC(nameHitsArr[ni], dateHitsArr[di], L, false, useSigma);

        if (c !== null && (bestC === null || c < bestC)) {
          bestC = c;
          bestName = rabbi.names[ni];
          bestDate = rabbi.dates[di];
        }
        if (!isRabbiPrefix && c !== null && (bestC_noRabbi === null || c < bestC_noRabbi)) {
          bestC_noRabbi = c;
        }
      }
    }

    results.push({
      id: rabbi.id,
      en: rabbi.en,
      c: bestC,
      c_noRabbi: bestC_noRabbi,
      name: bestName,
      date: bestDate
    });

    const cStr = bestC !== null ? bestC.toFixed(4) : 'null';
    process.stdout.write(`  Rabbi ${String(rabbi.id).padStart(2)}: c=${cStr.padStart(8)}  ${rabbi.en}\n`);
  }

  // Compute P₁-P₄
  const cValues = results.filter(r => r.c !== null && r.c < 1.0).map(r => r.c);
  const cValues_noRabbi = results.filter(r => r.c_noRabbi !== null && r.c_noRabbi < 1.0).map(r => r.c_noRabbi);

  const p1 = computeP1(cValues);
  const p2 = computeP2(cValues);
  const p3 = cValues_noRabbi.length > 0 ? computeP1(cValues_noRabbi) : 1.0;
  const p4 = cValues_noRabbi.length > 0 ? computeP2(cValues_noRabbi) : 1.0;
  const overallP = 4 * Math.min(p1, p2, p3, p4);

  const kLE02 = cValues.filter(c => c <= 0.2).length;

  console.log(`\n  --- Summary ---`);
  console.log(`  Word pairs considered: ${totalPairs} (${filteredPairs} filtered by 5-8)`);
  console.log(`  Matched rabbis: ${cValues.length}/${rabbisWithDates.length}`);
  console.log(`  Matched (no-Rabbi): ${cValues_noRabbi.length}/${rabbisWithDates.length}`);
  console.log(`  k (c ≤ 0.2): ${kLE02}/${cValues.length}`);
  console.log(`  P₁ = ${p1.toExponential(4)}`);
  console.log(`  P₂ = ${p2.toExponential(4)}`);
  console.log(`  P₃ = ${p3.toExponential(4)}`);
  console.log(`  P₄ = ${p4.toExponential(4)}`);
  console.log(`  Overall P = 4·min(P₁,P₂,P₃,P₄) = ${overallP.toExponential(4)}`);
  console.log(`  (1 in ${Math.round(1/overallP).toLocaleString()})`);

  return { results, cValues, cValues_noRabbi, p1, p2, p3, p4, overallP, totalPairs };
}

// =============================================================================
// Main
// =============================================================================

console.log('WRR 1994 Experiment — Discrepancy Correction Test');
console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);
console.log(`Genesis text: ${L} letters (Koren edition)`);
console.log(`Rabbis loaded: ${rabbis.length} total, ${rabbisWithDates.length} with dates`);

const startOld = Date.now();
const oldResult = runExperiment(false, 'OLD METHOD: ω = max(1/t) over h values');
const timeOld = ((Date.now() - startOld) / 1000).toFixed(1);
console.log(`  Time: ${timeOld}s`);

const startNew = Date.now();
const newResult = runExperiment(true, 'NEW METHOD: σ = Σ(1/δ) where δ=f²+f\'²+t² (WRR 1994 paper)');
const timeNew = ((Date.now() - startNew) / 1000).toFixed(1);
console.log(`  Time: ${timeNew}s`);

console.log(`\n${'='.repeat(70)}`);
console.log('  COMPARISON');
console.log(`${'='.repeat(70)}`);
console.log(`  ${'Metric'.padEnd(30)} ${'OLD (ω/max)'.padStart(15)} ${'NEW (σ/sum)'.padStart(15)}`);
console.log(`  ${'-'.repeat(60)}`);
console.log(`  ${'Matched rabbis'.padEnd(30)} ${String(oldResult.cValues.length).padStart(15)} ${String(newResult.cValues.length).padStart(15)}`);
console.log(`  ${'Word pairs'.padEnd(30)} ${String(oldResult.totalPairs).padStart(15)} ${String(newResult.totalPairs).padStart(15)}`);
console.log(`  ${'P₁'.padEnd(30)} ${oldResult.p1.toExponential(4).padStart(15)} ${newResult.p1.toExponential(4).padStart(15)}`);
console.log(`  ${'P₂'.padEnd(30)} ${oldResult.p2.toExponential(4).padStart(15)} ${newResult.p2.toExponential(4).padStart(15)}`);
console.log(`  ${'P₃'.padEnd(30)} ${oldResult.p3.toExponential(4).padStart(15)} ${newResult.p3.toExponential(4).padStart(15)}`);
console.log(`  ${'P₄'.padEnd(30)} ${oldResult.p4.toExponential(4).padStart(15)} ${newResult.p4.toExponential(4).padStart(15)}`);
console.log(`  ${'Overall P'.padEnd(30)} ${oldResult.overallP.toExponential(4).padStart(15)} ${newResult.overallP.toExponential(4).padStart(15)}`);
console.log(`  ${'1/P'.padEnd(30)} ${('1 in ' + Math.round(1/oldResult.overallP).toLocaleString()).padStart(15)} ${('1 in ' + Math.round(1/newResult.overallP).toLocaleString()).padStart(15)}`);
console.log(`  ${'Time'.padEnd(30)} ${(timeOld + 's').padStart(15)} ${(timeNew + 's').padStart(15)}`);
console.log(`  ${'WRR Paper'.padEnd(30)} ${''.padStart(15)} ${'1.6e-5'.padStart(15)}`);
console.log(`\n  P₁ threshold: c ≤ 0.2 (FIXED from c < 0.2)`);
console.log(`  δ formula: f² + f'² + t² (FIXED from just t)`);
console.log(`  Aggregation: σ = Σ(1/δ) (FIXED from ω = max(1/t))`);
