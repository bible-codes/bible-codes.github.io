# Hebrew Bible Analysis Suite

## Project Overview

A comprehensive browser-based platform for computational analysis of the Hebrew Bible (Tanakh), featuring 11 interactive research tools — including the first open-source JavaScript replication of the landmark 1994 Witztum-Rips-Rosenberg (WRR) equidistant letter sequence experiment published in *Statistical Science*.

**Live**: [bible-codes.github.io](https://bible-codes.github.io/)
**Source**: [github.com/bible-codes/bible-codes.github.io](https://github.com/bible-codes/bible-codes.github.io)

---

## The Challenge

In 1994, mathematicians Witztum, Rips, and Rosenberg published a peer-reviewed paper claiming statistically significant letter-pattern correlations in the Book of Genesis. Their experiment searched for equidistant letter sequences (ELS) encoding names and dates of 32 famous rabbis, reporting P < 0.00002. The original software was proprietary and required specialized hardware. No fully open-source, browser-based replication existed.

I set out to build a complete Hebrew Bible analysis platform that could:
- Replicate the WRR experiment transparently in the browser
- Provide a full suite of Hebrew text analysis tools beyond ELS
- Run 100% client-side with no server dependencies
- Work offline as an installable Progressive Web App

---

## Technical Architecture

### Core Engine

- **Text Corpus**: 304,805 consonantal Hebrew letters (Koren edition Torah), integrity-verified via SHA-256 checksum
- **Character Database**: 39 compressed JSON files covering all Tanakh books, with per-character metadata (book, chapter, verse, word position, gematria values)
- **Search Algorithm**: KMP + Boyer-Moore pattern matching across equivalence classes for each skip value, supporting forward and backward ELS with sofit (final-form) letter normalization

### Performance

- **Web Workers**: ELS scan and WRR computation run off the main thread — the UI stays fully responsive during searches spanning hundreds of thousands of skip values
- **Scan Worker** (`engines/scan.worker.js`): N-term parallel search with progress streaming
- **WRR Worker** (`engines/wrr.worker.js`, ~950 lines): Full perturbation-statistic computation with permutation testing
- **Result Caps**: 10,000 hits/term (smallest |skip| retained), display pagination at 200 results, sliding-window cluster discovery capped at 5,000/term

### Visualization

- **2D Matrix**: 8-color term overlay with verse attribution tooltips, PNG export
- **3D Matrix**: Three.js WebGL renderer with OrbitControls, auto-rotate, raycasting tooltips, auto-optimal dimension computation from skip values
- **Video Capture**: MediaRecorder WebM recording + GIF89a animation encoder (custom LZW implementation with 480px downscaling)
- **Hebrew Date Map**: Pre-computed ELS density heatmap across 14 Hebrew months x 30 days (652 search terms, 1.74M hits)

### Data Pipeline

- **Build Tools**: Python scripts process Koren transliterated source files into compressed character databases, handling RTL digit reversal and Unicode normalization
- **Compression**: gzip via `DecompressionStream` API — 630MB raw data compressed to 21MB served
- **Lazy Loading**: Character database and ELS index loaded on-demand per tab/feature

---

## The 11 Tools

| # | Tool | What It Does |
|---|------|-------------|
| 1 | **ELS Bible Codes Search** | N-term equidistant letter sequence search with cluster ranking across skip range +/-500 |
| 2 | **WRR 1994 Experiment** | Full replication: 32 rabbis (Quick Run + Full c(w,w') perturbation statistic + permutation test) |
| 3 | **WRR Nations (B3)** | 68 nations x 5 expressions from Genesis 10, ELS-to-surface-text proximity |
| 4 | **Hebrew Text Search** | Pattern matching with regex, first/last letter filtering, auto-suggestions |
| 5 | **Gematria Calculator** | Standard, reduced, and ordinal methods; search by value or range |
| 6 | **Acronym / Notarikon** | Roshei Teivot, Sofei Teivot, middle letters; book-wide pattern analysis |
| 7 | **Tsirufim (Permutations)** | Semantic letter permutation engine with Hebrew word embeddings and clustering |
| 8 | **Matrix View** | Rectangular text grids for visual pattern inspection |
| 9 | **Book View** | Traditional verse reader with word spacing |
| 10 | **Hebrew Date Map** | ELS density heatmap for every day of the Hebrew calendar |
| 11 | **Hebrew OCR** | Extract text from images and PDFs for analysis |

---

## WRR Replication: Results and Context

### What the 1994 Paper Claimed

Witztum, Rips, and Rosenberg searched for ELS encodings of 32 famous rabbis' names near their dates of birth/death in Genesis. They reported an overall significance of **P < 0.00002** (1 in 62,500).

### What My Implementation Achieves

**P = 0.0012** (1 in 840) — **statistically significant** (P < 0.05)

### The 75x Gap — and What Research Revealed

I initially assumed the gap was due to algorithmic differences in my implementation. After systematic investigation, I discovered something more fundamental:

**Nobody has ever independently reproduced WRR's P = 1.6×10⁻⁵. Not a single researcher.**

This is documented in the peer-reviewed literature:

- **McKay, Bar-Natan, Bar-Hillel, and Kalai (MBBK)** — four mathematicians/computer scientists — wrote independent implementations. They could not consistently reproduce WRR's exact distances, even using the same data. Published in *Statistical Science* (1999).
- **WRR's own code was lost.** When asked for their original programs, WRR "were unable to provide" them. The programs they distributed had approximately half a dozen bugs. The program that generated the published Genesis histograms was described by Witztum as "presumably lost."
- **The Hebrew University Aumann Committee**, chaired by Nobel laureate Robert Aumann (initially sympathetic), ran two formal replications. Both produced **non-significant results**.
- **The effect disappears with independent data.** When Dr. Simcha Emanuel independently prepared appellations for the same 32 rabbis, the effect vanished completely.
- **MBBK demonstrated a comparable effect in War and Peace** through appellation selection alone — proving data selection can produce WRR-like results in any text.

### What I Tested and Eliminated

| Variation | Effect on P |
|-----------|-------------|
| Domain-of-minimality weighting | P worsened (0.0012 → 0.018) |
| Compound distance formula (f²+f'²+l²+1) | P much worse (0.25) |
| D(w) factor-of-2 correction | P worsened |
| Removing 5-8 char filter | P collapsed (0.0012 → 0.20) |
| σ (sum-over-h) vs ω (max-over-h) | Ruled out — WRR2 paper confirms ω = max |
| P₃/P₄ statistics on non-רבי subset | Implemented, marginal improvement |
| Full 174 canonical appellations | Loaded from McKay archive |

### What This Means

My implementation achieves a statistically significant result (P = 0.0012, or 1 in 840) using the full WRR methodology. The ~75× gap from the published result is **consistent with the finding that no independent researcher has ever reproduced the original P-value**. This may be the most faithful open-source replication that exists — and the gap it reveals is itself an important finding.

Every formula, every constant, every decision is in the open source. Inspect it, reproduce it, or improve it.

**References**:
- MBBK, ["Solving the Bible Code Puzzle"](https://www.math.toronto.edu/~drorbn/Codes/StatSci.pdf), *Statistical Science*, 1999
- [McKay's Torah Codes Archive](https://users.cecs.anu.edu.au/~bdm/codes/torah.html)
- [Bar-Natan's Bible Codes Page](https://www.math.toronto.edu/~drorbn/Codes/)

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Single-file architecture** for main app | Eliminates HTTP request overhead; entire tool loads in one fetch |
| **Web Workers for heavy computation** | ELS scan and WRR run off main thread; cancel via `worker.terminate()` |
| **Custom GIF89a encoder** | No external dependencies; LZW compression with 64-color quantization, 480px downscaling |
| **Sofit normalization** | Final-form letters (ך,ם,ן,ף,ץ) mapped to regular forms for search; originals preserved for display |
| **DecompressionStream for data** | Native browser gzip decompression; 30x compression ratio on character databases |
| **No framework** | Vanilla JS + ES6 modules; zero build step; deploy by pushing to GitHub Pages |

---

## Stack

**Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
**3D Rendering**: Three.js (local build, no CDN dependency)
**Computation**: Web Workers (dedicated threads for scan + WRR)
**Storage**: Compressed JSON (gzip), IndexedDB for persistence
**Deployment**: GitHub Pages (static hosting, zero server cost)
**PWA**: Service Worker caching, manifest.json, installable on mobile/desktop
**AI-Assisted Development**: Built with [Claude Code](https://claude.ai/claude-code) (Anthropic) — used as a development accelerator for code generation, debugging, and algorithmic implementation. All architectural decisions, algorithm selection, mathematical methodology, and domain-specific choices are my own.

---

## Metrics

- **304,805** letters in Torah text (searchable in real-time)
- **39** Tanakh books with character-level metadata
- **1.74M** ELS hits pre-computed for Hebrew calendar date map
- **56,000** Hebrew words in Tsirufim dictionary
- **5,847** Torah verse summaries (AI-generated)
- **21 MB** total compressed data payload (630 MB uncompressed)
- **0** server dependencies
- **0** npm packages required
- **100%** offline-capable after first load
