#!/usr/bin/env python3
"""
Simple Text-based ELS Visualization Script
Creates a simple text representation of ELS matches without requiring matplotlib.
"""

import pandas as pd
import numpy as np
import glob
import os

def load_matrix_csv(matrix_file):
    """Load the 2D matrix CSV file and extract Hebrew letters."""
    try:
        with open(matrix_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        matrix = []
        for line in lines:
            # Split by semicolon and extract Hebrew letters (skip coordinate info)
            parts = line.strip().split(';')
            if len(parts) > 20:  # Skip coordinate columns
                hebrew_letters = parts[1:21]  # Extract 20 Hebrew letters
                matrix.append(hebrew_letters)
        
        return matrix
    except Exception as e:
        print(f"Error loading matrix: {e}")
        return None

def load_els_matches(els_files_pattern):
    """Load ELS match positions from CSV files."""
    matches = []
    files = glob.glob(els_files_pattern)
    
    print(f"Found {len(files)} ELS match files")
    
    for file in files[:10]:  # Limit to first 10 matches for visualization
        try:
            df = pd.read_csv(file)
            if 'n' in df.columns:  # Position column
                positions = df['n'].tolist()
                matches.extend(positions)
                print(f"Loaded {len(positions)} positions from {os.path.basename(file)}")
        except Exception as e:
            print(f"Error loading {file}: {e}")
            continue
    
    return matches

def create_simple_text_visualization(matrix, matches, output_file="els_visualization.txt", width=20):
    """Create a simple text-based visualization highlighting ELS matches."""
    if matrix is None:
        print("No matrix data available")
        return
    
    height = len(matrix)
    print(f"Matrix size: {height} rows × {width} columns")
    print(f"Total ELS match positions: {len(matches)}")
    
    # Create set for faster lookup
    match_positions = set(matches)
    
    # Create visualization (show first 30 rows for readability)
    display_rows = min(30, height)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("ELS VISUALIZATION - Torah Bible Codes\n")
        f.write("=" * 60 + "\n")
        f.write(f"Search term: משיח (Messiah)\n")
        f.write(f"Text: Genesis (Koren Codex)\n")
        f.write(f"Matrix: {height} rows × {width} columns\n")
        f.write(f"ELS matches found: {len(matches)}\n")
        f.write(f"Showing first {display_rows} rows\n")
        f.write("=" * 60 + "\n\n")
        
        # Column headers
        f.write("Row  ")
        for j in range(width):
            f.write(f"{j+1:2d}")
        f.write("\n")
        f.write("     " + "--" * width + "\n")
        
        # Matrix content
        for i in range(display_rows):
            f.write(f"{i+1:3d}: ")
            for j in range(width):
                if i < len(matrix) and j < len(matrix[i]):
                    pos = i * width + j + 1
                    letter = matrix[i][j]
                    if pos in match_positions:
                        f.write(f"[{letter}]")  # Highlight ELS positions with brackets
                    else:
                        f.write(f" {letter} ")
                else:
                    f.write(" . ")
            
            # Show positions with matches in this row
            row_matches = []
            for j in range(width):
                pos = i * width + j + 1
                if pos in match_positions:
                    row_matches.append(f"pos{pos}")
            
            if row_matches:
                f.write(f"  <-- ELS matches: {', '.join(row_matches)}")
            
            f.write("\n")
        
        f.write("\n" + "=" * 60 + "\n")
        f.write("LEGEND:\n")
        f.write("[letter] = ELS match position\n")
        f.write(" letter  = regular text\n")
        f.write("=" * 60 + "\n")
        
        # Summary statistics
        f.write(f"\nSUMMARY:\n")
        f.write(f"Total positions analyzed: {height * width}\n")
        f.write(f"ELS matches found: {len(matches)}\n")
        f.write(f"Match density: {len(matches)/(height*width)*100:.4f}%\n")
        
        # List all match positions
        f.write(f"\nALL ELS MATCH POSITIONS:\n")
        sorted_matches = sorted(matches)
        for i, pos in enumerate(sorted_matches):
            if i % 10 == 0:
                f.write("\n")
            f.write(f"{pos:6d} ")
        f.write("\n")
    
    print(f"Text visualization saved as: {output_file}")

def create_pattern_grid(matches, width=20, height=100):
    """Create a simple pattern grid showing ELS distribution."""
    print("\nELS PATTERN VISUALIZATION (First 100 rows):")
    print("█ = ELS match, ░ = no match")
    print("-" * (width + 5))
    
    match_positions = set(matches)
    
    for i in range(height):
        print(f"{i+1:3d}: ", end="")
        for j in range(width):
            pos = i * width + j + 1
            if pos in match_positions:
                print("█", end="")
            else:
                print("░", end="")
        print()
    print("-" * (width + 5))

def main():
    """Main function to create ELS visualization."""
    print("Creating ELS Text-based Visualization...")
    
    # File paths
    matrix_file = "USER_GENERATED_FILES/USER_FILE_Matrix2D_Koren_1Genesis_20x3904.csv"
    els_pattern = "USER_GENERATED_FILES/USER_FILE_WordsOfELSs_POSITIVE_ELS1_*.csv"
    
    # Check if files exist
    if not os.path.exists(matrix_file):
        print(f"Matrix file not found: {matrix_file}")
        return
    
    # Load data
    print("Loading matrix data...")
    matrix = load_matrix_csv(matrix_file)
    
    print("Loading ELS matches...")
    matches = load_els_matches(els_pattern)
    print(f"Found {len(matches)} ELS match positions")
    
    if len(matches) == 0:
        print("No ELS matches found to visualize")
        return
    
    # Create visualizations
    print("Creating text visualization...")
    create_simple_text_visualization(matrix, matches)
    
    print("Creating pattern grid...")
    create_pattern_grid(matches)
    
    print("✓ ELS visualization completed!")
    print("Check 'els_visualization.txt' for detailed results")
    
if __name__ == "__main__":
    main()