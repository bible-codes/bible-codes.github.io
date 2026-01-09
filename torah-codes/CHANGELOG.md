# CHANGELOG - Torah Bible Codes Fork

## [Fork v1.0.0] - 2024-09-26

### Added

#### New Scripts
- **`els_proximity_analyzer.py`** - Multi-term ELS proximity analysis engine
  - Accepts unlimited Hebrew search terms
  - Calculates proximity scores using three metrics
  - Exports detailed reports and CSV data
  - Generates text-based matrix visualizations

- **`els_proximity_visualizer.py`** - Visual analysis with matplotlib
  - Creates matrix images with colored ELS highlights
  - Generates proximity heatmaps for term relationships
  - Produces skip distribution statistical plots
  - Exports high-quality PNG images

- **`simple_matrix_view.py`** - Specific pattern intersection viewer
  - Shows זבידה and אהרן intersection in Genesis 50
  - Displays 2D matrix with position markers
  - Calculates visual crossing points

- **`matrix_visualization.py`** - Enhanced matrix display capabilities
- **`matrix_image_generator.py`** - Image generation utilities
- **`search_zebidah.py`** - Specific search implementation

### Enhanced Features

#### Final Form Normalization
- Automatic conversion of Hebrew final forms to regular letters:
  - ם → מ (mem sofit to mem)
  - ן → נ (nun sofit to nun)
  - ץ → צ (tzadi sofit to tzadi)
  - ף → פ (peh sofit to peh)
  - ך → כ (kaf sofit to kaf)
- Enables more comprehensive ELS searches
- Finds patterns that would be missed with strict letter matching

#### Proximity Analysis Algorithm
- **Minimum Distance Calculation**: Finds closest points between patterns
- **Range Overlap Detection**: Identifies shared text regions
- **Skip Similarity Scoring**: Compares skip values for pattern alignment
- **Composite Scoring**: Combines metrics for ranking matches

#### Visualization Capabilities
- Hebrew text matrix with highlighted ELS patterns
- Color-coded pattern identification
- Connection line visualizations showing skip paths
- Statistical distribution plots
- Proximity relationship heatmaps

### Output Enhancements

#### New File Formats
- **Text Reports** (`ELS_Proximity_Report_*.txt`)
  - Detailed proximity analysis
  - Verse context for matches
  - Statistical summaries

- **Data Exports** (`ELS_Proximity_Data_*.csv`)
  - Complete match data
  - Proximity scores
  - Position information

- **Visual Outputs** (`ELS_Matrix_*.png`, `ELS_Heatmap_*.png`)
  - High-resolution images
  - Multiple visualization types
  - Statistical plots

### Improved Functionality

#### Search Capabilities
- Multi-term simultaneous searching
- Configurable skip distance ranges
- Batch processing support
- Progress tracking for long searches

#### User Interface
- Interactive command-line prompts
- Clear input validation
- Helpful error messages
- Automatic output organization

### Code Quality Improvements
- Modular design with reusable functions
- Comprehensive documentation
- Type hints for better code clarity
- Error handling and validation

### Documentation
- New `README.md` with complete usage instructions
- `CHANGELOG.md` for version tracking
- Updated `CLAUDE.md` with new commands
- Inline code documentation

## Technical Details

### Dependencies Added
- Enhanced matplotlib usage for visualizations
- NumPy array operations for matrix handling
- Pandas DataFrame operations for data export

### File Organization
- All outputs organized in `USER_GENERATED_FILES/`
- Consistent naming conventions
- Automatic directory creation

### Performance Optimizations
- Efficient string operations for Hebrew text
- Optimized search algorithms
- Memory-efficient matrix representations

## Bug Fixes
- Improved Hebrew text handling
- Better UTF-8 encoding support
- Fixed matrix boundary conditions

## Testing
- Tested with Genesis text (78,064 letters)
- Verified with multiple Hebrew search terms
- Validated proximity calculations
- Confirmed visualization outputs

## Examples of New Capabilities

### Proximity Search Results
- Found זבידה at position 76839 with skip -91
- Found אהרן at position 77660 with skip 35
- Identified intersection in Genesis Chapter 50
- Calculated proximity of 821 letters

### Visual Analysis
- Generated matrix showing both patterns
- Created heatmap of term relationships
- Produced skip distribution analysis
- Exported all results to organized files

## Migration Notes

### From Original Version
- Fully backward compatible with original `p.py`
- Existing CSV files can be used with new scripts
- No changes required to existing workflows
- New features are additive, not replacements

### Usage Recommendations
1. Run `p.py` first to generate base data
2. Use `els_proximity_analyzer.py` for text analysis
3. Use `els_proximity_visualizer.py` for visual outputs
4. Review results in `USER_GENERATED_FILES/`

---

*This fork maintains full compatibility with the original TorahBibleCodes project while adding significant new analysis and visualization capabilities.*