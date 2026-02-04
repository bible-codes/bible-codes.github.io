#!/usr/bin/env python3
"""
Build Unified Hebrew Dictionary

Merges multiple dictionary sources into a single unified dictionary:
- BDB (Brown-Driver-Briggs)
- Wiktionary
- Tanakh Extracted

Features:
- Deduplication with provenance tracking
- Best root selection by source priority
- Era classification
- Inflection mapping

Output: Unified dictionary for offline PWA use
"""

import json
import gzip
from pathlib import Path
from collections import defaultdict
import re


# Source priorities (lower = better)
SOURCE_PRIORITY = {
    'bdb': 1,
    'strongs': 2,  # Strong's has verified data, same era as BDB
    'wiktionary': 3,
    'tanakh': 4,
    'wikipedia': 5,  # Modern Hebrew vocabulary from Wikipedia titles
}

# Hebrew letters for validation
HEBREW_LETTERS = set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ')

# Final letter mapping
FINAL_TO_REGULAR = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}


def normalize_word(word):
    """Normalize Hebrew word for deduplication"""
    if not word:
        return ''

    # Remove niqqud
    word = re.sub(r'[\u0591-\u05C7]', '', word)

    # Convert final letters
    normalized = ''.join(FINAL_TO_REGULAR.get(c, c) for c in word)

    return normalized


def load_source(source_name, file_path):
    """Load a dictionary source file"""
    print(f"  Loading {source_name} from {file_path}...")

    with gzip.open(file_path, 'rt', encoding='utf-8') as f:
        data = json.load(f)

    # Get entries (different formats)
    if 'entries' in data:
        entries = data['entries']
    else:
        entries = data

    print(f"    Loaded {len(entries)} entries")
    return entries


def merge_entries(sources):
    """Merge entries from all sources"""
    unified = {}
    stats = defaultdict(int)

    # Process each source in priority order
    for source_name in sorted(SOURCE_PRIORITY.keys(), key=lambda x: SOURCE_PRIORITY[x]):
        if source_name not in sources:
            continue

        entries = sources[source_name]
        print(f"  Merging {source_name} ({len(entries)} entries)...")

        for word, entry in entries.items():
            # Normalize for deduplication
            normalized = normalize_word(word)
            if not normalized:
                continue

            # Use original word as key (preserves finals)
            key = word

            if key not in unified:
                # New entry
                unified[key] = {
                    'word': word,
                    'normalized': normalized,
                    'sources': [source_name],
                    'root': None,
                    'rootSource': None,
                    'pos': None,
                    'binyan': None,
                    'definitions': [],
                    'era': None,
                    'refs': [],
                    'related': [],
                    'variants': [],
                }
                stats['new_entries'] += 1
            else:
                # Merge with existing
                unified[key]['sources'].append(source_name)
                stats['merged_entries'] += 1

            # Update fields from this source
            update_entry(unified[key], entry, source_name)

    return unified, stats


def update_entry(unified_entry, source_entry, source_name):
    """Update unified entry with data from source"""

    # Root (use highest priority)
    source_root = source_entry.get('root')
    if source_root:
        current_priority = SOURCE_PRIORITY.get(unified_entry.get('rootSource'), 999)
        new_priority = SOURCE_PRIORITY.get(source_name, 999)

        if new_priority < current_priority or unified_entry['root'] is None:
            unified_entry['root'] = source_root
            unified_entry['rootSource'] = source_name

    # POS (use highest priority)
    source_pos = source_entry.get('pos')
    if source_pos and not unified_entry['pos']:
        unified_entry['pos'] = source_pos

    # Binyan
    source_binyan = source_entry.get('binyan')
    if source_binyan and not unified_entry['binyan']:
        unified_entry['binyan'] = source_binyan

    # Definitions (merge, avoid duplicates)
    source_defs = source_entry.get('definitions', [])
    for d in source_defs:
        if d and d not in unified_entry['definitions']:
            unified_entry['definitions'].append(d)

    # Era (prefer verified sources)
    source_era = source_entry.get('era')
    if source_era:
        if not unified_entry['era'] or SOURCE_PRIORITY[source_name] < SOURCE_PRIORITY.get(unified_entry.get('eraSource', 'tanakh'), 999):
            unified_entry['era'] = source_era
            unified_entry['eraSource'] = source_name

    # References (merge)
    source_refs = source_entry.get('refs', [])
    for r in source_refs:
        if r and r not in unified_entry['refs']:
            unified_entry['refs'].append(r)

    # Related words (merge)
    source_related = source_entry.get('related', [])
    for r in source_related:
        if r and r not in unified_entry['related']:
            unified_entry['related'].append(r)


def classify_entries(unified):
    """Apply era and type classification"""
    print("  Classifying entries...")

    for word, entry in unified.items():
        # Era classification
        if not entry.get('era'):
            if 'bdb' in entry['sources']:
                entry['era'] = 'biblical'
            elif any(s in entry['sources'] for s in ['wiktionary']):
                # Check if has biblical references
                if entry.get('refs'):
                    entry['era'] = 'biblical'
                else:
                    entry['era'] = 'modern'

        # Word type classification
        if entry.get('pos') in ['proper_noun', 'proper_noun_m', 'proper_noun_f', 'place_name']:
            entry['type'] = 'proper_noun'
        elif is_foreign_word(word):
            entry['type'] = 'foreign'
        else:
            entry['type'] = 'native'


def is_foreign_word(word):
    """Check if word appears to be foreign"""
    # Check if mostly non-Hebrew characters
    hebrew_count = sum(1 for c in word if c in HEBREW_LETTERS)
    return hebrew_count < len(word) * 0.5


def build_inflection_map(unified):
    """Build mapping from inflected forms to lemmas"""
    print("  Building inflection map...")

    inflection_map = {}
    roots_to_words = defaultdict(list)

    # Group words by root
    for word, entry in unified.items():
        root = entry.get('root')
        if root:
            roots_to_words[root].append(word)

    # For each root, identify potential lemma and inflections
    for root, words in roots_to_words.items():
        if len(words) < 2:
            continue

        # Simple heuristic: shortest word with same letters as root is likely lemma
        lemma = None
        for word in sorted(words, key=len):
            normalized = normalize_word(word)
            if normalized == normalize_word(root) or len(normalized) == 3:
                lemma = word
                break

        if not lemma:
            lemma = words[0]

        # Map inflections to lemma
        for word in words:
            if word != lemma:
                inflection_map[word] = {
                    'lemma': lemma,
                    'root': root,
                }

    return inflection_map


def clean_for_output(unified):
    """Clean entries for output (remove internal fields)"""
    output = {}

    for word, entry in unified.items():
        clean = {
            'word': entry['word'],
            'root': entry.get('root'),
            'pos': entry.get('pos'),
            'sources': entry['sources'],
        }

        # Optional fields (only include if present)
        if entry.get('binyan'):
            clean['binyan'] = entry['binyan']
        if entry.get('definitions'):
            clean['definitions'] = entry['definitions'][:5]  # Limit
        if entry.get('era'):
            clean['era'] = entry['era']
        if entry.get('type') and entry['type'] != 'native':
            clean['type'] = entry['type']
        if entry.get('refs'):
            clean['refs'] = entry['refs'][:5]  # Limit
        if entry.get('related'):
            clean['related'] = entry['related'][:5]  # Limit

        # Remove None values
        output[word] = {k: v for k, v in clean.items() if v is not None}

    return output


def save_dictionary(dictionary, inflection_map, output_dir):
    """Save unified dictionary and inflection map"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save main dictionary
    dict_path = output_dir / 'hebrew-unified.json.gz'
    print(f"  Saving dictionary to {dict_path}...")

    dict_output = {
        'source': {
            'name': 'Unified Hebrew Dictionary',
            'short_name': 'unified',
            'description': 'Merged from BDB, Wiktionary, and Tanakh extraction',
            'license': 'Mixed (CC-BY-SA for most sources)',
            'sources': ['bdb', 'wiktionary', 'tanakh'],
        },
        'version': '1.0',
        'entries': dictionary,
    }

    with gzip.open(dict_path, 'wt', encoding='utf-8') as f:
        json.dump(dict_output, f, ensure_ascii=False, separators=(',', ':'))

    dict_size = dict_path.stat().st_size / 1024
    print(f"    Saved {len(dictionary)} entries ({dict_size:.1f} KB)")

    # Save inflection map
    inflect_path = output_dir / 'inflection-map.json.gz'
    print(f"  Saving inflection map to {inflect_path}...")

    inflect_output = {
        'source': 'unified-dictionary',
        'version': '1.0',
        'mappings': inflection_map,
    }

    with gzip.open(inflect_path, 'wt', encoding='utf-8') as f:
        json.dump(inflect_output, f, ensure_ascii=False, separators=(',', ':'))

    inflect_size = inflect_path.stat().st_size / 1024
    print(f"    Saved {len(inflection_map)} mappings ({inflect_size:.1f} KB)")

    return dict_size, inflect_size


def print_stats(unified, inflection_map, stats):
    """Print statistics"""
    print("\n" + "=" * 60)
    print("Unified Dictionary Statistics")
    print("=" * 60)

    print(f"\nTotal unique entries: {len(unified)}")
    print(f"New entries: {stats['new_entries']}")
    print(f"Merged entries: {stats['merged_entries']}")
    print(f"Inflection mappings: {len(inflection_map)}")

    # Source distribution
    print("\nEntries by source:")
    source_counts = defaultdict(int)
    for entry in unified.values():
        for s in entry['sources']:
            source_counts[s] += 1
    for source, count in sorted(source_counts.items()):
        print(f"  {source}: {count}")

    # Multi-source entries
    multi_source = sum(1 for e in unified.values() if len(e['sources']) > 1)
    print(f"\nMulti-source entries: {multi_source} ({multi_source/len(unified)*100:.1f}%)")

    # Root coverage
    with_root = sum(1 for e in unified.values() if e.get('root'))
    print(f"With root: {with_root} ({with_root/len(unified)*100:.1f}%)")

    # Era distribution
    print("\nEra distribution:")
    era_counts = defaultdict(int)
    for entry in unified.values():
        era = entry.get('era', 'unknown')
        era_counts[era] += 1
    for era, count in sorted(era_counts.items(), key=lambda x: -x[1]):
        print(f"  {era}: {count}")

    # POS distribution
    print("\nPOS distribution (top 10):")
    pos_counts = defaultdict(int)
    for entry in unified.values():
        pos = entry.get('pos', 'unknown')
        pos_counts[pos] += 1
    for pos, count in sorted(pos_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"  {pos}: {count}")


def main():
    print("=" * 60)
    print("Unified Hebrew Dictionary Builder")
    print("=" * 60)

    # Source files
    source_files = {
        'bdb': Path('data/dictionaries/openscriptures-bdb.json.gz'),
        'strongs': Path('data/dictionaries/strongs-hebrew.json.gz'),
        'wiktionary': Path('data/dictionaries/hebrew-wiktionary.json.gz'),
        'tanakh': Path('data/embeddings/hebrew-roots.json.gz'),
        'wikipedia': Path('data/dictionaries/wikipedia-hebrew.json.gz'),
    }

    # Load sources
    print("\nLoading sources:")
    sources = {}
    for name, path in source_files.items():
        if path.exists():
            sources[name] = load_source(name, path)
        else:
            print(f"  WARNING: {path} not found, skipping")

    # Merge entries
    print("\nMerging entries:")
    unified, stats = merge_entries(sources)

    # Classify
    classify_entries(unified)

    # Build inflection map
    inflection_map = build_inflection_map(unified)

    # Clean for output
    print("\nPreparing output:")
    clean_unified = clean_for_output(unified)

    # Save
    output_dir = Path('data/dictionaries/unified')
    dict_size, inflect_size = save_dictionary(clean_unified, inflection_map, output_dir)

    # Print stats
    print_stats(unified, inflection_map, stats)

    print("\n" + "=" * 60)
    print(f"Total file size: {dict_size + inflect_size:.1f} KB")
    print("Done!")


if __name__ == '__main__':
    main()
