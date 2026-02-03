#!/usr/bin/env python3
"""
Build Koren Text Database from ASCII Transliteration

Converts the Rips/Koren Torah text from ASCII transliteration to Hebrew Unicode
and builds a character-level database matching our schema.

Source: text_koren_*.txt files (exact text used by Rips et al.)
Output: koren-*.json.gz files for PWA use
"""

import json
import gzip
import re
import os
import hashlib

# ASCII to Hebrew transliteration mapping
TRANS_TO_HEBREW = {
    ')': 'א', 'B': 'ב', 'G': 'ג', 'D': 'ד', 'H': 'ה',
    'W': 'ו', 'Z': 'ז', 'X': 'ח', '+': 'ט', 'Y': 'י',
    'K': 'כ', 'L': 'ל', 'M': 'מ', 'N': 'נ', 'S': 'ס',
    '(': 'ע', 'P': 'פ', 'C': 'צ', 'Q': 'ק', 'R': 'ר',
    '$': 'ש', 'T': 'ת',
}

# Standard gematria values
GEMATRIA = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400,
}

ORDINAL = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 11, 'ך': 11, 'ל': 12, 'מ': 13, 'ם': 13, 'נ': 14, 'ן': 14,
    'ס': 15, 'ע': 16, 'פ': 17, 'ף': 17, 'צ': 18, 'ץ': 18, 'ק': 19, 'ר': 20,
    'ש': 21, 'ת': 22,
}

BOOKS = [
    (1, 'text_koren_1genesis.txt', 'genesis'),
    (2, 'text_koren_2exodus.txt', 'exodus'),
    (3, 'text_koren_3leviticus.txt', 'leviticus'),
    (4, 'text_koren_4numbers.txt', 'numbers'),
    (5, 'text_koren_5deuteronomy.txt', 'deuteronomy'),
]

EXPECTED_COUNTS = {
    'genesis': 78064,
    'exodus': 63529,
    'leviticus': 44790,
    'numbers': 63530,
    'deuteronomy': 54892,
}


def parse_koren_file(filepath):
    """Parse a Koren transliterated text file.

    Format: book chapter verse TEXT
    Example: 1 1 1 BR)$YT BR) )LHYM )T H$MYM W)T H)RC
    """
    verses = []

    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = line.split(' ', 3)
            if len(parts) < 4:
                continue

            book_num, chapter, verse, text = parts

            # Convert transliteration to Hebrew
            hebrew_text = ''
            for char in text:
                if char in TRANS_TO_HEBREW:
                    hebrew_text += TRANS_TO_HEBREW[char]
                # Skip spaces and other characters

            verses.append({
                'chapter': int(chapter),
                'verse': int(verse),
                'text': hebrew_text
            })

    return verses


def build_char_database(book_num, book_name, verses, global_id_start):
    """Build character-level database for a book."""
    chars = []
    words = []
    verse_records = []

    global_id = global_id_start
    word_id = 0
    verse_id = 0

    for v in verses:
        verse_text = v['text']
        verse_start_id = global_id
        verse_char_index = 0
        word_index = 0
        char_in_word = 0
        word_start_id = global_id

        for i, char in enumerate(verse_text):
            # Check for final forms based on position
            # In Koren format, finals aren't distinguished, so we detect by position
            is_final = False
            final_char = char

            # Check if this might be a final letter (end of word)
            # We'll determine word boundaries by looking for common patterns
            # For now, treat all as non-final since the source doesn't distinguish

            gematria_std = GEMATRIA.get(char, 0)
            gematria_ord = ORDINAL.get(char, 0)
            gematria_red = gematria_std % 9 if gematria_std > 0 else 0
            if gematria_red == 0 and gematria_std > 0:
                gematria_red = 9

            char_record = {
                'id': global_id,
                'book': book_num,
                'chapter': v['chapter'],
                'verse': v['verse'],
                'verse_char_index': verse_char_index,
                'word_index': word_index,
                'char_index_in_word': char_in_word,
                'base_char': char,
                'final_form': is_final,
                'niqqud': '',
                'taamim': '',
                'alt_taamim': '',
                'has_niqqud': False,
                'has_taamim': False,
                'has_alt_taamim': False,
                'gematria_standard': gematria_std,
                'gematria_reduced': gematria_red,
                'gematria_ordinal': gematria_ord,
                'word_id': word_id,
                'verse_id': verse_id,
            }

            chars.append(char_record)
            global_id += 1
            verse_char_index += 1
            char_in_word += 1

        # Record verse
        verse_records.append({
            'verse_id': verse_id,
            'book': book_num,
            'chapter': v['chapter'],
            'verse': v['verse'],
            'verse_text_consonantal': verse_text,
            'verse_text_full': verse_text,
            'char_count': len(verse_text),
            'word_count': word_index + 1,
            'gematria_standard': sum(GEMATRIA.get(c, 0) for c in verse_text),
        })

        verse_id += 1

    return chars, verse_records, global_id


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    texts_dir = os.path.join(script_dir, '..', 'torah-codes', 'texts')
    data_dir = os.path.join(script_dir, '..', 'data')

    print("=" * 60)
    print("BUILDING KOREN TEXT DATABASE")
    print("=" * 60)

    all_chars = []
    global_id = 0
    full_text = ''

    for book_num, filename, book_name in BOOKS:
        filepath = os.path.join(texts_dir, filename)

        print(f"\nProcessing {book_name.title()}...")

        verses = parse_koren_file(filepath)
        chars, verse_records, new_global_id = build_char_database(
            book_num, book_name, verses, global_id
        )

        book_text = ''.join(c['base_char'] for c in chars)
        full_text += book_text

        expected = EXPECTED_COUNTS[book_name]
        actual = len(chars)
        status = '✓' if actual == expected else '✗'
        print(f"  {actual:,} characters (expected {expected:,}) {status}")

        # Save character database
        output_path = os.path.join(data_dir, f'koren-{book_name}-chars.json.gz')
        with gzip.open(output_path, 'wt', encoding='utf-8') as f:
            json.dump(chars, f, ensure_ascii=False)
        print(f"  Saved: {output_path}")

        all_chars.extend(chars)
        global_id = new_global_id

    # Save full Torah text (no spaces)
    torah_path = os.path.join(data_dir, 'koren-torahNoSpaces.txt')
    with open(torah_path, 'w', encoding='utf-8') as f:
        f.write(full_text)

    # Calculate hash
    sha256 = hashlib.sha256(full_text.encode('utf-8')).hexdigest()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total characters: {len(full_text):,}")
    print(f"Expected (Koren): 304,805")
    print(f"Match: {'✓ YES' if len(full_text) == 304805 else '✗ NO'}")
    print(f"SHA-256: {sha256}")
    print(f"\nSaved: {torah_path}")
    print("=" * 60)


if __name__ == '__main__':
    main()
