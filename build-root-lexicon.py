#!/usr/bin/env python3
"""
Build Hebrew Root Lexicon

Extracts Hebrew roots from the existing word database and creates
a compressed lexicon file for client-side use.

Approach:
1. Load all unique words from words.json.gz files
2. Apply morphological analysis (heuristic-based)
3. Generate hebrew-roots.json.gz with root mappings

Note: For better accuracy, integrate YAP or AlephBERT in future versions.
"""

import json
import gzip
import sys
from pathlib import Path
from collections import defaultdict
import re


class HebrewRootExtractor:
    """Extract Hebrew roots using morphological heuristics"""

    # Common prefixes (ה, ו, ב, כ, ל, מ, ש)
    PREFIXES = ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש']

    # Common suffixes (ordered by length for greedy matching)
    SUFFIXES = [
        'יהם', 'יהן', 'יכם', 'יכן',  # 3-letter
        'הם', 'הן', 'כם', 'כן', 'נו', 'ים', 'ות',  # 2-letter
        'ה', 'י', 'ך', 'ו', 'ת'  # 1-letter
    ]

    # Binyan patterns (simplified detection)
    BINYAN_PATTERNS = {
        'qal': r'^[א-ת]{3}$',
        'nifal': r'^נ[א-ת]{2,3}',
        'piel': r'^[א-ת]{3}$',  # Ambiguous without niqqud
        'hifil': r'^ה[א-ת]{2,3}',
        'hitpael': r'^(הת|ת)[א-ת]{2,3}'
    }

    FINAL_LETTERS = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}

    def __init__(self):
        self.lexicon = {}
        self.word_count = 0

    def normalize(self, word):
        """Remove niqqud and convert final letters"""
        # Remove niqqud (Unicode combining marks U+0591 - U+05C7)
        normalized = re.sub(r'[\u0591-\u05C7]', '', word)

        # Convert final letters
        for final, regular in self.FINAL_LETTERS.items():
            normalized = normalized.replace(final, regular)

        return normalized

    def strip_affixes(self, word):
        """Remove common prefixes and suffixes"""
        original = word

        # Strip prefix (only one)
        for prefix in self.PREFIXES:
            if word.startswith(prefix) and len(word) > 2:
                word = word[1:]
                break

        # Strip suffix (only one, longest match first)
        for suffix in self.SUFFIXES:
            if word.endswith(suffix) and len(word) > len(suffix) + 1:
                word = word[:-len(suffix)]
                break

        return word

    def extract_root(self, word):
        """Extract root using heuristics"""
        # Normalize
        normalized = self.normalize(word)
        original_normalized = normalized

        # Try stripping affixes
        stripped = self.strip_affixes(normalized)

        # Determine root based on length
        word_len = len(stripped)

        if word_len == 3:
            # Already tri-literal (most common)
            root = stripped
            confidence = 0.8

        elif word_len == 4:
            # Check for patterns
            if stripped[0] == 'נ':
                # Nifal: נשבר → שבר
                root = stripped[1:]
                confidence = 0.7
            elif stripped[0] == 'ה':
                # Hifil: הקדים → קדם
                root = stripped[1:]
                confidence = 0.7
            elif stripped[0] == 'מ':
                # Mif'al: מדבר → דבר
                root = stripped[1:]
                confidence = 0.6
            elif stripped[0] == 'ת':
                # Hitpael: תפלל → פלל
                root = stripped[1:]
                confidence = 0.6
            elif stripped[0] == stripped[2] and stripped[1] == stripped[3]:
                # Reduplication: פרפר → פר
                root = stripped[:2]
                confidence = 0.5
            else:
                # Assume quadri-literal
                root = stripped
                confidence = 0.5

        elif word_len == 5:
            # Usually tri-literal with affixes, extract middle 3
            root = stripped[1:4]
            confidence = 0.4

        elif word_len == 2:
            # Bi-literal (rare)
            root = stripped
            confidence = 0.4

        elif word_len > 5:
            # Long word, guess middle 3 letters
            mid = word_len // 2
            root = stripped[mid-1:mid+2]
            confidence = 0.3

        else:
            # Very short or empty
            root = stripped
            confidence = 0.1

        # Detect binyan (simplified)
        binyan = None
        for name, pattern in self.BINYAN_PATTERNS.items():
            if re.match(pattern, original_normalized):
                binyan = name
                break

        return {
            'root': root,
            'binyan': binyan,
            'pos': None,  # Would need dictionary for POS tagging
            'confidence': confidence,
            'metadata': {
                'normalized': original_normalized,
                'stripped': stripped
            }
        }

    def build_lexicon(self, words):
        """Build root lexicon from word list"""
        print(f"Processing {len(words)} unique words...")

        for word in words:
            if not word or not word.strip():
                continue

            result = self.extract_root(word)
            self.lexicon[word] = result
            self.word_count += 1

            if self.word_count % 1000 == 0:
                print(f"  Processed {self.word_count} words...")

        print(f"Lexicon complete: {len(self.lexicon)} entries")

    def get_stats(self):
        """Get lexicon statistics"""
        roots = set(entry['root'] for entry in self.lexicon.values())
        binyans = set(entry['binyan'] for entry in self.lexicon.values() if entry['binyan'])
        avg_confidence = sum(entry['confidence'] for entry in self.lexicon.values()) / len(self.lexicon)

        return {
            'total_words': len(self.lexicon),
            'unique_roots': len(roots),
            'binyans': sorted(binyans),
            'avg_confidence': round(avg_confidence, 3)
        }


def load_words_from_database(data_dir='data'):
    """Load all unique words from the database files"""
    data_path = Path(data_dir)
    words = set()

    print("Loading words from database...")

    # Look for *-words.json.gz files (book-specific naming)
    word_files = sorted(data_path.glob('*-words.json.gz'))

    if not word_files:
        print("ERROR: No *-words.json.gz files found in data/")
        return None

    for file_path in word_files:
        print(f"  Reading {file_path.name}...")

        try:
            with gzip.open(file_path, 'rt', encoding='utf-8') as f:
                data = json.load(f)

            # Extract unique words (consonantal form)
            for word_data in data:
                consonantal = word_data.get('word_text_consonantal', '')
                if consonantal:
                    words.add(consonantal)

        except Exception as e:
            print(f"  WARNING: Failed to read {file_path}: {e}")

    print(f"Loaded {len(words)} unique words")
    return sorted(words)


def save_lexicon(lexicon, output_file='data/embeddings/hebrew-roots.json.gz'):
    """Save lexicon as compressed JSON"""
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Saving lexicon to {output_file}...")

    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        json.dump(lexicon, f, ensure_ascii=False, indent=None)

    # Get file size
    size_kb = output_path.stat().st_size / 1024
    print(f"Saved {len(lexicon)} entries ({size_kb:.1f} KB)")


def main():
    """Main execution"""
    print("=" * 60)
    print("Hebrew Root Lexicon Builder")
    print("=" * 60)

    # Load words from database
    words = load_words_from_database()
    if not words:
        sys.exit(1)

    # Extract roots
    extractor = HebrewRootExtractor()
    extractor.build_lexicon(words)

    # Print statistics
    stats = extractor.get_stats()
    print("\nLexicon Statistics:")
    print(f"  Total words: {stats['total_words']}")
    print(f"  Unique roots: {stats['unique_roots']}")
    print(f"  Binyans detected: {', '.join(stats['binyans']) if stats['binyans'] else 'None'}")
    print(f"  Average confidence: {stats['avg_confidence']}")

    # Save lexicon
    save_lexicon(extractor.lexicon)

    print("\nDone! Root lexicon ready for use.")
    print("Next steps:")
    print("  1. Test with: node test-roots.js")
    print("  2. Integrate with Tsirufim engine")
    print("  3. (Optional) Improve with YAP or AlephBERT")


if __name__ == '__main__':
    main()
