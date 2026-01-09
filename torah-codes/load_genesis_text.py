#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Genesis text directly from the CSV file with proper parsing
"""

import csv
import os

def load_genesis_text():
    """Load Hebrew text from Genesis CSV with correct parsing"""
    csv_path = "USER_GENERATED_FILES/USER_FILE_WordsInSelectedBiblicalTexts_WordPositions_LetterPositions_GematriaValues_Koren_1Genesis_20x3904.csv"

    if not os.path.exists(csv_path):
        print(f"Error: Cannot find {csv_path}")
        return None, None, None

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

    # Join letters into text
    text = ''.join(letters)
    return text, text, positions

if __name__ == "__main__":
    text, normalized, positions = load_genesis_text()
    if text:
        print(f"Loaded {len(text)} letters from Genesis")
        print(f"First 100 letters: {text[:100]}")
        print(f"Last 100 letters: {text[-100:]}")
    else:
        print("Failed to load text")