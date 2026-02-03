#!/usr/bin/env python3
"""
Build Koren Text Database from ASCII Transliteration

Converts the Rips/Koren Torah text from ASCII transliteration to Hebrew Unicode
with proper final letter forms (ך ם ן ף ץ).

Source: text_koren_*.txt files (exact text used by Rips et al., 1994)
Output: Character database and Torah text for ELS search

Verification:
- Total letters: 304,805 (matches Rips)
- Uses Ketiv (written) form
- Proper final letters at word endings
"""

import json
import gzip
import re
import os
import hashlib

# ASCII to Hebrew transliteration mapping - Regular forms
TRANS_TO_HEBREW = {
    ')': 'א', 'B': 'ב', 'G': 'ג', 'D': 'ד', 'H': 'ה',
    'W': 'ו', 'Z': 'ז', 'X': 'ח', '+': 'ט', 'Y': 'י',
    'K': 'כ', 'L': 'ל', 'M': 'מ', 'N': 'נ', 'S': 'ס',
    '(': 'ע', 'P': 'פ', 'C': 'צ', 'Q': 'ק', 'R': 'ר',
    '$': 'ש', 'T': 'ת',
}

# Final forms (used at end of words)
FINAL_FORMS = {
    'K': 'ך',  # כ -> ך
    'M': 'ם',  # מ -> ם
    'N': 'ן',  # נ -> ן
    'P': 'ף',  # פ -> ף
    'C': 'ץ',  # צ -> ץ
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
    (1, 'text_koren_1genesis.txt', 'genesis', 78064),
    (2, 'text_koren_2exodus.txt', 'exodus', 63529),
    (3, 'text_koren_3leviticus.txt', 'leviticus', 44790),
    (4, 'text_koren_4numbers.txt', 'numbers', 63530),
    (5, 'text_koren_5deuteronomy.txt', 'deuteronomy', 54892),
]


def convert_word(ascii_word):
    """Convert an ASCII word to Hebrew with proper final letters."""
    if not ascii_word:
        return ''

    hebrew = ''
    for i, char in enumerate(ascii_word):
        is_last = (i == len(ascii_word) - 1)

        if is_last and char in FINAL_FORMS:
            hebrew += FINAL_FORMS[char]
        elif char in TRANS_TO_HEBREW:
            hebrew += TRANS_TO_HEBREW[char]

    return hebrew


def parse_koren_file(filepath):
    """Parse a Koren transliterated text file with proper finals."""
    verses = []

    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = line.split(' ', 3)
            if len(parts) < 4:
                continue

            book_num, chapter, verse, text_with_spaces = parts

            # Convert each word separately to handle finals
            words = text_with_spaces.split()
            hebrew_text = ''.join(convert_word(w) for w in words)

            verses.append({
                'chapter': int(chapter),
                'verse': int(verse),
                'text': hebrew_text
            })

    return verses


def build_char_database(book_num, book_name, verses, global_id_start):
    """Build character-level database for a book."""
    chars = []
    verse_records = []

    global_id = global_id_start
    verse_id_offset = global_id_start  # Use for verse_id tracking

    for v_idx, v in enumerate(verses):
        verse_text = v['text']
        verse_char_index = 0
        word_index = 0
        char_in_word = 0

        for char in verse_text:
            is_final = char in 'ךםןףץ'

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
                'gematria_standard': gematria_std,
                'gematria_reduced': gematria_red,
                'gematria_ordinal': gematria_ord,
            }

            chars.append(char_record)
            global_id += 1
            verse_char_index += 1
            char_in_word += 1

        # Record verse
        verse_records.append({
            'verse_id': v_idx,
            'book': book_num,
            'chapter': v['chapter'],
            'verse': v['verse'],
            'verse_text': verse_text,
            'char_count': len(verse_text),
            'gematria_standard': sum(GEMATRIA.get(c, 0) for c in verse_text),
        })

    return chars, verse_records, global_id


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    texts_dir = os.path.join(script_dir, '..', 'torah-codes', 'texts')
    data_dir = os.path.join(script_dir, '..', 'data')

    print("=" * 60)
    print("BUILDING KOREN TEXT DATABASE (with proper finals)")
    print("=" * 60)

    global_id = 0
    full_text = ''
    all_valid = True

    for book_num, filename, book_name, expected_count in BOOKS:
        filepath = os.path.join(texts_dir, filename)

        print(f"\nProcessing {book_name.title()}...")

        verses = parse_koren_file(filepath)
        chars, verse_records, new_global_id = build_char_database(
            book_num, book_name, verses, global_id
        )

        book_text = ''.join(c['base_char'] for c in chars)
        full_text += book_text

        actual = len(chars)
        status = '✓' if actual == expected_count else '✗'
        if actual != expected_count:
            all_valid = False
        print(f"  {actual:,} characters (expected {expected_count:,}) {status}")

        # Check for finals
        finals_count = sum(1 for c in chars if c['final_form'])
        print(f"  Final letters: {finals_count:,}")

        # Save character database
        output_path = os.path.join(data_dir, f'{book_name}-chars.json.gz')
        with gzip.open(output_path, 'wt', encoding='utf-8') as f:
            json.dump(chars, f, ensure_ascii=False)
        print(f"  Saved: {output_path}")

        global_id = new_global_id

    # Save full Torah text (no spaces)
    torah_path = os.path.join(data_dir, 'torahNoSpaces.txt')
    with open(torah_path, 'w', encoding='utf-8') as f:
        f.write(full_text)

    # Calculate hash
    sha256 = hashlib.sha256(full_text.encode('utf-8')).hexdigest()

    # Verify finals in full text
    finals_total = sum(1 for c in full_text if c in 'ךםןףץ')

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total characters: {len(full_text):,}")
    print(f"Expected (Rips): 304,805")
    print(f"Match: {'✓ YES' if len(full_text) == 304805 else '✗ NO'}")
    print(f"Final letters: {finals_total:,}")
    print(f"SHA-256: {sha256}")
    print(f"\nFirst 28 chars: {full_text[:28]}")
    print(f"Expected:       בראשיתבראאלהיםאתהשמיםואתהארץ")
    print(f"Match: {'✓' if full_text[:28] == 'בראשיתבראאלהיםאתהשמיםואתהארץ' else '✗'}")
    print(f"\nSaved: {torah_path}")
    print("=" * 60)

    return all_valid and len(full_text) == 304805


if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)
