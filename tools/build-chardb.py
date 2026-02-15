#!/usr/bin/env python3
"""
Build Torah character database from Koren text files + torahNoSpaces.txt.

Uses Koren transliterated files for verse/chapter/word structure,
and torahNoSpaces.txt for the actual Hebrew characters.
This ensures exact position alignment with the ELS search text.

Output: per-book *-chars.json.gz files in data/ directory.

Usage:
    python3 tools/build-chardb.py
"""

import json
import gzip
import sys
from pathlib import Path

# Transliteration mapping: Koren Latin → Hebrew
TRANSLIT = {
    ')': 'א', 'B': 'ב', 'G': 'ג', 'D': 'ד', 'H': 'ה',
    'W': 'ו', 'Z': 'ז', 'X': 'ח', '+': 'ט', 'Y': 'י',
    'K': 'כ', 'L': 'ל', 'M': 'מ', 'N': 'נ', 'S': 'ס',
    '(': 'ע', 'P': 'פ', 'C': 'צ', 'Q': 'ק', 'R': 'ר',
    '$': 'ש', 'T': 'ת'
}

# Gematria values
GEMATRIA_STANDARD = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
}

GEMATRIA_ORDINAL = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 11, 'ך': 11, 'ל': 12, 'מ': 13, 'ם': 13, 'נ': 14, 'ן': 14,
    'ס': 15, 'ע': 16, 'פ': 17, 'ף': 17, 'צ': 18, 'ץ': 18,
    'ק': 19, 'ר': 20, 'ש': 21, 'ת': 22
}

FINAL_FORMS = {'ך', 'ם', 'ן', 'ף', 'ץ'}

# Torah books: (number, koren_filename, output_name)
TORAH_BOOKS = [
    (1, 'text_koren_1genesis.txt', 'genesis'),
    (2, 'text_koren_2exodus.txt', 'exodus'),
    (3, 'text_koren_3leviticus.txt', 'leviticus'),
    (4, 'text_koren_4numbers.txt', 'numbers'),
    (5, 'text_koren_5deuteronomy.txt', 'deuteronomy'),
]


def fix_reversed_number(s):
    """Fix RTL-reversed digit strings: '01' → 10, '21' → 12, '9' → 9."""
    if len(s) > 1:
        return int(s[::-1])
    return int(s)


def parse_koren_file(filepath):
    """Parse a Koren transliterated text file into verse structures.

    Returns list of {book, chapter, verse, words: [word_chars_count, ...], total_chars}
    where total_chars is the count of consonantal characters (no spaces).
    """
    verses = []
    current_verse = None

    with open(filepath, 'r') as f:
        for line in f:
            line = line.rstrip()
            if not line:
                continue

            parts = line.split(None, 3)
            if len(parts) < 4:
                continue

            book = fix_reversed_number(parts[0])
            chapter = fix_reversed_number(parts[1])
            verse = fix_reversed_number(parts[2])
            text = parts[3]

            # Split text into words
            words = text.split()
            word_char_counts = []
            for w in words:
                # Count only transliteration chars (skip any non-alpha artifacts)
                count = sum(1 for c in w if c in TRANSLIT)
                if count > 0:
                    word_char_counts.append(count)

            # Check if this is a continuation line (same book/chapter/verse)
            if (current_verse and
                current_verse['book'] == book and
                current_verse['chapter'] == chapter and
                current_verse['verse'] == verse):
                # Continuation: append words
                current_verse['words'].extend(word_char_counts)
                current_verse['total_chars'] += sum(word_char_counts)
            else:
                # New verse
                if current_verse:
                    verses.append(current_verse)
                current_verse = {
                    'book': book,
                    'chapter': chapter,
                    'verse': verse,
                    'words': word_char_counts,
                    'total_chars': sum(word_char_counts)
                }

    if current_verse:
        verses.append(current_verse)

    return verses


def build_chardb(torah_text, koren_verses, book_number, global_offset):
    """Build character database entries for one book.

    Args:
        torah_text: Full Torah text (torahNoSpaces.txt)
        koren_verses: Parsed Koren verse structures
        book_number: Book number (1-5)
        global_offset: Starting position in torah_text for this book

    Returns:
        (chars_list, next_offset)
    """
    chars = []
    pos = global_offset

    for v in koren_verses:
        verse_char_idx = 0
        word_idx = 0

        for word_len in v['words']:
            for char_in_word in range(word_len):
                if pos >= len(torah_text):
                    print(f"  WARNING: position {pos} exceeds torah text length {len(torah_text)}")
                    break

                heb_char = torah_text[pos]
                g_std = GEMATRIA_STANDARD.get(heb_char, 0)
                g_ord = GEMATRIA_ORDINAL.get(heb_char, 0)
                g_red = g_std
                while g_red >= 10:
                    g_red = sum(int(d) for d in str(g_red))

                chars.append({
                    'id': pos,
                    'book': book_number,
                    'chapter': v['chapter'],
                    'verse': v['verse'],
                    'verse_char_index': verse_char_idx,
                    'word_index': word_idx,
                    'char_index_in_word': char_in_word,
                    'base_char': heb_char,
                    'final_form': heb_char in FINAL_FORMS,
                    'gematria_standard': g_std,
                    'gematria_reduced': g_red,
                    'gematria_ordinal': g_ord,
                })

                pos += 1
                verse_char_idx += 1

            word_idx += 1

    return chars, pos


def main():
    project_root = Path(__file__).parent.parent
    texts_dir = project_root / 'torah-codes' / 'texts'
    data_dir = project_root / 'data'

    # Read Torah text
    torah_path = data_dir / 'torahNoSpaces.txt'
    torah_text = torah_path.read_text(encoding='utf-8').strip()
    print(f"Torah text: {len(torah_text):,} characters")

    global_offset = 0
    total_chars = 0

    for book_num, koren_file, output_name in TORAH_BOOKS:
        print(f"\n{'='*50}")
        print(f"Book {book_num}: {output_name.title()}")
        print('='*50)

        koren_path = texts_dir / koren_file
        if not koren_path.exists():
            print(f"  ERROR: {koren_path} not found")
            continue

        # Parse Koren text for verse structure
        verses = parse_koren_file(koren_path)
        expected_chars = sum(v['total_chars'] for v in verses)
        print(f"  Verses: {len(verses)}")
        print(f"  Expected chars: {expected_chars:,}")

        # Build char entries
        chars, next_offset = build_chardb(torah_text, verses, book_num, global_offset)
        actual_chars = len(chars)
        print(f"  Actual chars: {actual_chars:,}")

        if actual_chars != expected_chars:
            print(f"  WARNING: char count mismatch! Expected {expected_chars}, got {actual_chars}")

        # Verify alignment: check first and last chars
        if chars:
            first = chars[0]
            last = chars[-1]
            print(f"  First: pos={first['id']} ch={first['chapter']}:{first['verse']} '{first['base_char']}'")
            print(f"  Last:  pos={last['id']} ch={last['chapter']}:{last['verse']} '{last['base_char']}'")
            # Verify against torah text
            ok = all(chars[i]['base_char'] == torah_text[chars[i]['id']] for i in range(len(chars)))
            print(f"  Torah alignment: {'OK' if ok else 'MISMATCH!'}")

        # Verify verse numbering (no reversals)
        max_verse = max(v['verse'] for v in verses)
        max_chapter = max(v['chapter'] for v in verses)
        print(f"  Max chapter: {max_chapter}, Max verse: {max_verse}")

        # Check for suspicious verse drops
        prev_v = 0
        prev_ch = 0
        drops = 0
        for v in verses:
            if v['chapter'] == prev_ch and v['verse'] < prev_v:
                drops += 1
            prev_ch = v['chapter']
            prev_v = v['verse']
        if drops:
            print(f"  WARNING: {drops} verse number drops detected!")
        else:
            print(f"  Verse ordering: OK (no drops)")

        # Write compressed output
        gz_path = data_dir / f'{output_name}-chars.json.gz'
        with gzip.open(gz_path, 'wt', encoding='utf-8') as f:
            json.dump(chars, f, ensure_ascii=False)
        gz_size = gz_path.stat().st_size
        print(f"  Output: {gz_path.name} ({gz_size / 1024:.1f} KB)")

        global_offset = next_offset
        total_chars += actual_chars

    print(f"\n{'='*50}")
    print(f"COMPLETE: {total_chars:,} total chars (expected {len(torah_text):,})")
    if total_chars == len(torah_text):
        print("Perfect alignment with torahNoSpaces.txt!")
    else:
        print(f"WARNING: off by {total_chars - len(torah_text):,} chars!")
    print('='*50)


if __name__ == '__main__':
    main()
