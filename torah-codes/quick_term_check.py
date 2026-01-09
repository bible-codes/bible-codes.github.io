#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick check if terms exist in Genesis
"""

from els_proximity_analyzer import load_text_from_csv, normalize_hebrew_text

print("Loading Genesis text...")
original_text, text, positions = load_text_from_csv()
print(f"Loaded {len(text)} letters\n")

# Terms to search
terms = ["תשפו", "תשרית", "שביעי"]

print("Checking if terms exist as direct substrings:\n")

for term in terms:
    normalized = normalize_hebrew_text(term)
    print(f"{term} (normalized: {normalized}):")

    # Check direct occurrence
    if term in original_text:
        count = original_text.count(term)
        print(f"  ✓ Found {count} times in original text")
        # Find first occurrence
        idx = original_text.index(term)
        context = original_text[max(0, idx-10):min(len(original_text), idx+len(term)+10)]
        print(f"  Context: ...{context}...")
    else:
        print(f"  ✗ Not found as direct substring in original")

    if normalized in text:
        count = text.count(normalized)
        print(f"  ✓ Found {count} times in normalized text")
    else:
        print(f"  ✗ Not found in normalized text")

    print()

# Check some known terms
print("\nChecking known terms for comparison:")
known_terms = ["בראשית", "אלהים", "משה"]

for term in known_terms:
    normalized = normalize_hebrew_text(term)
    if term in original_text:
        count = original_text.count(term)
        print(f"{term}: ✓ Found {count} times")
    else:
        print(f"{term}: ✗ Not found")

print("\nNote: משה (Moses) should not be in Genesis, only in Exodus onwards.")