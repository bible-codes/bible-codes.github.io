#!/usr/bin/env python3
"""
Torah Text Validation Tool

Validates the Torah text against the Koren edition used by Rips et al. (1994).

Expected:
- Total letters: 304,805
- Proper final forms (ך ם ן ף ץ)
- Ketiv (written) form
- SHA-256: b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226
"""

import gzip
import json
import hashlib
import os
import sys

# Expected counts per book (Koren/Rips edition)
EXPECTED_COUNTS = {
    'genesis': 78064,
    'exodus': 63529,
    'leviticus': 44790,
    'numbers': 63530,
    'deuteronomy': 54892,
    'total': 304805
}

# SHA-256 hash of canonical Koren text
CANONICAL_SHA256 = "b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226"


def load_torah_from_db(data_dir):
    """Load Torah text from character database files."""
    torah_books = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy']
    full_text = ''
    book_texts = {}

    for book in torah_books:
        filepath = os.path.join(data_dir, f'{book}-chars.json.gz')
        with gzip.open(filepath, 'rt', encoding='utf-8') as f:
            chars = json.load(f)
        book_text = ''.join(c['base_char'] for c in chars)
        book_texts[book] = book_text
        full_text += book_text

    return full_text, book_texts


def validate_text(data_dir=None):
    """Run full validation and return results."""
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')

    results = {
        'valid': True,
        'source': 'Koren Edition (Rips et al., 1994)',
        'books': {},
        'total': {},
        'hash': {},
        'finals': {},
        'warnings': []
    }

    # Load text
    full_text, book_texts = load_torah_from_db(data_dir)

    # Validate each book
    for book, text in book_texts.items():
        actual = len(text)
        expected = EXPECTED_COUNTS[book]

        results['books'][book] = {
            'actual': actual,
            'expected': expected,
            'matches': actual == expected,
        }

        if actual != expected:
            results['valid'] = False
            results['warnings'].append(f"{book}: count mismatch (expected {expected}, got {actual})")

    # Validate total
    actual_total = len(full_text)
    results['total'] = {
        'actual': actual_total,
        'expected': EXPECTED_COUNTS['total'],
        'matches': actual_total == EXPECTED_COUNTS['total'],
    }

    if actual_total != EXPECTED_COUNTS['total']:
        results['valid'] = False

    # Validate hash
    sha256 = hashlib.sha256(full_text.encode('utf-8')).hexdigest()
    results['hash'] = {
        'actual': sha256,
        'expected': CANONICAL_SHA256,
        'matches': sha256 == CANONICAL_SHA256
    }

    if sha256 != CANONICAL_SHA256:
        results['valid'] = False
        results['warnings'].append("SHA-256 mismatch - text may have been modified")

    # Check final letters
    finals = 'ךםןףץ'
    finals_count = sum(1 for c in full_text if c in finals)
    results['finals'] = {
        'total': finals_count,
        'expected_min': 20000,  # Approximately 20,106 in correct text
        'has_finals': finals_count > 0
    }

    if finals_count == 0:
        results['valid'] = False
        results['warnings'].append("No final letters found - text may be corrupted")

    # Check first verse
    expected_gen1_1 = 'בראשיתבראאלהיםאתהשמיםואתהארץ'
    actual_gen1_1 = full_text[:28]
    results['first_verse'] = {
        'actual': actual_gen1_1,
        'expected': expected_gen1_1,
        'matches': actual_gen1_1 == expected_gen1_1
    }

    if actual_gen1_1 != expected_gen1_1:
        results['valid'] = False
        results['warnings'].append("Genesis 1:1 mismatch")

    return results, full_text


def print_report(results):
    """Print validation report."""
    print("=" * 70)
    print("TORAH TEXT VALIDATION REPORT")
    print("=" * 70)
    print(f"Source: {results['source']}")
    print(f"Overall Valid: {'✓ YES' if results['valid'] else '✗ NO'}")
    print()

    print("Book-by-Book Analysis:")
    print("-" * 70)
    print(f"{'Book':<15} {'Actual':>10} {'Expected':>10} {'Status':<10}")
    print("-" * 70)

    for book, data in results['books'].items():
        status = "✓" if data['matches'] else "✗"
        print(f"{book.title():<15} {data['actual']:>10,} {data['expected']:>10,} {status}")

    print("-" * 70)
    t = results['total']
    status = "✓" if t['matches'] else "✗"
    print(f"{'TOTAL':<15} {t['actual']:>10,} {t['expected']:>10,} {status}")

    print()
    print("Final Letters:")
    print("-" * 70)
    f = results['finals']
    print(f"Count: {f['total']:,} {'✓' if f['has_finals'] else '✗'}")

    print()
    print("First Verse (Genesis 1:1):")
    print("-" * 70)
    fv = results['first_verse']
    print(f"Actual:   {fv['actual']}")
    print(f"Expected: {fv['expected']}")
    print(f"Match: {'✓' if fv['matches'] else '✗'}")

    print()
    print("Hash Verification:")
    print("-" * 70)
    h = results['hash']
    print(f"SHA-256: {h['actual']}")
    print(f"Status:  {'✓ Matches canonical' if h['matches'] else '✗ MISMATCH!'}")

    if results['warnings']:
        print()
        print("Warnings:")
        for w in results['warnings']:
            print(f"  ⚠ {w}")

    print("=" * 70)


def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else None
    results, text = validate_text(data_dir)
    print_report(results)

    # Exit with error if invalid
    sys.exit(0 if results['valid'] else 1)


if __name__ == '__main__':
    main()
