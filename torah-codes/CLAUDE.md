# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Running the Application
- `python p.py` - Main interactive ELS search application
- `python -m ipython` then `%run p.py` - Run in IPython for interactive development
- `./run-docker.sh` - Build and run containerized version
- `docker-compose build` - Build Docker image
- `docker-compose run --rm torahbiblecodes` - Run container interactively

### Visualization Tools
- `python visualize_els.py` - Create visual representations with matplotlib
- `python simple_visualize.py` - Text-based visualization without matplotlib
- `python simple_matrix_view.py` - View 2D matrix intersections of specific ELS patterns

### Multi-Term Proximity Analysis Tools (NEW)
- `python els_proximity_analyzer.py` - Find proximity overlaps between multiple search terms
  - Accepts multiple Hebrew search terms (first term is main)
  - Normalizes final forms: מ=ם, נ=ן, צ=ץ, פ=ף, כ=ך
  - Generates text reports, CSV data, and matrix visualizations
- `python els_proximity_visualizer.py` - Create visual images of ELS proximities
  - Generates matplotlib-based visualizations
  - Creates matrix images, proximity heatmaps, and skip distribution plots
  - Outputs PNG images to USER_GENERATED_FILES/

### Dependencies
- `pip install -r requirements.txt` - Install numpy, pandas, ipython, tqdm, matplotlib

## High-Level Architecture

The Torah Codes project implements Equidistant Letter Sequences (ELS) search in Hebrew biblical texts using the mathematical formula: n, (n + d), (n + 2d), (n + 3d)... (n + (k-1)d) where n is start position, d is skip distance, and k is search term length.

### Core Classes
- **cls_GlobalSearchObject** - Master container managing all search data, parameters, and text selections
- **cls_ELSObject** - Represents individual ELS search terms with match tracking
- **cls_LetterObject** - Individual Hebrew letters with position, gematria values, and context

### Module Organization
The codebase consists of 80+ modules following the naming convention `mod_##_FunctionDescription.py` that form a sequential processing pipeline:
1. Text selection and codex choice (Koren, Leningrad, MAM)
2. Text preprocessing from JSON/CSV/TXT sources
3. ELS term input with gematria calculation
4. Matrix generation and search algorithm execution
5. Results export to CSV with detailed position data

### Key Data Structures
- Dictionaries with tuple keys for multi-dimensional indexing: `{(book, chapter, verse, word, letter): value}`
- Pandas Series for letter sequences and statistical analysis
- Mixed 0-based and 1-based indexing depending on context
- Letter positions tracked in both absolute text position and verse/word/letter coordinates

### Hebrew Text Processing
- Three manuscript traditions supported (Koren, Leningrad, MAM/Aleppo)
- Gematria values: א=1, ב=2, ג=3... with sofit forms having distinct values
- UTF-8 encoding throughout
- Space handling for multi-word search terms

### File Organization
- `/texts/` - Source biblical texts in different formats per codex
- `/USER_GENERATED_FILES/` - Output directory for search results, matrices, and statistics
- Root directory contains all Python modules and main application

## Important Implementation Details

### Performance Considerations
- Torah contains 304,850 letters; full Hebrew Bible has 1,197,042 letters
- Memory-intensive matrix operations for large skip distances
- Progress tracking with tqdm for long searches
- Docker recommended for consistent environment

### Output Files
The application generates multiple CSV files per search:
- ELS match positions with verse context
- 2D matrix representations
- Letter frequency statistics
- Gematria calculations for terms and text

### Search Algorithm
ELS searches support:
- Custom skip distances with min/max constraints
- Bidirectional search (positive and negative d)
- Batch processing via CSV input files
- Multiple text combinations (e.g., Samuel I+II as one book)