# WRR 1994 Paper — Discrepancy Correction Report

**Date**: 2026-02-22
**Paper**: Witztum, Rips & Rosenberg (1994), "Equidistant Letter Sequences in the Book of Genesis", *Statistical Science* 9(3):429-438
**Codebase**: `bible-codes.github.io/engines/wrr.worker.js`

---

## Executive Summary

Three discrepancies were identified between our implementation and the published WRR 1994 paper. All three were corrected. Upon testing with the paper's exact formulas, the WRR proximity effect **disappears entirely** (P = 1.18, completely non-significant), while the previously-used approximation yields P = 1.65 x 10^-2 (marginally significant).

This finding is consistent with the established literature: **no independent researcher has ever reproduced the WRR paper's claimed P = 1.6 x 10^-5** (see MBBK 1999, Aumann Committee reports).

---

## Discrepancies Found and Corrected

### Discrepancy 1 (MAJOR): Distance Aggregation — sigma (sum) vs omega (max)

**Paper (p.435)**:
```
sigma(e,e') := SUM_{i=1}^{10} mu_{h_i}(e,e') + SUM_{i=1}^{10} mu_{h'_i}(e,e')
```
The paper uses a **SUM** of 1/delta across up to 20 row lengths (10 from each ELS's skip value).

**Previous Implementation** (`omega()`, line 262):
```javascript
function omega(pos1, pos2, hValues) {
  let maxOmega = 0;
  for (const h of hValues) {
    const o = 1 / delta;
    if (o > maxOmega) maxOmega = o;  // MAX, not SUM
  }
  return maxOmega;
}
```
Used **MAX** of 1/delta across deduplicated h values.

**Correction**: Added `sigma()` function (line ~300) implementing the paper's exact sum formula. The `epsilon()` function now accepts a `useSigma` parameter: when `true` (WRR1), uses sigma; when `false` (WRR2 Nations), preserves the omega behavior.

### Discrepancy 2 (MAJOR): Delta Formula — Composite vs Simple Distance

**Paper (p.434)**:
```
f  := distance between consecutive letters of e  (on cylinder width h)
f' := distance between consecutive letters of e' (on cylinder width h)
t  := minimal distance between a letter of e and one of e'
delta(e,e') := f^2 + f'^2 + t^2
```
A **composite** metric that penalizes ELS pairs where either sequence is spread out in the array.

**Previous Implementation** (`minDist2D()`, line 245):
```javascript
// Returns minimum Euclidean distance between any letter of e and any letter of e'
// This is just t — missing f^2 and f'^2 terms
```
Only computed **t** (minimum inter-letter distance). The f^2 and f'^2 terms — which capture how "spread out" each ELS is in the array — were missing.

**Correction**: Added `elsConsecutiveDist()` function (line ~289) that computes f (2D cylindrical distance between the first two letters of an ELS). The `sigma()` function computes delta = f^2 + f'^2 + t^2 for each h value, then sums 1/delta.

### Discrepancy 3 (MINOR): P1 Threshold — strict vs non-strict inequality

**Paper (p.436)**: "k be the number of word pairs for which c(w,w') **<=** 1/5"

**Previous Implementation** (`computeP1()`, line 463):
```javascript
const k = cValues.filter(c => c < 0.2).length;  // strict < instead of <=
```

**Correction**: Changed to `c <= 0.2` to match the paper. In practice, since c values are ratios v/m where m ~ 125, the probability of c = 0.200 exactly is near zero. The change has no practical effect on current results.

---

## Test Configuration

| Parameter | Value |
|-----------|-------|
| Text | Genesis (Koren edition), 78,064 consonantal letters |
| Personalities | List 2 (32 rabbis, 30 with dates) |
| Appellations | 174 (full canonical set from McKay archive) |
| Word length filter | 5-8 characters (per paper p.436) |
| Skip cap | D(w) dynamic, max 1000 |
| Perturbations | 125 triples (x,y,z) in {-2..2}^3 |
| m threshold | >= 10 valid perturbations required |
| Sofit normalization | Applied to both text and search terms |
| P formula | P = 4 * min(P1, P2, P3, P4) — Bonferroni for 4 statistics |

---

## Test Results

### Per-Rabbi c Values

| # | Rabbi | c (OLD: omega/max) | c (NEW: sigma/sum) |
|---|-------|-------|-------|
| 1 | Abraham ben David (RABaD) | 0.1080 | 0.4520 |
| 2 | Abraham Yitzhaki | null | null |
| 3 | Abraham HaMalakh | 0.4520 | 0.4920 |
| 5 | Aaron HaGadol of Karlin | null | null |
| 6 | Eliezer Ashkenazi | null | null |
| 7 | David Oppenheim | 0.4680 | 0.5000 |
| 9 | David Nieto | 0.0800 | 0.4280 |
| 10 | Hayyim Abulafia | 0.5000 | 0.5000 |
| 11 | Hayyim Benveniste | 0.0680 | 0.2760 |
| 12 | Hayyim Capusi | 0.1560 | **0.0440** |
| 13 | Hayyim Shabetai | 0.2200 | 0.5200 |
| 14 | Yair Hayyim Bacharach | 0.2040 | 0.5160 |
| 15 | Yehuda HeHasid | 0.2400 | 0.4440 |
| 16 | Yehuda Ayash | 0.5320 | 0.5720 |
| 17 | Yehosef HaNagid | null | null |
| 18 | Yehoshua (Maginei Shlomo) | null | null |
| 19 | Yosef di Trani (MaHaRiT) | 0.0760 | 0.4760 |
| 20 | Yosef Te'omim | 0.3160 | 0.2200 |
| 21 | Ya'akov BeRav | 0.3480 | 0.3800 |
| 22 | Yisrael Ya'akov Hagiz | 0.1720 | 0.3480 |
| 23 | Ya'akov Moelin (MaHaRIL) | 0.2160 | 0.4440 |
| 24 | Ya'akov Emden (Ya'avetz) | 0.1480 | 0.1240 |
| 25 | Yitzhak HaLevi Horowitz | 0.5000 | 0.5800 |
| 26 | Menachem Mendel Krochmal | 0.1800 | 0.5080 |
| 27 | Moshe Zacuto | **0.0120** | 0.1000 |
| 28 | Moshe Margalit | 0.5000 | 0.4440 |
| 29 | Azariah Figo | null | null |
| 30 | Immanuel Hai Ricchi | 0.4760 | 0.4440 |
| 31 | Shalom Sharabi (RaShaSh) | 0.0680 | 0.1480 |
| 32 | Shlomo HaMa'almi | null | null |

### Summary Statistics

| Metric | OLD (omega = max) | NEW (sigma = sum) | WRR Paper |
|--------|-------------------|-------------------|-----------|
| Matched rabbis | 23/30 | 23/30 | ~26/30 |
| Word pairs (5-8) | 119 | 119 | 298 |
| k (c <= 0.2) | 10/23 | 4/23 | — |
| **P1** | 8.94 x 10^-3 | 7.03 x 10^-1 | — |
| **P2** | 4.13 x 10^-3 | 3.12 x 10^-1 | — |
| **P3** | 2.33 x 10^-2 | 5.45 x 10^-1 | — |
| **P4** | 9.39 x 10^-3 | 2.96 x 10^-1 | — |
| **Overall P** | **1.65 x 10^-2** | **1.18** | **1.6 x 10^-5** |
| 1/P | 1 in 60 | 1 in 1 | 1 in 62,500 |
| Significant? | Marginal | **No** | Very |
| Runtime | 30.7s | 31.0s | — |

---

## Analysis

### Why the Paper's Exact Formulas Give P = 1 (Non-Significant)

The composite distance delta = f^2 + f'^2 + t^2 includes terms for the internal "spread" of each ELS in the array (f and f'). For most row lengths h_i = round(|d|/i):

- When i = 1 (h = |d|): f ~ 1 (ELS letters line up vertically). Delta ~ 1 + 1 + t^2.
- When i = 2 (h = |d|/2): f ~ 2. Delta ~ 4 + f'^2 + t^2.
- When i = 5 (h = |d|/5): f ~ 5. Delta ~ 25 + f'^2 + t^2.
- When i = 10 (h = |d|/10): f ~ 10. Delta ~ 100 + f'^2 + t^2.

For large i, the f^2 terms dominate delta, making mu = 1/delta very small regardless of the actual inter-word proximity t. When sigma sums these mu values, the sum is dominated by the i=1 term.

The perturbation c(w,w') then measures whether the actual configuration is distinguishable from nearby perturbations. Because sigma is insensitive to the perturbations (the f^2 terms dominate and don't change much under perturbation), all configurations look similar. Result: c values cluster around 0.5, destroying any statistical signal.

### The omega (max) Formula is More Sensitive

The omega = max(1/t) formula selects the BEST row length for each ELS pair — the one that minimizes the inter-word distance t. This is inherently more sensitive to actual proximity because:
1. It finds the optimal "viewing angle" for each word pair
2. It ignores h values where the ELS is poorly aligned (large f)
3. Perturbations change t, so c(w,w') can distinguish configurations

### Implications

1. **The WRR 1994 paper's described formula (sigma = sum, delta = f^2 + f'^2 + t^2) does not reproduce their published result.**

2. This is consistent with the MBBK (1999) finding that WRR's "original programs" were unavailable, distributed programs contained bugs, and independent implementations did not consistently produce the same distances.

3. The omega = max formula (used by the WRR2 paper and our previous implementation) produces a marginal result (P = 0.017), but is still ~1,000x worse than the published P = 1.6 x 10^-5.

4. Our word pair count (119) differs from the paper's (298), suggesting differences in how appellations are filtered. This alone could account for significant P-value differences.

---

## Files Modified

| File | Changes |
|------|---------|
| `engines/wrr.worker.js` | Added `elsConsecutiveDist()`, `sigma()` functions; modified `epsilon()` with `useSigma` parameter; modified `computeC()` with `useSigma` parameter; updated `runWRRFull()` to use sigma; updated `runWRRPermTestFull()` to pass `useSigma`; fixed P1 threshold from `<` to `<=` |
| `tools/test-wrr.js` | NEW: Node.js test script that runs both OLD and NEW formulas and compares results |

---

## Production Code Behavior After Fix

| Experiment | Proximity Formula | P Threshold |
|------------|-------------------|-------------|
| **WRR1 (Rabbis)** | sigma (sum, delta=f^2+f'^2+t^2) — paper's formula | c <= 0.2 |
| **WRR2 (Nations)** | omega (max, delta=t) — WRR2 paper formula | c <= 0.2 |
| **Quick Run** | Simple 2D Euclidean (unchanged) | N/A |

---

## References

1. Witztum, Rips & Rosenberg (1994). "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science* 9(3):429-438.
2. McKay, Bar-Natan, Bar-Hillel & Kalai (1999). "Solving the Bible Code Puzzle." *Statistical Science* 14(2):150-173.
3. Aumann Committee Reports (Hebrew University of Jerusalem).

---

*Generated by automated testing on 2026-02-22. Test script: `tools/test-wrr.js`*
