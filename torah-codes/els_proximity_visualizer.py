#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ELS Proximity Visualizer - Creates visual matrix images showing ELS overlaps
Includes final form normalization: מ=ם, נ=ן, צ=ץ, פ=ף, כ=ך
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib import colors
import pandas as pd
from els_proximity_analyzer import (
    normalize_hebrew_text,
    load_text_from_csv,
    find_els_occurrences,
    find_best_proximities
)

def create_matrix_image(text, proximities, width=50, height=50,
                       output_file="els_matrix.png", show_hebrew=True):
    """Create a visual matrix image showing ELS patterns"""

    if not proximities:
        print("No proximities to visualize")
        return

    # Find display range
    all_positions = []
    for prox in proximities[:5]:  # Top 5
        all_positions.extend(prox['main']['positions'])
        all_positions.extend(prox['other']['positions'])

    min_pos = min(all_positions) - 50
    max_pos = max(all_positions) + 50
    min_pos = max(0, min_pos)
    max_pos = min(len(text) - 1, max_pos)

    # Calculate actual dimensions
    total_chars = max_pos - min_pos + 1
    actual_height = (total_chars + width - 1) // width

    # Create figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 12))

    # Left plot - Hebrew letters with highlights
    if show_hebrew:
        ax1.set_title('Hebrew Text Matrix with ELS Patterns', fontsize=14, weight='bold')
        ax1.set_xlim(0, width)
        ax1.set_ylim(0, actual_height)
        ax1.set_aspect('equal')
        ax1.invert_yaxis()

        # Color map for different proximities
        colors_list = ['red', 'blue', 'green', 'orange', 'purple']

        # Plot Hebrew letters
        for row in range(actual_height):
            for col in range(width):
                pos = min_pos + row * width + col
                if pos < len(text):
                    # Check if this position is in any ELS
                    is_els = False
                    for i, prox in enumerate(proximities[:5]):
                        if pos in prox['main']['positions']:
                            rect = patches.Rectangle((col-0.4, row-0.4), 0.8, 0.8,
                                                    linewidth=2, edgecolor=colors_list[i],
                                                    facecolor='none', alpha=0.7)
                            ax1.add_patch(rect)
                            ax1.text(col, row, text[pos], ha='center', va='center',
                                   fontsize=10, color=colors_list[i], weight='bold')
                            is_els = True
                            break
                        elif pos in prox['other']['positions']:
                            rect = patches.Rectangle((col-0.4, row-0.4), 0.8, 0.8,
                                                    linewidth=1, edgecolor=colors_list[i],
                                                    facecolor='none', alpha=0.5,
                                                    linestyle='--')
                            ax1.add_patch(rect)
                            ax1.text(col, row, text[pos], ha='center', va='center',
                                   fontsize=10, color=colors_list[i])
                            is_els = True
                            break

                    if not is_els:
                        ax1.text(col, row, text[pos], ha='center', va='center',
                               fontsize=8, color='gray', alpha=0.5)

        ax1.set_xticks([])
        ax1.set_yticks([])
        ax1.grid(True, alpha=0.2, linewidth=0.5)

    # Right plot - Pattern connections
    ax2.set_title('ELS Connection Patterns', fontsize=14, weight='bold')
    ax2.set_xlim(0, width)
    ax2.set_ylim(0, actual_height)
    ax2.set_aspect('equal')
    ax2.invert_yaxis()

    # Draw connection lines
    for i, prox in enumerate(proximities[:5]):
        color = colors_list[i]

        # Draw main term connections
        main_positions = prox['main']['positions']
        for j in range(len(main_positions) - 1):
            pos1 = main_positions[j] - min_pos
            pos2 = main_positions[j + 1] - min_pos
            y1, x1 = pos1 // width, pos1 % width
            y2, x2 = pos2 // width, pos2 % width
            ax2.plot([x1, x2], [y1, y2], color=color, linewidth=2, alpha=0.7)

        # Draw other term connections
        other_positions = prox['other']['positions']
        for j in range(len(other_positions) - 1):
            pos1 = other_positions[j] - min_pos
            pos2 = other_positions[j + 1] - min_pos
            y1, x1 = pos1 // width, pos1 % width
            y2, x2 = pos2 // width, pos2 % width
            ax2.plot([x1, x2], [y1, y2], color=color, linewidth=1,
                    alpha=0.7, linestyle='--')

        # Mark positions
        for pos in main_positions:
            rel_pos = pos - min_pos
            y, x = rel_pos // width, rel_pos % width
            ax2.scatter(x, y, color=color, s=50, marker='o')

        for pos in other_positions:
            rel_pos = pos - min_pos
            y, x = rel_pos // width, rel_pos % width
            ax2.scatter(x, y, color=color, s=30, marker='^')

    ax2.set_xticks([])
    ax2.set_yticks([])
    ax2.grid(True, alpha=0.2, linewidth=0.5)

    # Add legend
    legend_elements = []
    for i in range(min(len(proximities), 5)):
        prox = proximities[i]
        other_term = prox.get('other_term', 'Term')
        legend_elements.append(
            plt.Line2D([0], [0], color=colors_list[i], linewidth=2,
                      label=f"Match {i+1}: Skip {prox['main']['skip']} & {prox['other']['skip']}")
        )

    ax2.legend(handles=legend_elements, loc='upper right')

    # Add overall title
    fig.suptitle('ELS Proximity Analysis - Matrix Visualization', fontsize=16, weight='bold')

    # Save figure
    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"Image saved to: {output_file}")

    return fig

def create_proximity_heatmap(all_results, output_file="proximity_heatmap.png"):
    """Create a heatmap showing proximity scores between all term pairs"""

    terms = list(all_results.keys())
    n_terms = len(terms)

    # Create proximity matrix
    prox_matrix = np.zeros((n_terms, n_terms))

    for i, term1 in enumerate(terms):
        for j, term2 in enumerate(terms):
            if i != j and all_results[term1] and all_results[term2]:
                proximities = find_best_proximities(
                    all_results[term1][:10],  # Use top 10 occurrences
                    all_results[term2][:10],
                    top_n=1
                )
                if proximities:
                    prox_matrix[i, j] = proximities[0]['proximity']['proximity_score']

    # Create heatmap
    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(prox_matrix, cmap='YlOrRd', aspect='auto')

    # Set ticks and labels
    ax.set_xticks(np.arange(n_terms))
    ax.set_yticks(np.arange(n_terms))
    ax.set_xticklabels(terms, rotation=45, ha='right')
    ax.set_yticklabels(terms)

    # Add colorbar
    plt.colorbar(im, ax=ax, label='Proximity Score')

    # Add values to cells
    for i in range(n_terms):
        for j in range(n_terms):
            if prox_matrix[i, j] > 0:
                text = ax.text(j, i, f'{prox_matrix[i, j]:.2f}',
                             ha='center', va='center', color='black', fontsize=8)

    ax.set_title('ELS Terms Proximity Heatmap', fontsize=14, weight='bold')
    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"Heatmap saved to: {output_file}")

    return fig

def create_skip_distribution_plot(all_results, output_file="skip_distribution.png"):
    """Create a plot showing skip distance distributions for all terms"""

    fig, axes = plt.subplots(2, 1, figsize=(12, 10))

    # Positive skips
    ax = axes[0]
    for term, occurrences in all_results.items():
        pos_skips = [occ['skip'] for occ in occurrences if occ['skip'] > 0]
        if pos_skips:
            counts = pd.Series(pos_skips).value_counts().sort_index()
            ax.scatter(counts.index, counts.values, label=term, alpha=0.6, s=20)

    ax.set_xlabel('Skip Distance')
    ax.set_ylabel('Frequency')
    ax.set_title('Positive Skip Distance Distribution', fontsize=12, weight='bold')
    ax.legend(loc='upper right')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, 100)  # Focus on smaller skips

    # Negative skips
    ax = axes[1]
    for term, occurrences in all_results.items():
        neg_skips = [abs(occ['skip']) for occ in occurrences if occ['skip'] < 0]
        if neg_skips:
            counts = pd.Series(neg_skips).value_counts().sort_index()
            ax.scatter(counts.index, counts.values, label=term, alpha=0.6, s=20)

    ax.set_xlabel('Skip Distance (absolute value)')
    ax.set_ylabel('Frequency')
    ax.set_title('Negative Skip Distance Distribution', fontsize=12, weight='bold')
    ax.legend(loc='upper right')
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, 100)  # Focus on smaller skips

    fig.suptitle('ELS Skip Distance Analysis', fontsize=14, weight='bold')
    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"Skip distribution saved to: {output_file}")

    return fig

def main():
    """Main function for visual ELS proximity analysis"""
    print("="*80)
    print("ELS PROXIMITY VISUALIZER")
    print("Creates visual matrix images and analysis plots")
    print("Final forms normalized: מ=ם, נ=ן, צ=ץ, פ=ף, כ=ך")
    print("="*80)

    # Load text
    print("\nLoading Hebrew text from Genesis...")
    original_text, text, positions = load_text_from_csv()
    print(f"Loaded {len(text)} letters")

    # Get search terms
    print("\nEnter search terms (Hebrew):")
    print("Enter each term and press Enter. Type 'done' when finished.\n")

    search_terms = []
    while True:
        term = input(f"Term {len(search_terms)+1}: ").strip()
        if term.lower() == 'done':
            break
        if term:
            normalized_term = normalize_hebrew_text(term)
            search_terms.append(normalized_term)
            print(f"  Added: {term}")
            if term != normalized_term:
                print(f"  Normalized to: {normalized_term}")

    if len(search_terms) < 2:
        print("Error: Please enter at least 2 terms for analysis")
        return

    # Get parameters
    max_skip = input("\nMaximum skip distance (default 500): ").strip()
    max_skip = int(max_skip) if max_skip else 500

    # Search for all terms
    print(f"\nSearching for ELS occurrences (skip range: 1-{max_skip})...")
    all_results = {}

    for term in search_terms:
        print(f"  Searching for: {term}...")
        occurrences = find_els_occurrences(text, term, 1, max_skip)
        all_results[term] = occurrences
        print(f"    Found {len(occurrences)} occurrences")

    # Find proximities for the main term
    main_term = search_terms[0]
    all_proximities = []

    for other_term in search_terms[1:]:
        if all_results[main_term] and all_results[other_term]:
            prox = find_best_proximities(
                all_results[main_term],
                all_results[other_term],
                top_n=10
            )
            for p in prox:
                p['other_term'] = other_term
            all_proximities.extend(prox)

    # Sort by score
    all_proximities.sort(key=lambda x: x['proximity']['proximity_score'], reverse=True)

    # Create visualizations
    output_dir = "USER_GENERATED_FILES"
    os.makedirs(output_dir, exist_ok=True)

    print("\nGenerating visualizations...")

    # 1. Matrix visualization
    if all_proximities:
        matrix_file = os.path.join(output_dir, f"ELS_Matrix_{main_term}.png")
        create_matrix_image(text, all_proximities, width=50,
                          output_file=matrix_file)

    # 2. Proximity heatmap
    if len(search_terms) > 2:
        heatmap_file = os.path.join(output_dir, f"ELS_Heatmap_{main_term}.png")
        create_proximity_heatmap(all_results, output_file=heatmap_file)

    # 3. Skip distribution
    dist_file = os.path.join(output_dir, f"ELS_SkipDist_{main_term}.png")
    create_skip_distribution_plot(all_results, output_file=dist_file)

    print("\n" + "="*80)
    print("Visualization complete!")
    print("Check USER_GENERATED_FILES/ for output images")
    print("="*80)

if __name__ == "__main__":
    main()