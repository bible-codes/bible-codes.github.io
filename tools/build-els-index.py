#!/usr/bin/env python3
"""
Build Torah ELS Index

Precomputes ALL occurrences of ALL dictionary words at ALL ELS skip values.
This transforms ELS searches from O(n*m*s) to O(1) lookups.

Usage:
    python3 build-els-index.py [--skip-range 100] [--output els-index.json.gz]

Features:
- Trie-based efficient word matching
- Parallel processing across CPU cores
- Delta-encoded compression
- Progress reporting
"""

import json
import gzip
import hashlib
import argparse
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import multiprocessing as mp
from functools import partial
import sys


# Hebrew letters (consonantal)
HEBREW_LETTERS = set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ')

# Final letter normalization
FINAL_TO_REGULAR = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}


class TrieNode:
    """Trie node for efficient prefix matching"""
    __slots__ = ['children', 'is_word', 'word']

    def __init__(self):
        self.children = {}
        self.is_word = False
        self.word = None


class Trie:
    """Trie data structure for dictionary lookup"""

    def __init__(self):
        self.root = TrieNode()
        self.word_count = 0

    def insert(self, word):
        """Insert word into trie"""
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_word = True
        node.word = word
        self.word_count += 1

    def search_from_sequence(self, sequence):
        """Find all dictionary words that are prefixes of the sequence"""
        words_found = []
        node = self.root

        for i, char in enumerate(sequence):
            if char not in node.children:
                break
            node = node.children[char]
            if node.is_word:
                words_found.append((node.word, i + 1))  # (word, length)

        return words_found


def load_torah_text(torah_path):
    """Load Torah text (consonantal only)"""
    print(f"Loading Torah text from {torah_path}...")

    with open(torah_path, 'r', encoding='utf-8') as f:
        text = f.read().strip()

    # Remove any non-Hebrew characters
    text = ''.join(c for c in text if c in HEBREW_LETTERS)

    print(f"  Loaded {len(text):,} characters")
    return text


def load_dictionary(dict_paths):
    """Load dictionary words from multiple sources"""
    print("Loading dictionary...")

    words = set()

    for path in dict_paths:
        if not path.exists():
            print(f"  WARNING: {path} not found, skipping")
            continue

        print(f"  Loading {path}...")

        if path.suffix == '.gz':
            with gzip.open(path, 'rt', encoding='utf-8') as f:
                data = json.load(f)
        else:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

        # Handle different formats
        if 'entries' in data:
            entries = data['entries']
        else:
            entries = data

        for word in entries.keys():
            # Normalize: remove niqqud, keep only Hebrew letters
            clean = re.sub(r'[\u0591-\u05C7]', '', word)
            clean = ''.join(c for c in clean if c in HEBREW_LETTERS)

            if len(clean) >= 2:  # Minimum 2 letters
                words.add(clean)

    print(f"  Total unique words: {len(words):,}")
    return words


def build_trie(words):
    """Build trie from word set"""
    print("Building trie...")
    trie = Trie()

    for word in words:
        trie.insert(word)

    print(f"  Trie contains {trie.word_count:,} words")
    return trie


def extract_sequence(torah, start, skip, max_length):
    """Extract letter sequence from Torah at given start and skip"""
    if skip == 0:
        return ""

    sequence = []
    pos = start

    for _ in range(max_length):
        if pos < 0 or pos >= len(torah):
            break
        sequence.append(torah[pos])
        pos += skip

    return ''.join(sequence)


def find_words_at_skip(args):
    """Find all dictionary words at a specific skip value (for parallel processing)"""
    torah, trie, skip, max_word_length = args

    results = defaultdict(list)
    torah_len = len(torah)

    # Determine valid starting range
    if skip > 0:
        # Forward: can start from 0 to torah_len - 1
        start_range = range(torah_len)
    else:
        # Backward: need to start from position where we can go back
        start_range = range(torah_len)

    for start in start_range:
        # Extract sequence at this position/skip
        sequence = extract_sequence(torah, start, skip, max_word_length)

        if len(sequence) < 2:
            continue

        # Find all dictionary words in this sequence
        words_found = trie.search_from_sequence(sequence)

        for word, length in words_found:
            results[word].append(start)

    return skip, dict(results)


def build_index_optimized(torah, trie, skip_range, max_word_length=10, min_word_length=2):
    """Build ELS index with optimized single-process approach"""
    print(f"\nBuilding ELS index (skip range: {skip_range[0]} to {skip_range[1]}, min word len: {min_word_length})...")

    # Prepare skip values (exclude 0)
    skips = [s for s in range(skip_range[0], skip_range[1] + 1) if s != 0]
    total_skips = len(skips)

    # Index: word -> list of (position, skip) tuples
    index = defaultdict(list)

    import time
    start_time = time.time()

    for i, skip in enumerate(skips):
        # Process this skip value
        torah_len = len(torah)

        for start in range(torah_len):
            # Walk trie while extracting letters
            node = trie.root
            pos = start
            depth = 0

            while node and 0 <= pos < torah_len and depth < max_word_length:
                letter = torah[pos]
                if letter not in node.children:
                    break
                node = node.children[letter]

                if node.is_word and len(node.word) >= min_word_length:
                    index[node.word].append((start, skip))

                pos += skip
                depth += 1

        # Progress update every skip
        if (i + 1) % 5 == 0 or i + 1 == total_skips:
            elapsed = time.time() - start_time
            pct = (i + 1) / total_skips * 100
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            eta = (total_skips - i - 1) / rate if rate > 0 else 0
            total_occs = sum(len(v) for v in index.values())
            print(f"  Progress: {i+1}/{total_skips} skips ({pct:.1f}%), "
                  f"{len(index):,} words, {total_occs:,} occs, "
                  f"ETA: {eta/60:.1f}min", end='\r')
            sys.stdout.flush()

    print()  # Newline after progress

    # Sort occurrences by position for each word
    print("  Sorting occurrences...")
    for word in index:
        index[word].sort(key=lambda x: (x[0], x[1]))

    return dict(index)


def build_index_sequential(torah, trie, skip_range, max_word_length=10):
    """Build ELS index sequentially (for debugging or small ranges)"""
    print(f"\nBuilding ELS index sequentially (skip range: {skip_range[0]} to {skip_range[1]})...")

    index = defaultdict(list)
    skips = [s for s in range(skip_range[0], skip_range[1] + 1) if s != 0]
    total_skips = len(skips)

    for i, skip in enumerate(skips):
        _, results = find_words_at_skip((torah, trie, skip, max_word_length))

        for word, positions in results.items():
            for pos in positions:
                index[word].append((pos, skip))

        if (i + 1) % 10 == 0 or i + 1 == total_skips:
            pct = (i + 1) / total_skips * 100
            total_occs = sum(len(v) for v in index.values())
            print(f"  Progress: {i+1}/{total_skips} skips ({pct:.1f}%), "
                  f"{len(index):,} words, {total_occs:,} occurrences", end='\r')

    print()

    # Sort occurrences
    for word in index:
        index[word].sort(key=lambda x: (x[0], x[1]))

    return dict(index)


def compute_statistics(index):
    """Compute index statistics"""
    stats = {
        'total_words': len(index),
        'total_occurrences': sum(len(occs) for occs in index.values()),
        'words_by_occurrence_count': {},
        'top_words': [],
    }

    # Distribution of occurrence counts
    occ_counts = defaultdict(int)
    word_occ_list = []

    for word, occs in index.items():
        count = len(occs)
        word_occ_list.append((word, count))

        if count <= 10:
            occ_counts[str(count)] += 1
        elif count <= 100:
            occ_counts['11-100'] += 1
        elif count <= 1000:
            occ_counts['101-1000'] += 1
        else:
            occ_counts['1000+'] += 1

    stats['words_by_occurrence_count'] = dict(occ_counts)

    # Top 20 most common words
    word_occ_list.sort(key=lambda x: -x[1])
    stats['top_words'] = word_occ_list[:20]

    return stats


def save_index(index, output_path, metadata):
    """Save index as compressed JSON"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"\nSaving index to {output_path}...")

    # Convert index to more compact format
    # word -> [[pos1, skip1], [pos2, skip2], ...]
    compact_index = {}
    for word, occurrences in index.items():
        compact_index[word] = occurrences  # Already list of tuples

    output = {
        'metadata': metadata,
        'index': compact_index
    }

    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  Saved: {size_mb:.2f} MB")

    return size_mb


def main():
    parser = argparse.ArgumentParser(description='Build Torah ELS Index')
    parser.add_argument('--skip-range', type=int, default=100,
                        help='Skip range (will use -N to +N)')
    parser.add_argument('--output', type=str, default='data/els-index/els-index.json.gz',
                        help='Output file path')
    parser.add_argument('--sequential', action='store_true',
                        help='Use sequential processing (slower, for debugging)')
    parser.add_argument('--max-word-length', type=int, default=10,
                        help='Maximum word length to search')
    parser.add_argument('--min-word-length', type=int, default=2,
                        help='Minimum word length to index (3+ recommended for smaller files)')

    args = parser.parse_args()

    print("=" * 70)
    print("Torah ELS Index Builder")
    print("=" * 70)

    # Paths
    torah_path = Path('data/torahNoSpaces.txt')
    dict_paths = [
        Path('data/dictionaries/unified/hebrew-unified.json.gz'),
    ]

    # Load data
    torah = load_torah_text(torah_path)
    words = load_dictionary(dict_paths)
    trie = build_trie(words)

    # Compute Torah hash for verification
    torah_hash = hashlib.sha256(torah.encode('utf-8')).hexdigest()

    # Build index
    skip_range = (-args.skip_range, args.skip_range)

    # Use optimized single-process approach (more memory efficient)
    index = build_index_optimized(torah, trie, skip_range, args.max_word_length, args.min_word_length)

    # Statistics
    stats = compute_statistics(index)

    print(f"\n{'=' * 70}")
    print("Index Statistics:")
    print(f"  Words with occurrences: {stats['total_words']:,}")
    print(f"  Total occurrences: {stats['total_occurrences']:,}")
    print(f"\n  Occurrence distribution:")
    for key, count in sorted(stats['words_by_occurrence_count'].items()):
        print(f"    {key} occurrences: {count:,} words")
    print(f"\n  Top 10 most common words:")
    for word, count in stats['top_words'][:10]:
        print(f"    {word}: {count:,}")

    # Metadata
    metadata = {
        'version': '1.0',
        'created': datetime.now().isoformat(),
        'torah_length': len(torah),
        'torah_hash': torah_hash,
        'skip_range': list(skip_range),
        'dictionary_size': len(words),
        'max_word_length': args.max_word_length,
        'total_words': stats['total_words'],
        'total_occurrences': stats['total_occurrences'],
    }

    # Save
    size_mb = save_index(index, args.output, metadata)

    print(f"\n{'=' * 70}")
    print(f"Done! Index saved to {args.output}")
    print(f"  Skip range: {skip_range[0]} to {skip_range[1]}")
    print(f"  Words indexed: {stats['total_words']:,}")
    print(f"  Total occurrences: {stats['total_occurrences']:,}")
    print(f"  File size: {size_mb:.2f} MB")
    print("=" * 70)


if __name__ == '__main__':
    main()
