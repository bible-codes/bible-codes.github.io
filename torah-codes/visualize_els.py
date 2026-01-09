#!/usr/bin/env python3
"""
Simple ELS Visualization Script
Creates a visual representation of ELS matches in the text matrix.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
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
        
        return np.array(matrix)
    except Exception as e:
        print(f"Error loading matrix: {e}")
        return None

def load_els_matches(els_files_pattern):
    """Load ELS match positions from CSV files."""
    matches = []
    files = glob.glob(els_files_pattern)
    
    for file in files[:5]:  # Limit to first 5 matches for visualization
        try:
            df = pd.read_csv(file)
            if 'n' in df.columns:  # Position column
                positions = df['n'].tolist()
                matches.extend(positions)
        except Exception as e:
            print(f"Error loading {file}: {e}")
            continue
    
    return matches

def create_simple_visualization(matrix, matches, output_file="els_visualization.png", width=20):
    """Create a simple matrix visualization highlighting ELS matches."""
    if matrix is None:
        print("No matrix data available")
        return
    
    height = len(matrix)
    
    # Create binary matrix for highlighting
    highlight_matrix = np.zeros((height, width))
    
    # Mark ELS positions (convert 1-based to 0-based indexing)
    for pos in matches:
        if pos > 0:
            row = (pos - 1) // width
            col = (pos - 1) % width
            if row < height and col < width:
                highlight_matrix[row, col] = 1
    
    # Create figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))
    
    # Plot 1: Hebrew text matrix (showing first 50 rows for readability)
    display_rows = min(50, height)
    text_matrix = matrix[:display_rows, :]
    
    ax1.set_xlim(0, width)
    ax1.set_ylim(0, display_rows)
    ax1.set_aspect('equal')
    ax1.invert_yaxis()
    
    for i in range(display_rows):
        for j in range(width):
            if i < len(text_matrix) and j < len(text_matrix[i]):
                ax1.text(j+0.5, i+0.5, text_matrix[i][j], 
                        ha='center', va='center', fontsize=8, 
                        bbox=dict(boxstyle="round,pad=0.1", 
                                facecolor='yellow' if highlight_matrix[i, j] == 1 else 'white',
                                alpha=0.7))
    
    ax1.set_title('Hebrew Text Matrix with ELS Highlights (First 50 rows)', fontsize=14)
    ax1.set_xlabel('Column')
    ax1.set_ylabel('Row')
    
    # Plot 2: Pattern visualization (full matrix)
    cmap = ListedColormap(['lightgray', 'red'])
    im = ax2.imshow(highlight_matrix, cmap=cmap, aspect='auto')
    ax2.set_title(f'ELS Pattern Visualization\n({height} rows × {width} columns)', fontsize=14)
    ax2.set_xlabel('Column')
    ax2.set_ylabel('Row')
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=ax2)
    cbar.set_label('ELS Match')
    cbar.set_ticks([0, 1])
    cbar.set_ticklabels(['No Match', 'ELS Match'])
    
    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"Visualization saved as: {output_file}")
    return fig

def main():
    """Main function to create ELS visualization."""
    print("Creating ELS Visualization...")
    
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
    
    # Create visualization
    print("Creating visualization...")
    fig = create_simple_visualization(matrix, matches)
    
    if fig:
        print("✓ ELS visualization completed!")
        print("Red dots show positions where ELS matches occur")
        print("Yellow highlights in text matrix show ELS letter positions")
    
if __name__ == "__main__":
    main()