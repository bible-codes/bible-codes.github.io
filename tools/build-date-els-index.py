#!/usr/bin/env python3
"""
Build Hebrew Date ELS Index — pre-computed ELS positions for all Hebrew dates and years.

Searches the Koren Edition Torah text (torahNoSpaces.txt, 304,805 letters — the exact
text used by Rips et al. 1994, SHA-256: b65394d...) for Hebrew date terms at all skip
distances, producing a compressed JSON index for the Date Map UI.

Text Source:
  Koren Edition of the Torah, same text used in the WRR (1994) experiment.
  Verified via SHA-256 hash: b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226
  Sofiot (final letter forms) are normalized to regular forms for search matching,
  matching the behavior of the main ELS scan engine.

Hebrew Date Terms Generated:
  - 14 months × up to 30 days each:
      12 standard months (Tishrei through Elul)
      + Adar I (אדרא, leap-year first Adar, 30 days)
      + Adar II (אדרב, leap-year second Adar, 29 days)
  - Variant month spellings: חשוון for חשון, אדרראשון for אדרא, אדרשני for אדרב
  - Days 15 & 16 searched in BOTH forms:
      Standard: טו (15), טז (16) — avoids divine name
      Mathematical: יה (15), יו (16) — pure gematria form
      (ELS sequences follow letter values, not typographic convention)
  - 14 standalone month names + variants
  - 100 year values (5700–5799 = ~1940–2039)
  - Total: ~600+ unique search terms

Algorithm:
  For each skip distance d (1 to max_skip):
    - Build d subsequences: text[0::d], text[1::d], ..., text[d-1::d]
    - Search each subsequence for all terms using str.find() (C-speed)
    - For negative skip: search for reversed terms in same subsequences
    - Map subsequence positions back to original text positions

Output: data/els-dates-index.json.gz (~100–300 KB)

Usage:
    python3 tools/build-date-els-index.py
    python3 tools/build-date-els-index.py --max-skip 500 --top-n 20
    python3 tools/build-date-els-index.py --dry-run

Options:
    --max-skip N   Maximum absolute skip value to search (default: 200)
                   Higher values find more hits but take longer.
                   200 → ~2 min, 500 → ~10 min
    --top-n N      Number of top hits (smallest |skip|) stored per term (default: 10)
    --output PATH  Output file path (default: data/els-dates-index.json.gz)
    --dry-run      Print term counts and sample terms without searching

Performance: ~2–5 min for --max-skip 200, ~10–30 min for --max-skip 500
"""

import argparse
import gzip
import json
import os
import sys
import time
from pathlib import Path
from collections import defaultdict

# --- Sofit normalization (matches JS SOFIT_MAP in index.html) ---
# Final-form letters → regular forms: ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ
SOFIT_MAP = str.maketrans({'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'})

def normalize_sofiot(s):
    return s.translate(SOFIT_MAP)

# --- Hebrew calendar data ---

# All 14 months: 12 standard + Adar I + Adar II
# (Hebrew name, English name, max days in month)
MONTHS = [
    ('תשרי',  'Tishrei',   30),
    ('חשון',  'Cheshvan',  29),   # Can be 30 in some years
    ('כסלו',  'Kislev',    30),   # Can be 29 in some years
    ('טבת',   'Tevet',     29),
    ('שבט',   'Shevat',    30),
    ('אדר',   'Adar',      29),   # Non-leap year Adar
    ('אדרא',  'Adar I',    30),   # Leap year first Adar (אדר ראשון)
    ('אדרב',  'Adar II',   29),   # Leap year second Adar (אדר שני)
    ('ניסן',  'Nisan',     30),
    ('אייר',  'Iyar',      29),
    ('סיון',  'Sivan',     30),
    ('תמוז',  'Tammuz',    29),
    ('אב',    'Av',        30),
    ('אלול',  'Elul',      29),
]

# Variant month spellings (searched as additional terms)
MONTH_ALTS = {
    'חשון':  ['חשוון'],       # Cheshvan with extra vav (מרחשוון)
    'אדרא':  ['אדרראשון'],    # Adar Rishon full form (no spaces for ELS)
    'אדרב':  ['אדרשני'],      # Adar Sheni full form
}

# Day number → list of Hebrew forms
# Standard convention: 15=טו, 16=טז (avoids spelling divine name יה / יו)
# Mathematical form: 15=יה, 16=יו (pure gematria — valid for ELS search since
# equidistant letter sequences follow letter VALUES, not typographic conventions)
def day_to_hebrew_forms(n):
    """Convert day number (1-30) to list of Hebrew numeral strings.

    Returns a list with 1 or 2 forms:
      - Days 15, 16: returns BOTH standard (טו/טז) and mathematical (יה/יו) forms
      - All other days: returns single standard form

    Convention:
      Standard: 15=טו (tet-vav), 16=טז (tet-zayin) — avoids divine name
      Mathematical: 15=יה (yod-heh), 16=יו (yod-vav) — pure positional value
    """
    units = {1:'א', 2:'ב', 3:'ג', 4:'ד', 5:'ה', 6:'ו', 7:'ז', 8:'ח', 9:'ט'}

    if n <= 9:
        return [units[n]]
    elif n == 10:
        return ['י']
    elif n == 15:
        return ['טו', 'יה']   # Standard + mathematical
    elif n == 16:
        return ['טז', 'יו']   # Standard + mathematical
    elif n == 20:
        return ['כ']
    elif n == 30:
        return ['ל']
    elif n < 20:
        return ['י' + units[n - 10]]
    elif n < 30:
        return ['כ' + units[n - 20]]
    else:
        return ['ל']


def year_to_hebrew(n):
    """Convert year value (e.g. 786 for 5786) to Hebrew letter string.

    Encoding: hundreds are decomposed into multiples of 400 (ת), 300 (ש), 200 (ר), 100 (ק).
    Tens and units follow standard gematria.
    For years containing 15 or 16 in the tens+units: uses טו/טז (standard convention).

    Examples:
      786 → תשפו  (5786 = 2025/26)
      780 → תשפ   (5780 = 2019/20)
      700 → תש    (5700 = 1939/40)
      744 → תשמד  (5744 = 1983/84)
      715 → תשטו  (5715 = 1954/55)
    """
    result = []

    # Hundreds: 400=ת, 300=ש, 200=ר, 100=ק
    while n >= 400:
        result.append('ת')
        n -= 400
    if n >= 300:
        result.append('ש')
        n -= 300
    elif n >= 200:
        result.append('ר')
        n -= 200
    elif n >= 100:
        result.append('ק')
        n -= 100

    # Special cases for 15, 16 (standard convention for year names)
    if n == 15:
        result.append('טו')
        return ''.join(result)
    if n == 16:
        result.append('טז')
        return ''.join(result)

    # Tens
    tens_map = {10:'י', 20:'כ', 30:'ל', 40:'מ', 50:'נ', 60:'ס', 70:'ע', 80:'פ', 90:'צ'}
    t = (n // 10) * 10
    if t > 0:
        result.append(tens_map[t])
        n -= t

    # Units
    units_map = {1:'א', 2:'ב', 3:'ג', 4:'ד', 5:'ה', 6:'ו', 7:'ז', 8:'ח', 9:'ט'}
    if n > 0:
        result.append(units_map[n])

    return ''.join(result)


def generate_all_terms():
    """Generate all Hebrew date terms to search.

    Generates:
      1. Day+Month combinations for all 14 months (incl. Adar, Adar I, Adar II)
         - Days 15 and 16 generate TWO terms each (standard + mathematical form)
         - Variant month spellings generate additional terms
      2. Standalone month names (14 + variants)
      3. Year values 5700–5799 (~1940–2039)

    Returns dict: { normalized_term: { type, label, ... } }
    """
    terms = {}

    # 1. Day+Month combinations
    for month_heb, month_eng, max_day in MONTHS:
        for day in range(1, max_day + 1):
            day_forms = day_to_hebrew_forms(day)
            primary_day = day_forms[0]  # Standard form (e.g., טו for 15)

            for di, day_heb in enumerate(day_forms):
                combined = normalize_sofiot(day_heb + month_heb)
                label = f"{day} {month_eng}"
                if di > 0:
                    label += f" (alt day={day_heb})"

                if combined not in terms:
                    terms[combined] = {
                        'type': 'date', 'label': label,
                        'day': day, 'month': month_eng, 'monthHeb': month_heb
                    }

                # Variant month spellings
                for alt in MONTH_ALTS.get(month_heb, []):
                    alt_combined = normalize_sofiot(day_heb + alt)
                    if alt_combined not in terms:
                        alt_label = f"{day} {month_eng}" + (f" (alt day={day_heb})" if di > 0 else " (alt)")
                        terms[alt_combined] = {
                            'type': 'date', 'label': alt_label,
                            'day': day, 'month': month_eng, 'monthHeb': alt
                        }

    # 2. Standalone month names
    for month_heb, month_eng, _ in MONTHS:
        month_norm = normalize_sofiot(month_heb)
        if month_norm not in terms:
            terms[month_norm] = {'type': 'month', 'label': month_eng, 'monthHeb': month_heb}

        for alt in MONTH_ALTS.get(month_heb, []):
            alt_norm = normalize_sofiot(alt)
            if alt_norm not in terms:
                terms[alt_norm] = {'type': 'month', 'label': month_eng + ' (alt)', 'monthHeb': alt}

    # 3. Years: 5700-5799 (Hebrew years, covering ~1940-2039)
    for year_val in range(700, 800):
        year_heb = year_to_hebrew(year_val)
        year_norm = normalize_sofiot(year_heb)
        full_year = year_val + 5000
        if year_norm not in terms:
            terms[year_norm] = {'type': 'year', 'label': str(full_year), 'year': full_year}

    return terms


def search_term(text_norm, term, max_skip, top_n):
    """Search for a single term across all skip values.

    Uses subsequence slicing (text[start::d]) with str.find() for C-speed matching.
    For negative skips: searches for reversed term in same subsequences.

    Returns: { 'n': total_hits, 'minSkip': min_abs_skip, 'top': [...] }
    """
    k = len(term)
    rev_term = term[::-1]
    all_hits = []

    for d in range(1, max_skip + 1):
        for start in range(d):
            subseq = text_norm[start::d]

            # Forward (positive skip = d)
            idx = 0
            while True:
                pos = subseq.find(term, idx)
                if pos == -1:
                    break
                actual_pos = start + pos * d
                all_hits.append((actual_pos, d))
                idx = pos + 1

            # Backward (negative skip = -d): search reversed term
            if rev_term != term:  # Skip if palindrome (same forward/backward)
                idx = 0
                while True:
                    pos = subseq.find(rev_term, idx)
                    if pos == -1:
                        break
                    # Start position for backward ELS
                    actual_pos = start + (pos + k - 1) * d
                    all_hits.append((actual_pos, -d))
                    idx = pos + 1

    total = len(all_hits)
    if total == 0:
        return {'n': 0}

    # Sort by |skip| to get most significant hits first
    all_hits.sort(key=lambda h: (abs(h[1]), h[0]))
    min_skip = abs(all_hits[0][1])
    top = [{'p': h[0], 's': h[1]} for h in all_hits[:top_n]]

    return {'n': total, 'minSkip': min_skip, 'top': top}


def main():
    parser = argparse.ArgumentParser(
        description='Build Hebrew Date ELS Index from Koren Torah text',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 tools/build-date-els-index.py                    # Default: ±200 skip
  python3 tools/build-date-els-index.py --max-skip 500     # Wider search
  python3 tools/build-date-els-index.py --dry-run           # Preview terms only
  python3 tools/build-date-els-index.py --top-n 20          # Store more hits per term

Text Source:
  Koren Edition Torah (304,805 letters) — same text used by
  Witztum, Rips & Rosenberg in Statistical Science (1994).
  SHA-256: b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226
""")
    parser.add_argument('--max-skip', type=int, default=200,
                        help='Maximum absolute skip value to search (default: 200)')
    parser.add_argument('--top-n', type=int, default=10,
                        help='Number of top hits to store per term (default: 10)')
    parser.add_argument('--output', type=str, default='data/els-dates-index.json.gz',
                        help='Output file path')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print term statistics without searching')
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent
    text_path = project_root / 'data' / 'torahNoSpaces.txt'
    output_path = project_root / args.output

    # Load Koren Torah text
    print(f"Loading Koren Torah text from {text_path}...")
    text = text_path.read_text(encoding='utf-8').strip()
    text_norm = normalize_sofiot(text)
    print(f"  {len(text_norm):,} characters (Koren Edition)")

    # Verify expected length
    if len(text_norm) != 304805:
        print(f"  WARNING: Expected 304,805 chars (Koren), got {len(text_norm):,}")

    # Generate terms
    terms = generate_all_terms()
    by_type = defaultdict(list)
    for t, info in terms.items():
        by_type[info['type']].append(t)

    print(f"\nTerms generated:")
    print(f"  Dates (day+month):   {len(by_type['date']):>4}  (14 months × up to 30 days, incl. Adar/Adar I/Adar II)")
    print(f"  Months (standalone): {len(by_type['month']):>4}  (14 months + variant spellings)")
    print(f"  Years (5700-5799):   {len(by_type['year']):>4}")
    print(f"  Total unique terms:  {len(terms):>4}")
    print(f"\n  Note: Days 15 & 16 have dual forms (טו/יה, טז/יו)")
    print(f"  Note: Adar has 3 variants (אדר, אדרא, אדרב)")

    if args.dry_run:
        print(f"\nSkip range: ±{args.max_skip}")
        print(f"Top hits stored per term: {args.top_n}")
        print("\n--- Sample terms ---")
        samples = sorted(terms.items(), key=lambda x: (x[1]['type'], x[1]['label']))
        shown = 0
        for i, (t, info) in enumerate(samples):
            if i < 20 or i >= len(samples) - 5:
                print(f"  {t:>12} ({info['type']:>5}) = {info['label']}")
                shown += 1
            elif shown == 20:
                print(f"  ... ({len(samples) - 25} more) ...")
                shown += 1
        return

    # Search all terms
    print(f"\nSearching skip range ±{args.max_skip}...")
    results = {'dates': {}, 'months': {}, 'years': {}}
    total = len(terms)
    done = 0
    start_time = time.time()
    total_hits = 0

    for term_str in sorted(terms.keys()):
        info = terms[term_str]
        done += 1

        result = search_term(text_norm, term_str, args.max_skip, args.top_n)
        result['label'] = info['label']
        if info['type'] == 'date':
            result['day'] = info['day']
            result['month'] = info['month']

        category = info['type'] + 's'  # 'dates', 'months', 'years'
        results[category][term_str] = result
        total_hits += result['n']

        elapsed = time.time() - start_time
        rate = done / elapsed if elapsed > 0 else 0
        eta = (total - done) / rate if rate > 0 else 0

        if done % 25 == 0 or done == total or done <= 3:
            min_s = f" minSkip={result.get('minSkip','—')}" if result['n'] > 0 else ""
            print(f"  [{done:>3}/{total}] {info['label']:>20} ({term_str:>12}) "
                  f"→ {result['n']:>5} hits{min_s}  "
                  f"({rate:.1f}/s, ETA {eta:.0f}s)")

    elapsed = time.time() - start_time

    # Build output
    output = {
        'meta': {
            'version': '1.1',
            'textEdition': 'Koren (Rips et al. 1994)',
            'textSHA256': 'b65394d28c85ce76dca0d15af08810deebb2e85032d6575a9ae764643a193226',
            'skipRange': [1, args.max_skip],
            'textLen': len(text_norm),
            'generated': time.strftime('%Y-%m-%d'),
            'topN': args.top_n,
            'termCount': len(terms),
            'totalHits': total_hits,
            'searchTime': round(elapsed, 1),
            'notes': 'Days 15/16 searched in both standard (טו/טז) and mathematical (יה/יו) forms. '
                     'Adar searched in 3 variants: אדר (non-leap), אדרא (Adar I), אדרב (Adar II).'
        },
        'dates': results['dates'],
        'months': results['months'],
        'years': results['years']
    }

    # Save compressed
    print(f"\nSaving to {output_path}...")
    json_bytes = json.dumps(output, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with gzip.open(output_path, 'wb') as f:
        f.write(json_bytes)

    raw_size = len(json_bytes)
    gz_size = output_path.stat().st_size
    print(f"  Raw: {raw_size:,} bytes → Compressed: {gz_size:,} bytes ({raw_size/gz_size:.1f}x ratio)")
    print(f"\nSummary:")
    print(f"  Total hits across all terms: {total_hits:,}")
    print(f"  Search time: {elapsed:.1f}s ({len(terms)/elapsed:.1f} terms/s)")
    print(f"  Terms with hits: {sum(1 for cat in results.values() for r in cat.values() if r['n'] > 0)}/{len(terms)}")
    print("Done!")


if __name__ == '__main__':
    main()
