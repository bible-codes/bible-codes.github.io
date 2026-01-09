#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Search for custom terms: תשפו, תשרית, שביעי
With visualization generation
"""

import os
from els_proximity_analyzer import (
    normalize_hebrew_text,
    load_text_from_csv,
    find_els_occurrences,
    find_best_proximities,
    generate_report,
    generate_matrix_visualization
)

try:
    from els_proximity_visualizer import (
        create_matrix_image,
        create_proximity_heatmap,
        create_skip_distribution_plot
    )
    has_visualizer = True
except ImportError:
    has_visualizer = False
    print("Warning: Visualizer not available")

print("="*80)
print("ELS SEARCH - CUSTOM TERMS")
print("="*80)

# Define search terms
search_terms = ["תשפו", "תשרית", "שביעי"]
print(f"\nSearch terms: {', '.join(search_terms)}")

# Load text
print("\nLoading Hebrew text from Genesis...")
original_text, text, positions = load_text_from_csv()
print(f"Loaded {len(text)} letters")

# Normalize search terms
normalized_terms = []
for term in search_terms:
    normalized = normalize_hebrew_text(term)
    normalized_terms.append(normalized)
    print(f"  {term} → {normalized} (length: {len(normalized)})")

# Use reasonable skip range for these terms
min_skip = 1
max_skip = 100  # Start with smaller range for faster search

print(f"\nSearching with skip range: {min_skip} to {max_skip}")
print("This may take a moment...")

# Search for all terms
all_results = {}
for i, term in enumerate(normalized_terms, 1):
    print(f"\n[{i}/3] Searching for: {term}")

    # First check if term exists as direct text
    if term in text:
        print(f"  ✓ Found as direct substring in text")

    # ELS search
    occurrences = find_els_occurrences(text, term, min_skip, max_skip)
    all_results[term] = occurrences
    print(f"  Found {len(occurrences)} ELS occurrences")

    if occurrences:
        # Show some examples
        print(f"  Sample occurrences (first 5):")
        for j, occ in enumerate(occurrences[:5], 1):
            print(f"    {j}. Position {occ['start']}, Skip {occ['skip']}")

            # Show the actual letters found
            letters_found = []
            for pos in occ['positions'][:5]:  # Show first 5 positions
                if pos < len(text):
                    letters_found.append(text[pos])
            print(f"       Letters: {''.join(letters_found)}...")

# Generate outputs if we have results
output_dir = "USER_GENERATED_FILES"
os.makedirs(output_dir, exist_ok=True)

if any(all_results.values()):
    print("\n" + "-"*40)
    print("GENERATING OUTPUTS")
    print("-"*40)

    # Generate report
    main_term = normalized_terms[0]
    try:
        report_file, all_proximities = generate_report(
            normalized_terms, all_results, positions, output_dir
        )
        print(f"\n✓ Report saved to: {report_file}")
    except Exception as e:
        print(f"Could not generate report: {e}")
        all_proximities = []

    # Text matrix visualization
    if all_proximities:
        try:
            viz_file = os.path.join(output_dir, f"Matrix_Text_{main_term}.txt")
            generate_matrix_visualization(
                text, all_proximities[:3],
                width=40, output_file=viz_file
            )
            print(f"✓ Text matrix saved to: {viz_file}")
        except Exception as e:
            print(f"Could not create text matrix: {e}")

    # Visual images if available
    if has_visualizer and all_proximities:
        print("\nGenerating visual images...")

        # Matrix image
        try:
            matrix_file = os.path.join(output_dir, f"Matrix_Image_{main_term}.png")
            create_matrix_image(
                text, all_proximities[:5],
                width=40, output_file=matrix_file,
                show_hebrew=True
            )
            print(f"✓ Matrix image saved to: {matrix_file}")
        except Exception as e:
            print(f"Could not create matrix image: {e}")

        # Heatmap
        if len(normalized_terms) > 1:
            try:
                heatmap_file = os.path.join(output_dir, f"Heatmap_{main_term}.png")
                create_proximity_heatmap(all_results, output_file=heatmap_file)
                print(f"✓ Heatmap saved to: {heatmap_file}")
            except Exception as e:
                print(f"Could not create heatmap: {e}")

        # Skip distribution
        try:
            dist_file = os.path.join(output_dir, f"SkipDist_{main_term}.png")
            create_skip_distribution_plot(all_results, output_file=dist_file)
            print(f"✓ Skip distribution saved to: {dist_file}")
        except Exception as e:
            print(f"Could not create skip distribution: {e}")

else:
    print("\nNo ELS occurrences found for any term.")
    print("These terms may not exist in Genesis with the given skip range.")
    print("You might try:")
    print("  1. Larger skip ranges (but slower search)")
    print("  2. Different search terms")
    print("  3. Searching in different biblical books")

# Summary
print("\n" + "="*80)
print("SEARCH COMPLETE")
print("="*80)

total_found = sum(len(v) for v in all_results.values())
print(f"\nTotal ELS occurrences found: {total_found}")

for term, occurrences in all_results.items():
    if occurrences:
        skips = [abs(o['skip']) for o in occurrences]
        print(f"  {term}: {len(occurrences)} occurrences")
        print(f"    Skip range used: {min(skips)} to {max(skips)}")

print(f"\nAll outputs saved to: {output_dir}/")
print("="*80)