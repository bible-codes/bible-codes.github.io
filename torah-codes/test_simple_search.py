#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple test with common Hebrew words that should exist in Genesis
"""

import sys
import os
from els_proximity_analyzer import (
    normalize_hebrew_text,
    load_text_from_csv,
    find_els_occurrences,
    find_best_proximities
)

print("="*60)
print("SIMPLE ELS TEST - GENESIS")
print("="*60)

# Load text
print("\nLoading Genesis text...")
original_text, text, positions = load_text_from_csv()
print(f"Loaded {len(text)} letters")
print(f"First 50 letters: {text[:50]}")

# Search for simple, common terms that should exist
search_terms = ["אלהים", "ברא", "יום"]  # God, created, day - all in Genesis 1
print(f"\nSearching for: {', '.join(search_terms)}")

# Very limited search to test
min_skip = 1
max_skip = 10  # Very small range for testing

print(f"Skip range: {min_skip} to {max_skip}")

all_results = {}
for term in search_terms:
    normalized = normalize_hebrew_text(term)
    print(f"\n{term} (normalized: {normalized}):")

    # First check if term exists directly in text
    if normalized in text:
        print(f"  ✓ Found as direct substring")

    # Now search for ELS
    occurrences = find_els_occurrences(text, normalized, min_skip, max_skip)
    all_results[normalized] = occurrences

    print(f"  Found {len(occurrences)} ELS occurrences")
    if occurrences:
        for i, occ in enumerate(occurrences[:3], 1):
            print(f"    {i}. Position {occ['start']}, Skip {occ['skip']}")

print("\n" + "="*60)
print("Test complete!")

# If we found occurrences, try to generate a simple visualization
if any(all_results.values()):
    print("\nAttempting to create visualization...")

    # Find proximities
    main_term = list(all_results.keys())[0]
    all_proximities = []

    for other_term in list(all_results.keys())[1:]:
        if all_results[main_term] and all_results[other_term]:
            prox = find_best_proximities(
                all_results[main_term][:5],
                all_results[other_term][:5],
                top_n=3
            )
            for p in prox:
                p['other_term'] = other_term
            all_proximities.extend(prox)

    if all_proximities:
        print(f"Found {len(all_proximities)} proximity matches")

        # Try to create a simple text matrix
        from els_proximity_analyzer import generate_matrix_visualization

        try:
            viz_file = "USER_GENERATED_FILES/test_matrix.txt"
            generate_matrix_visualization(text, all_proximities[:1],
                                        width=30, output_file=viz_file)
            print(f"Text matrix saved to: {viz_file}")
        except Exception as e:
            print(f"Could not create visualization: {e}")
else:
    print("\nNo ELS occurrences found - terms may need different skip ranges")