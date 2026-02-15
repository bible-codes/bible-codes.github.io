#!/usr/bin/env python3
"""
Convert WRR rabbi data from Michigan-Claremont transliteration to Hebrew Unicode.

Reads WRR1.txt / WRR2.txt (Brendan McKay's ANU archive format) and outputs
JSON arrays matching the WRR_RABBIS format used in bible-codes.html.

MC transliteration used in WRR rabbi files (differs from genesis.koren):
  A → א    B → ב    G → ג    D → ד    H → ה
  W → ו    Z → ז    X → ח    + → ט    Y → י
  K → כ    L → ל    M → מ    N → נ    S → ס
  @ → ע    P → פ    C → צ    Q → ק    R → ר
  $ → ש    T → ת

Entry format:
  COUNT DATE_FLAG WORD1 WORD2 ... WORDn  /DAY1/MONTH1 [/DAY2/MONTH2 ...]
  Continuation lines start with whitespace.
  Blank lines separate groups (ignored).
  Lines starting with # are comments.
"""

import json
import sys
import os

# MC → Hebrew mapping (as used in the WRR rabbi data files)
MC_TO_HEB = {
    'A': 'א', 'B': 'ב', 'G': 'ג', 'D': 'ד', 'H': 'ה',
    'W': 'ו', 'Z': 'ז', 'X': 'ח', '+': 'ט', 'Y': 'י',
    'K': 'כ', 'L': 'ל', 'M': 'מ', 'N': 'נ', 'S': 'ס',
    '@': 'ע', 'P': 'פ', 'C': 'צ', 'Q': 'ק', 'R': 'ר',
    '$': 'ש', 'T': 'ת',
}


def mc_to_hebrew(mc_word):
    """Convert a single MC-transliterated word to Hebrew."""
    result = []
    for ch in mc_word:
        if ch in MC_TO_HEB:
            result.append(MC_TO_HEB[ch])
        else:
            # Unexpected character — keep as-is (shouldn't happen)
            print(f"WARNING: unexpected char '{ch}' in MC word '{mc_word}'", file=sys.stderr)
            result.append(ch)
    return ''.join(result)


def parse_wrr_file(filepath):
    """Parse a WRR rabbi data file and return list of rabbi entries."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Join continuation lines (lines starting with whitespace) to the previous line
    merged = []
    for line in lines:
        stripped = line.rstrip('\n\r')
        if not stripped or stripped.startswith('#'):
            continue
        if stripped[0] in ' \t':
            # Continuation line — append to previous
            if merged:
                merged[-1] += ' ' + stripped.strip()
            continue
        merged.append(stripped.strip())

    rabbis = []
    for i, line in enumerate(merged):
        parts = line.split()
        if len(parts) < 3:
            print(f"WARNING: skipping short line: {line}", file=sys.stderr)
            continue

        count = int(parts[0])
        date_flag = int(parts[1])

        # Split remaining parts into appellations and dates
        remaining = parts[2:]
        appellations = []
        raw_dates = []

        for token in remaining:
            if token.startswith('/'):
                raw_dates.append(token)
            else:
                appellations.append(token)

        # Verify appellation count
        if len(appellations) != count:
            print(f"WARNING: rabbi {i+1}: expected {count} appellations, got {len(appellations)}: {' '.join(appellations)}", file=sys.stderr)

        # Convert appellations to Hebrew
        names_heb = [mc_to_hebrew(a) for a in appellations]

        # Parse dates: format /DAY/MONTH
        # Multiple dates may be concatenated in raw_dates list, but each is /DAY/MONTH
        dates_parsed = []
        date_tokens = ' '.join(raw_dates).split()
        for dt in date_tokens:
            # dt should be like /K/X$WN or /+Z/T$RY
            if not dt.startswith('/'):
                continue
            # Remove leading /
            dt = dt[1:]
            # Split on / to get day and month parts
            slash_parts = dt.split('/')
            if len(slash_parts) >= 2:
                day_mc = slash_parts[0]
                month_mc = slash_parts[1]
                day_heb = mc_to_hebrew(day_mc)
                month_heb = mc_to_hebrew(month_mc)
                dates_parsed.append((day_heb, month_heb))

        # Verify date count
        if date_flag > 0 and len(dates_parsed) != date_flag:
            print(f"WARNING: rabbi {i+1}: date_flag={date_flag} but parsed {len(dates_parsed)} dates", file=sys.stderr)

        # Generate 3 date variants per date: "day month", "day bmonth", "bday month"
        date_variants = []
        for day, month in dates_parsed:
            date_variants.append(f"{day} {month}")       # day month
            date_variants.append(f"{day} ב{month}")      # day bmonth
            date_variants.append(f"ב{day} {month}")      # bday month

        rabbis.append({
            'index': i + 1,
            'names': names_heb,
            'names_mc': appellations,
            'dates': date_variants,
            'dates_raw': dates_parsed,
            'date_flag': date_flag,
            'count': count,
        })

    return rabbis


# English names for List 2 (32 rabbis, matching WRR2.txt order)
EN_NAMES_LIST2 = [
    "Abraham ben David (RABaD)",
    "Abraham Yitzhaki",
    "Abraham HaMalakh",
    "Abraham Saba",
    "Aaron HaGadol of Karlin",
    "Eliezer Ashkenazi",
    "David Oppenheim",
    "David HaNagid",
    "David Nieto",
    "Hayyim Abulafia",
    "Hayyim Benveniste",
    "Hayyim Capusi",
    "Hayyim Shabetai",
    "Yair Hayyim Bacharach",
    "Yehuda HeHasid",
    "Yehuda Ayash",
    "Yehosef HaNagid",
    "Yehoshua (Maginei Shlomo)",
    "Yosef di Trani (MaHaRiT)",
    "Yosef Te'omim",
    "Ya'akov BeRav",
    "Yisrael Ya'akov Hagiz",
    "Ya'akov Moelin (MaHaRIL)",
    "Ya'akov Emden (Ya'avetz)",
    "Yitzhak HaLevi Horowitz",
    "Menachem Mendel Krochmal",
    "Moshe Zacuto",
    "Moshe Margalit",
    "Azariah Figo",
    "Immanuel Hai Ricchi",
    "Shalom Sharabi (RaShaSh)",
    "Shlomo HaMa'almi",
]

# English names for List 1 (34 rabbis, matching WRR1.txt order)
EN_NAMES_LIST1 = [
    "Abraham ben David (RABaD)",
    "Abraham the Pious (ben HaRambam)",
    "Abraham ibn Ezra",
    "Eliyahu Bahur",
    "Eliyahu (the GR\"A)",
    "Gershon Ashkenazi",
    "David Ganz",
    "David HaLevi (the TaZ)",
    "Hayyim ibn Attar",
    "Yehuda ben HaRosh",
    "Yehuda HeHasid (of Regensburg)",
    "Yehuda Loew (MaHaRaL of Prague)",
    "Yonatan Eybeschutz",
    "Yehoshua (Penei Yehoshua)",
    "Yehoshua Falk (the SM\"A)",
    "Yoel Sirkis (the Ba\"CH)",
    "Yom Tov Lipmann Heller",
    "Yonah Gerondi",
    "Yosef Karo",
    "Yehezkel Landau (Noda BiYehuda)",
    "Ya'akov Yehoshua Falk (Penei Yehoshua)",
    "Ya'akov Tam (Rabbeinu Tam)",
    "Yitzhak Alfasi (the Rif)",
    "Yisrael Ba'al Shem Tov",
    "Meir of Rothenburg (MaHaRaM)",
    "Mordechai Yaffe (the Levush)",
    "Moshe Isserles (the Rema)",
    "Moshe Hayyim Luzzatto (RaMCHaL)",
    "Moshe ben Maimon (Rambam)",
    "Tzvi Ashkenazi (Hakham Tzvi)",
    "Shabtai HaKohen (the ShaKH)",
    "Shlomo Yitzhaki (Rashi)",
    "Shlomo Luria (MaHaRShaL)",
    "Shmuel Eliezer Eidels (MaHaRSHA)",
]


def format_for_js(rabbis, en_names, list_name):
    """Format rabbi data as JavaScript array literal."""
    lines = []
    lines.append(f"    const {list_name} = [")
    for i, rabbi in enumerate(rabbis):
        en = en_names[i] if i < len(en_names) else f"Rabbi {i+1}"
        names_js = ','.join(f'"{n}"' for n in rabbi['names'])
        dates_js = ','.join(f'"{d}"' for d in rabbi['dates'])
        comma = ',' if i < len(rabbis) - 1 else ''
        lines.append(f'      {{ id:{i+1}, en:"{en}", names:[{names_js}], dates:[{dates_js}] }}{comma}')
    lines.append("    ];")
    return '\n'.join(lines)


def format_as_json(rabbis, en_names):
    """Format rabbi data as JSON."""
    result = []
    for i, rabbi in enumerate(rabbis):
        en = en_names[i] if i < len(en_names) else f"Rabbi {i+1}"
        result.append({
            'id': i + 1,
            'en': en,
            'names': rabbi['names'],
            'dates': rabbi['dates'],
            'appellation_count': rabbi['count'],
            'date_count': rabbi['date_flag'],
        })
    return result


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(project_dir, 'data')

    # Parse both lists
    wrr2_path = '/tmp/WRR2.txt'
    wrr1_path = '/tmp/WRR1.txt'

    if not os.path.exists(wrr2_path):
        print(f"ERROR: {wrr2_path} not found", file=sys.stderr)
        sys.exit(1)

    print("=== Parsing WRR List 2 (32 rabbis) ===")
    list2 = parse_wrr_file(wrr2_path)
    print(f"Parsed {len(list2)} entries")

    if os.path.exists(wrr1_path):
        print("\n=== Parsing WRR List 1 (34 rabbis) ===")
        list1 = parse_wrr_file(wrr1_path)
        print(f"Parsed {len(list1)} entries")
    else:
        list1 = None
        print(f"\n{wrr1_path} not found, skipping List 1")

    # Print summary for verification
    print("\n=== List 2 Summary ===")
    for i, r in enumerate(list2):
        en = EN_NAMES_LIST2[i] if i < len(EN_NAMES_LIST2) else f"Rabbi {i+1}"
        dates_str = ', '.join(f'{d}/{m}' for d, m in r['dates_raw']) if r['dates_raw'] else '(no date)'
        print(f"  {i+1:2d}. {en:40s} | {r['count']} names, {r['date_flag']} dates | {r['names'][0]}")
        print(f"      Names: {', '.join(r['names'])}")
        if r['dates']:
            print(f"      Dates: {', '.join(r['dates'][:3])}{'...' if len(r['dates']) > 3 else ''}")

    if list1:
        print("\n=== List 1 Summary ===")
        for i, r in enumerate(list1):
            en = EN_NAMES_LIST1[i] if i < len(EN_NAMES_LIST1) else f"Rabbi {i+1}"
            print(f"  {i+1:2d}. {en:45s} | {r['count']} names, {r['date_flag']} dates | {r['names'][0]}")

    # Output JSON files
    json2 = format_as_json(list2, EN_NAMES_LIST2)
    json2_path = os.path.join(data_dir, 'wrr-list2.json')
    with open(json2_path, 'w', encoding='utf-8') as f:
        json.dump(json2, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {json2_path}")

    if list1:
        json1 = format_as_json(list1, EN_NAMES_LIST1)
        json1_path = os.path.join(data_dir, 'wrr-list1.json')
        with open(json1_path, 'w', encoding='utf-8') as f:
            json.dump(json1, f, ensure_ascii=False, indent=2)
        print(f"Wrote {json1_path}")

    # Output JS code for embedding in bible-codes.html
    print("\n=== JavaScript for bible-codes.html ===")
    print()
    js2 = format_for_js(list2, EN_NAMES_LIST2, 'WRR_RABBIS')
    print(js2)
    print()

    if list1:
        js1 = format_for_js(list1, EN_NAMES_LIST1, 'WRR_RABBIS_LIST1')
        print(js1)
        print()


if __name__ == '__main__':
    main()
