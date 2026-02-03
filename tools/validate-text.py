#!/usr/bin/env python3
"""
Torah Text Validation Tool

Validates the Torah/Tanach text against known reference standards.

Sources:
- Our DB: Leningrad Codex (oldest complete Hebrew Bible manuscript, 1008 CE)
- Rips et al.: Koren Edition (used in original Torah codes research)

The ~367 character difference between Leningrad and Koren is due to:
- Qere/Ketiv variations (written vs read forms)
- Plene/defective spelling differences (מלא/חסר)
- Minor textual variants between manuscript traditions
"""

import gzip
import json
import hashlib
import os
import sys

# Reference counts from various editions
KOREN_COUNTS = {
    'genesis': 78064,
    'exodus': 63529,
    'leviticus': 44790,
    'numbers': 63530,
    'deuteronomy': 54892,
    'total': 304805
}

# Our Leningrad-based counts (for validation that DB hasn't changed)
LENINGRAD_COUNTS = {
    'genesis': 78143,
    'exodus': 63595,
    'leviticus': 44812,
    'numbers': 63588,
    'deuteronomy': 55034,
    'total': 305172
}

# SHA-256 hashes of canonical texts (for integrity verification)
LENINGRAD_SHA256 = "aac5640a45c4448850d1d09ef25e42d105c73593f7edb0821c54165ff0d13860"
KOREN_SHA256 = "9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4"

# For backward compatibility
CANONICAL_SHA256 = LENINGRAD_SHA256


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
        'source': 'Leningrad Codex',
        'books': {},
        'total': {},
        'hash': {},
        'warnings': []
    }

    # Load text
    full_text, book_texts = load_torah_from_db(data_dir)

    # Validate each book
    for book, text in book_texts.items():
        actual = len(text)
        expected_leningrad = LENINGRAD_COUNTS[book]
        expected_koren = KOREN_COUNTS[book]

        results['books'][book] = {
            'actual': actual,
            'expected_leningrad': expected_leningrad,
            'expected_koren': expected_koren,
            'matches_leningrad': actual == expected_leningrad,
            'diff_from_koren': actual - expected_koren
        }

        if actual != expected_leningrad:
            results['valid'] = False
            results['warnings'].append(f"{book}: count mismatch (expected {expected_leningrad}, got {actual})")

    # Validate total
    actual_total = len(full_text)
    results['total'] = {
        'actual': actual_total,
        'expected_leningrad': LENINGRAD_COUNTS['total'],
        'expected_koren': KOREN_COUNTS['total'],
        'matches_leningrad': actual_total == LENINGRAD_COUNTS['total'],
        'diff_from_koren': actual_total - KOREN_COUNTS['total']
    }

    if actual_total != LENINGRAD_COUNTS['total']:
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
        results['warnings'].append(f"SHA-256 mismatch - text may have been modified")

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
    print(f"{'Book':<15} {'Actual':>10} {'Leningrad':>10} {'Koren':>10} {'Status':<10}")
    print("-" * 70)

    for book, data in results['books'].items():
        status = "✓" if data['matches_leningrad'] else "✗"
        diff = f"+{data['diff_from_koren']}" if data['diff_from_koren'] > 0 else str(data['diff_from_koren'])
        print(f"{book.title():<15} {data['actual']:>10,} {data['expected_leningrad']:>10,} {data['expected_koren']:>10,} {status} ({diff} vs Koren)")

    print("-" * 70)
    t = results['total']
    status = "✓" if t['matches_leningrad'] else "✗"
    diff = f"+{t['diff_from_koren']}" if t['diff_from_koren'] > 0 else str(t['diff_from_koren'])
    print(f"{'TOTAL':<15} {t['actual']:>10,} {t['expected_leningrad']:>10,} {t['expected_koren']:>10,} {status} ({diff} vs Koren)")

    print()
    print("Hash Verification:")
    print("-" * 70)
    h = results['hash']
    print(f"SHA-256: {h['actual']}")
    print(f"Status:  {'✓ Matches canonical' if h['matches'] else '✗ MISMATCH - text modified!'}")

    if results['warnings']:
        print()
        print("Warnings:")
        for w in results['warnings']:
            print(f"  ⚠ {w}")

    print()
    print("Note: Our text uses the Leningrad Codex. Rips et al. used the Koren edition.")
    print(f"      Difference: +{results['total']['diff_from_koren']} characters")
    print("      For exact Rips replication, the Koren text would be needed.")
    print("=" * 70)


def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else None
    results, text = validate_text(data_dir)
    print_report(results)

    # Exit with error if invalid
    sys.exit(0 if results['valid'] else 1)


if __name__ == '__main__':
    main()
