#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ELS Proximity Analyzer - Multi-term ELS search with proximity and skip analysis
Finds locations of maximal proximity overlap and closest skip values
Treats final forms as regular: מ=ם, נ=ן, צ=ץ, פ=ף, כ=ך
"""

import os
import sys
import pandas as pd
import numpy as np
from collections import defaultdict
import csv
from typing import List, Dict, Tuple, Set
import glob

def normalize_hebrew_text(text):
    """Normalize Hebrew text by treating final forms as regular letters"""
    replacements = {
        'ם': 'מ',  # mem sofit -> mem
        'ן': 'נ',  # nun sofit -> nun
        'ץ': 'צ',  # tzadi sofit -> tzadi
        'ף': 'פ',  # peh sofit -> peh
        'ך': 'כ'   # kaf sofit -> kaf
    }

    normalized = text
    for final, regular in replacements.items():
        normalized = normalized.replace(final, regular)
    return normalized

def load_text_from_csv():
    """Load Hebrew text from existing Genesis CSV file"""
    csv_path = "USER_GENERATED_FILES/USER_FILE_WordsInSelectedBiblicalTexts_WordPositions_LetterPositions_GematriaValues_Koren_1Genesis_20x3904.csv"

    if not os.path.exists(csv_path):
        print(f"Error: Cannot find {csv_path}")
        print("Please run the main ELS search program first to generate the text file.")
        sys.exit(1)

    letters = []
    positions = {}

    with open(csv_path, 'r', encoding='utf-8') as f:
        # Skip header
        header = f.readline()

        for line in f:
            if not line.strip():
                continue

            # Parse the line
            parts = line.strip().split(';')
            if len(parts) >= 2:
                # Extract the Hebrew word
                hebrew_word = parts[1]

                # Add each letter to our list
                for letter in hebrew_word:
                    if letter and letter.strip():  # Skip empty characters
                        letters.append(letter)
                        pos = len(letters) - 1

                        # Parse coordinates if available
                        if parts[0]:
                            coords = parts[0].strip('()').split(', ')
                            if len(coords) >= 5:
                                positions[pos] = {
                                    'book': coords[0],
                                    'chapter': coords[1],
                                    'verse': coords[2],
                                    'word': coords[3],
                                    'letter': letter
                                }

    # Join and normalize the text
    text = ''.join(letters)
    normalized_text = normalize_hebrew_text(text)

    return text, normalized_text, positions

def find_els_occurrences(text, search_term, min_skip=1, max_skip=None):
    """Find all ELS occurrences of a search term"""
    if max_skip is None:
        max_skip = len(text) // len(search_term)

    occurrences = []
    term_len = len(search_term)

    # Positive skips
    for skip in range(min_skip, min(max_skip + 1, len(text) // term_len)):
        for start in range(len(text) - (term_len - 1) * skip):
            match = True
            positions = []
            for i in range(term_len):
                pos = start + i * skip
                if text[pos] != search_term[i]:
                    match = False
                    break
                positions.append(pos)

            if match:
                occurrences.append({
                    'term': search_term,
                    'start': start,
                    'skip': skip,
                    'positions': positions,
                    'end': positions[-1]
                })

    # Negative skips
    for skip in range(min_skip, min(max_skip + 1, len(text) // term_len)):
        for start in range((term_len - 1) * skip, len(text)):
            match = True
            positions = []
            for i in range(term_len):
                pos = start - i * skip
                if text[pos] != search_term[i]:
                    match = False
                    break
                positions.append(pos)

            if match:
                occurrences.append({
                    'term': search_term,
                    'start': start,
                    'skip': -skip,
                    'positions': positions,
                    'end': positions[-1]
                })

    return occurrences

def calculate_proximity(occ1, occ2):
    """Calculate proximity between two ELS occurrences"""
    # Minimum distance between any letters
    min_dist = float('inf')
    for pos1 in occ1['positions']:
        for pos2 in occ2['positions']:
            dist = abs(pos1 - pos2)
            if dist < min_dist:
                min_dist = dist

    # Range overlap
    range1 = (min(occ1['positions']), max(occ1['positions']))
    range2 = (min(occ2['positions']), max(occ2['positions']))

    overlap_start = max(range1[0], range2[0])
    overlap_end = min(range1[1], range2[1])
    overlap = max(0, overlap_end - overlap_start)

    # Skip similarity (inverse of difference)
    skip_diff = abs(abs(occ1['skip']) - abs(occ2['skip']))

    return {
        'min_distance': min_dist,
        'overlap': overlap,
        'skip_difference': skip_diff,
        'proximity_score': 1.0 / (min_dist + 1) + overlap / 1000.0 - skip_diff / 100.0
    }

def find_best_proximities(main_occurrences, other_occurrences, top_n=10):
    """Find the best proximity matches between main term and other terms"""
    proximities = []

    for main_occ in main_occurrences:
        for other_occ in other_occurrences:
            prox = calculate_proximity(main_occ, other_occ)
            proximities.append({
                'main': main_occ,
                'other': other_occ,
                'proximity': prox
            })

    # Sort by proximity score
    proximities.sort(key=lambda x: x['proximity']['proximity_score'], reverse=True)

    return proximities[:top_n]

def generate_matrix_visualization(text, proximities, width=50, output_file=None):
    """Generate a matrix visualization of the proximity results"""
    if not proximities:
        print("No proximities to visualize")
        return

    # Find the range to display
    all_positions = []
    for prox in proximities[:3]:  # Show top 3
        all_positions.extend(prox['main']['positions'])
        all_positions.extend(prox['other']['positions'])

    if not all_positions:
        return

    min_pos = min(all_positions) - 100
    max_pos = max(all_positions) + 100
    min_pos = max(0, min_pos)
    max_pos = min(len(text) - 1, max_pos)

    # Create matrix
    matrix = []
    for row_start in range(min_pos, max_pos, width):
        row = []
        for col in range(width):
            pos = row_start + col
            if pos < len(text):
                row.append(text[pos])
            else:
                row.append(' ')
        matrix.append(row)

    # Mark ELS positions
    marked_matrix = []
    for row_idx, row in enumerate(matrix):
        marked_row = []
        for col_idx, char in enumerate(row):
            pos = min_pos + row_idx * width + col_idx

            # Check if this position is in any ELS
            mark = ''
            for i, prox in enumerate(proximities[:3]):
                if pos in prox['main']['positions']:
                    mark = f"[{i+1}M]"  # Main term
                    break
                elif pos in prox['other']['positions']:
                    mark = f"[{i+1}O]"  # Other term
                    break

            if mark:
                marked_row.append(mark)
            else:
                marked_row.append(char)
        marked_matrix.append(marked_row)

    # Print or save visualization
    output_lines = []
    output_lines.append("="*80)
    output_lines.append("MATRIX VISUALIZATION - Top ELS Proximities")
    output_lines.append("="*80)
    output_lines.append(f"Range: {min_pos} - {max_pos}, Width: {width}")
    output_lines.append("Legend: [1M]=First main term, [1O]=First other term, etc.")
    output_lines.append("-"*80)

    for row_idx, row in enumerate(marked_matrix):
        row_start = min_pos + row_idx * width
        output_lines.append(f"{row_start:6}: {''.join(row)}")

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(output_lines))
    else:
        print('\n'.join(output_lines))

    return marked_matrix

def generate_report(search_terms, all_results, positions, output_dir="USER_GENERATED_FILES"):
    """Generate comprehensive report of proximity analysis"""

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Create report filename
    main_term = search_terms[0]
    report_file = os.path.join(output_dir, f"ELS_Proximity_Report_{main_term}.txt")

    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write("ELS PROXIMITY ANALYSIS REPORT\n")
        f.write("="*80 + "\n\n")

        f.write(f"Main Search Term: {main_term}\n")
        f.write(f"Other Terms: {', '.join(search_terms[1:])}\n")
        f.write(f"Final Forms Normalized: מ=ם, נ=ן, צ=ץ, פ=ף, כ=ך\n\n")

        f.write("-"*80 + "\n")
        f.write("OCCURRENCE SUMMARY\n")
        f.write("-"*80 + "\n")

        for term, occurrences in all_results.items():
            f.write(f"\n{term}: {len(occurrences)} occurrences found\n")
            if occurrences:
                skips = [occ['skip'] for occ in occurrences]
                f.write(f"  Skip range: {min(skips)} to {max(skips)}\n")
                f.write(f"  Position range: {min(occ['start'] for occ in occurrences)} to ")
                f.write(f"{max(occ['end'] for occ in occurrences)}\n")

        f.write("\n" + "-"*80 + "\n")
        f.write("TOP PROXIMITY MATCHES\n")
        f.write("-"*80 + "\n")

        # Combine all proximity results
        all_proximities = []
        for other_term in search_terms[1:]:
            if main_term in all_results and other_term in all_results:
                prox = find_best_proximities(
                    all_results[main_term],
                    all_results[other_term],
                    top_n=5
                )
                for p in prox:
                    p['other_term'] = other_term
                    all_proximities.extend(prox)

        # Sort by score
        all_proximities.sort(key=lambda x: x['proximity']['proximity_score'], reverse=True)

        for i, prox in enumerate(all_proximities[:20], 1):
            f.write(f"\n{i}. {main_term} <-> {prox['other_term']}\n")
            f.write(f"   Main: Start={prox['main']['start']}, Skip={prox['main']['skip']}\n")
            f.write(f"   Other: Start={prox['other']['start']}, Skip={prox['other']['skip']}\n")
            f.write(f"   Min Distance: {prox['proximity']['min_distance']}\n")
            f.write(f"   Overlap: {prox['proximity']['overlap']}\n")
            f.write(f"   Skip Difference: {prox['proximity']['skip_difference']}\n")
            f.write(f"   Proximity Score: {prox['proximity']['proximity_score']:.4f}\n")

            # Add verse context if available
            if positions:
                main_pos = prox['main']['positions'][0]
                if main_pos in positions:
                    ctx = positions[main_pos]
                    f.write(f"   Context: {ctx['book']} {ctx['chapter']}:{ctx['verse']}\n")

    print(f"Report saved to: {report_file}")
    return report_file, all_proximities

def main():
    """Main function for interactive ELS proximity analysis"""
    print("="*80)
    print("ELS PROXIMITY ANALYZER")
    print("Treats final forms as regular: מ=ם, נ=ן, צ=ץ, פ=ף, כ=ך")
    print("="*80)

    # Load text
    print("\nLoading Hebrew text from Genesis...")
    original_text, text, positions = load_text_from_csv()
    print(f"Loaded {len(text)} letters")

    # Get search terms
    print("\nEnter search terms (Hebrew):")
    print("The first term will be the main term for proximity analysis.")
    print("Enter each term and press Enter. Type 'done' when finished.\n")

    search_terms = []
    while True:
        term = input(f"Term {len(search_terms)+1}: ").strip()
        if term.lower() == 'done':
            break
        if term:
            # Normalize the search term
            normalized_term = normalize_hebrew_text(term)
            search_terms.append(normalized_term)
            print(f"  Added: {term}")
            if term != normalized_term:
                print(f"  Normalized to: {normalized_term}")

    if len(search_terms) < 2:
        print("Error: Please enter at least 2 terms for proximity analysis")
        return

    # Get skip parameters
    print(f"\nEnter skip distance parameters (press Enter for defaults):")
    min_skip = input("Minimum skip (default 1): ").strip()
    min_skip = int(min_skip) if min_skip else 1

    max_skip = input("Maximum skip (default 1000): ").strip()
    max_skip = int(max_skip) if max_skip else 1000

    # Search for all terms
    print(f"\nSearching for ELS occurrences...")
    all_results = {}

    for term in search_terms:
        print(f"  Searching for: {term}...")
        occurrences = find_els_occurrences(text, term, min_skip, max_skip)
        all_results[term] = occurrences
        print(f"    Found {len(occurrences)} occurrences")

    # Generate report
    print("\nGenerating proximity analysis report...")
    report_file, all_proximities = generate_report(search_terms, all_results, positions)

    # Generate matrix visualization for top results
    if all_proximities:
        print("\nGenerating matrix visualization...")
        viz_file = os.path.join("USER_GENERATED_FILES",
                               f"ELS_Matrix_Viz_{search_terms[0]}.txt")
        generate_matrix_visualization(text, all_proximities[:3],
                                    width=50, output_file=viz_file)
        print(f"Visualization saved to: {viz_file}")

    # Create CSV with detailed results
    if all_proximities:
        csv_file = os.path.join("USER_GENERATED_FILES",
                               f"ELS_Proximity_Data_{search_terms[0]}.csv")

        rows = []
        for prox in all_proximities[:100]:  # Top 100
            row = {
                'main_term': search_terms[0],
                'other_term': prox.get('other_term', ''),
                'main_start': prox['main']['start'],
                'main_skip': prox['main']['skip'],
                'other_start': prox['other']['start'],
                'other_skip': prox['other']['skip'],
                'min_distance': prox['proximity']['min_distance'],
                'overlap': prox['proximity']['overlap'],
                'skip_difference': prox['proximity']['skip_difference'],
                'proximity_score': prox['proximity']['proximity_score']
            }
            rows.append(row)

        df = pd.DataFrame(rows)
        df.to_csv(csv_file, index=False, encoding='utf-8')
        print(f"Data saved to: {csv_file}")

    print("\n" + "="*80)
    print("Analysis complete!")
    print("="*80)

if __name__ == "__main__":
    main()