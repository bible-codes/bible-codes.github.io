#!/usr/bin/env python3
"""
Build Hebrew Dictionary from Hebrew Wiktionary

Parses Hebrew Wiktionary XML dump to extract:
- Hebrew words with roots
- Part of speech
- Definitions
- Biblical references
- Era markers (biblical, modern, etc.)

Source: https://dumps.wikimedia.org/hewiktionary/
License: CC-BY-SA
"""

import json
import gzip
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
import re
import sys


class WiktionaryParser:
    """Parse Hebrew Wiktionary dump"""

    # Root template patterns
    ROOT_PATTERNS = [
        # {{שרש|אבד|א־ב־ד}}
        r'\{\{שרש\|([^|]+)\|[^}]+\}\}',
        # {{שרש3|א|ב|ד}}
        r'\{\{שרש3\|([^|]+)\|([^|]+)\|([^|}]+)',
        # {{שרש4|א|ב|ג|ד}}
        r'\{\{שרש4\|([^|]+)\|([^|]+)\|([^|]+)\|([^|}]+)',
        # {{שורש|אבד}}
        r'\{\{שורש\|([^|}]+)',
    ]

    # Binyan patterns
    BINYAN_PATTERN = r'בניין=(\w+)'

    # POS patterns
    POS_PATTERNS = {
        'verb': [r'==.*פועל.*==', r'\{\{ניתוח דקדוקי לפועל', r'בניין='],
        'noun': [r'==.*שם עצם.*==', r'שע\|', r'ש\.ע\.'],
        'adj': [r'==.*שם תואר.*==', r'שת\|', r'ש\.ת\.'],
        'adv': [r'==.*תואר הפועל.*=='],
        'proper_noun': [r'==.*שם פרטי.*==', r'שם עצם פרטי'],
    }

    # Era markers
    ERA_PATTERNS = {
        'biblical': [r'לשון המקרא', r'מקראי', r'תנ"ך'],
        'rabbinic': [r'לשון חכמים', r'לשון חז"ל', r'משנה', r'תלמוד'],
        'medieval': [r'לשון ימי הביניים', r'פייטנים'],
        'modern': [r'עברית חדשה', r'עברית מודרנית', r'סלנג'],
    }

    # Hebrew letters only
    HEBREW_LETTERS = set('אבגדהוזחטיכלמנסעפצקרשתךםןףץ')

    def __init__(self):
        self.entries = {}
        self.stats = defaultdict(int)

    def parse_dump(self, xml_path):
        """Parse the Wiktionary XML dump"""
        print(f"Parsing {xml_path}...")

        # Use iterative parsing for large files
        context = ET.iterparse(xml_path, events=('end',))

        page_count = 0
        entry_count = 0

        for event, elem in context:
            if elem.tag.endswith('page'):
                page_count += 1

                # Get namespace
                ns_elem = elem.find('.//{http://www.mediawiki.org/xml/export-0.11/}ns')
                if ns_elem is None:
                    ns_elem = elem.find('.//ns')

                ns = ns_elem.text if ns_elem is not None else ''

                # Only process main namespace (0)
                if ns == '0':
                    title_elem = elem.find('.//{http://www.mediawiki.org/xml/export-0.11/}title')
                    if title_elem is None:
                        title_elem = elem.find('.//title')

                    text_elem = elem.find('.//{http://www.mediawiki.org/xml/export-0.11/}text')
                    if text_elem is None:
                        text_elem = elem.find('.//text')

                    if title_elem is not None and text_elem is not None:
                        title = title_elem.text
                        text = text_elem.text or ''

                        # Check if it's a Hebrew word
                        if title and self.is_hebrew_word(title):
                            entry = self.parse_entry(title, text)
                            if entry:
                                self.entries[title] = entry
                                entry_count += 1

                                if entry_count % 1000 == 0:
                                    print(f"  Parsed {entry_count} entries...")

                # Clear element to save memory
                elem.clear()

        print(f"Parsed {page_count} pages, extracted {entry_count} entries")
        return self.entries

    def is_hebrew_word(self, word):
        """Check if word is primarily Hebrew letters"""
        if not word:
            return False

        hebrew_count = sum(1 for c in word if c in self.HEBREW_LETTERS)
        return hebrew_count > 0 and hebrew_count >= len(word) * 0.5

    def parse_entry(self, title, text):
        """Parse a single Wiktionary entry"""
        if not text:
            return None

        entry = {
            'word': title,
            'roots': [],
            'pos': None,
            'binyan': None,
            'definitions': [],
            'era': None,
            'refs': [],
            'related': [],
            'etymology': None,
        }

        # Extract roots
        roots = self.extract_roots(text)
        if roots:
            entry['roots'] = roots
            self.stats['with_root'] += 1

        # Extract binyan
        binyan = self.extract_binyan(text)
        if binyan:
            entry['binyan'] = binyan
            self.stats['with_binyan'] += 1

        # Extract POS
        pos = self.extract_pos(text)
        if pos:
            entry['pos'] = pos
            self.stats[f'pos_{pos}'] += 1

        # Extract definitions
        definitions = self.extract_definitions(text)
        if definitions:
            entry['definitions'] = definitions[:5]  # Limit to 5
            self.stats['with_definitions'] += 1

        # Extract era
        era = self.extract_era(text)
        if era:
            entry['era'] = era
            self.stats[f'era_{era}'] += 1

        # Extract biblical references
        refs = self.extract_biblical_refs(text)
        if refs:
            entry['refs'] = refs[:10]  # Limit to 10
            self.stats['with_refs'] += 1

        # Extract related words
        related = self.extract_related(text)
        if related:
            entry['related'] = related[:10]

        # Only include if we have some useful data
        if roots or definitions or pos:
            return entry

        return None

    def extract_roots(self, text):
        """Extract root letters from templates"""
        roots = []

        for pattern in self.ROOT_PATTERNS:
            matches = re.findall(pattern, text)
            for match in matches:
                if isinstance(match, tuple):
                    # Multiple capture groups (שרש3, שרש4)
                    root = ''.join(match)
                else:
                    root = match

                # Clean root
                root = self.clean_root(root)
                if root and root not in roots:
                    roots.append(root)

        return roots

    def clean_root(self, root):
        """Clean root string"""
        if not root:
            return None

        # Remove separators
        root = root.replace('־', '').replace('-', '').replace('|', '')

        # Keep only Hebrew letters
        root = ''.join(c for c in root if c in self.HEBREW_LETTERS)

        # Valid roots are 2-4 letters
        if 2 <= len(root) <= 4:
            return root

        return None

    def extract_binyan(self, text):
        """Extract verb binyan (pattern)"""
        match = re.search(self.BINYAN_PATTERN, text)
        if match:
            binyan = match.group(1).lower()
            binyan_map = {
                'קל': 'qal',
                'נפעל': 'nifal',
                'פיעל': 'piel',
                'פועל': 'pual',
                'הפעיל': 'hifil',
                'הופעל': 'hufal',
                'התפעל': 'hitpael',
            }
            return binyan_map.get(binyan, binyan)
        return None

    def extract_pos(self, text):
        """Extract part of speech"""
        for pos, patterns in self.POS_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return pos
        return None

    def extract_definitions(self, text):
        """Extract definitions from numbered list"""
        definitions = []

        # Find definition lines (starting with #)
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('#') and not line.startswith('#:'):
                # Remove wiki markup
                definition = self.clean_wiki_text(line[1:].strip())
                if definition and len(definition) > 2:
                    definitions.append(definition)

        return definitions

    def clean_wiki_text(self, text):
        """Remove wiki markup from text"""
        if not text:
            return ''

        # Remove templates {{...}}
        text = re.sub(r'\{\{[^}]+\}\}', '', text)

        # Remove links [[...|text]] -> text
        text = re.sub(r'\[\[[^|\]]+\|([^\]]+)\]\]', r'\1', text)
        text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove references
        text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
        text = re.sub(r'<ref[^>]*/>', '', text)

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        return text

    def extract_era(self, text):
        """Extract era/period classification"""
        text_lower = text.lower()

        for era, patterns in self.ERA_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return era

        return None

    def extract_biblical_refs(self, text):
        """Extract biblical references"""
        refs = []

        # Pattern for תנ"ך template
        pattern = r'\{\{צט/תנ"ך\|[^|]*\|([^|]+)\|([^|]+)\|([^|}]+)'
        matches = re.findall(pattern, text)

        for match in matches:
            book, chapter, verse = match
            ref = f"{book}.{chapter}.{verse}"
            if ref not in refs:
                refs.append(ref)

        return refs

    def extract_related(self, text):
        """Extract related words from sections"""
        related = []

        # Look for related sections
        sections = ['נגזרות', 'מילים נרדפות', 'ניגודים', 'ראו גם']

        for section in sections:
            pattern = rf'==={section}===\s*(.*?)(?====|$)'
            match = re.search(pattern, text, re.DOTALL)
            if match:
                content = match.group(1)
                # Extract linked words
                links = re.findall(r'\[\[([^\]|]+)', content)
                for link in links:
                    word = link.split('#')[0]  # Remove anchor
                    if self.is_hebrew_word(word) and word not in related:
                        related.append(word)

        return related

    def get_stats(self):
        """Get parsing statistics"""
        return dict(self.stats)


def save_dictionary(entries, output_path, source_info):
    """Save dictionary as compressed JSON"""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Create wrapper with metadata
    output = {
        'source': source_info,
        'version': '1.0',
        'entries': {}
    }

    # Convert entries
    for word, entry in entries.items():
        output['entries'][word] = {
            'word': entry['word'],
            'root': entry['roots'][0] if entry['roots'] else None,
            'roots': entry['roots'] if len(entry['roots']) > 1 else None,
            'pos': entry['pos'],
            'binyan': entry['binyan'],
            'definitions': entry['definitions'] if entry['definitions'] else None,
            'era': entry['era'],
            'refs': entry['refs'] if entry['refs'] else None,
            'related': entry['related'] if entry['related'] else None,
        }

        # Remove None values
        output['entries'][word] = {k: v for k, v in output['entries'][word].items() if v is not None}

    print(f"Saving to {output_path}...")

    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = output_path.stat().st_size / 1024
    print(f"Saved {len(entries)} entries ({size_kb:.1f} KB)")

    return size_kb


def main():
    # Paths
    xml_path = Path('/tmp/wiktionary/hewiktionary.xml')
    output_path = Path('data/dictionaries/hebrew-wiktionary.json.gz')

    if not xml_path.exists():
        print(f"ERROR: {xml_path} not found")
        print("Download from: https://dumps.wikimedia.org/hewiktionary/latest/")
        sys.exit(1)

    print("=" * 60)
    print("Hebrew Wiktionary Dictionary Builder")
    print("=" * 60)

    # Parse dump
    parser = WiktionaryParser()
    entries = parser.parse_dump(xml_path)

    # Source info
    source_info = {
        'name': 'Hebrew Wiktionary',
        'short_name': 'wiktionary',
        'source': 'https://he.wiktionary.org',
        'dump_url': 'https://dumps.wikimedia.org/hewiktionary/',
        'license': 'CC-BY-SA 3.0',
        'description': 'Community-sourced Hebrew dictionary with roots, definitions, and grammatical analysis'
    }

    # Save
    size_kb = save_dictionary(entries, output_path, source_info)

    # Print stats
    stats = parser.get_stats()
    print("\n" + "=" * 60)
    print("Statistics:")
    print(f"  Total entries: {len(entries)}")
    print(f"  With root: {stats.get('with_root', 0)}")
    print(f"  With binyan: {stats.get('with_binyan', 0)}")
    print(f"  With definitions: {stats.get('with_definitions', 0)}")
    print(f"  With biblical refs: {stats.get('with_refs', 0)}")
    print(f"  File size: {size_kb:.1f} KB")

    print("\nPart of Speech Distribution:")
    for key, value in sorted(stats.items()):
        if key.startswith('pos_'):
            print(f"  {key[4:]}: {value}")

    print("\nEra Distribution:")
    for key, value in sorted(stats.items()):
        if key.startswith('era_'):
            print(f"  {key[4:]}: {value}")

    print("\n" + "=" * 60)
    print("Done! Dictionary saved to:", output_path)


if __name__ == '__main__':
    main()
