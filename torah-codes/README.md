# Torah Bible Codes - Enhanced Fork

An enhanced version of the Torah Bible Codes ELS (Equidistant Letter Sequences) search software with advanced proximity analysis and visualization capabilities.

## 🔴🟡🟢 Fork Enhancements

This fork adds significant new features to the original TorahBibleCodes project:

### New Features

#### 1. **Multi-Term Proximity Analysis** (`els_proximity_analyzer.py`)
- Search for multiple Hebrew terms simultaneously
- Find locations of maximal proximity overlap between terms
- Identify similar skip values across different ELS patterns
- Calculate proximity scores based on:
  - Minimum distance between patterns
  - Range overlap
  - Skip value similarity

#### 2. **Advanced Visualizations** (`els_proximity_visualizer.py`)
- Generate matplotlib-based visual analysis
- Create matrix images showing Hebrew letters with ELS highlights
- Produce proximity heatmaps for term comparisons
- Generate skip distribution statistical plots
- Export high-quality PNG images

#### 3. **Final Form Normalization**
- Automatically treats Hebrew final forms as regular letters:
  - מ = ם (mem sofit → mem)
  - נ = ן (nun sofit → nun)
  - צ = ץ (tzadi sofit → tzadi)
  - פ = ף (peh sofit → peh)
  - כ = ך (kaf sofit → kaf)

#### 4. **Matrix Intersection Viewer** (`simple_matrix_view.py`)
- Visualize specific ELS pattern intersections
- Show 2D matrix representations of text
- Identify visual crossing points between terms

#### 5. **Enhanced Search Results**
- Detailed CSV exports with all match positions
- Comprehensive text reports with verse context
- Statistical analysis of skip distributions
- Batch processing capabilities

## Installation

### Prerequisites
- Python 3.8 or higher
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/torah-codes.git
cd torah-codes
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Required packages:
- numpy
- pandas
- matplotlib
- tqdm
- ipython

## Usage

### Main ELS Search Application
```bash
python p.py
```
Interactive application for searching ELS patterns in biblical texts.

### Multi-Term Proximity Analysis

#### Text-based Analysis
```bash
python els_proximity_analyzer.py
```

**Features:**
- Enter multiple Hebrew search terms
- First term is treated as the main term for proximity analysis
- Generates:
  - Detailed proximity report (`.txt`)
  - CSV data file with all matches
  - Text-based matrix visualization

**Example Session:**
```
Enter search terms (Hebrew):
Term 1: אהרן
Term 2: משה
Term 3: ישראל
Enter 'done' when finished.

Minimum skip (default 1): 1
Maximum skip (default 1000): 500
```

#### Visual Analysis with Images
```bash
python els_proximity_visualizer.py
```

**Generates:**
- Matrix visualization with colored ELS patterns
- Proximity heatmap showing relationships between all terms
- Skip distribution plots for statistical analysis
- All images saved to `USER_GENERATED_FILES/`

### Simple Visualization Tools

#### Text-based ELS Visualization
```bash
python simple_visualize.py
```

#### Matrix Intersection Viewer
```bash
python simple_matrix_view.py
```
Shows specific intersections (e.g., זבידה and אהרן in Genesis 50)

## Output Files

All results are saved to `USER_GENERATED_FILES/` directory:

### From Proximity Analyzer:
- `ELS_Proximity_Report_[term].txt` - Detailed text report
- `ELS_Proximity_Data_[term].csv` - CSV with all proximity data
- `ELS_Matrix_Viz_[term].txt` - Text matrix visualization

### From Proximity Visualizer:
- `ELS_Matrix_[term].png` - Visual matrix with Hebrew letters
- `ELS_Heatmap_[term].png` - Proximity relationship heatmap
- `ELS_SkipDist_[term].png` - Skip distribution analysis

## Project Structure

```
torah-codes/
├── p.py                          # Main ELS search application
├── els_proximity_analyzer.py     # Multi-term proximity analysis (NEW)
├── els_proximity_visualizer.py   # Visual proximity analysis (NEW)
├── simple_matrix_view.py         # Matrix intersection viewer (NEW)
├── visualize_els.py             # Basic ELS visualization
├── simple_visualize.py          # Text-based visualization
├── texts/                       # Biblical text sources
├── USER_GENERATED_FILES/        # Output directory
└── mod_*.py                     # Module files (80+ modules)
```

## Algorithm

The ELS search uses the mathematical formula:
```
n, (n + d), (n + 2d), (n + 3d)... (n + (k-1)d)
```
Where:
- `n` = starting position
- `d` = skip distance (positive or negative)
- `k` = length of search term

## Supported Texts

### Codices (Manuscript Collections):
1. **Koren** - Koren Publishers Jerusalem edition
2. **Leningrad** - Leningrad Codex (oldest complete Hebrew Bible)
3. **MAM** - Miqra According to Masorah (based on Aleppo Codex)

### Biblical Books:
Complete Hebrew Bible (Tanakh) including:
- Torah (5 books)
- Nevi'im/Prophets (21 books)
- Ketuvim/Writings (13 books)

## Changes from Original

### Major Enhancements:
1. **New Scripts Added:**
   - `els_proximity_analyzer.py` - Complete proximity analysis system
   - `els_proximity_visualizer.py` - matplotlib-based visualizations
   - `simple_matrix_view.py` - Specific pattern intersection viewer

2. **Algorithm Improvements:**
   - Final form normalization for more comprehensive searches
   - Multi-term simultaneous search capability
   - Proximity scoring algorithm
   - Skip value similarity detection

3. **Output Enhancements:**
   - Visual matrix images with Hebrew text
   - Statistical distribution plots
   - Comprehensive CSV exports
   - Detailed proximity reports with verse context

4. **User Experience:**
   - Interactive command-line interfaces
   - Progress tracking for long searches
   - Automatic output organization
   - Clear documentation and examples

## Examples

### Finding Name Proximities in Genesis
The fork successfully identified meaningful proximities between biblical names:
- זבידה (Zebidah) and אהרן (Aaron) intersect in Genesis 50
- Patterns separated by only 821 letters
- Visual matrix shows crossing patterns near Jacob's death narrative

### Statistical Analysis
- Automatic skip distribution analysis
- Frequency plots for positive and negative skips
- Proximity heatmaps for multiple term comparisons

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## Original Project

Original Torah Bible Codes by @TorahBibleCodes:
- GitHub: https://github.com/TorahBibleCodes/TorahBibleCodes
- Website: https://TorahBibleCodes.com
- Documentation: https://torahbiblecodes-sphinx.readthedocs.io/

## License

This project maintains the same license as the original TorahBibleCodes project.

## Support

Support the original developer:
- GiveSendGo: https://www.givesendgo.com/TorahBibleCodes

---

*Note: This fork focuses on enhanced proximity analysis and visualization capabilities while maintaining full compatibility with the original ELS search functionality.*