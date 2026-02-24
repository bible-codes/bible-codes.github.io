#!/usr/bin/env python3
"""
Build verse-summaries.json.gz — pre-computed semantic context for all Tanakh verses.

Reads all 39 data/*-verses.json.gz files, sends chapter-sized batches to
Claude API (Haiku for cost efficiency), and produces a single compressed
JSON file keyed by "book:chapter:verse".

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    pip install anthropic
    python3 tools/build-verse-summaries.py

Options:
    --books  1,2,3       Only process specific book numbers (default: all)
    --resume             Resume from last checkpoint (skips completed chapters)
    --output PATH        Output file (default: data/verse-summaries.json.gz)
    --model  MODEL       Claude model to use (default: claude-haiku-4-5)
    --dry-run            Print stats without calling API

Cost estimate: ~929 chapters × ~1K tokens each ≈ 1M input + 500K output tokens
    Haiku: ~$1 input + $2.50 output ≈ $3.50 total
"""

import argparse
import gzip
import json
import os
import sys
import time
import glob
from pathlib import Path

# Book number → English name (matches app's BOOK_NAMES)
BOOK_NAMES = {
    1:'Genesis',2:'Exodus',3:'Leviticus',4:'Numbers',5:'Deuteronomy',
    6:'Joshua',7:'Judges',8:'1 Samuel',9:'2 Samuel',10:'1 Kings',
    11:'2 Kings',12:'Isaiah',13:'Jeremiah',14:'Ezekiel',15:'Hosea',
    16:'Joel',17:'Amos',18:'Obadiah',19:'Jonah',20:'Micah',
    21:'Nahum',22:'Habakkuk',23:'Zephaniah',24:'Haggai',25:'Zechariah',
    26:'Malachi',27:'Psalms',28:'Proverbs',29:'Job',30:'Song of Songs',
    31:'Ruth',32:'Lamentations',33:'Ecclesiastes',34:'Esther',35:'Daniel',
    36:'Ezra',37:'Nehemiah',38:'1 Chronicles',39:'2 Chronicles'
}

# Filename stem → book number
FILENAME_TO_BOOK = {}

def build_filename_map(data_dir):
    """Build mapping from filename stems to book numbers by reading actual files."""
    for path in glob.glob(os.path.join(data_dir, '*-verses.json.gz')):
        stem = os.path.basename(path).replace('-verses.json.gz', '')
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            data = json.load(f)
        if data:
            FILENAME_TO_BOOK[stem] = data[0]['book']


def load_verses(data_dir):
    """Load all verse data from compressed JSON files, grouped by book and chapter."""
    books = {}  # book_num → {chapter → [verses]}

    for path in sorted(glob.glob(os.path.join(data_dir, '*-verses.json.gz'))):
        stem = os.path.basename(path).replace('-verses.json.gz', '')
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            data = json.load(f)

        if not data:
            continue

        book_num = data[0]['book']
        books[book_num] = {}

        for v in data:
            chap = v['chapter']
            if chap not in books[book_num]:
                books[book_num][chap] = []
            books[book_num][chap].append(v)

    return books


def build_prompt(book_name, chapter, verses):
    """Build the prompt for a single chapter."""
    verse_lines = []
    for v in verses:
        text = v.get('verse_text_consonantal', '')
        verse_lines.append(f"  {v['verse']}. {text}")

    verses_block = "\n".join(verse_lines)

    return f"""You are a Hebrew Bible scholar. Below are the consonantal Hebrew verses from {book_name} Chapter {chapter}.

For EACH verse, provide a UNIQUE per-verse summary in this exact JSON format:
{{
  "{v['book']}:{chapter}:VERSE_NUM": {{
    "s": "summary of THIS SPECIFIC verse only",
    "who": ["key subjects/people mentioned in THIS verse"],
    "feel": "emotional tone/sentiment (1-3 words)",
    "t": ["1-3 thematic tags"]
  }}
}}

CRITICAL RULES:
- Each verse MUST have its own DISTINCT summary describing what THAT verse says.
- NEVER copy the same summary across multiple verses. Even in repetitive sections (lists, genealogies, census counts, offerings), each verse has DIFFERENT specific details — name them.
- For genealogy/list verses: name the specific person, tribe, or item in THAT verse.
  Example: verse listing "Of the tribe of Asher, Sethur son of Michael" → "Sethur son of Michael represents tribe of Asher"
- For census verses: include the specific tribe name and count from THAT verse.
- For offering verses: include the specific day number or offerer name.
- "who" should list actual names when possible (people, tribes, places).
- "feel" captures the emotional register (e.g., "awe", "grief", "joy", "command", "enumeration").
- "t" uses lowercase tags like "creation", "covenant", "war", "prophecy", "law", "prayer", "genealogy", "census", "offering".

Respond with ONLY a valid JSON object containing all {len(verses)} verses. No commentary.

{book_name} Chapter {chapter}:
{verses_block}"""


def call_api(client, model, prompt, max_retries=3):
    """Call Claude API with retry logic."""
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )
            text = response.content[0].text.strip()
            # Strip markdown code fences if present
            if text.startswith('```'):
                text = text.split('\n', 1)[1] if '\n' in text else text[3:]
                if text.endswith('```'):
                    text = text[:-3].strip()
                elif '```' in text:
                    text = text[:text.rfind('```')].strip()

            return json.loads(text), response.usage
        except json.JSONDecodeError as e:
            print(f"    JSON parse error (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
        except Exception as e:
            print(f"    API error (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(5 * (attempt + 1))

    return None, None


def main():
    parser = argparse.ArgumentParser(description='Build verse summaries using Claude API')
    parser.add_argument('--books', type=str, default='',
                        help='Comma-separated book numbers to process (default: all)')
    parser.add_argument('--resume', action='store_true',
                        help='Resume from checkpoint, skipping completed chapters')
    parser.add_argument('--output', type=str, default='data/verse-summaries.json.gz',
                        help='Output file path')
    parser.add_argument('--model', type=str, default='claude-haiku-4-5',
                        help='Claude model to use')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print stats without calling API')
    parser.add_argument('--checkpoint', type=str, default='data/.verse-summaries-checkpoint.json',
                        help='Checkpoint file for resume support')
    args = parser.parse_args()

    # Resolve paths relative to project root
    project_root = Path(__file__).parent.parent
    data_dir = project_root / 'data'
    output_path = project_root / args.output
    checkpoint_path = project_root / args.checkpoint

    print(f"Loading verse data from {data_dir}...")
    books = load_verses(str(data_dir))

    # Filter books if specified
    if args.books:
        book_filter = set(int(b) for b in args.books.split(','))
        books = {k: v for k, v in books.items() if k in book_filter}

    # Count totals
    total_chapters = sum(len(chapters) for chapters in books.values())
    total_verses = sum(
        sum(len(vv) for vv in chapters.values())
        for chapters in books.values()
    )

    print(f"Books: {len(books)}, Chapters: {total_chapters}, Verses: {total_verses}")

    if args.dry_run:
        # Estimate token usage
        est_input = total_chapters * 1200  # ~1200 tokens per chapter prompt
        est_output = total_chapters * 600   # ~600 tokens per chapter response
        print(f"\nEstimated tokens: ~{est_input:,} input + ~{est_output:,} output")
        print(f"Estimated cost (Haiku): ~${est_input * 1e-6:.2f} input + ${est_output * 5e-6:.2f} output = ~${est_input * 1e-6 + est_output * 5e-6:.2f}")
        return

    # Import anthropic
    try:
        import anthropic
    except ImportError:
        print("Error: 'anthropic' package not installed. Run: pip install anthropic")
        sys.exit(1)

    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY environment variable not set.")
        sys.exit(1)

    client = anthropic.Anthropic()

    # Load checkpoint if resuming
    summaries = {}
    if args.resume and checkpoint_path.exists():
        with open(checkpoint_path, 'r', encoding='utf-8') as f:
            summaries = json.load(f)
        print(f"Resumed from checkpoint: {len(summaries)} verses already processed")

    # Track completed chapters
    completed_chapters = set()
    for key in summaries:
        parts = key.split(':')
        if len(parts) == 3:
            completed_chapters.add(f"{parts[0]}:{parts[1]}")

    total_input_tokens = 0
    total_output_tokens = 0
    processed = 0
    errors = 0

    for book_num in sorted(books.keys()):
        book_name = BOOK_NAMES.get(book_num, f"Book {book_num}")
        chapters = books[book_num]

        for chap_num in sorted(chapters.keys()):
            chap_key = f"{book_num}:{chap_num}"

            # Skip if already processed
            if chap_key in completed_chapters:
                continue

            verses = chapters[chap_num]
            prompt = build_prompt(book_name, chap_num, verses)

            print(f"  {book_name} {chap_num} ({len(verses)} verses)...", end=' ', flush=True)

            result, usage = call_api(client, args.model, prompt)

            if result:
                summaries.update(result)
                processed += 1
                if usage:
                    total_input_tokens += usage.input_tokens
                    total_output_tokens += usage.output_tokens
                print(f"OK ({usage.input_tokens + usage.output_tokens} tokens)" if usage else "OK")
            else:
                errors += 1
                print("FAILED")

            # Checkpoint every 10 chapters
            if processed % 10 == 0 and processed > 0:
                with open(checkpoint_path, 'w', encoding='utf-8') as f:
                    json.dump(summaries, f, ensure_ascii=False)
                print(f"  [Checkpoint saved: {len(summaries)} verses]")

            # Rate limit: small delay between calls
            time.sleep(0.5)

    # Save final output
    print(f"\nSaving {len(summaries)} verse summaries to {output_path}...")
    json_bytes = json.dumps(summaries, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with gzip.open(output_path, 'wb') as f:
        f.write(json_bytes)

    # Clean up checkpoint
    if checkpoint_path.exists():
        os.remove(checkpoint_path)

    raw_size = len(json_bytes)
    gz_size = output_path.stat().st_size
    print(f"Raw: {raw_size:,} bytes → Compressed: {gz_size:,} bytes ({raw_size/gz_size:.1f}x ratio)")
    print(f"Total tokens: {total_input_tokens:,} input + {total_output_tokens:,} output")
    print(f"Processed: {processed} chapters, Errors: {errors}")
    print("Done!")


if __name__ == '__main__':
    main()
