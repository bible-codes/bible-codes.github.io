#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated test script for ELS proximity analysis with Hebrew search terms
Search terms: תשפו, תשרית, שביעי
"""

import sys
import os
from els_proximity_analyzer import (
    normalize_hebrew_text,
    load_text_from_csv,
    find_els_occurrences,
    find_best_proximities,
    generate_report,
    generate_matrix_visualization
)
from els_proximity_visualizer import (
    create_matrix_image,
    create_proximity_heatmap,
    create_skip_distribution_plot
)

def main():
    print("="*80)
    print("ELS PROXIMITY ANALYSIS - AUTOMATED TEST")
    print("="*80)

    # Define search terms
    search_terms = ["תשפו", "תשרית", "שביעי"]
    print(f"\nSearch terms: {', '.join(search_terms)}")

    # Load text
    print("\nLoading Hebrew text from Genesis...")
    try:
        original_text, text, positions = load_text_from_csv()
        print(f"Successfully loaded {len(text)} letters")
    except Exception as e:
        print(f"Error loading text: {e}")
        return

    # Normalize search terms
    normalized_terms = []
    for term in search_terms:
        normalized = normalize_hebrew_text(term)
        normalized_terms.append(normalized)
        if term != normalized:
            print(f"  {term} normalized to: {normalized}")

    # Search parameters
    min_skip = 1
    max_skip = 500
    print(f"\nSearching with skip range: {min_skip} to {max_skip}")

    # Search for all terms
    print("\n" + "-"*40)
    print("SEARCHING FOR ELS OCCURRENCES")
    print("-"*40)

    all_results = {}
    for term in normalized_terms:
        print(f"\nSearching for: {term}")
        occurrences = find_els_occurrences(text, term, min_skip, max_skip)
        all_results[term] = occurrences
        print(f"  Found {len(occurrences)} occurrences")

        # Show first 5 occurrences
        if occurrences:
            print(f"  First 5 occurrences:")
            for i, occ in enumerate(occurrences[:5], 1):
                print(f"    {i}. Position {occ['start']}, Skip {occ['skip']}")

    # Check if we have results
    if not any(all_results.values()):
        print("\nNo ELS occurrences found for any search term.")
        print("This may be because the terms don't exist with the given skip range.")
        return

    # Generate report
    print("\n" + "-"*40)
    print("GENERATING PROXIMITY ANALYSIS")
    print("-"*40)

    try:
        report_file, all_proximities = generate_report(
            normalized_terms, all_results, positions
        )
        print(f"Report saved to: {report_file}")
    except Exception as e:
        print(f"Error generating report: {e}")
        all_proximities = []

    # Generate text matrix visualization
    if all_proximities:
        print("\nGenerating text matrix visualization...")
        try:
            viz_file = os.path.join("USER_GENERATED_FILES",
                                   f"ELS_Matrix_Viz_{normalized_terms[0]}.txt")
            generate_matrix_visualization(text, all_proximities[:3],
                                        width=50, output_file=viz_file)
            print(f"Text visualization saved to: {viz_file}")
        except Exception as e:
            print(f"Error generating text visualization: {e}")

    # Generate visual images
    print("\n" + "-"*40)
    print("GENERATING VISUAL IMAGES")
    print("-"*40)

    output_dir = "USER_GENERATED_FILES"
    os.makedirs(output_dir, exist_ok=True)

    # 1. Matrix image with Hebrew letters
    if all_proximities:
        print("\nCreating matrix image with Hebrew letters...")
        try:
            matrix_file = os.path.join(output_dir, f"ELS_Matrix_{normalized_terms[0]}.png")
            fig = create_matrix_image(text, all_proximities, width=50,
                                    output_file=matrix_file, show_hebrew=True)
            print(f"Matrix image saved to: {matrix_file}")
        except Exception as e:
            print(f"Error creating matrix image: {e}")

    # 2. Proximity heatmap
    if len(normalized_terms) > 1 and all_results:
        print("\nCreating proximity heatmap...")
        try:
            heatmap_file = os.path.join(output_dir, f"ELS_Heatmap_{normalized_terms[0]}.png")
            fig = create_proximity_heatmap(all_results, output_file=heatmap_file)
            print(f"Heatmap saved to: {heatmap_file}")
        except Exception as e:
            print(f"Error creating heatmap: {e}")

    # 3. Skip distribution plot
    if all_results:
        print("\nCreating skip distribution plot...")
        try:
            dist_file = os.path.join(output_dir, f"ELS_SkipDist_{normalized_terms[0]}.png")
            fig = create_skip_distribution_plot(all_results, output_file=dist_file)
            print(f"Skip distribution saved to: {dist_file}")
        except Exception as e:
            print(f"Error creating skip distribution: {e}")

    # Summary
    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80)
    print("\nSummary of results:")
    for term, occurrences in all_results.items():
        print(f"  {term}: {len(occurrences)} occurrences")

    if all_proximities:
        print(f"\nTop proximity matches found: {len(all_proximities)}")
        print("\nTop 3 proximity scores:")
        for i, prox in enumerate(all_proximities[:3], 1):
            print(f"  {i}. Score: {prox['proximity']['proximity_score']:.4f}")
            print(f"     Main skip: {prox['main']['skip']}, Other skip: {prox['other']['skip']}")
            print(f"     Min distance: {prox['proximity']['min_distance']} letters")

    print("\nAll output files saved to USER_GENERATED_FILES/")
    print("="*80)

if __name__ == "__main__":
    main()