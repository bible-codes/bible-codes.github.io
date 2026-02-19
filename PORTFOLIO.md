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

## WRR Replication: Results and Honesty

### What the 1994 Paper Found

Witztum, Rips, and Rosenberg searched for ELS encodings of 32 famous rabbis' names near their dates of birth/death in Genesis. They reported an overall significance of **P < 0.00002** (1 in 62,500).

### What My Implementation Achieves

**P = 0.00119** (1 in 840)

### The 75x Gap — and Why It Matters

The gap is real, documented, and traceable to specific algorithmic choices:

- **Domain-of-minimality weighting**: The original WRR paper weights each ELS occurrence by the fraction of row-lengths where it achieves minimal distance. My implementation uses unweighted proximity. This is the primary source of the gap.
- **What was ruled out**: I systematically tested and eliminated cylindrical wrapping errors, D(w) factor-of-2 corrections, compound delta formulas (which made results *worse*, P=0.25), and P3/P4 statistics (not in the original paper).
- **What matches**: Tie-breaking (`v = strict_greater + ties/2`), m>=10 threshold, multi-row-length optimization, 125 spatial perturbations for c(w,w'), P1 (binomial) and P2 (Gamma CDF) statistics.

This gap is a feature of transparency, not a failure. The implementation is fully open-source — every formula, every constant, every algorithmic choice is inspectable and reproducible.

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
