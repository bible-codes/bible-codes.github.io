#!/usr/bin/env python3
"""
Hebrew Bible Database Builder

Parses Hebrew biblical texts and generates character-level, word-level,
and verse-level JSON databases for the Hebrew Bible Analysis Suite.

Input: Leningrad Codex JSON files (torah-codes/texts/)
Output: JSON files for IndexedDB (data/)
"""

import json
import sys
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple

# Hebrew letter gematria values (standard method)
GEMATRIA_STANDARD = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
}

# Ordinal values (position in alphabet)
GEMATRIA_ORDINAL = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 11, 'ך': 11, 'ל': 12, 'מ': 13, 'ם': 13, 'נ': 14, 'ן': 14,
    'ס': 15, 'ע': 16, 'פ': 17, 'ף': 17, 'צ': 18, 'ץ': 18,
    'ק': 19, 'ר': 20, 'ש': 21, 'ת': 22
}

# Final form letters
FINAL_FORMS = {'ך', 'ם', 'ן', 'ף', 'ץ'}

# Regular (non-final) form equivalents
REGULAR_FORMS = {
    'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'
}

# Hebrew base letters (including finals)
HEBREW_LETTERS = set(GEMATRIA_STANDARD.keys())

# Book names mapping (for future expansion to full Tanach)
BOOK_NAMES = {
    'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
    'Joshua': 6, 'Judges': 7, 'I Samuel': 8, 'II Samuel': 9,
    'I Kings': 10, 'II Kings': 11, 'Isaiah': 12, 'Jeremiah': 13,
    'Ezekiel': 14, 'Hosea': 15, 'Joel': 16, 'Amos': 17, 'Obadiah': 18,
    'Jonah': 19, 'Micah': 20, 'Nahum': 21, 'Habakkuk': 22, 'Zephaniah': 23,
    'Haggai': 24, 'Zechariah': 25, 'Malachi': 26, 'Psalms': 27,
    'Proverbs': 28, 'Job': 29, 'Song of Songs': 30, 'Ruth': 31,
    'Lamentations': 32, 'Ecclesiastes': 33, 'Esther': 34, 'Daniel': 35,
    'Ezra': 36, 'Nehemiah': 37, 'I Chronicles': 38, 'II Chronicles': 39
}


def calculate_gematria(text: str, method: str = 'standard') -> int:
    """
    Calculate gematria value of Hebrew text.

    Args:
        text: Hebrew text (consonantal)
        method: 'standard', 'ordinal', or 'reduced'

    Returns:
        Gematria value
    """
    lookup = GEMATRIA_ORDINAL if method == 'ordinal' else GEMATRIA_STANDARD
    value = sum(lookup.get(c, 0) for c in text if c in HEBREW_LETTERS)

    if method == 'reduced':
        # Reduce to single digit by summing digits repeatedly
        while value >= 10:
            value = sum(int(d) for d in str(value))

    return value


def is_hebrew_letter(char: str) -> bool:
    """Check if character is a Hebrew base letter."""
    return char in HEBREW_LETTERS


def parse_character(char: str, position_info: Dict) -> Dict:
    """
    Parse a single Hebrew character into database entry.

    Args:
        char: Single character
        position_info: Dict with id, book, chapter, verse, word indices

    Returns:
        Character database entry
    """
    base_char = char
    final_form = char in FINAL_FORMS

    # For now, no niqqud/taamim (consonantal text only)
    niqqud = ''
    taamim = ''
    alt_taamim = ''

    return {
        'id': position_info['id'],
        'book': position_info['book'],
        'chapter': position_info['chapter'],
        'verse': position_info['verse'],
        'verse_char_index': position_info['verse_char_index'],
        'word_index': position_info['word_index'],
        'char_index_in_word': position_info['char_index_in_word'],
        'base_char': base_char,
        'final_form': final_form,
        'niqqud': niqqud,
        'taamim': taamim,
        'alt_taamim': alt_taamim,
        'has_niqqud': len(niqqud) > 0,
        'has_taamim': len(taamim) > 0,
        'has_alt_taamim': len(alt_taamim) > 0,
        'gematria_standard': calculate_gematria(base_char, 'standard'),
        'gematria_reduced': calculate_gematria(base_char, 'reduced'),
        'gematria_ordinal': calculate_gematria(base_char, 'ordinal'),
        'word_id': position_info['word_id'],
        'verse_id': position_info['verse_id']
    }


def parse_word(word_text: str, word_info: Dict, chars: List[Dict]) -> Dict:
    """
    Parse a word and create word database entry.

    Args:
        word_text: Hebrew word (consonantal)
        word_info: Dict with word_id, book, chapter, verse, word_index
        chars: List to append character entries to

    Returns:
        Word database entry
    """
    # Clean word text (remove non-Hebrew characters like maqaf)
    clean_chars = [c for c in word_text if is_hebrew_letter(c)]
    consonantal_text = ''.join(clean_chars)

    if not consonantal_text:
        return None

    first_char_id = None
    last_char_id = None

    # Process each character in word
    for char_idx, char in enumerate(clean_chars):
        char_entry = parse_character(char, {
            'id': word_info['current_char_id'],
            'book': word_info['book'],
            'chapter': word_info['chapter'],
            'verse': word_info['verse'],
            'verse_char_index': word_info['verse_char_index'],
            'word_index': word_info['word_index'],
            'char_index_in_word': char_idx,
            'word_id': word_info['word_id'],
            'verse_id': word_info['verse_id']
        })

        chars.append(char_entry)

        if first_char_id is None:
            first_char_id = word_info['current_char_id']
        last_char_id = word_info['current_char_id']

        word_info['current_char_id'] += 1
        word_info['verse_char_index'] += 1

    return {
        'word_id': word_info['word_id'],
        'book': word_info['book'],
        'chapter': word_info['chapter'],
        'verse': word_info['verse'],
        'word_index': word_info['word_index'],
        'word_text_consonantal': consonantal_text,
        'word_text_full': consonantal_text,  # No niqqud for now
        'word_length_chars': len(consonantal_text),
        'first_char_id': first_char_id,
        'last_char_id': last_char_id,
        'gematria_standard': calculate_gematria(consonantal_text, 'standard'),
        'gematria_reduced': calculate_gematria(consonantal_text, 'reduced'),
        'gematria_ordinal': calculate_gematria(consonantal_text, 'ordinal')
    }


def parse_verse(verse_text: str, verse_info: Dict, chars: List[Dict], words: List[Dict]) -> Dict:
    """
    Parse a verse and create verse database entry.

    Args:
        verse_text: Hebrew verse text
        verse_info: Dict with verse_id, book, chapter, verse
        chars: List to append character entries to
        words: List to append word entries to

    Returns:
        Verse database entry
    """
    # Split verse into words
    word_texts = verse_text.split()

    verse_start_char_id = verse_info['current_char_id']
    verse_char_count = 0
    verse_word_count = 0
    verse_consonantal = []

    for word_idx, word_text in enumerate(word_texts):
        word_info = {
            'word_id': verse_info['current_word_id'],
            'book': verse_info['book'],
            'chapter': verse_info['chapter'],
            'verse': verse_info['verse'],
            'word_index': word_idx,
            'current_char_id': verse_info['current_char_id'],
            'verse_char_index': verse_char_count,
            'verse_id': verse_info['verse_id']
        }

        word_entry = parse_word(word_text, word_info, chars)

        if word_entry:
            words.append(word_entry)
            verse_consonantal.append(word_entry['word_text_consonantal'])
            verse_char_count += word_entry['word_length_chars']
            verse_word_count += 1
            verse_info['current_char_id'] = word_info['current_char_id']
            verse_info['current_word_id'] += 1

    consonantal_text = ''.join(verse_consonantal)

    return {
        'verse_id': verse_info['verse_id'],
        'book': verse_info['book'],
        'chapter': verse_info['chapter'],
        'verse': verse_info['verse'],
        'verse_text_consonantal': consonantal_text,
        'verse_text_full': consonantal_text,  # No niqqud for now
        'char_count': verse_char_count,
        'word_count': verse_word_count,
        'gematria_standard': calculate_gematria(consonantal_text, 'standard'),
        'gematria_reduced': calculate_gematria(consonantal_text, 'reduced'),
        'gematria_ordinal': calculate_gematria(consonantal_text, 'ordinal')
    }


def parse_book(json_file: Path, book_number: int) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Parse a biblical book JSON file.

    Args:
        json_file: Path to Leningrad JSON file
        book_number: Book number (1-39)

    Returns:
        Tuple of (chars, words, verses) lists
    """
    print(f"📖 Parsing {json_file.name}...")

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    book_name = data['title']
    chapters = data['text']

    chars = []
    words = []
    verses = []

    current_char_id = 0
    current_word_id = 0
    current_verse_id = 0

    for chapter_idx, chapter in enumerate(chapters, start=1):
        for verse_idx, verse_text in enumerate(chapter, start=1):
            verse_info = {
                'verse_id': current_verse_id,
                'book': book_number,
                'chapter': chapter_idx,
                'verse': verse_idx,
                'current_char_id': current_char_id,
                'current_word_id': current_word_id
            }

            verse_entry = parse_verse(verse_text, verse_info, chars, words)
            verses.append(verse_entry)

            current_char_id = verse_info['current_char_id']
            current_word_id = verse_info['current_word_id']
            current_verse_id += 1

    print(f"  ✅ {len(chars):,} characters, {len(words):,} words, {len(verses):,} verses")

    return chars, words, verses


def main():
    """Main entry point."""
    # Paths
    project_root = Path(__file__).parent.parent
    texts_dir = project_root / 'torah-codes' / 'texts'
    output_dir = project_root / 'data'

    output_dir.mkdir(exist_ok=True)

    # Parse Genesis
    genesis_json = texts_dir / 'text_leningrad_1genesis.json'

    if not genesis_json.exists():
        print(f"❌ Error: {genesis_json} not found")
        return 1

    chars, words, verses = parse_book(genesis_json, book_number=1)

    # Output files
    chars_file = output_dir / 'genesis-chars.json'
    words_file = output_dir / 'genesis-words.json'
    verses_file = output_dir / 'genesis-verses.json'

    print("\n💾 Writing output files...")

    with open(chars_file, 'w', encoding='utf-8') as f:
        json.dump(chars, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {chars_file.name} ({chars_file.stat().st_size / 1024:.1f} KB)")

    with open(words_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {words_file.name} ({words_file.stat().st_size / 1024:.1f} KB)")

    with open(verses_file, 'w', encoding='utf-8') as f:
        json.dump(verses, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {verses_file.name} ({verses_file.stat().st_size / 1024:.1f} KB)")

    # Summary statistics
    print("\n📊 Summary:")
    print(f"  Book: Genesis (1)")
    print(f"  Characters: {len(chars):,}")
    print(f"  Words: {len(words):,}")
    print(f"  Verses: {len(verses):,}")
    print(f"  Chapters: {verses[-1]['chapter']}")
    print(f"  Total size: {(chars_file.stat().st_size + words_file.stat().st_size + verses_file.stat().st_size) / 1024:.1f} KB")

    print("\n✨ Database generation complete!")
    return 0


if __name__ == '__main__':
    sys.exit(main())
