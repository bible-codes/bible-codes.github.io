#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate visual matrix with זבידה vertical and אהרן displayed
Export as PNG/JPG image
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib import font_manager
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import necessary modules
import mod_2A_TextFileOpen_Koren
import mod_3A1_TextFilePreprocess_Koren_ExtractStrings
import mod_3A3_TextFilePreprocess_Koren_FixKeys
import mod_3A4_TextFilePreprocess_Koren_FixLines
import mod_3A5_TextFileParse_Koren
import mod_8A_DataObjectsCreate

print("\n=== Generating Matrix Image with Vertical זבידה ===\n")

# Load Genesis text
NumberOfTextChosen = 1  # Genesis
TextKoren = mod_2A_TextFileOpen_Koren.fn_TextFileOpen(NumberOfTextChosen)
ListOfTupleKeysToFix, ListOfWordsInLine = mod_3A1_TextFilePreprocess_Koren_ExtractStrings.fn_ExtractStrings(TextKoren)
ListOfTupleKeysForKoren = mod_3A3_TextFilePreprocess_Koren_FixKeys.fn_FixKeys(ListOfTupleKeysToFix)
DVK = mod_3A4_TextFilePreprocess_Koren_FixLines.fn_FixLines(ListOfTupleKeysForKoren, ListOfWordsInLine)
LW4AV, DVKH, DVKHS, VerseCountTotal, WordCountTotal, LetterCountTotal = mod_3A5_TextFileParse_Koren.fn_TextFileParse(DVK)

# Create data objects
D, DS = DVKH, DVKHS
S, L, DL, D5, DLO = mod_8A_DataObjectsCreate.fn_DataObjectsCreate(D)

print(f"Text loaded: {LetterCountTotal} letters total")

# Define our ELS patterns
zebidah_positions = [76839, 76930, 77021, 77112, 77203]  # זבידה
zebidah_letters = ['ז', 'ב', 'י', 'ד', 'ה']
aaron_positions = [77660, 77695, 77730, 77765]  # אהרן
aaron_letters = ['א', 'ה', 'ר', 'ן']

# Use זבידה's skip (91) as matrix width for vertical display
MATRIX_WIDTH = 91

# Calculate matrix dimensions
# Start before first זבידה letter and end after last אהרן letter
start_position = 76800  # Start a bit before first letter
end_position = 77800    # End after last letter
total_positions = end_position - start_position
MATRIX_HEIGHT = (total_positions // MATRIX_WIDTH) + 2

print(f"Matrix dimensions: {MATRIX_WIDTH} columns x {MATRIX_HEIGHT} rows")
print(f"Position range: {start_position} to {end_position}")

# Create the matrix
matrix = []
position_map = {}  # Track which positions contain which letters

for row in range(MATRIX_HEIGHT):
    row_data = []
    for col in range(MATRIX_WIDTH):
        pos = start_position + (row * MATRIX_WIDTH) + col
        if 0 <= pos - 1 < len(L):  # Convert to 0-based index
            letter = L[pos - 1]
        else:
            letter = ' '
        row_data.append(letter)
        position_map[(row, col)] = pos
    matrix.append(row_data)

# Find where our ELS letters appear in the matrix
zebidah_coords = []
for i, pos in enumerate(zebidah_positions):
    if start_position <= pos < end_position:
        matrix_pos = pos - start_position
        row = matrix_pos // MATRIX_WIDTH
        col = matrix_pos % MATRIX_WIDTH
        zebidah_coords.append((row, col, zebidah_letters[i]))

aaron_coords = []
for i, pos in enumerate(aaron_positions):
    if start_position <= pos < end_position:
        matrix_pos = pos - start_position
        row = matrix_pos // MATRIX_WIDTH
        col = matrix_pos % MATRIX_WIDTH
        aaron_coords.append((row, col, aaron_letters[i]))

print(f"\nזבידה appears at: {zebidah_coords}")
print(f"אהרן appears at: {aaron_coords}")

# Create the visualization
fig, ax = plt.subplots(figsize=(20, 12))

# Display settings
cell_size = 1
font_size = 8

# Draw the matrix grid
for row in range(min(MATRIX_HEIGHT, 15)):  # Show first 15 rows
    for col in range(min(MATRIX_WIDTH, 91)):  # Show all columns
        # Get the letter at this position
        letter = matrix[row][col] if row < len(matrix) and col < len(matrix[row]) else ' '

        # Check if this is a special letter
        is_zebidah = any(r == row and c == col for r, c, _ in zebidah_coords)
        is_aaron = any(r == row and c == col for r, c, _ in aaron_coords)

        # Set colors based on ELS membership
        if is_zebidah:
            bg_color = 'lightblue'
            text_color = 'darkblue'
            weight = 'bold'
            size = font_size + 2
        elif is_aaron:
            bg_color = 'lightcoral'
            text_color = 'darkred'
            weight = 'bold'
            size = font_size + 2
        else:
            bg_color = 'white'
            text_color = 'gray'
            weight = 'normal'
            size = font_size

        # Draw cell background
        rect = patches.Rectangle((col, MATRIX_HEIGHT - row - 1), 1, 1,
                                  linewidth=0.5, edgecolor='lightgray',
                                  facecolor=bg_color)
        ax.add_patch(rect)

        # Add letter text
        if letter != ' ':
            ax.text(col + 0.5, MATRIX_HEIGHT - row - 0.5, letter,
                   ha='center', va='center', fontsize=size,
                   color=text_color, weight=weight)

# Add grid lines for better visibility
ax.set_xlim(0, min(MATRIX_WIDTH, 91))
ax.set_ylim(0, min(MATRIX_HEIGHT, 15))
ax.set_aspect('equal')

# Remove ticks
ax.set_xticks([])
ax.set_yticks([])

# Add title and legend
plt.title('ELS Matrix: זבידה (Vertical) and אהרן in Genesis 50\nMatrix Width = 91 (זבידה skip distance)',
          fontsize=16, fontweight='bold', pad=20)

# Add legend
from matplotlib.lines import Line2D
legend_elements = [
    Line2D([0], [0], marker='s', color='w', label='זבידה (Zebidah)',
           markerfacecolor='lightblue', markersize=15),
    Line2D([0], [0], marker='s', color='w', label='אהרן (Aaron)',
           markerfacecolor='lightcoral', markersize=15)
]
ax.legend(handles=legend_elements, loc='upper right', fontsize=12)

# Add position annotations
ax.text(0.02, 0.98, f'Start Position: {start_position}',
        transform=ax.transAxes, fontsize=10, va='top')
ax.text(0.02, 0.94, f'Matrix Width: {MATRIX_WIDTH}',
        transform=ax.transAxes, fontsize=10, va='top')

# Highlight the vertical alignment of זבידה
if zebidah_coords:
    col_num = zebidah_coords[0][1]  # Get column of first letter
    ax.axvline(x=col_num + 0.5, color='blue', alpha=0.3, linewidth=2)
    ax.text(col_num + 0.5, -0.5, f'Column {col_num}\n(זבידה)',
            ha='center', fontsize=10, color='blue')

plt.tight_layout()

# Save as PNG and JPG
png_path = 'USER_GENERATED_FILES/matrix_zebidah_aaron.png'
jpg_path = 'USER_GENERATED_FILES/matrix_zebidah_aaron.jpg'

plt.savefig(png_path, dpi=150, bbox_inches='tight')
plt.savefig(jpg_path, dpi=150, bbox_inches='tight', format='jpg')

print(f"\nImages saved:")
print(f"  PNG: {png_path}")
print(f"  JPG: {jpg_path}")

# Also create a text representation
print("\n" + "="*80)
print("MATRIX ANALYSIS (Width = 91)")
print("="*80)
print("\nזבידה positions in matrix:")
for row, col, letter in zebidah_coords:
    print(f"  {letter} at Row {row}, Column {col}")

print("\nאהרן positions in matrix:")
for row, col, letter in aaron_coords:
    print(f"  {letter} at Row {row}, Column {col}")

# Check if זבידה forms a vertical line
if len(zebidah_coords) > 1:
    columns = [col for _, col, _ in zebidah_coords]
    if len(set(columns)) == 1:
        print(f"\n✓ זבידה forms a PERFECT VERTICAL line in column {columns[0]}!")
    else:
        print(f"\nזבידה appears in columns: {columns}")

# Calculate אהרן pattern
if len(aaron_coords) > 1:
    print(f"\nאהרן pattern analysis:")
    for i in range(len(aaron_coords)-1):
        row1, col1, _ = aaron_coords[i]
        row2, col2, _ = aaron_coords[i+1]
        row_diff = row2 - row1
        col_diff = col2 - col1
        print(f"  Letter {i+1} to {i+2}: Row +{row_diff}, Col +{col_diff}")

print("\n" + "="*80)
print("Matrix visualization complete!")
print("="*80)