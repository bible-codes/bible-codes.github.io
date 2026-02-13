# Hebrew Bible Analysis Suite

A browser-based platform for exploring the Hebrew Bible (Tanakh) through computational analysis. All processing runs locally in the browser — no server, no accounts, full offline support.

**Live Site**: [bible-codes.github.io](https://bible-codes.github.io/)

**Version**: 4.0
**Last Updated**: February 13, 2026
**Status**: Production (10 active tools, 3 pending)

---

## Table of Contents

1. [Overview](#1-overview)
   - 1.1 [What This Project Does](#11-what-this-project-does)
   - 1.2 [Academic Foundation](#12-academic-foundation)
   - 1.3 [Torah Text Source](#13-torah-text-source)
2. [Quick Start](#2-quick-start)
   - 2.1 [Use Online](#21-use-online)
   - 2.2 [Install as App (PWA)](#22-install-as-app-pwa)
   - 2.3 [Run Locally](#23-run-locally)
3. [Tools & Features](#3-tools--features)
   - 3.1 [ELS Bible Codes Search](#31-els-bible-codes-search)
     - 3.1.1 [Full Scan Mode](#311-full-scan-mode)
     - 3.1.2 [Index Lookup Mode](#312-index-lookup-mode)
     - 3.1.3 [Dictionary Mode](#313-dictionary-mode)
     - 3.1.4 [Batch Term Loader](#314-batch-term-loader)
     - 3.1.5 [Matrix Visualization](#315-matrix-visualization)
     - 3.1.6 [3D Matrix View](#316-3d-matrix-view)
   - 3.2 [Text Search](#32-text-search)
   - 3.3 [Gematria Calculator](#33-gematria-calculator)
   - 3.4 [Acronym / Notarikon Tool](#34-acronym--notarikon-tool)
   - 3.5 [Tsirufim — Semantic Permutations](#35-tsirufim--semantic-permutations)
   - 3.6 [Matrix View](#36-matrix-view)
   - 3.7 [Book View](#37-book-view)
   - 3.8 [Hebrew OCR](#38-hebrew-ocr)
   - 3.9 [Other Resources](#39-other-resources)
4. [How It Works — Algorithms Explained](#4-how-it-works--algorithms-explained)
   - 4.1 [ELS Search Algorithm](#41-els-search-algorithm)
     - 4.1.1 [What Is an ELS?](#411-what-is-an-els)
     - 4.1.2 [Skip Values and Directions](#412-skip-values-and-directions)
     - 4.1.3 [Equivalence Classes](#413-equivalence-classes)
     - 4.1.4 [Pattern Matching: KMP and Boyer-Moore](#414-pattern-matching-kmp-and-boyer-moore)
     - 4.1.5 [N-Term Cluster Discovery](#415-n-term-cluster-discovery)
     - 4.1.6 [Verse Attribution](#416-verse-attribution)
     - 4.1.7 [Performance](#417-performance)
   - 4.2 [ELS Index — Precomputed Lookups](#42-els-index--precomputed-lookups)
     - 4.2.1 [How the Index Is Built](#421-how-the-index-is-built)
     - 4.2.2 [Query Operations](#422-query-operations)
     - 4.2.3 [Statistical Significance](#423-statistical-significance)
     - 4.2.4 [3D ELS Matrix Space](#424-3d-els-matrix-space)
   - 4.3 [Gematria Methods](#43-gematria-methods)
   - 4.4 [Acronym Extraction](#44-acronym-extraction)
   - 4.5 [Hebrew Root Extraction](#45-hebrew-root-extraction)
   - 4.6 [Tsirufim Processing Pipeline](#46-tsirufim-processing-pipeline)
   - 4.7 [Matrix Discovery and WRR Methodology](#47-matrix-discovery-and-wrr-methodology)
5. [Technical Architecture](#5-technical-architecture)
   - 5.1 [System Diagram](#51-system-diagram)
   - 5.2 [Character-Level Database](#52-character-level-database)
   - 5.3 [Unified Dictionary System](#53-unified-dictionary-system)
   - 5.4 [IndexedDB Storage](#54-indexeddb-storage)
   - 5.5 [PWA and Offline Support](#55-pwa-and-offline-support)
   - 5.6 [Technology Stack](#56-technology-stack)
6. [Data Sources and Text Variants](#6-data-sources-and-text-variants)
   - 6.1 [Koren Torah Text](#61-koren-torah-text)
   - 6.2 [Manuscript Variants](#62-manuscript-variants)
   - 6.3 [Full Tanakh Text Data](#63-full-tanakh-text-data)
   - 6.4 [Targum Onkelos](#64-targum-onkelos)
7. [File Structure](#7-file-structure)
8. [API Reference](#8-api-reference)
   - 8.1 [Root Extraction API](#81-root-extraction-api)
   - 8.2 [ELS Index API](#82-els-index-api)
   - 8.3 [Dictionary Service API](#83-dictionary-service-api)
   - 8.4 [Database Query API](#84-database-query-api)
9. [Development Guide](#9-development-guide)
   - 9.1 [Local Development](#91-local-development)
   - 9.2 [Building Data Files](#92-building-data-files)
   - 9.3 [Testing](#93-testing)
   - 9.4 [Python Torah Codes Engine](#94-python-torah-codes-engine)
   - 9.5 [Contributing](#95-contributing)
10. [Implementation Status](#10-implementation-status)
11. [Changelog](#11-changelog)
12. [References and Related Projects](#12-references-and-related-projects)
13. [Contact](#13-contact)

---

## 1. Overview

### 1.1 What This Project Does

This project provides a set of browser-based tools for analyzing the Hebrew Bible at the character level. The central idea is that the canonical unit is a **single letter occurrence** in the Tanakh — all higher-level structures (words, verses, gematria values, ELS patterns, acronyms) are derived views over that base data.

The tools cover:

- **ELS (Equidistant Letter Sequences)**: Search for patterns formed by reading every *n*th letter of the Torah text.
- **Gematria**: Compute the numerical value of Hebrew words using traditional methods.
- **Acronym/Notarikon**: Extract first, last, or middle letters from words in a verse.
- **Tsirufim (Permutations)**: Analyze how letters of a word can recombine into other meaningful words.
- **Text Search**: Search for words and patterns in the Hebrew Bible with regex support.
- **Book View**: Read the Hebrew Bible in a traditional chapter-and-verse layout.
- **Matrix View**: Visualize sections of Torah text as a rectangular grid for ELS analysis.
- **Hebrew OCR**: Extract Hebrew text from PDF or image files.

Everything runs in the browser. There is no server backend. Data is stored locally using IndexedDB and cached by a service worker for offline use. The application is installable as a Progressive Web App (PWA).

### 1.2 Academic Foundation

The ELS research is rooted in peer-reviewed academic work:

> Witztum, Doron, Eliyahu Rips, and Yoav Rosenberg. "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, vol. 9, no. 3, 1994, pp. 429–438.

The search algorithms used are based on:

- Knuth, D. E., Morris, J. H., & Pratt, V. R. (1977). "Fast Pattern Matching in Strings." *SIAM Journal on Computing*.
- Boyer, R. S., & Moore, J. S. (1977). "A Fast String Searching Algorithm." *Communications of the ACM*.

### 1.3 Torah Text Source

| Property | Value |
|----------|-------|
| Edition | Koren (same text used by Rips et al., 1994) |
| Total letters | 304,805 |
| Final letters (ךםןףץ) | 20,106 |
| Form | Ketiv (written form) |
| SHA-256 | `b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226` |

The text can be validated by running `python3 tools/validate-text.py data/`.

---

## 2. Quick Start

### 2.1 Use Online

Visit [bible-codes.github.io](https://bible-codes.github.io/). The site loads instantly and works on any modern browser.

### 2.2 Install as App (PWA)

A PWA (Progressive Web App) is a website that can be installed on your device and used like a native application, including offline.

- **Desktop (Chrome/Edge)**: Click the install icon in the address bar, or go to Menu > Install.
- **Android**: Chrome > Menu > Install app.
- **iOS**: Safari > Share > Add to Home Screen.

Once installed, all tools work without an internet connection.

### 2.3 Run Locally

```bash
git clone https://github.com/bible-codes/bible-codes.github.io.git
cd bible-codes.github.io
python3 -m http.server 8000
# Open http://localhost:8000
```

A local HTTP server is required because the application uses ES6 modules, which browsers block when opened directly from the filesystem.

---

## 3. Tools & Features

### 3.1 ELS Bible Codes Search

**File**: `bible-codes.html`

The main tool. It searches for Equidistant Letter Sequences in the Torah — patterns formed by reading every *n*th letter. The page has three tabs: Full Scan, Index Lookup, and Dictionary.

#### 3.1.1 Full Scan Mode

**Purpose**: Search the Torah text in real time for up to 8 Hebrew terms simultaneously, across a configurable range of skip values (default: -500 to +500).

**How to use**:
1. Enter Hebrew search terms in the text box, one per line. You can also upload a `.txt` file.
2. Use the on-screen Hebrew keyboard (click the ⌨ button) if your device lacks a Hebrew keyboard.
3. Set the skip range. Larger ranges search more thoroughly but take longer.
4. Click "Search". Terms are automatically parsed, cleaned, and deduplicated. A progress bar shows completion percentage. Click "Cancel" to abort.

**Automatic input cleaning**: Non-Hebrew characters, spaces, punctuation, military ranks (אל"ם, סמ"ר, etc.), parenthetical notes, and the memorial suffix הי"ד are all stripped automatically. Final-form letters (sofiot: ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ) are treated as equivalent to their regular forms during search, so searching for a word will find it regardless of letter form. The matrix display preserves the original Torah text with sofiot as they appear.

**What happens internally**: For each term and each skip value in the range, the application extracts the letter sequence at that skip interval and runs pattern matching against a normalized version of the Torah text (see [Section 4.1](#41-els-search-algorithm) for details). When two or more terms are used, results are ranked by the **smallest cluster** — the tightest region of Torah text that contains at least one hit from every term.

**Cluster ranking**: The sliding window algorithm (O(M log M) where M is total hits) merges all hits from all terms, sorts them by position, then finds the smallest windows containing all terms. This is described in detail in [Section 4.1.5](#415-n-term-cluster-discovery).

**Verse attribution**: Each result shows which Torah book, chapter, and verse its letters come from. This is looked up from a character database covering Genesis through Deuteronomy.

**Color coding**: Each of up to 8 terms gets a distinct color in the matrix display:

| Term | Color | Hex |
|------|-------|-----|
| 1 | Amber | #ffc107 |
| 2 | Cyan | #00bcd4 |
| 3 | Deep Orange | #ff5722 |
| 4 | Green | #4caf50 |
| 5 | Pink | #e91e63 |
| 6 | Indigo | #3f51b5 |
| 7 | Brown | #795548 |
| 8 | Blue-grey | #607d8b |
| Overlap | Purple | #9c27b0 |

**Additional features**:
- **Session save/load**: Save your terms and results to the browser for later.
- **JSON export**: Download all results and clusters as structured data.
- **PNG export**: Download the matrix as an image.

#### 3.1.2 Index Lookup Mode

**Purpose**: Instant proximity searches using a precomputed index. Instead of scanning the Torah text in real time, this mode looks up results from an index that was built offline.

**How to use**:
1. Select the "Index Lookup" tab.
2. Enter Hebrew terms (comma-separated).
3. Click "Search Index".
4. View proximity pairs ranked by distance (closest first).
5. Click any pair to see the matrix visualization.

**When to use this instead of Full Scan**: Index Lookup is faster (results appear instantly) because the work was done ahead of time. However, it only covers skip values in the precomputed range (currently ±50). Full Scan covers any skip range you specify and gives you cluster-ranked results for multiple terms.

**Index statistics**: 51,493 words indexed across 41.8 million occurrences at skip ±50. See [Section 4.2](#42-els-index--precomputed-lookups) for details on how this index works.

#### 3.1.3 Dictionary Mode

**Purpose**: Browse the 260,000+ word Hebrew dictionary and click any word to search for it.

**How to use**:
1. Select the "Dictionary" tab.
2. Filter by source (BDB, Wiktionary, etc.), era (Biblical, Modern, etc.), or free text.
3. Browse paginated results.
4. Click any word to search it in the ELS index.

#### 3.1.4 Batch Search & Results Table

**Purpose**: Search for many terms at once. When multiple terms are searched, results appear in a sortable table showing hit counts, best skip values, and scan status for each term. Export results as CSV.

**Hebrew Virtual Keyboard**: Click the ⌨ button to toggle an on-screen Hebrew keyboard. This allows typing Hebrew on any device, regardless of whether Hebrew fonts or keyboard layouts are installed. The keyboard follows standard Israeli layout (top row: ק ר א ט ו ן ם פ) with New Line, Space, and Backspace keys.

#### 3.1.5 Matrix Visualization

When you click on any search result, a matrix appears below showing the Torah text arranged in a grid. The grid width equals the absolute skip value, so the search term reads vertically down the matrix. Highlighted cells show where your search terms appear.

**Hover tooltips**: Each cell shows its verse reference (e.g., "Genesis 12:3"). Hovering a verse in the legend shows the full verse text and highlights all letters from that verse with a golden glow animation.

#### 3.1.6 3D Matrix View

A WebGL-rendered 3D version of the matrix, built with Three.js (lazy-loaded on first use, ~600KB).

- Auto-computed optimal dimensions based on skip values.
- Auto-rotate with orbit controls (drag to rotate, scroll to zoom).
- Raycasting tooltips: hover any letter for verse reference, position, and term info.
- Only renders highlighted letters (typically 10–50 meshes) for performance.

### 3.2 Text Search

**File**: `text-search.html`

Search for words and patterns in the Hebrew Bible.

- **Exact match**: Find a specific Hebrew word or phrase.
- **Pattern match**: Use regular expressions for flexible searching.
- **First/last letter filter**: Find words starting or ending with specific letters.
- **Text mode**: Search in consonantal text (letters only) or full text (with niqqud/vowel marks).
- **Auto-suggestions**: As you type, matching words are suggested.

### 3.3 Gematria Calculator

**File**: `gematria.html`

Gematria is the traditional practice of assigning numerical values to Hebrew letters. This tool calculates values and finds matching words.

**Three calculation methods**:

| Method | How It Works | Example: אדם (Adam) |
|--------|-------------|---------------------|
| Standard | א=1, ב=2, ... י=10, כ=20, ... ק=100, ר=200, ש=300, ת=400 | 1 + 4 + 40 = **45** |
| Reduced | Take the standard value, then sum its digits repeatedly until single digit | 45 → 4+5 = **9** |
| Ordinal | Each letter numbered by position: א=1, ב=2, ... ת=22 | 1 + 4 + 13 = **18** |

Final letter forms (ך ם ן ף ץ) use the same values as their regular forms.

**Features**:
- Enter a word to calculate its gematria by all three methods.
- Enter a number to find all words with that gematria value.
- Search by range (e.g., find all words with gematria between 100 and 110).
- Statistical analysis of gematria distributions.

### 3.4 Acronym / Notarikon Tool

**File**: `acronym.html`

Notarikon is the extraction of letters from specific positions within words. This tool applies these methods to Bible verses.

| Method | Hebrew Name | What It Extracts |
|--------|------------|------------------|
| Roshei Teivot | ראשי תיבות | First letter of each word |
| Sofei Teivot | סופי תיבות | Last letter of each word |
| Middle | אמצעיות | Middle letter of each word |
| Alternating | לסירוגין | Every other letter |

**Features**:
- Enter a verse or phrase and extract letters by method.
- Search for a specific acronym to find verses that produce it.
- Book-wide analysis: extract acronyms across an entire book.
- Meaningful pattern detection.

### 3.5 Tsirufim — Semantic Permutations

**File**: `tsirufim.html`

Tsirufim (צירופים, "combinations") is the analysis of how the letters of a Hebrew word can rearrange into other meaningful words. In Hebrew tradition, this is seen as revealing hidden connections between concepts.

**How it works**: Given a set of Hebrew letters, the tool generates all permutations, filters them against a 56,000-word dictionary, and scores the results by semantic relevance to a context you provide. The pipeline is described in detail in [Section 4.6](#46-tsirufim-processing-pipeline).

**How to use**:
1. Enter Hebrew letters for permutation.
2. Optionally describe a situation or context.
3. Optionally select an event type (conflict, movement, judgment, etc.).
4. Adjust settings (minimum/maximum word length, confidence threshold).
5. Select a clustering method (K-Means, DBSCAN, or Hierarchical).
6. Click "Generate Permutations".
7. Browse results across four tabs: Results, Visualization (2D semantic space), Clusters, and Analysis.

### 3.6 Matrix View

**File**: `matrix-view.html`

Display a section of Torah text as a rectangular character grid.

- Set starting position, width (characters per row), and height (rows).
- Search for ELS patterns within the displayed grid.
- Toggle between consonantal and full text (with niqqud).
- Hover cells for verse reference tooltips.
- Export matrix to text file.

### 3.7 Book View

**File**: `book-view.html`

Read the Hebrew Bible in a traditional layout.

- Select any of the 39 Tanakh books, then a chapter.
- Toggle verse numbers, niqqud (vowel marks), and taamim (cantillation marks) on or off.
- Search within the current chapter.
- Navigate between chapters with Previous/Next buttons.
- Print-friendly mode.

### 3.8 Hebrew OCR

**File**: `heb-ocr.html`

Extract Hebrew text from PDF files or images using in-browser OCR.

- Upload a PDF or image file, or provide a URL.
- Uses Tesseract.js for Hebrew character recognition and PDF.js for PDF rendering.
- Page-by-page processing with progress indicator.
- Download the extracted text as a `.txt` file.

### 3.9 Other Resources

**File**: `other-resources.html`

A collection of additional tools, data files, and reference material consolidated from related repositories. Includes:

- **Legacy tools**: BCApp (original ELS interface), Igeret HaRamban (Ramban's Letter with Hebrew, English, Japanese translations and audio), Q&A / Bible Statistics page.
- **Manuscript variants**: Genesis text from multiple historical codices (Koren, Sassoon, BHS, Hilleli, Jerusalem, Venice, Yemen). See [Section 6.2](#62-manuscript-variants).
- **Full Tanakh data**: The complete Tanakh without spaces (1.2M letters), UTF-8 text, and Targum Onkelos.
- **Notebooks**: Jupyter notebooks for anagram analysis, Bible text cleaning, and 3D visualization.


---

## 4. How It Works — Algorithms Explained

### 4.1 ELS Search Algorithm

#### 4.1.1 What Is an ELS?

An **Equidistant Letter Sequence** is a pattern formed by reading letters at a fixed interval (called the "skip") from a text. Formally, an ELS with skip *d* starting at position *p* reads the letters at positions:

**p, p+d, p+2d, p+3d, ..., p+(n-1)d**

where *n* is the length of the word being searched.

For example, if you search for a 3-letter word with skip 50 starting at position 100, you read the letters at positions 100, 150, and 200.

#### 4.1.2 Skip Values and Directions

| Skip Value | Meaning | Included? | Label |
|------------|---------|-----------|-------|
| 0 | Same position repeated (meaningless) | No | — |
| +1 | Forward sequential reading (plain text) | Yes | "Open Text (forward)" |
| -1 | Backward sequential reading | Yes | "Open Text (backward)" |
| \|skip\| ≥ 2 | True equidistant letter sequence | Yes | "Skip ±n" |

**Why search in both directions?** Positive and negative skips extract different letter sequences from the same text:

```
Text: אבגדהוזחטיכלמנסעפצקרשת (positions 0–21)

Skip +3, start 0:  positions 0, 3, 6, 9, 12, 15  → א ד ז כ נ ק
Skip -3, start 21: positions 21, 18, 15, 12, 9, 6 → ת ק נ כ ז ד
```

These are different sequences and may contain different patterns.

#### 4.1.3 Equivalence Classes

For a given skip value *d*, the 304,805 Torah positions are partitioned into |*d*| independent groups called equivalence classes. Each class must be searched separately.

For skip = 3:
- Class 0: positions 0, 3, 6, 9, 12, ...
- Class 1: positions 1, 4, 7, 10, 13, ...
- Class 2: positions 2, 5, 8, 11, 14, ...

The search iterates through each class, extracts the letters at those positions into a string, and then searches that string for the target pattern.

#### 4.1.4 Pattern Matching: KMP and Boyer-Moore

Once we have a sequence of letters (from an equivalence class), we need to find whether our search term appears in that sequence. The application uses two well-known string matching algorithms:

**KMP (Knuth-Morris-Pratt)**:
- Processes the sequence left to right, never going backwards.
- Builds a "failure function" table from the search term that tells it how far to skip ahead on a mismatch.
- Guaranteed O(n+m) time, where *n* is the sequence length and *m* is the term length.
- This is the primary algorithm used for all ELS searches.

**Boyer-Moore**:
- Works by comparing the pattern from right to left, allowing it to skip large sections of text.
- Often faster than KMP in practice, especially for longer patterns, because it can skip characters it knows cannot match.
- Used as a secondary algorithm for additional coverage.

Both algorithms are run on each equivalence class. Results are merged and deduplicated before being returned.

**Why use both?** Different algorithms may find edge cases that the other misses in certain degenerate inputs. Running both provides a redundancy check.

#### 4.1.5 N-Term Cluster Discovery

When multiple search terms are used, the application finds the tightest regions of Torah text containing at least one hit from every term.

**Algorithm** (sliding window, O(M log M) where M = total hits across all terms):

1. **Merge**: Collect all hits from all terms into one array, each tagged with its term index.
2. **Sort**: Sort by position in the Torah text (ascending).
3. **Slide**: Move a window across the sorted array:
   - Expand the right edge until all terms are represented in the window.
   - Record the span (rightmost position minus leftmost position).
   - Shrink the left edge while all terms remain present, recording smaller spans.
4. **Filter**: Only keep clusters with span ≤ 10,000 characters.
5. **Select**: For each cluster, pick one representative hit per term (the one closest to the window center).
6. **Deduplicate**: Remove clusters that report the same combination of hits.
7. **Rank**: Sort by span ascending (tightest clusters first). Return the top 200.

#### 4.1.6 Verse Attribution

Every position in the Torah text maps to a specific book, chapter, and verse. The application loads a character database (one compressed JSON file per Torah book) that provides this mapping as a simple array lookup: `charDatabase[position]` returns `{book, chapter, verse}`.

This data is loaded lazily on first scan and covers all five Torah books (Genesis through Deuteronomy, ~304,805 entries).

#### 4.1.7 Performance

| Operation | Typical Time |
|-----------|-------------|
| Open text search (skip=0) | < 100ms |
| Single skip value | ~50ms |
| Range -100 to +100 | ~10–15 seconds |
| Range -500 to +500 | ~1–2 minutes |
| Precomputed index lookup | < 1ms |

During long scans, the UI yields periodically (`await setTimeout(0)`) to remain responsive, and a progress bar shows completion percentage.

### 4.2 ELS Index — Precomputed Lookups

The Index Lookup mode uses a precomputed index that records every occurrence of every dictionary word at every skip value across the Torah. This transforms what would be an expensive real-time computation into an instant lookup.

#### 4.2.1 How the Index Is Built

The build script (`tools/build-els-index.py`) works as follows:

1. Load the Torah text (304,805 letters) and the unified Hebrew dictionary (82,530 words).
2. Build a **trie** (prefix tree) from the dictionary. A trie is a tree data structure where each node represents one letter; walking from root to a leaf spells out a word. This allows checking whether a sequence of letters forms a valid word in O(L) time, where L is the word length.
3. For each skip value in the range (e.g., -50 to +50):
   - For each starting position in the Torah:
     - Walk the trie while extracting letters at the given skip interval.
     - If a complete word is found, record `(word, position, skip)`.
4. Compress the result and write it to a `.json.gz` file.

**Complexity**: O(skip_range × torah_length × average_word_length) ≈ 4 billion operations for ±50 range. Takes about 1 minute on a modern CPU.

**Index statistics**:

| Skip Range | Words Indexed | Occurrences | File Size |
|------------|---------------|-------------|-----------|
| ±20 | 56K | ~25M | 53 MB |
| ±50 | 52K | ~42M | 39 MB |

#### 4.2.2 Query Operations

All operations below are instant (O(1) lookup plus O(n) processing of results):

- **Word lookup**: Find all occurrences of a word at all indexed skip values.
- **Proximity search**: Find all words within *n* characters of a given position.
- **Pair proximity**: Find the minimum distance between any occurrence of word A and any occurrence of word B.
- **Proximity matrix**: For a list of words, compute pairwise minimum distances (an "attention-style" matrix).
- **Cluster discovery**: Starting from a seed word, find all other words occurring nearby.
- **ELS embedding**: Represent a word as a vector based on where it appears in the Torah, enabling similarity calculations between words.

#### 4.2.3 Statistical Significance

The index supports significance scoring: given how often a word appears, is that more or less than expected by chance?

**Expected occurrences** are calculated from letter frequencies in the Torah. For a word W of length L:

```
Expected ≈ positions × skip_count × ∏(freq(letterᵢ))
```

A z-score is computed: `z = (observed - expected) / √expected`. A high z-score suggests the word appears more often than chance would predict.

#### 4.2.4 3D ELS Matrix Space

Each skip value defines a different 2D arrangement of the Torah text (a "page" in a conceptual book). An ELS occurrence can be located in a 3D coordinate system:

- **X**: Position in the Torah (0–304,804)
- **Y**: Column within the matrix (position mod skip)
- **Z**: Skip value

This 3D representation allows computing whether terms cluster not just in text position but across skip values — a potentially significant pattern if the same words appear in related regions across multiple "pages."

### 4.3 Gematria Methods

Every Hebrew letter has a traditional numerical value. Gematria calculates the sum of letter values in a word. This tool supports three methods:

**Standard (Mispar Gadol)**:
```
א=1   ב=2   ג=3   ד=4   ה=5   ו=6   ז=7   ח=8   ט=9
י=10  כ=20  ל=30  מ=40  נ=50  ס=60  ע=70  פ=80  צ=90
ק=100 ר=200 ש=300 ת=400

Final forms: ך=20, ם=40, ן=50, ף=80, ץ=90
```

**Reduced (Mispar Katan)**: Take the standard gematria, then sum its digits. Repeat until a single digit remains. Example: תורה = 400+6+200+5 = 611 → 6+1+1 = 8.

**Ordinal (Mispar Siduri)**: Number each letter by its position in the alphabet: א=1, ב=2, ..., ת=22.

### 4.4 Acronym Extraction

The acronym engine extracts letters from specific positions within each word of a verse or phrase:

- **Roshei Teivot** (ראשי תיבות): First letter of each word. For example, from "בראשית ברא אלהים" → ב.ב.א
- **Sofei Teivot** (סופי תיבות): Last letter of each word.
- **Middle letters**: The middle letter of each word (for odd-length words).
- **Alternating**: Every other letter across the entire phrase.

The tool can also work in reverse: given an acronym, it searches for verses that produce it.

### 4.5 Hebrew Root Extraction

Hebrew words are built from three-letter roots (שורשים) combined with patterns (binyanim) and affixes. Knowing the root of a word is essential for understanding its meaning and finding related words.

The root extraction system uses a two-tier approach:

**Tier 1 — Lexicon Lookup (primary)**:
A precomputed dictionary of 56,118 Biblical Hebrew words mapped to their roots. This provides O(1) lookups with full confidence.

- 11,468 unique roots identified
- 4 binyanim (verb patterns) detected: Qal, Nifal, Hifil, Hitpael
- 691 KB compressed

**Tier 2 — Morphological Heuristics (fallback)**:
For words not in the lexicon, the system strips known prefixes (ה, ו, ב, כ, ל, מ, ש) and suffixes (ים, ות, יהם, הם, כם, נו, ה, י, ך), then checks the lexicon again. If still not found, it applies morphological rules to guess the root, with lower confidence scores.

**Binyanim** (verb patterns) detected:

| Binyan | Pattern | Example | Meaning |
|--------|---------|---------|---------|
| Qal | פָּעַל | דבר | Basic active ("he spoke") |
| Nifal | נִפְעַל | נשבר | Passive/reflexive ("was broken") |
| Piel | פִּעֵל | דבר | Intensive active ("he conversed") |
| Hifil | הִפְעִיל | הקדים | Causative ("he preceded/caused to be early") |
| Hitpael | הִתְפַּעֵל | התפלל | Reflexive ("he prayed [to himself]") |

### 4.6 Tsirufim Processing Pipeline

The Tsirufim engine processes input through five stages:

**Stage 1 — Generate Candidates**: Produce all permutations of the input letters. Filter against a 56,000-word Hebrew dictionary. Apply morphological validity checks and gematria bounds.

**Stage 2 — Extract Features**: For each valid word, compute a 64-dimensional feature vector:
- Indices 0–2: Gematria values (standard, reduced, ordinal), normalized.
- Indices 3–4: Root gematria and confidence score.
- Index 5: Word length.
- Indices 6–12: Binyan (verb pattern), one-hot encoded.
- Indices 13–16: Letter composition (guttural ratio, weak letter ratio, emphatic ratio, dominant letter frequency).
- Indices 17–63: Additional morphological and semantic features.

**Stage 3 — Contextual Scoring**: Score each candidate word relative to the input context using cosine similarity between feature vectors. Apply semantic drift penalties and inter-word coherence boosts.

**Stage 4 — Clustering**: Group scored candidates into thematic clusters using K-Means (when you know how many groups to expect), DBSCAN (auto-detects clusters and noise), or Hierarchical clustering (shows relationships between clusters).

**Stage 5 — Visualization**: Project the 64-dimensional feature vectors into 2D using PCA (Principal Component Analysis), then render them as an interactive scatter plot with D3.js. Each cluster gets a distinct color.

### 4.7 Matrix Discovery and WRR Methodology

This is a planned feature based on the 1994 Witztum-Rips-Rosenberg experiment.

**Concept**: Given a matrix region around one or more ELS results, search for additional terms (names, places, dates) that appear as ELS within that region. Calculate whether the observed proximity between terms is statistically significant compared to random chance.

**The WRR method**:
1. Define pairs of related terms (e.g., a rabbi's name and their date of birth/death).
2. Search for each term as an ELS in the Torah.
3. Measure how close the paired terms appear to each other.
4. Compare this proximity against control texts (the same letters shuffled randomly, which preserves letter frequencies but destroys any intentional patterns).
5. Calculate a P-value: the probability of observing such close proximity by chance alone.

**Expected occurrences formula**: For a word of length L with letters w₁, w₂, ..., wₗ in a text of length N across a range of skip values:

```
Expected ≈ N × skip_count × ∏(freq(wᵢ))
```

where `freq(wᵢ)` is the frequency of letter wᵢ in the Torah text. Longer words are exponentially less likely to appear by chance.

---

## 5. Technical Architecture

### 5.1 System Diagram

```
+---------------------------------------------------------------+
|                      USER'S BROWSER                            |
|                                                                |
|  +---------------+  +---------------+  +---------------+       |
|  |   UI Layer    |  |  Tool Pages   |  |   Service     |       |
|  |   (HTML/CSS)  |  |  (HTML+JS)    |  |   Worker      |       |
|  +-------+-------+  +-------+-------+  +-------+-------+       |
|          |                  |                  |                |
|  +-------+------------------+------------------+--------+      |
|  |              Application Logic (ES6 Modules)         |      |
|  |                                                      |      |
|  |  +----------+  +-----------+  +------------------+  |      |
|  |  |  Search  |  | Gematria  |  |    Tsirufim      |  |      |
|  |  |  Engines |  |  Engine   |  | (Permutations +  |  |      |
|  |  +----------+  +-----------+  |   Clustering)    |  |      |
|  |                               +------------------+  |      |
|  |  +-----------------------------------------------+  |      |
|  |  |          Root Extraction Engine               |  |      |
|  |  |  - Lexicon Lookup (56K words)                 |  |      |
|  |  |  - Morphological Heuristics                   |  |      |
|  |  +-----------------------------------------------+  |      |
|  |  +-----------------------------------------------+  |      |
|  |  |          ELS Index Service                    |  |      |
|  |  |  - Precomputed occurrences (41.8M)            |  |      |
|  |  |  - Instant proximity lookups                  |  |      |
|  |  +-----------------------------------------------+  |      |
|  +------------------------------------------------------+      |
|                                                                |
|  +----------------------------------------------------------+  |
|  |                  IndexedDB Storage                        |  |
|  |  +------------+  +------------+  +------------+          |  |
|  |  |   chars    |  |   words    |  |   verses   |          |  |
|  |  |  ~1.2M     |  |  ~309K     |  |  ~23K      |          |  |
|  |  +------------+  +------------+  +------------+          |  |
|  |  +------------+  +------------+  +------------+          |  |
|  |  |   roots    |  | dictionary |  | els-index  |          |  |
|  |  |  ~56K      |  |  ~82K      |  |  ~52K      |          |  |
|  |  +------------+  +------------+  +------------+          |  |
|  +----------------------------------------------------------+  |
+---------------------------------------------------------------+
                              |
                              | Loads from GitHub Pages (CDN)
                              v
+---------------------------------------------------------------+
|  data/*.json.gz              engines/*.js                      |
|  - chars/words/verses        - roots.js, gematria.js           |
|  - els-index/*.json.gz       - search.js, els-index.js         |
|  - dictionaries/*.json.gz    - tsirufim/*.js                   |
+---------------------------------------------------------------+
```

### 5.2 Character-Level Database

The database treats every letter in the Tanakh as a separate record. Each character stores:

```javascript
{
  id: INTEGER,                  // Global ordinal (0..304,805 for Torah)
  book: SMALLINT,               // 1..39 (Tanakh book number)
  chapter: SMALLINT,
  verse: SMALLINT,
  verse_char_index: SMALLINT,   // Position within verse (0-based)
  word_index: SMALLINT,         // Word number within verse (0-based)
  char_index_in_word: SMALLINT, // Position within word (0-based)
  base_char: CHAR(1),           // Base letter: א through ת
  final_form: BOOLEAN,          // Whether it is a final letter: ך ם ן ף ץ
  niqqud: STRING,               // Vowel marks (Unicode combining characters)
  taamim: STRING,               // Cantillation marks
  alt_taamim: STRING,           // Alternate cantillation (e.g., Aseret HaDibrot)
  gematria_standard: SMALLINT,  // Precomputed standard gematria value
  gematria_reduced: SMALLINT,
  gematria_ordinal: SMALLINT,
  word_id: INTEGER,
  verse_id: INTEGER
}
```

**Why this design?** Every analytical feature becomes a query over this table:
- ELS search → iterate by global `id` at skip intervals.
- Gematria → sum precomputed `gematria_standard` values.
- Acronyms → filter by `char_index_in_word = 0` for first letters.
- Verse lookup → group by `verse_id`.

| Data Type | Records | Compressed Size |
|-----------|---------|-----------------|
| Characters | ~1.2M | ~21 MB |
| Words | ~309K | ~15 MB |
| Verses | ~23K | ~3 MB |

Data is stored as gzip-compressed JSON files (one file per book per type, 117 files total for 39 Tanakh books × 3 types). These are decompressed in the browser using the Compression Streams API and loaded into IndexedDB on first use.

### 5.3 Unified Dictionary System

The dictionary merges entries from multiple sources into a single searchable collection:

| Source | Entries | Description |
|--------|---------|-------------|
| Tanakh Extracted | 56,118 | All unique word forms from the Hebrew Bible |
| Hebrew Wiktionary | 27,598 | Modern and Biblical Hebrew, community-sourced |
| BDB (Open Scriptures) | 6,893 | Brown-Driver-Briggs, academically verified Biblical Hebrew |
| Strong's Concordance | 6,243 | Cross-referenced to specific verses |
| **Unified Total** | **82,151** | Deduplicated superset |

**Inflection mapping**: 50,037 inflected forms linked to their base forms (lemmas). This means you can look up a conjugated verb and find its root.

**Era classification**: Each entry is tagged as Biblical (9,340), Modern (19,602), Rabbinic (2,022), or Medieval (39).

**Total PWA size**: ~5.3 MB compressed. Works entirely offline.

### 5.4 IndexedDB Storage

IndexedDB is the browser's built-in database for storing large amounts of structured data. This project uses it to store character data, word data, verse data, roots, and dictionary entries.

**Database name**: `BibleAnalysis` (version 3)

**Object stores**: `chars`, `words`, `verses`, `roots`, `definitions`, `metadata`

**Typical browser quotas**: Chrome/Edge ~60% of free disk space, Firefox ~50%, Safari 1 GB default.

### 5.5 PWA and Offline Support

A Progressive Web App (PWA) is a website enhanced with a service worker and a manifest file so that it can be installed and run offline.

**Service worker** (`sw.js`, current version v6.0): Caches all HTML pages, JavaScript modules, CSS files, Torah data, dictionary files, and ELS index files. Uses a cache-first strategy for static assets and network-first with cache fallback for data files.

**What works offline**: All tools — ELS search, text search, gematria, acronyms, tsirufim, dictionary lookups, matrix view, book reader. The only features requiring network are fetching URLs in the OCR tool and external links (e.g., Sefaria).

### 5.6 Technology Stack

- **Frontend**: Pure JavaScript (ES6 modules), HTML5, CSS3. No framework dependencies.
- **Visualization**: D3.js (tsirufim), Three.js (3D matrix, lazy-loaded).
- **OCR**: Tesseract.js, PDF.js (both loaded from CDN).
- **Storage**: IndexedDB, Service Worker Cache API.
- **Compression**: Browser-native Compression Streams API (gzip).
- **Build tools** (offline, Python): `build-database.py`, `build-els-index.py`, `build-unified-dict.py`, and others in `tools/`.
- **Deployment**: GitHub Pages (static hosting).

---

## 6. Data Sources and Text Variants

### 6.1 Koren Torah Text

The primary text used for all ELS analysis is the Koren Edition — the same text used in the 1994 Witztum-Rips-Rosenberg study. It consists of 304,805 consonantal Hebrew letters in the written (ketiv) form. The file `data/torahNoSpaces.txt` contains this text as a single unbroken string.

### 6.2 Manuscript Variants

The `data/manuscripts/` directory contains Genesis text from multiple historical codices and editions, allowing comparison across manuscript traditions:

**Koren Edition** (all 5 Torah books):
- `genesis.koren.gz`, `exodus.koren.gz`, `leviticus.koren.gz`, `numbers.koren.gz`, `deuteronomy.koren.gz`

**Genesis from other codices**:
- `genesis.sassoon.gz` — Sassoon Codex (one of the oldest known Torah manuscripts)
- `genesis.bhs.gz` — Biblia Hebraica Stuttgartensia (standard academic critical edition)
- `genesis.hilleli.gz` — Hilleli Codex (medieval manuscript cited by Maimonides)
- `genesis.jerus.gz` — Jerusalem Codex
- `genesis.venice.gz` — Venice Edition (early printed edition)
- `genesis.yemen.gz`, `genesis.yemen1.gz`, `genesis.yemen2.gz`, `genesis.yemen3.gz` — Yemenite manuscript traditions

### 6.3 Full Tanakh Text Data

- `data/tanach-texts/NoSpacesTanach.dat` — The entire Tanakh (not just Torah) as a single string without spaces (~1.2 million letters).
- `data/tanach-texts/t3utf.dat` — Full Tanakh in UTF-8 with spaces and punctuation.
- `data/tanach-texts/tanach.zip` — Zipped Tanakh dataset.

### 6.4 Targum Onkelos

- `data/tanach-texts/Unkelos.zip` — Targum Onkelos, the authoritative Aramaic translation of the Torah, traditionally read alongside the Hebrew text in synagogue.

---

## 7. File Structure

```
/
├── index.html                  # Redirects to bible-codes.html
├── bible-codes.html            # ELS search (main tool)
├── text-search.html            # Hebrew text search
├── gematria.html               # Gematria calculator
├── acronym.html                # Notarikon/acronym tool
├── tsirufim.html               # Semantic permutations
├── matrix-view.html            # Grid visualization
├── book-view.html              # Traditional reader
├── heb-ocr.html                # Hebrew OCR
├── other-resources.html        # Additional tools and data
├── BCApp.html                  # Legacy ELS interface
├── igeret.html                 # Igeret HaRamban
├── qa.html                     # Bible statistics / Q&A
├── test-db.html                # Database testing
├── test-roots.html             # Root extraction testing
├── test-dictionaries.html      # Dictionary testing
│
├── data/
│   ├── torahNoSpaces.txt       # Koren Torah text (304,805 letters)
│   ├── precomputed-terms.json  # Precomputed ELS hash tables
│   ├── *-chars.json.gz         # Character database (39 books)
│   ├── *-words.json.gz         # Word data (39 books)
│   ├── *-verses.json.gz        # Verse data (39 books)
│   ├── els-index/              # Precomputed ELS indices
│   ├── dictionaries/           # Hebrew dictionaries
│   │   ├── unified/            # Merged 82K-entry dictionary
│   │   ├── openscriptures-bdb.json.gz
│   │   ├── strongs-hebrew.json.gz
│   │   └── hebrew-wiktionary.json.gz
│   ├── embeddings/             # Hebrew word vectors
│   ├── manuscripts/            # Torah text variants (multiple codices)
│   └── tanach-texts/           # Full Tanakh data and Targum Onkelos
│
├── engines/
│   ├── search.js               # Text search engine
│   ├── gematria.js             # Gematria calculations
│   ├── acronym.js              # Acronym/notarikon engine
│   ├── roots.js                # Hebrew root extraction
│   ├── root-integration.js     # Root integration helpers
│   ├── matrix.js               # Matrix visualization
│   ├── letter-analysis.js      # Letter frequency analysis
│   ├── els-index.js            # ELS index query engine
│   ├── dictionary-service.js   # Dictionary service
│   ├── els.worker.js           # ELS Web Worker
│   └── tsirufim/               # Semantic permutation suite
│       ├── permutations.js
│       ├── embeddings.js
│       ├── scoring.js
│       ├── clustering.js
│       └── visualization.js
│
├── db/
│   ├── schema.js               # IndexedDB schema
│   ├── loader.js               # Data loading utilities
│   ├── query.js                # Database queries
│   ├── dictionary-schema.js    # Dictionary DB schema
│   └── dictionary-loader.js    # Dictionary loading
│
├── js/
│   ├── test.js                 # ELS main logic
│   ├── load-torah.js           # Torah text loader
│   ├── search-algorithms.js    # KMP & Boyer-Moore
│   ├── i18n.js                 # Internationalization
│   ├── pwa-install.js          # PWA install prompt
│   └── mobile-nav.js           # Mobile navigation
│
├── tools/
│   ├── build-database.py       # Character DB builder
│   ├── build-koren-database.py # Koren text builder
│   ├── build-els-index.py      # ELS index builder
│   ├── build-unified-dict.py   # Dictionary merger
│   ├── build-wiktionary-dict.py # Wiktionary parser
│   ├── build-strongs-dict.py   # Strong's parser
│   ├── build-openscriptures-dict.py # BDB parser
│   ├── build-wikipedia-dict.py # Wikipedia parser
│   ├── validate-text.py        # Text validation
│   ├── els-verify.py           # Hebrew text verification
│   └── extract_heb.py          # Hebrew word extraction from Wikipedia
│
├── audio/                      # Audio files (Igeret HaRamban)
├── reference/
│   ├── notebooks/              # Jupyter notebooks
│   │   ├── anagram.ipynb
│   │   ├── CleanBible.ipynb
│   │   └── 3d.ipynb
│
├── torah-codes/                # Python ELS engine (1,693 files)
│   ├── p.py                    # Main entry point
│   ├── els_proximity_analyzer.py
│   ├── matrix_visualization.py
│   ├── texts/                  # Torah text sources
│   └── CHATUFIM.txt            # 182 hostage names for batch testing
│
├── docs/                       # Technical specifications
│   ├── ELS-INDEX-SYSTEM.md
│   ├── UNIFIED-DICTIONARY-PLAN.md
│   └── MATRIX-DISCOVERY-PLAN.md
│
├── sw.js                       # Service worker
├── manifest.json               # PWA manifest
├── styles.css                  # Global styles
└── css/mobile-optimized.css    # Mobile-first styles
```

---

## 8. API Reference

These JavaScript APIs are available for developers building on top of the engines.

### 8.1 Root Extraction API

```javascript
import { getRootExtractor } from './engines/roots.js';

const extractor = getRootExtractor();
await extractor.initialize();

// Extract root of a word
const result = await extractor.extractRoot('מדברים');
// { root: 'דבר', binyan: 'piel', confidence: 1.0, method: 'lexicon' }

// Extract roots for multiple words
const results = await extractor.extractRoots(['משה', 'אהרן']);

// Find all words sharing a root
const words = extractor.getWordsWithRoot('דבר');
// ['דבר', 'מדבר', 'דברים', ...]

// Check if a word is in the lexicon
extractor.isKnownWord('משה');  // true

// Get statistics
extractor.getStats();
// { totalWords: 56118, uniqueRoots: 11468, ... }
```

### 8.2 ELS Index API

```javascript
import { getElsIndexService, initElsIndex } from './engines/els-index.js';

await initElsIndex('data/els-index/els-index-50-min4.json.gz');
const service = getElsIndexService();

// Find all occurrences of a word
service.findWord('משה');
// [{pos: 1234, skip: 5}, {pos: 2345, skip: -10}, ...]

// Find words near a position
service.findNearby(50000, 1000);

// Minimum distance between two words
service.pairProximity('משה', 'אהרן');
// { distance: 42, word1: {...}, word2: {...} }

// Pairwise proximity matrix for a list of words
service.computeProximityMatrix(['משה', 'אהרן', 'פרעה']);

// Discover cluster around a seed word
service.discoverCluster('משה', 1000);
// { seed, center, words: [...], totalOccurrences }

// Statistical significance
service.significanceScore('משה');
// { observed, expected, zScore, significant }
```

### 8.3 Dictionary Service API

```javascript
import { getDictionaryService, initDictionaries } from './engines/dictionary-service.js';

await initDictionaries(['unified', 'bdb', 'strongs']);
const dictService = getDictionaryService();

// Look up a word
dictService.lookup('אברהם');
// { word, root, definitions, era, sources, ... }

// Get base form of an inflected word
dictService.getLemma('אבדו');
// { lemma: 'אבד', root: 'אבד' }

// Search by era
dictService.searchByEra('biblical', 50);

// Get all inflections of a root
dictService.getInflections('אבד');
// ['אבד', 'אבדה', 'אבדו', ...]

// Check existence
dictService.isKnownWord('שלום');  // true

// Get all words
dictService.getAllWords();  // Set of 82K+ words
```

### 8.4 Database Query API

```javascript
import { loadBook } from './db/loader.js';
import { getVersesByBook, getCharacterRange, getVerseByRef } from './db/query.js';

// Load a book (downloads and decompresses on first call)
await loadBook('genesis');

// Get all verses from a book
const verses = await getVersesByBook(1);

// Get characters in a range
const chars = await getCharacterRange(0, 999);

// Get a specific verse
const verse = await getVerseByRef(1, 1, 1);  // Genesis 1:1

// Get characters in a verse
const verseChars = await getCharactersInVerse(verseId);
```

---

## 9. Development Guide

### 9.1 Local Development

```bash
# Clone the repository
git clone https://github.com/bible-codes/bible-codes.github.io.git
cd bible-codes.github.io

# Start a local server (required for ES6 modules)
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

Alternatively, use the VS Code Live Server extension.

### 9.2 Building Data Files

All build scripts are in the `tools/` directory and require Python 3.

**Character database** (processes all 39 Tanakh books):
```bash
python3 tools/build-database.py --books all --output data/
```

**Root lexicon** (56K words with root mappings):
```bash
python3 tools/build-root-lexicon.py
# Output: data/embeddings/hebrew-roots.json.gz
```

**ELS index** (precomputed word occurrences):
```bash
python3 tools/build-els-index.py --skip-range 50 --min-length 4
# Output: data/els-index/els-index-50-min4.json.gz
```

**Unified dictionary** (merge all dictionary sources):
```bash
python3 tools/build-unified-dict.py
# Output: data/dictionaries/unified/hebrew-unified.json.gz
```

**Text validation**:
```bash
python3 tools/validate-text.py data/
# Verifies letter count, final forms, SHA-256 hash
```

### 9.3 Testing

**Test pages** (open in browser):
- `test-db.html` — Database functionality and storage quota monitoring.
- `test-roots.html` — Root extraction accuracy.
- `test-dictionaries.html` — Dictionary service across all sources.

**Manual testing checklist**:
- Test all tools on Chrome, Firefox, and Safari.
- Test on mobile (iOS Safari, Android Chrome).
- Test offline mode (disconnect network after initial load).
- Test PWA installation and launch.

### 9.4 Python Torah Codes Engine

The `torah-codes/` directory contains a comprehensive Python-based ELS search engine (a fork of TorahBibleCodes with enhancements). It includes:

- **Multi-term proximity analysis**: `els_proximity_analyzer.py`
- **Visualization tools**: `els_proximity_visualizer.py`, `matrix_visualization.py`
- **Multiple codices**: Koren, Leningrad, MAM (Miqra According to Masorah)
- **Docker support**: `Dockerfile`, `docker-compose.yml`
- **Pre-configured searches**: Input files for various terms

Run the main ELS search:
```bash
cd torah-codes
python3 p.py
```

### 9.5 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Make changes and test thoroughly.
4. Commit and push.
5. Open a Pull Request.

**Coding standards**: ES6+ JavaScript, no framework dependencies, mobile-first CSS, JSDoc comments for public functions.

---

## 10. Implementation Status

### Active Tools (10)

| Tool | File | Status |
|------|------|--------|
| ELS Bible Codes | `bible-codes.html` | Complete |
| Text Search | `text-search.html` | Complete |
| Gematria | `gematria.html` | Complete |
| Acronym | `acronym.html` | Complete |
| Tsirufim | `tsirufim.html` | Complete |
| Matrix View | `matrix-view.html` | Complete |
| Book View | `book-view.html` | Complete |
| Hebrew OCR | `heb-ocr.html` | Complete |
| Other Resources | `other-resources.html` | Complete |
| Dictionary | (in bible-codes.html) | Complete |

### Pending (4)

| Tool | Description | Priority |
|------|-------------|----------|
| WRR 1994 Experiment | One-click replication of the 32-rabbi name-date experiment | High |
| Letter Analysis UI | Letter frequency visualization (engine complete) | High |
| Cantillation Viewer | Display and search by taamim (cantillation marks) | Medium |
| Cross-References | Link verses to Talmud, Midrash, Zohar via Sefaria | Medium |

### Engine Completion

| Engine | Lines | Status |
|--------|-------|--------|
| `engines/search.js` | 379 | Complete |
| `engines/gematria.js` | 454 | Complete |
| `engines/acronym.js` | 448 | Complete |
| `engines/els.worker.js` | 343 | Complete |
| `engines/roots.js` | 335 | Complete |
| `engines/root-integration.js` | 290 | Complete |
| `engines/matrix.js` | ~600 | Complete |
| `engines/letter-analysis.js` | ~450 | Complete |
| `engines/els-index.js` | 534 | Complete |
| `engines/dictionary-service.js` | ~400 | Complete |
| `engines/tsirufim/` (5 files) | 2,209 | Complete |

### Phase Completion

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation & Infrastructure | 100% |
| 2 | Database Infrastructure | 100% |
| 3 | Core Search Engines | 100% |
| 4 | UI Development | 100% |
| 5 | Advanced Features | 90% |
| 5.5 | Tsirufim Semantic Engine | 100% |
| 5.6 | PWA & Internationalization | 100% |
| 6 | Testing & Optimization | In Progress |
| 7 | Documentation & Release | In Progress |

---

## 11. Changelog

### February 13, 2026: Repository Consolidation

Consolidated content from all Bible-codes-related repositories into this single superset repo:

- **bible-data-science.github.io**: Copied HTML tools (Hebrew OCR, Igeret HaRamban, Q&A, BCApp), manuscript variant data (14 codex files), full Tanakh text data, Targum Onkelos, audio files, Jupyter notebooks.
- **torahcodes_fork**: Already fully integrated in `torah-codes/` directory (1,693 files).
- **heb_wiki_words**: Copied `extract_heb.py` word extraction script to `tools/`.
- Created `other-resources.html` page linking all imported content.
- Added "Other Resources" link to `bible-codes.html` footer.
- **Unified term input**: Replaced individual term input fields with a single textarea (one term per line). Auto-parses on Search — no separate Parse button needed.
- **Hebrew Virtual Keyboard**: On-screen keyboard toggle (⌨ button) for typing Hebrew on any device without a Hebrew keyboard installed. Standard Israeli layout.
- **Sofit normalization**: Final-form letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ) treated as equivalent during search. Torah text displayed with original sofiot preserved.

### February 7–8, 2026: 3D Matrix, Batch Loader, Verse Hover

- **3D Matrix View**: Three.js WebGL renderer with auto-rotate, raycasting tooltips, auto-optimal dimensions. Lazy-loaded on first use.
- **Verse Hover Tooltips**: Hovering a verse reference in the legend shows full verse text and highlights its letters with golden glow animation.
- **Batch Term Loader**: Upload `.txt` files or paste lists. Auto-cleans Hebrew names (strips military ranks, parenthetical notes, memorial suffixes). Sortable results table with CSV export.
- **Unified Search**: Single Search button handles manual + batch terms together. Per-term progress with ETA.
- Default skip range changed from ±100 to ±500.

### February 6, 2026: N-Term Scan with Cluster Ranking

- Dynamic N-term UI (up to 8 terms), each color-coded.
- Sliding window cluster finder: O(M log M) algorithm finds minimal-span windows containing all terms.
- Verse attribution from Torah character database.
- 8-color matrix with purple overlap.
- Session save/load, JSON export, PNG matrix download.

### February 4, 2026: Unified ELS Interface

- Combined separate ELS pages into single `bible-codes.html` with three tabs: Index Lookup, Full Scan, Dictionary.
- Inline matrix view (replaces popup modal).
- Dictionary integration: click any word to search.

### February 3, 2026: ELS Index System and Dictionary

- **ELS Index**: 51,493 words indexed, 41.8 million occurrences at skip ±50. O(1) lookups. Proximity calculations, cluster discovery, statistical significance.
- **Unified Dictionary**: 82,151 entries merged from BDB, Wiktionary, Strong's, and Tanakh extraction. 50,037 inflection mappings. Era classification.

### February 2, 2026: Algorithm Fix and PWA

- Fixed bidirectional ELS search (skip +d and -d now correctly extract different sequences).
- PWA fully installable with proper icons and manifest.
- Hebrew/English language toggle on index page.
- Clickable ELS matrix view.

### January 12–13, 2026: Advanced Features

- Matrix View system, Book View, Letter Analysis engine.
- Root extraction system (56K word lexicon).
- Tsirufim semantic permutation engine (5 modules, 2,209 lines).
- Mobile-first responsive design.

---

## 12. References and Related Projects

### Academic References

1. Witztum, D., Rips, E., & Rosenberg, Y. (1994). "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, 9(3), 429–438.
2. Knuth, D. E., Morris, J. H., & Pratt, V. R. (1977). "Fast Pattern Matching in Strings." *SIAM Journal on Computing*, 6(2), 323–350.
3. Boyer, R. S., & Moore, J. S. (1977). "A Fast String Searching Algorithm." *Communications of the ACM*, 20(10), 762–772.

### Data Sources

- **Torah Text**: Koren Edition (304,805 letters, verified against Rips et al.)
- **BDB Dictionary**: Open Scriptures Project
- **Hebrew Wiktionary**: Community-sourced, XML dump
- **Strong's Concordance**: Open-source concordance data
- **Manuscript Variants**: Sassoon, BHS, Hilleli, Jerusalem, Venice, and Yemenite codices

### Related Repositories

All content from these repositories has been consolidated into this one:

- [bible-codes/bible-codes.github.io](https://github.com/bible-codes/bible-codes.github.io) — This repository
- [roni762583/bible-data-science.github.io](https://github.com/roni762583/bible-data-science.github.io) — Legacy site (HTML tools, manuscript data, notebooks)
- [roni762583/torahcodes_fork](https://github.com/roni762583/torahcodes_fork) — Python ELS engine (integrated in `torah-codes/`)
- [roni762583/heb_wiki_words](https://github.com/roni762583/heb_wiki_words) — Hebrew word extraction script

### Attribution

The `torah-codes/` directory is a fork of the **TorahBibleCodes** project by [@TorahBibleCodes](https://github.com/TorahBibleCodes). The original project provides a Python-based ELS search engine for Hebrew biblical texts. Our fork adds multi-term proximity analysis, advanced visualization, and final-form normalization. Full credit to the original author for the core ELS search framework.

- **Original repository**: [TorahBibleCodes/TorahBibleCodes](https://github.com/TorahBibleCodes/TorahBibleCodes)
- **Website**: [TorahBibleCodes.com](https://TorahBibleCodes.com)
- **Documentation**: [torahbiblecodes-sphinx.readthedocs.io](https://torahbiblecodes-sphinx.readthedocs.io/)
- **Support the original developer**: [GiveSendGo](https://www.givesendgo.com/TorahBibleCodes)

### Libraries Used

- **D3.js**: Data visualization (tsirufim semantic space)
- **Three.js**: 3D matrix rendering (lazy-loaded from CDN)
- **Tesseract.js**: Hebrew OCR (loaded from CDN)
- **PDF.js**: PDF rendering for OCR (loaded from CDN)

---

## 13. Contact

- **Developer**: Aharon
- **Email**: roni762583@gmail.com
- **GitHub**: [bible-codes](https://github.com/bible-codes)
- **Issues**: [GitHub Issues](https://github.com/bible-codes/bible-codes.github.io/issues)

---

*Last Updated: February 13, 2026*
*Version: 4.0*
