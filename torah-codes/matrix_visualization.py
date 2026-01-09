#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2D Matrix visualization for ELS terms in Genesis 50
Shows זבידה and אהרן patterns
"""

import numpy as np
import pandas as pd
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

print("\n=== 2D Matrix Visualization for Genesis 50 ELS Patterns ===\n")

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

def create_matrix_around_position(letters_list, center_pos, matrix_width=50, matrix_height=20):
    """
    Create a 2D matrix centered around a specific position
    """
    # Calculate starting position to center our target
    start_pos = max(0, center_pos - (matrix_width * matrix_height // 2))

    # Create the matrix
    matrix = []
    for row in range(matrix_height):
        row_letters = []
        for col in range(matrix_width):
            pos = start_pos + (row * matrix_width) + col
            if pos < len(letters_list):
                row_letters.append(letters_list[pos])
            else:
                row_letters.append(' ')
        matrix.append(row_letters)

    return matrix, start_pos

def mark_els_in_matrix(matrix, start_pos, els_position, skip, length, matrix_width, marker='*'):
    """
    Mark ELS pattern in the matrix
    Returns matrix with markers and list of marked positions
    """
    marked_positions = []
    marked_matrix = [row[:] for row in matrix]  # Deep copy

    for i in range(length):
        actual_pos = els_position + (i * skip)
        matrix_pos = actual_pos - start_pos

        if 0 <= matrix_pos < len(matrix) * matrix_width:
            row = matrix_pos // matrix_width
            col = matrix_pos % matrix_width
            if 0 <= row < len(matrix):
                # Store original letter with marker
                marked_positions.append((row, col, matrix[row][col]))

    return marked_matrix, marked_positions

# Focus on Genesis 50 area (around position 76000-78000)
genesis_50_start = 76000
genesis_50_end = 78064

# Create matrix for the Genesis 50 region
matrix_width = 35  # Matches אהרן skip distance
matrix_height = 60  # Enough rows to show patterns

# Center around אהרן position 77660 (Genesis 50:19)
center_position = 77660
matrix, start_pos = create_matrix_around_position(L, center_position, matrix_width, matrix_height)

print(f"\nMatrix centered around position {center_position} (Genesis 50:19)")
print(f"Matrix dimensions: {matrix_width} x {matrix_height}")
print(f"Starting position: {start_pos}")
print(f"Ending position: {start_pos + matrix_width * matrix_height}")

# Mark זבידה (position 76839, skip 91, length 5)
zebidah_matrix, zebidah_marks = mark_els_in_matrix(
    matrix, start_pos, 76839, 91, 5, matrix_width
)

# Mark אהרן (position 77660, skip 35, length 4)
aaron_matrix, aaron_marks = mark_els_in_matrix(
    matrix, start_pos, 77660, 35, 4, matrix_width
)

# Create visualization
print("\n" + "="*80)
print("2D MATRIX VISUALIZATION - Genesis 50 Region")
print("="*80)
print("Legend: [Z] = זבידה letters, [A] = אהרן letters, [X] = overlapping")
print("="*80 + "\n")

# Print column numbers
print("    ", end="")
for col in range(min(matrix_width, 35)):
    print(f"{col:3}", end="")
print("\n    " + "-" * (min(matrix_width, 35) * 3))

# Display matrix with highlights
for row_idx, row in enumerate(matrix[:30]):  # Show first 30 rows for clarity
    print(f"{row_idx:3}|", end="")
    for col_idx in range(min(len(row), 35)):
        letter = row[col_idx]

        # Check if this position is marked
        is_zebidah = any(r == row_idx and c == col_idx for r, c, _ in zebidah_marks)
        is_aaron = any(r == row_idx and c == col_idx for r, c, _ in aaron_marks)

        if is_zebidah and is_aaron:
            print(f"[X]", end="")
        elif is_zebidah:
            print(f"[Z]", end="")
        elif is_aaron:
            print(f"[A]", end="")
        else:
            print(f" {letter} ", end="")
    print()

print("\n" + "="*80)

# Show the actual ELS words found
print("\nELS PATTERNS FOUND:")
print("-" * 40)

# זבידה pattern
print("\nזבידה (Zebidah) - Position 76839, Skip 91:")
zebidah_letters = []
for i in range(5):
    pos = 76839 + (i * 91)
    if pos < len(L):
        zebidah_letters.append(L[pos])
print("Letters found: " + " -> ".join(zebidah_letters))
print("Forms: " + "".join(zebidah_letters))

# אהרן pattern at position 77660
print("\nאהרן (Aaron) - Position 77660, Skip 35:")
aaron_letters = []
for i in range(4):
    pos = 77660 + (i * 35)
    if pos < len(L):
        aaron_letters.append(L[pos])
print("Letters found: " + " -> ".join(aaron_letters))
print("Forms: " + "".join(aaron_letters))

# Calculate proximity
distance = abs(77660 - 76839)
print(f"\nProximity: The patterns are {distance} letters apart")
print(f"Both patterns appear in Genesis chapter 50")

# Export matrix to CSV for further analysis
print("\n" + "="*80)
print("Exporting matrix to CSV file...")

# Create DataFrame for export
df_matrix = pd.DataFrame(matrix[:30])
df_matrix.columns = [f"Col_{i}" for i in range(matrix_width)]

# Add markers for ELS patterns
marks_data = []
for r, c, letter in zebidah_marks:
    if r < 30:
        marks_data.append({'Row': r, 'Col': c, 'Letter': letter, 'Pattern': 'זבידה'})
for r, c, letter in aaron_marks:
    if r < 30:
        marks_data.append({'Row': r, 'Col': c, 'Letter': letter, 'Pattern': 'אהרן'})

df_marks = pd.DataFrame(marks_data)

# Save to files
df_matrix.to_csv('USER_GENERATED_FILES/Matrix_Genesis50_Display.csv', index=True, encoding='utf-8')
df_marks.to_csv('USER_GENERATED_FILES/Matrix_Genesis50_ELS_Marks.csv', index=False, encoding='utf-8')

print("Matrix exported to: USER_GENERATED_FILES/Matrix_Genesis50_Display.csv")
print("ELS marks exported to: USER_GENERATED_FILES/Matrix_Genesis50_ELS_Marks.csv")

print("\n=== Visualization Complete ===")