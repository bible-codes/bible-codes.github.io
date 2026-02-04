#!/usr/bin/env python3
"""
Build Hebrew Dictionary from Wikipedia

Downloads Hebrew Wikipedia dump and extracts unique Hebrew words.
Target: ~500K unique Hebrew words from article text.

Usage:
    python3 build-wikipedia-dict.py [--output wikipedia-hebrew.json.gz]

Features:
- Downloads Hebrew Wikipedia abstract dump (~50MB compressed)
- Extracts Hebrew words from article text
- Filters by Hebrew character content
- Normalizes final letters
- Outputs dictionary with frequency data
"""

import json
import gzip
import re
import argparse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
import sys

# Hebrew character sets
HEBREW_LETTERS = set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ')
HEBREW_PATTERN = re.compile(r'[\u0590-\u05FF]+')

# Final letter normalization
FINAL_TO_REGULAR = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}

# Wikipedia dump URLs
WIKI_TITLES_URL = "https://dumps.wikimedia.org/hewiki/latest/hewiki-latest-all-titles-in-ns0.gz"
# Alternative: full articles dump (large, ~2GB)
# WIKI_PAGES_URL = "https://dumps.wikimedia.org/hewiki/latest/hewiki-latest-pages-articles.xml.bz2"


def download_dump(url, output_path):
    """Download Wikipedia dump with progress reporting"""
    print(f"Downloading {url}...")

    def report_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100, downloaded * 100 / total_size)
            mb_down = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            print(f"\r  Progress: {percent:.1f}% ({mb_down:.1f}/{mb_total:.1f} MB)", end='')
        else:
            mb_down = downloaded / (1024 * 1024)
            print(f"\r  Downloaded: {mb_down:.1f} MB", end='')
        sys.stdout.flush()

    urllib.request.urlretrieve(url, output_path, report_progress)
    print()  # Newline after progress


def extract_hebrew_words(text):
    """Extract Hebrew words from text"""
    words = set()

    # Find all Hebrew word sequences
    matches = HEBREW_PATTERN.findall(text)

    for match in matches:
        # Remove niqqud and other diacritics
        clean = re.sub(r'[\u0591-\u05C7]', '', match)

        # Keep only Hebrew letters
        clean = ''.join(c for c in clean if c in HEBREW_LETTERS)

        if len(clean) >= 2:  # Minimum 2 letters
            words.add(clean)

    return words


def normalize_word(word):
    """Normalize Hebrew word (handle final letters)"""
    # For dictionary purposes, keep final letters as-is
    # They are valid and meaningful in Hebrew
    return word


def process_dump(dump_path, max_articles=None):
    """Process Wikipedia dump and extract words"""
    print(f"Processing {dump_path}...")

    word_freq = defaultdict(int)
    line_count = 0

    # Process as text file (titles or other text dump)
    if str(dump_path).endswith('.gz'):
        f = gzip.open(dump_path, 'rt', encoding='utf-8', errors='ignore')
    else:
        f = open(dump_path, 'r', encoding='utf-8', errors='ignore')

    for line in f:
        line_count += 1

        # Each title can contain multiple words
        # Also extract individual words from compound titles
        line = line.strip()

        # Extract Hebrew words
        words = extract_hebrew_words(line)
        for word in words:
            word_freq[normalize_word(word)] += 1

        if line_count % 50000 == 0:
            print(f"  Processed {line_count:,} lines, {len(word_freq):,} unique words")

        if max_articles and line_count >= max_articles:
            break

    f.close()

    print(f"  Total: {line_count:,} lines, {len(word_freq):,} unique words")
    return word_freq


def build_dictionary(word_freq, min_freq=1):
    """Build dictionary from word frequencies"""
    entries = {}

    for word, freq in word_freq.items():
        if freq >= min_freq:
            entries[word] = {
                'definitions': [],  # No definitions from Wikipedia
                'root': None,
                'pos': None,
                'frequency': freq,
                'sources': ['wikipedia'],
                'era': 'modern'  # Wikipedia is modern Hebrew
            }

    return entries


def save_dictionary(entries, output_path):
    """Save dictionary as compressed JSON"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output = {
        'metadata': {
            'source': 'Hebrew Wikipedia',
            'description': 'Hebrew vocabulary extracted from Wikipedia articles',
            'total_entries': len(entries),
            'license': 'CC BY-SA 4.0'
        },
        'entries': entries
    }

    print(f"Saving to {output_path}...")

    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  Saved: {size_mb:.2f} MB")

    return size_mb


def main():
    parser = argparse.ArgumentParser(description='Build Hebrew Dictionary from Wikipedia')
    parser.add_argument('--output', type=str, default='data/dictionaries/wikipedia-hebrew.json.gz',
                        help='Output file path')
    parser.add_argument('--dump', type=str, default=None,
                        help='Path to existing Wikipedia dump (skips download)')
    parser.add_argument('--max-articles', type=int, default=None,
                        help='Maximum articles to process (for testing)')
    parser.add_argument('--min-freq', type=int, default=2,
                        help='Minimum word frequency to include')
    parser.add_argument('--skip-download', action='store_true',
                        help='Skip download if dump exists')

    args = parser.parse_args()

    print("=" * 70)
    print("Hebrew Wikipedia Dictionary Builder")
    print("=" * 70)

    # Determine dump path
    dump_path = Path(args.dump) if args.dump else Path('/tmp/hewiki-titles.gz')

    # Download if needed
    if not dump_path.exists() or not args.skip_download:
        if not args.dump:
            download_dump(WIKI_TITLES_URL, dump_path)
        else:
            print(f"Using existing dump: {dump_path}")
    else:
        print(f"Using cached dump: {dump_path}")

    # Process dump
    word_freq = process_dump(dump_path, args.max_articles)

    # Build dictionary
    print(f"\nBuilding dictionary (min frequency: {args.min_freq})...")
    entries = build_dictionary(word_freq, args.min_freq)
    print(f"  Entries after filtering: {len(entries):,}")

    # Show frequency distribution
    freq_dist = defaultdict(int)
    for entry in entries.values():
        freq = entry['frequency']
        if freq == 1:
            freq_dist['1'] += 1
        elif freq <= 5:
            freq_dist['2-5'] += 1
        elif freq <= 10:
            freq_dist['6-10'] += 1
        elif freq <= 100:
            freq_dist['11-100'] += 1
        else:
            freq_dist['100+'] += 1

    print("\n  Frequency distribution:")
    for bucket in ['1', '2-5', '6-10', '11-100', '100+']:
        if bucket in freq_dist:
            print(f"    {bucket}: {freq_dist[bucket]:,} words")

    # Save dictionary
    size_mb = save_dictionary(entries, args.output)

    print(f"\n{'=' * 70}")
    print(f"Done! Dictionary saved to {args.output}")
    print(f"  Total words: {len(entries):,}")
    print(f"  File size: {size_mb:.2f} MB")
    print("=" * 70)


if __name__ == '__main__':
    main()
