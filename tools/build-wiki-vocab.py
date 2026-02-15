#!/usr/bin/env python3
"""
Extract full Hebrew vocabulary from Hebrew Wikipedia dump.
Also extracts person names from biographical articles for the names dictionaries.

Input: tools/wiki-data/hewiki-latest-pages-articles.xml.bz2
Output:
  - data/dictionaries/wikipedia-fulltext.json.gz  (all unique Hebrew words)
  - tools/wiki-data/wiki-person-names.json        (names extracted from bios)
"""

import bz2, re, json, gzip, sys, os, time
from pathlib import Path
from collections import Counter
from xml.etree.ElementTree import iterparse

PROJ = Path(__file__).resolve().parent.parent
DUMP_PATH = PROJ / 'tools' / 'wiki-data' / 'hewiki-latest-pages-articles.xml.bz2'
OUT_VOCAB = PROJ / 'data' / 'dictionaries' / 'wikipedia-fulltext.json.gz'
OUT_NAMES = PROJ / 'tools' / 'wiki-data' / 'wiki-person-names.json'

# Hebrew Unicode range
HEB_RE = re.compile(r"[\u0590-\u05FF'\"]+")
# Person category patterns (Hebrew)
PERSON_CAT_RE = re.compile(
    r'\[\[קטגוריה:.*(?:נולדו|נפטרו|אנשים|פוליטיקאים|שחקנים|שחקניות|'
    r'זמרים|זמרות|סופרים|סופרות|מדענים|ספורטאים|ספורטאיות|'
    r'רבנים|פילוסופים|כלכלנים|אמנים|אמניות|מנהיגים|'
    r'עיתונאים|עיתונאיות|צבאיים|גנרלים|נשיאים|ראשי ממשלה)',
    re.UNICODE
)
# Bold name at start of article (first sentence pattern)
BOLD_NAME_RE = re.compile(r"^'''([^']+?)'''", re.MULTILINE)
# Name in parentheses pattern: Hebrew (English; dates)
NAME_PAREN_RE = re.compile(r"^'''([^']+?)'''\s*\(", re.MULTILINE)


def extract_hebrew_words(text):
    """Extract all Hebrew words from text."""
    words = set()
    for match in HEB_RE.finditer(text):
        word = match.group().strip("'\"")
        # Only keep words with actual Hebrew letters
        if re.search(r'[\u05D0-\u05EA]', word) and 2 <= len(word) <= 20:
            words.add(word)
    return words


def extract_first_name(title, text):
    """Try to extract a person's first name from a biographical article."""
    # Check if this is likely a person article
    if not PERSON_CAT_RE.search(text):
        return None, None

    # Try to get the bold name from article start
    m = BOLD_NAME_RE.search(text[:500])
    if not m:
        return None, None

    full_name = m.group(1).strip()
    # Split into parts
    parts = full_name.split()
    if not parts:
        return None, None

    first_name = parts[0].strip()
    # Validate it's Hebrew
    if not re.search(r'[\u05D0-\u05EA]', first_name):
        return None, None
    if len(first_name) < 2 or len(first_name) > 15:
        return None, None

    # Determine likely gender from categories
    gender = None
    if re.search(r'שחקניות|זמרות|סופרות|ספורטאיות|אמניות|עיתונאיות|נשים|אם\b', text):
        gender = 'F'
    elif re.search(r'שחקנים|זמרים|סופרים|ספורטאים|אמנים|עיתונאים|גברים|אב\b', text):
        gender = 'M'

    return first_name, gender


def process_dump():
    """Process the Wikipedia dump file."""
    if not DUMP_PATH.exists():
        print(f"ERROR: Dump file not found at {DUMP_PATH}")
        sys.exit(1)

    print(f"Processing: {DUMP_PATH}")
    print(f"File size: {DUMP_PATH.stat().st_size / 1024 / 1024:.0f} MB")

    word_freq = Counter()
    person_names = {}  # first_name -> {'count': N, 'gender': M/F/None}
    article_count = 0
    person_count = 0
    t0 = time.time()

    # Detect namespace from file
    ns = '{http://www.mediawiki.org/xml/export-0.11/}'

    with bz2.open(str(DUMP_PATH), 'rt', encoding='utf-8', errors='replace') as f:
        # Use iterparse with 'start'/'end' events for memory efficiency
        context = iterparse(f, events=('end',))
        title = ''
        for event, elem in context:
            # Strip any namespace prefix
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag

            if tag == 'title':
                title = elem.text or ''
                elem.clear()

            elif tag == 'page':
                elem.clear()

            elif tag == 'text':
                text = elem.text or ''
                if not text:
                    elem.clear()
                    continue

                # Skip non-article namespaces
                if title.startswith(('ויקיפדיה:', 'קטגוריה:', 'תבנית:', 'עזרה:',
                                     'Wikipedia:', 'Category:', 'Template:', 'Help:',
                                     'קובץ:', 'File:', 'מדיה-ויקי:', 'MediaWiki:',
                                     'מודול:', 'Module:', 'פורטל:', 'Portal:')):
                    elem.clear()
                    continue

                article_count += 1

                # Extract all Hebrew words
                words = extract_hebrew_words(text)
                for w in words:
                    word_freq[w] += 1

                # Try to extract person names
                first_name, gender = extract_first_name(title, text)
                if first_name:
                    person_count += 1
                    if first_name in person_names:
                        person_names[first_name]['count'] += 1
                        if gender and not person_names[first_name]['gender']:
                            person_names[first_name]['gender'] = gender
                    else:
                        person_names[first_name] = {'count': 1, 'gender': gender}

                # Progress
                if article_count % 10000 == 0:
                    elapsed = time.time() - t0
                    print(f"  {article_count:,} articles, {len(word_freq):,} unique words, "
                          f"{person_count:,} persons ({elapsed:.0f}s)")

                elem.clear()

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.0f}s")
    print(f"  Articles: {article_count:,}")
    print(f"  Unique Hebrew words: {len(word_freq):,}")
    print(f"  Person first names: {len(person_names):,}")

    # Save vocabulary
    print(f"\nWriting vocabulary to {OUT_VOCAB}...")
    vocab_dict = {
        'metadata': {
            'name': 'Hebrew Wikipedia Full-Text Vocabulary',
            'short_name': 'wikipedia-fulltext',
            'description': f'All unique Hebrew words from Hebrew Wikipedia ({article_count:,} articles). '
                           f'Extracted from full article text, not just titles.',
            'version': '2.0',
            'count': len(word_freq),
            'source': 'hewiki-latest-pages-articles.xml.bz2',
        },
        'entries': {}
    }
    for word, freq in word_freq.most_common():
        vocab_dict['entries'][word] = {
            'word': word,
            'definitions': [],
            'sources': ['wikipedia-fulltext'],
            'pos': None,
            'era': 'modern',
            'frequency': freq,
        }

    with gzip.open(str(OUT_VOCAB), 'wt', encoding='utf-8') as f:
        json.dump(vocab_dict, f, ensure_ascii=False)
    print(f"  Written: {OUT_VOCAB} ({len(word_freq):,} entries)")

    # Save person names
    print(f"\nWriting person names to {OUT_NAMES}...")
    with open(str(OUT_NAMES), 'w', encoding='utf-8') as f:
        json.dump(person_names, f, ensure_ascii=False, indent=2)
    print(f"  Written: {OUT_NAMES} ({len(person_names):,} names)")

    # Stats
    male_names = {n for n, d in person_names.items() if d['gender'] == 'M'}
    female_names = {n for n, d in person_names.items() if d['gender'] == 'F'}
    unknown_names = {n for n, d in person_names.items() if d['gender'] is None}
    print(f"  Male: {len(male_names):,}, Female: {len(female_names):,}, Unknown: {len(unknown_names):,}")

    # Top names
    top_male = sorted([(n, d['count']) for n, d in person_names.items() if d['gender'] == 'M'],
                       key=lambda x: -x[1])[:20]
    top_female = sorted([(n, d['count']) for n, d in person_names.items() if d['gender'] == 'F'],
                        key=lambda x: -x[1])[:20]
    print(f"\nTop male names: {top_male}")
    print(f"Top female names: {top_female}")


if __name__ == '__main__':
    process_dump()
