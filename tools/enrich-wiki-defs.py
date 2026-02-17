#!/usr/bin/env python3
"""
Enrich Unified Hebrew Dictionary with Wikipedia Summaries

Reads the unified dictionary, identifies entries without definitions,
fetches article extracts from the Hebrew Wikipedia REST API, and
writes the enriched dictionary back.

Only fetches for words that appear in the ELS index (practical scope).

Usage:
    python3 tools/enrich-wiki-defs.py [--dry-run] [--limit N] [--delay MS]

Options:
    --dry-run   Show stats without fetching
    --limit N   Max terms to fetch (default: all)
    --delay MS  Milliseconds between requests (default: 50)
"""

import json
import gzip
import time
import urllib.request
import urllib.parse
import urllib.error
import sys
import argparse
from pathlib import Path


DICT_PATH = Path('data/dictionaries/unified/hebrew-unified.json.gz')
ELS_INDEX_PATH = Path('data/els-index/els-index-50-min4.json.gz')
WIKI_API = 'https://he.wikipedia.org/api/rest_v1/page/summary/'


def first_sentence(text):
    """Extract the first sentence from a text, capped at ~200 chars."""
    if not text:
        return ''
    # Hebrew period is just '.', also handle '?' and '!'
    for sep in ['. ', '? ', '! ']:
        idx = text.find(sep)
        if idx != -1 and idx < 300:
            return text[:idx + 1]
    # No sentence boundary found, truncate
    if len(text) > 200:
        return text[:200].rsplit(' ', 1)[0] + '...'
    return text


def load_els_words():
    """Load the set of words in the ELS index."""
    if not ELS_INDEX_PATH.exists():
        print(f'Warning: ELS index not found at {ELS_INDEX_PATH}')
        return None
    print(f'Loading ELS index from {ELS_INDEX_PATH}...')
    with gzip.open(ELS_INDEX_PATH, 'rt', encoding='utf-8') as f:
        data = json.load(f)
    words = set(data.get('index', {}).keys())
    print(f'  ELS index contains {len(words)} words')
    return words


def load_dict():
    """Load the unified dictionary."""
    print(f'Loading dictionary from {DICT_PATH}...')
    with gzip.open(DICT_PATH, 'rt', encoding='utf-8') as f:
        data = json.load(f)
    entries = data.get('entries', {})
    print(f'  {len(entries)} entries loaded')
    return data, entries


def save_dict(data):
    """Save the dictionary back to gzip JSON."""
    print(f'Saving dictionary to {DICT_PATH}...')
    with gzip.open(DICT_PATH, 'wt', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print('  Saved.')


def fetch_wiki_summary(term, delay_s=0.05):
    """Fetch Wikipedia summary for a Hebrew term."""
    url = WIKI_API + urllib.parse.quote(term, safe='')
    req = urllib.request.Request(url, headers={
        'User-Agent': 'BibleCodesProject/1.0 (https://bible-codes.github.io)',
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            extract = data.get('extract', '')
            description = data.get('description', '')
            return first_sentence(extract), description
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, None  # Not found
        return None, None
    except Exception:
        return None, None
    finally:
        time.sleep(delay_s)


def main():
    parser = argparse.ArgumentParser(description='Enrich dictionary with Wikipedia summaries')
    parser.add_argument('--dry-run', action='store_true', help='Show stats only')
    parser.add_argument('--limit', type=int, default=0, help='Max terms to fetch (0=all)')
    parser.add_argument('--delay', type=int, default=50, help='Delay between requests in ms')
    args = parser.parse_args()

    delay_s = args.delay / 1000.0

    data, entries = load_dict()
    els_words = load_els_words()

    # Find entries that need definitions
    candidates = []
    for word, entry in entries.items():
        # Must have no definitions
        if entry.get('definitions'):
            continue
        # Must be >= 3 letters
        if len(word) < 3:
            continue
        # If ELS index available, only include words in it
        if els_words is not None and word not in els_words:
            continue
        candidates.append(word)

    print(f'\nCandidates for Wikipedia enrichment: {len(candidates)}')
    if els_words is not None:
        print(f'  (filtered to ELS index overlap)')

    if args.dry_run:
        print('\n--dry-run: exiting without fetching.')
        return

    if args.limit > 0:
        candidates = candidates[:args.limit]
        print(f'  Limited to first {args.limit} terms')

    enriched = 0
    not_found = 0
    errors = 0

    for i, word in enumerate(candidates):
        if (i + 1) % 100 == 0:
            print(f'  Progress: {i + 1}/{len(candidates)} (enriched: {enriched}, not found: {not_found})')

        extract, description = fetch_wiki_summary(word, delay_s)

        if extract is None:
            not_found += 1
            continue

        if extract:
            entries[word]['definitions'] = [extract]
            if 'wikipedia-summary' not in entries[word].get('sources', []):
                entries[word].setdefault('sources', []).append('wikipedia-summary')
            enriched += 1
        else:
            not_found += 1

    print(f'\n=== Results ===')
    print(f'  Total candidates: {len(candidates)}')
    print(f'  Enriched:         {enriched}')
    print(f'  Not found:        {not_found}')

    if enriched > 0:
        save_dict(data)
        print(f'\nDictionary updated with {enriched} new definitions.')
    else:
        print('\nNo changes made.')


if __name__ == '__main__':
    main()
