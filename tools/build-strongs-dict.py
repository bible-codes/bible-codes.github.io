#!/usr/bin/env python3
"""
Build Hebrew Dictionary from Strong's Concordance

Parses Strong's Hebrew dictionary from OpenScriptures format.
Source: https://github.com/openscriptures/strongs

Features:
- 8,674 Hebrew word entries with Strong's numbers
- Root derivations and cross-references
- KJV definitions
- Proper Hebrew lemmas

License: Public Domain (original 1894 Strong's)
"""

import json
import gzip
import re
from pathlib import Path
from collections import defaultdict


# Hebrew letters for validation
HEBREW_LETTERS = set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ')


def is_hebrew_word(word):
    """Check if word is primarily Hebrew letters"""
    if not word:
        return False
    # Remove niqqud and other marks
    clean = re.sub(r'[\u0591-\u05C7]', '', word)
    hebrew_count = sum(1 for c in clean if c in HEBREW_LETTERS)
    return hebrew_count > 0 and hebrew_count >= len(clean) * 0.5


def extract_root_from_derivation(derivation, all_entries):
    """Try to extract root word from derivation field"""
    if not derivation:
        return None

    # Look for H### references
    refs = re.findall(r'H(\d+)', derivation)
    for ref in refs:
        strong_id = f'H{ref}'
        if strong_id in all_entries:
            ref_entry = all_entries[strong_id]
            lemma = ref_entry.get('lemma', '')
            if lemma and is_hebrew_word(lemma):
                # Check if it's a primitive root
                if 'primitive' in ref_entry.get('derivation', '').lower():
                    return remove_niqqud(lemma)

    return None


def remove_niqqud(word):
    """Remove niqqud from Hebrew word"""
    if not word:
        return ''
    return re.sub(r'[\u0591-\u05C7]', '', word)


def classify_pos(entry):
    """Classify part of speech from Strong's data"""
    derivation = entry.get('derivation', '').lower()
    strongs_def = entry.get('strongs_def', '').lower()
    kjv_def = entry.get('kjv_def', '').lower()

    # Check for proper nouns (names)
    if any(x in strongs_def for x in ['israelite', 'a son of', 'a daughter of', 'the name of', 'a place']):
        return 'proper_noun'

    # Check for verbs
    if 'primitive root' in derivation or 'a primitive root' in derivation:
        return 'verb'
    if any(x in strongs_def for x in ['to ', 'causative', 'denominative']):
        return 'verb'

    # Check for nouns
    if any(x in strongs_def for x in ['a place', 'a person', 'abstract', 'concrete']):
        return 'noun'

    # Check for adjectives
    if 'adjective' in strongs_def:
        return 'adj'

    # Check for particles/conjunctions
    if any(x in strongs_def for x in ['particle', 'conjunction', 'preposition', 'adverb']):
        return 'particle'

    return None


def parse_strongs_js(filepath):
    """Parse Strong's dictionary from JS file"""
    print(f"Parsing {filepath}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # File format: var strongsHebrewDictionary = {...}; then module.exports
    # Find start after '= {'
    equals_idx = content.find('= {')
    if equals_idx == -1:
        raise ValueError("Could not find '= {' in file")

    json_start = equals_idx + 2  # Start at '{'

    # Find end - before module.exports or at };
    module_idx = content.find('module.exports')
    if module_idx != -1:
        end_section = content[json_start:module_idx]
        json_end = json_start + end_section.rfind('}') + 1
    else:
        json_end = content.rfind('};') + 1

    json_str = content[json_start:json_end]
    data = json.loads(json_str)

    print(f"  Found {len(data)} Strong's entries")
    return data


def build_dictionary(strongs_data):
    """Build structured dictionary from Strong's data"""
    entries = {}
    stats = defaultdict(int)

    # First pass: collect all entries
    for strong_id, entry in strongs_data.items():
        lemma = entry.get('lemma', '')
        if not lemma or not is_hebrew_word(lemma):
            stats['skipped_non_hebrew'] += 1
            continue

        stats['total'] += 1

    # Second pass: extract roots and build entries
    for strong_id, entry in strongs_data.items():
        lemma = entry.get('lemma', '')
        if not lemma or not is_hebrew_word(lemma):
            continue

        # Get consonantal form
        consonantal = remove_niqqud(lemma)
        if not consonantal:
            continue

        # Try to extract root
        root = extract_root_from_derivation(entry.get('derivation'), strongs_data)

        # If primitive root, use the word itself as root
        derivation = entry.get('derivation', '').lower()
        if 'primitive' in derivation and len(consonantal) == 3:
            root = consonantal
            stats['primitive_roots'] += 1

        if root:
            stats['with_root'] += 1

        # Classify POS
        pos = classify_pos(entry)
        if pos:
            stats[f'pos_{pos}'] += 1

        # Build definitions
        definitions = []
        if entry.get('strongs_def'):
            definitions.append(entry['strongs_def'])
        if entry.get('kjv_def') and entry['kjv_def'] != entry.get('strongs_def'):
            definitions.append(f"KJV: {entry['kjv_def']}")

        # Create entry (use consonantal as key to match other dictionaries)
        dict_entry = {
            'word': consonantal,
            'lemma_pointed': lemma,
            'strong_id': strong_id,
            'root': root,
            'pos': pos,
            'definitions': definitions[:3],  # Limit definitions
            'derivation': entry.get('derivation'),
            'transliteration': entry.get('xlit'),
            'pronunciation': entry.get('pron'),
        }

        # Remove None values
        dict_entry = {k: v for k, v in dict_entry.items() if v is not None}

        # Use consonantal form as key (may merge entries with same consonants)
        if consonantal in entries:
            # Merge: add Strong's ID to existing
            existing = entries[consonantal]
            if 'strong_ids' not in existing:
                existing['strong_ids'] = [existing.get('strong_id')]
                del existing['strong_id']
            existing['strong_ids'].append(strong_id)
            stats['merged'] += 1
        else:
            entries[consonantal] = dict_entry

    return entries, stats


def save_dictionary(entries, output_path, source_info):
    """Save dictionary as compressed JSON"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output = {
        'source': source_info,
        'version': '1.0',
        'entries': entries,
    }

    print(f"Saving to {output_path}...")

    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = output_path.stat().st_size / 1024
    print(f"  Saved {len(entries)} entries ({size_kb:.1f} KB)")

    return size_kb


def main():
    print("=" * 60)
    print("Strong's Hebrew Concordance Dictionary Builder")
    print("=" * 60)

    # Input file
    input_path = Path('/tmp/strongs/strongs-hebrew-dictionary.js')
    output_path = Path('data/dictionaries/strongs-hebrew.json.gz')

    if not input_path.exists():
        print(f"ERROR: {input_path} not found")
        print("Download from: https://github.com/openscriptures/strongs")
        return

    # Parse Strong's data
    strongs_data = parse_strongs_js(input_path)

    # Build dictionary
    print("\nBuilding dictionary...")
    entries, stats = build_dictionary(strongs_data)

    # Source info
    source_info = {
        'name': "Strong's Hebrew Concordance",
        'short_name': 'strongs',
        'source': 'https://github.com/openscriptures/strongs',
        'original': "A Concise Dictionary of the Words in the Hebrew Bible by James Strong (1894)",
        'license': 'Public Domain',
        'description': "Strong's Hebrew dictionary with numbered entries, definitions, and derivations"
    }

    # Save
    size_kb = save_dictionary(entries, output_path, source_info)

    # Print stats
    print("\n" + "=" * 60)
    print("Statistics:")
    print(f"  Total Hebrew entries: {stats['total']}")
    print(f"  Unique words: {len(entries)}")
    print(f"  Merged entries: {stats.get('merged', 0)}")
    print(f"  Primitive roots: {stats.get('primitive_roots', 0)}")
    print(f"  With root: {stats.get('with_root', 0)}")
    print(f"  Skipped non-Hebrew: {stats.get('skipped_non_hebrew', 0)}")

    print("\nPart of Speech Distribution:")
    for key, value in sorted(stats.items()):
        if key.startswith('pos_'):
            print(f"  {key[4:]}: {value}")

    print(f"\nFile size: {size_kb:.1f} KB")
    print("=" * 60)
    print("Done!")


if __name__ == '__main__':
    main()
