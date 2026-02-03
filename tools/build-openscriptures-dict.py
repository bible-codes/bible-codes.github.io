#!/usr/bin/env python3
"""
Build Hebrew Dictionary from Open Scriptures Hebrew Lexicon

Parses BrownDriverBriggs.xml to create a structured Hebrew dictionary
with verified roots, definitions, and parts of speech.

Source: https://github.com/openscriptures/HebrewLexicon
License: CC-BY-SA
"""

import json
import gzip
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
import re
import sys


def parse_bdb_lexicon(xml_path):
    """Parse Brown-Driver-Briggs XML lexicon"""

    print(f"Parsing {xml_path}...")

    # Parse XML
    tree = ET.parse(xml_path)
    root = tree.getroot()

    # Handle namespace
    ns = {'bdb': 'http://openscriptures.github.com/morphhb/namespace'}

    entries = []
    root_words = {}  # Track which words are roots

    # Find all entries
    for entry in root.findall('.//bdb:entry', ns):
        entry_data = parse_entry(entry, ns)
        if entry_data:
            entries.append(entry_data)

            # Track if this is a root entry
            if entry.get('type') == 'root':
                word = entry_data.get('word', '')
                if word:
                    root_words[word] = True

    print(f"Parsed {len(entries)} entries, {len(root_words)} root words")

    return entries, root_words


def parse_entry(entry, ns):
    """Parse a single lexicon entry"""

    entry_id = entry.get('id', '')
    entry_type = entry.get('type', '')  # 'root' or empty

    # Get Hebrew word(s)
    word_elements = entry.findall('bdb:w', ns)
    if not word_elements:
        return None

    # Primary word is first <w> element
    primary_word = word_elements[0].text
    if not primary_word:
        return None

    # Clean word (remove punctuation markers)
    primary_word = clean_hebrew(primary_word)
    if not primary_word:
        return None

    # Get part of speech
    pos_elements = entry.findall('bdb:pos', ns)
    pos = None
    if pos_elements:
        pos = pos_elements[0].text

    # Get definitions
    definitions = []
    for def_elem in entry.findall('bdb:def', ns):
        if def_elem.text:
            definitions.append(def_elem.text.strip())

    # Get senses (nested definitions)
    for sense in entry.findall('.//bdb:sense', ns):
        for def_elem in sense.findall('bdb:def', ns):
            if def_elem.text:
                definitions.append(def_elem.text.strip())

    # Get biblical references
    refs = []
    for ref in entry.findall('.//bdb:ref', ns):
        r = ref.get('r', '')
        if r:
            refs.append(r)

    # Build entry
    result = {
        'word': primary_word,
        'id': entry_id,
        'is_root': entry_type == 'root',
        'pos': normalize_pos(pos),
        'definitions': definitions[:5],  # Limit to 5 definitions
        'refs': refs[:10],  # Limit references
    }

    # If not a root entry, try to extract root from related entries
    # (BDB often has mod="II" or src="..." attributes)
    if not result['is_root']:
        mod = entry.get('mod', '')
        if mod:
            result['root_ref'] = mod

    return result


def clean_hebrew(text):
    """Clean Hebrew text - remove niqqud and special markers"""
    if not text:
        return ''

    # Remove niqqud (combining marks U+0591-U+05C7)
    text = re.sub(r'[\u0591-\u05C7]', '', text)

    # Remove special BDB markers
    text = text.replace('֫', '')  # meteg
    text = text.replace('֑', '')  # etnahta
    text = text.replace('׳', '')  # geresh
    text = text.replace('׃', '')  # sof pasuq

    # Keep only Hebrew letters
    text = re.sub(r'[^\u05D0-\u05EA]', '', text)

    return text.strip()


def normalize_pos(pos):
    """Normalize part of speech tags"""
    if not pos:
        return None

    pos = pos.lower().strip()

    # Map BDB POS to standard tags
    pos_map = {
        'n.m': 'noun_m',
        'n.m.': 'noun_m',
        'n.[m.]': 'noun_m',
        'n.f': 'noun_f',
        'n.f.': 'noun_f',
        'n.[f.]': 'noun_f',
        'vb': 'verb',
        'vb.': 'verb',
        'adj': 'adj',
        'adj.': 'adj',
        'adv': 'adv',
        'adv.': 'adv',
        'prep': 'prep',
        'prep.': 'prep',
        'conj': 'conj',
        'conj.': 'conj',
        'interj': 'interj',
        'interj.': 'interj',
        'n.pr': 'proper_noun',
        'n.pr.': 'proper_noun',
        'n.pr.m': 'proper_noun_m',
        'n.pr.m.': 'proper_noun_m',
        'n.pr.f': 'proper_noun_f',
        'n.pr.f.': 'proper_noun_f',
        'n.pr.loc': 'place_name',
        'n.pr.loc.': 'place_name',
        'coll': 'collective',
        'coll.': 'collective',
    }

    return pos_map.get(pos, pos)


def build_dictionary(entries, root_words):
    """Build final dictionary structure"""

    dictionary = {}
    stats = {
        'total_entries': 0,
        'root_entries': 0,
        'with_definitions': 0,
        'with_pos': 0,
        'unique_roots': set(),
        'pos_distribution': defaultdict(int),
    }

    for entry in entries:
        word = entry['word']
        if not word or len(word) < 2:
            continue

        # Skip if already exists (keep first/better entry)
        if word in dictionary:
            continue

        # Determine root
        root = None
        if entry['is_root']:
            root = word
            stats['unique_roots'].add(word)
        elif word in root_words:
            root = word

        # Build dictionary entry
        dict_entry = {
            'root': root,
            'pos': entry['pos'],
            'definitions': entry['definitions'],
            'is_root': entry['is_root'],
            'bdb_id': entry['id'],
        }

        # Only include refs for important entries
        if entry['is_root'] and entry.get('refs'):
            dict_entry['refs'] = entry['refs'][:5]

        dictionary[word] = dict_entry

        # Update stats
        stats['total_entries'] += 1
        if entry['is_root']:
            stats['root_entries'] += 1
        if entry['definitions']:
            stats['with_definitions'] += 1
        if entry['pos']:
            stats['with_pos'] += 1
            stats['pos_distribution'][entry['pos']] += 1

    stats['unique_roots'] = len(stats['unique_roots'])
    stats['pos_distribution'] = dict(stats['pos_distribution'])

    return dictionary, stats


def save_dictionary(dictionary, output_path, source_info):
    """Save dictionary as compressed JSON"""

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Create wrapper with metadata
    output = {
        'source': source_info,
        'version': '1.0',
        'entries': dictionary
    }

    print(f"Saving to {output_path}...")

    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = output_path.stat().st_size / 1024
    print(f"Saved {len(dictionary)} entries ({size_kb:.1f} KB)")

    return size_kb


def main():
    # Paths
    xml_path = Path('/tmp/HebrewLexicon/BrownDriverBriggs.xml')
    output_path = Path('data/dictionaries/openscriptures-bdb.json.gz')

    if not xml_path.exists():
        print(f"ERROR: {xml_path} not found")
        print("Run: git clone https://github.com/openscriptures/HebrewLexicon.git /tmp/HebrewLexicon")
        sys.exit(1)

    print("=" * 60)
    print("Open Scriptures BDB Dictionary Builder")
    print("=" * 60)

    # Parse XML
    entries, root_words = parse_bdb_lexicon(xml_path)

    # Build dictionary
    dictionary, stats = build_dictionary(entries, root_words)

    # Source info
    source_info = {
        'name': 'Brown-Driver-Briggs Hebrew Lexicon',
        'short_name': 'BDB',
        'source': 'Open Scriptures Hebrew Lexicon',
        'url': 'https://github.com/openscriptures/HebrewLexicon',
        'license': 'CC-BY-SA',
        'description': 'Classic Biblical Hebrew lexicon with roots, definitions, and biblical references'
    }

    # Save
    size_kb = save_dictionary(dictionary, output_path, source_info)

    # Print stats
    print("\n" + "=" * 60)
    print("Statistics:")
    print(f"  Total entries: {stats['total_entries']}")
    print(f"  Root entries: {stats['root_entries']}")
    print(f"  Unique roots: {stats['unique_roots']}")
    print(f"  With definitions: {stats['with_definitions']}")
    print(f"  With POS: {stats['with_pos']}")
    print(f"  File size: {size_kb:.1f} KB")

    print("\nPart of Speech Distribution:")
    for pos, count in sorted(stats['pos_distribution'].items(), key=lambda x: -x[1])[:10]:
        print(f"  {pos}: {count}")

    print("\n" + "=" * 60)
    print("Done! Dictionary saved to:", output_path)


if __name__ == '__main__':
    main()
