#!/usr/bin/env python3
"""
Build Hebrew name dictionaries (male + female) for ELS search.

Sources:
1. Hebrew Wikipedia verified names (article titles from name categories)
2. Comprehensive transliteration engine for common international names
3. Alt spellings included where known

Output: data/dictionaries/names-male.json.gz, data/dictionaries/names-female.json.gz
"""

import json, gzip, os, re, sys
from pathlib import Path

PROJ = Path(__file__).resolve().parent.parent

# ============================================================
# TRANSLITERATION ENGINE: English → Hebrew
# ============================================================
# Standard Israeli transliteration conventions for foreign names

# Multi-char patterns (checked first, longest match wins)
TRANSLIT_MULTI = {
    'sh': 'ש', 'ch': "צ'", 'th': 'ת', 'ph': 'פ',
    'zh': "ז'", 'kh': 'ח', 'gh': 'ג', 'dj': "ג'",
    'ts': 'צ', 'tz': 'צ', 'ck': 'ק',
    'ee': 'י', 'oo': 'ו', 'ou': 'או',
    'ei': 'יי', 'ey': 'יי', 'ai': 'יי', 'ay': 'יי',
    'au': 'או', 'aw': 'או',
    'ie': 'י', 'ea': 'י',
    'qu': 'קוו',
}

# Single-char mappings
TRANSLIT_SINGLE = {
    'a': 'א', 'b': 'ב', 'c': 'ק', 'd': 'ד', 'e': '',
    'f': 'פ', 'g': 'ג', 'h': 'ה', 'i': 'י', 'j': "ג'",
    'k': 'ק', 'l': 'ל', 'm': 'מ', 'n': 'נ', 'o': 'ו',
    'p': 'פ', 'q': 'ק', 'r': 'ר', 's': 'ס', 't': 'ט',
    'u': 'ו', 'v': 'ו', 'w': 'ו', 'x': 'קס', 'y': 'י',
    'z': 'ז',
}

def transliterate(name):
    """Transliterate an English name to Hebrew using standard Israeli conventions."""
    name = name.lower().strip()
    result = []
    i = 0
    while i < len(name):
        # Try multi-char patterns (longest first)
        matched = False
        for length in [3, 2]:
            chunk = name[i:i+length]
            if chunk in TRANSLIT_MULTI:
                result.append(TRANSLIT_MULTI[chunk])
                i += length
                matched = True
                break
        if not matched:
            ch = name[i]
            if ch in TRANSLIT_SINGLE:
                result.append(TRANSLIT_SINGLE[ch])
            # Skip non-alpha chars (hyphens, apostrophes, etc.)
            i += 1

    heb = ''.join(result)
    # Apply final-form rules: mem/nun/pe/tsade/kaf at end of word
    if heb and heb[-1] == 'מ': heb = heb[:-1] + 'ם'
    if heb and heb[-1] == 'נ': heb = heb[:-1] + 'ן'
    if heb and heb[-1] == 'פ': heb = heb[:-1] + 'ף'
    if heb and heb[-1] == 'צ': heb = heb[:-1] + 'ץ'
    if heb and heb[-1] == 'כ': heb = heb[:-1] + 'ך'
    return heb


# ============================================================
# VERIFIED TRANSLITERATIONS: Most common names with known Hebrew spellings
# ============================================================
# These override the transliteration engine — manually verified Hebrew spellings
# Format: 'English': ('Hebrew', 'gender', ['alt1', 'alt2'])

VERIFIED_NAMES = {
    # ===== TOP MALE NAMES (Worldwide / Multi-cultural) =====
    # English/American
    'James': ('ג׳יימס', 'M', ["ג'יימס", 'ג׳יימז']),
    'John': ("ג'ון", 'M', ['ג׳ון', 'יוחנן']),
    'Robert': ('רוברט', 'M', []),
    'Michael': ('מייקל', 'M', ['מיכאל']),
    'William': ('וויליאם', 'M', ['ויליאם']),
    'David': ('דייויד', 'M', ['דוד']),
    'Richard': ("ריצ'ארד", 'M', ['ריצארד']),
    'Joseph': ("ג'וזף", 'M', ['יוסף']),
    'Thomas': ('תומאס', 'M', ['תומס']),
    'Charles': ("צ'ארלס", 'M', ["צ'ארלז"]),
    'Christopher': ('כריסטופר', 'M', []),
    'Daniel': ('דניאל', 'M', []),
    'Matthew': ('מתיו', 'M', ['מתתיהו']),
    'Anthony': ('אנתוני', 'M', ['אנטוני']),
    'Mark': ('מארק', 'M', []),
    'Donald': ('דונלד', 'M', []),
    'Steven': ('סטיבן', 'M', ['סטפן', 'סטיבן']),
    'Paul': ('פול', 'M', []),
    'Andrew': ('אנדרו', 'M', ['אנדריו']),
    'Joshua': ("ג'ושוע", 'M', ['יהושע']),
    'Kenneth': ('קנת', 'M', []),
    'Kevin': ('קווין', 'M', []),
    'Brian': ('בריאן', 'M', ['בראיין']),
    'George': ("ג'ורג'", 'M', ["ג'ורג"]),
    'Timothy': ('טימותי', 'M', []),
    'Ronald': ('רונלד', 'M', []),
    'Edward': ('אדוארד', 'M', []),
    'Jason': ("ג'ייסון", 'M', []),
    'Jeffrey': ("ג'פרי", 'M', []),
    'Ryan': ('ראיין', 'M', ['ריאן']),
    'Jacob': ("ג'ייקוב", 'M', ['יעקב']),
    'Gary': ('גארי', 'M', []),
    'Nicholas': ('ניקולס', 'M', []),
    'Eric': ('אריק', 'M', []),
    'Jonathan': ("ג'ונתן", 'M', ['יונתן']),
    'Stephen': ('סטיבן', 'M', ['סטפן']),
    'Larry': ('לארי', 'M', []),
    'Justin': ("ג'סטין", 'M', []),
    'Scott': ('סקוט', 'M', []),
    'Brandon': ('ברנדון', 'M', []),
    'Benjamin': ('בנג׳מין', 'M', ['בנימין']),
    'Samuel': ('סמואל', 'M', ['שמואל']),
    'Raymond': ('ריימונד', 'M', []),
    'Gregory': ('גרגורי', 'M', []),
    'Frank': ('פרנק', 'M', []),
    'Alexander': ('אלכסנדר', 'M', []),
    'Patrick': ('פטריק', 'M', []),
    'Jack': ("ג'ק", 'M', ["ג'אק"]),
    'Dennis': ('דניס', 'M', []),
    'Jerry': ("ג'רי", 'M', []),
    'Tyler': ('טיילר', 'M', []),
    'Aaron': ('אהרון', 'M', ['אהרן']),
    'Jose': ('חוסה', 'M', []),
    'Adam': ('אדם', 'M', []),
    'Nathan': ('נייתן', 'M', ['נתן']),
    'Henry': ('הנרי', 'M', []),
    'Peter': ('פיטר', 'M', []),
    'Zachary': ('זכרי', 'M', []),
    'Douglas': ('דאגלס', 'M', []),
    'Harold': ('הרולד', 'M', []),
    'Kyle': ('קייל', 'M', []),
    'Noah': ('נוח', 'M', []),
    'Ethan': ('איתן', 'M', []),
    'Jeremy': ("ג'רמי", 'M', []),
    'Walter': ('וולטר', 'M', []),
    'Christian': ('כריסטיאן', 'M', []),
    'Keith': ('קית', 'M', []),
    'Roger': ("רוג'ר", 'M', []),
    'Terry': ('טרי', 'M', []),
    'Austin': ('אוסטין', 'M', []),
    'Sean': ('שון', 'M', []),
    'Gerald': ("ג'רלד", 'M', []),
    'Carl': ('קרל', 'M', []),
    'Dylan': ('דילן', 'M', []),
    'Jesse': ("ג'סי", 'M', []),
    'Bruce': ('ברוס', 'M', []),
    'Albert': ('אלברט', 'M', []),
    'Alan': ('אלן', 'M', []),
    'Juan': ('חואן', 'M', []),
    'Logan': ('לוגן', 'M', []),
    'Wayne': ('ויין', 'M', []),
    'Eugene': ("יוג'ין", 'M', []),
    'Philip': ('פיליפ', 'M', []),
    'Russell': ('ראסל', 'M', []),
    'Bobby': ('בובי', 'M', []),
    'Harry': ('הארי', 'M', []),
    'Vincent': ('וינסנט', 'M', []),
    'Oscar': ('אוסקר', 'M', []),
    'Martin': ('מרטין', 'M', []),
    'Louis': ('לואיס', 'M', ['לואי']),
    'Russell': ('ראסל', 'M', []),
    'Connor': ('קונור', 'M', []),
    'Elijah': ('אליהו', 'M', []),
    'Luke': ('לוק', 'M', []),
    'Oliver': ('אוליבר', 'M', []),
    'Mason': ('מייסון', 'M', []),
    'Liam': ('ליאם', 'M', []),

    # Arabic/Muslim names
    'Mohammed': ('מוחמד', 'M', ['מחמד', 'מוחמט', 'מחמט']),
    'Ahmed': ('אחמד', 'M', ['אחמט']),
    'Ali': ('עלי', 'M', []),
    'Omar': ('עומר', 'M', ['עמר']),
    'Hassan': ('חסן', 'M', ['חסאן']),
    'Hussein': ('חוסיין', 'M', ['חסין', 'חוסין']),
    'Ibrahim': ('איברהים', 'M', ['אברהים']),
    'Mustafa': ('מוסטפא', 'M', ['מוסטפה']),
    'Youssef': ('יוסף', 'M', ['יוסוף']),
    'Khalid': ('חאלד', 'M', []),
    'Karim': ('כרים', 'M', ['קרים']),
    'Tariq': ('טריק', 'M', ['טארק']),
    'Saeed': ('סעיד', 'M', []),
    'Rashid': ('ראשיד', 'M', []),
    'Nasser': ('נאסר', 'M', []),
    'Faisal': ('פייסל', 'M', ['פיסל']),
    'Hamza': ('חמזה', 'M', []),
    'Bilal': ('בילאל', 'M', []),
    'Salim': ('סלים', 'M', []),
    'Amir': ('אמיר', 'M', []),
    'Sami': ('סאמי', 'M', []),
    'Rami': ('ראמי', 'M', []),
    'Walid': ('וליד', 'M', ['ואליד']),
    'Khaled': ('חאלד', 'M', []),
    'Jamal': ("ג'מאל", 'M', []),
    'Ismail': ('ישמעאל', 'M', ['איסמאעיל']),
    'Adnan': ('עדנאן', 'M', []),
    'Salah': ('סלאח', 'M', []),
    'Farid': ('פריד', 'M', []),
    'Majid': ('מג׳יד', 'M', []),
    'Nabil': ('נביל', 'M', []),
    'Yasser': ('יאסר', 'M', []),
    'Bassam': ('בסאם', 'M', []),
    'Ziad': ('זיאד', 'M', []),

    # Russian names
    'Vladimir': ('ולדימיר', 'M', []),
    'Sergei': ('סרגיי', 'M', ['סרגי']),
    'Dmitri': ('דמיטרי', 'M', []),
    'Alexei': ('אלכסיי', 'M', []),
    'Nikolai': ('ניקולאי', 'M', []),
    'Ivan': ('איוון', 'M', []),
    'Mikhail': ('מיכאיל', 'M', []),
    'Boris': ('בוריס', 'M', []),
    'Andrei': ('אנדריי', 'M', []),
    'Yuri': ('יורי', 'M', []),
    'Oleg': ('אולג', 'M', []),
    'Igor': ('איגור', 'M', []),
    'Anatoly': ('אנטולי', 'M', []),
    'Viktor': ('ויקטור', 'M', []),
    'Pavel': ('פאבל', 'M', []),
    'Vasily': ('ואסילי', 'M', []),
    'Grigory': ('גריגורי', 'M', []),
    'Leonid': ('לאוניד', 'M', []),
    'Maxim': ('מקסים', 'M', []),
    'Artem': ('ארטם', 'M', []),

    # Spanish names
    'Carlos': ('קרלוס', 'M', []),
    'Miguel': ('מיגל', 'M', []),
    'Juan': ('חואן', 'M', []),
    'Luis': ('לואיס', 'M', []),
    'Fernando': ('פרננדו', 'M', []),
    'Francisco': ('פרנסיסקו', 'M', []),
    'Antonio': ('אנטוניו', 'M', []),
    'Pedro': ('פדרו', 'M', []),
    'Rafael': ('רפאל', 'M', []),
    'Ricardo': ('ריקרדו', 'M', []),
    'Diego': ('דייגו', 'M', []),
    'Alejandro': ('אלחנדרו', 'M', []),
    'Pablo': ('פבלו', 'M', []),
    'Mario': ('מריו', 'M', []),
    'Sergio': ('סרחיו', 'M', []),
    'Roberto': ('רוברטו', 'M', []),
    'Manuel': ('מנואל', 'M', []),
    'Jorge': ('חורחה', 'M', []),
    'Eduardo': ('אדוארדו', 'M', []),
    'Andres': ('אנדרס', 'M', []),

    # French names
    'Jean': ("ז'אן", 'M', []),
    'Pierre': ('פייר', 'M', []),
    'Jacques': ("ז'אק", 'M', []),
    'Francois': ('פרנסואה', 'M', []),
    'Michel': ('מישל', 'M', []),
    'Philippe': ('פיליפ', 'M', []),
    'Henri': ('אנרי', 'M', []),
    'Claude': ('קלוד', 'M', []),
    'Louis': ('לואי', 'M', ['לואיס']),
    'Antoine': ('אנטואן', 'M', []),
    'Rene': ('רנה', 'M', []),
    'Marcel': ('מרסל', 'M', []),
    'Bernard': ('ברנאר', 'M', []),
    'Nicolas': ('ניקולא', 'M', []),
    'Sebastien': ('סבסטיאן', 'M', []),
    'Guillaume': ('גיום', 'M', []),

    # German names
    'Hans': ('הנס', 'M', []),
    'Friedrich': ('פרידריך', 'M', []),
    'Wolfgang': ('וולפגנג', 'M', []),
    'Karl': ('קרל', 'M', []),
    'Johann': ('יוהאן', 'M', []),
    'Werner': ('ורנר', 'M', []),
    'Helmut': ('הלמוט', 'M', []),
    'Klaus': ('קלאוס', 'M', []),
    'Gerhard': ('גרהרד', 'M', []),
    'Stefan': ('שטפן', 'M', ['סטפן']),
    'Dieter': ('דיטר', 'M', []),
    'Manfred': ('מנפרד', 'M', []),
    'Jurgen': ('יורגן', 'M', []),
    'Heinrich': ('היינריך', 'M', []),
    'Rudolf': ('רודולף', 'M', []),

    # Italian names
    'Marco': ('מרקו', 'M', []),
    'Giuseppe': ("ג'וזפה", 'M', []),
    'Giovanni': ("ג'ובאני", 'M', []),
    'Andrea': ('אנדראה', 'M', []),
    'Alessandro': ('אלסנדרו', 'M', []),
    'Luca': ('לוקה', 'M', []),
    'Lorenzo': ('לורנצו', 'M', []),
    'Matteo': ('מתאו', 'M', []),
    'Paolo': ('פאולו', 'M', []),
    'Roberto': ('רוברטו', 'M', []),
    'Franco': ('פרנקו', 'M', []),
    'Stefano': ('סטפנו', 'M', []),
    'Giorgio': ("ג'ורג'ו", 'M', []),
    'Bruno': ('ברונו', 'M', []),
    'Fabio': ('פביו', 'M', []),

    # Chinese names (common in Hebrew transliteration)
    'Wei': ('ויי', 'M', []),
    'Ming': ('מינג', 'M', []),
    'Jun': ("ג'ון", 'M', []),
    'Lei': ('ליי', 'M', []),
    'Jian': ("ג'יאן", 'M', []),
    'Hui': ('הוי', 'M', []),
    'Chen': ("צ'ן", 'M', []),
    'Wang': ('וואנג', 'M', []),
    'Li': ('לי', 'M', []),
    'Zhang': ("ז'אנג", 'M', []),

    # Indian names
    'Raj': ("ראג'", 'M', []),
    'Arjun': ("ארג'ון", 'M', []),
    'Ravi': ('ראווי', 'M', []),
    'Suresh': ('סורש', 'M', []),
    'Vikram': ('ויקראם', 'M', []),
    'Sanjay': ('סנג׳יי', 'M', []),
    'Anil': ('אניל', 'M', []),
    'Krishna': ('קרישנה', 'M', []),
    'Rahul': ('ראהול', 'M', []),
    'Amit': ('אמיט', 'M', []),
    'Pradeep': ('פראדיפ', 'M', []),
    'Deepak': ('דיפאק', 'M', []),
    'Ajay': ("אג'יי", 'M', []),
    'Ramesh': ('ראמש', 'M', []),
    'Manoj': ('מנוג׳', 'M', []),

    # Turkish names
    'Mehmet': ('מחמט', 'M', []),
    'Ahmet': ('אחמט', 'M', []),
    'Mustafa': ('מוסטפא', 'M', []),
    'Hasan': ('חסן', 'M', []),
    'Ismail': ('איסמעיל', 'M', []),
    'Kemal': ('כמאל', 'M', []),
    'Osman': ('עות׳מאן', 'M', []),
    'Yusuf': ('יוסוף', 'M', []),
    'Murat': ('מוראט', 'M', []),
    'Erdogan': ('ארדואן', 'M', []),

    # Persian names
    'Reza': ('רזא', 'M', []),
    'Darius': ('דריוש', 'M', []),
    'Cyrus': ('כורש', 'M', []),
    'Farhad': ('פרהאד', 'M', []),
    'Amir': ('אמיר', 'M', []),
    'Babak': ('באבאק', 'M', []),

    # Hebrew/Israeli names (already in Hebrew)
    'Avi': ('אבי', 'M', []),
    'Yossi': ('יוסי', 'M', []),
    'Moshe': ('משה', 'M', []),
    'Avraham': ('אברהם', 'M', []),
    'Yitzhak': ('יצחק', 'M', []),
    'Yaakov': ('יעקב', 'M', []),
    'Chaim': ('חיים', 'M', []),
    'Shlomo': ('שלמה', 'M', []),
    'Shimon': ('שמעון', 'M', []),
    'Reuven': ('ראובן', 'M', []),
    'Yehuda': ('יהודה', 'M', []),
    'Binyamin': ('בנימין', 'M', []),
    'Ephraim': ('אפרים', 'M', []),
    'Menachem': ('מנחם', 'M', []),
    'Baruch': ('ברוך', 'M', []),
    'Eliezer': ('אליעזר', 'M', []),
    'Mordechai': ('מרדכי', 'M', []),
    'Nachman': ('נחמן', 'M', []),
    'Tzvi': ('צבי', 'M', []),
    'Aryeh': ('אריה', 'M', []),
    'Gershon': ('גרשון', 'M', []),
    'Aharon': ('אהרון', 'M', ['אהרן']),

    # African names
    'Kwame': ('קוואמה', 'M', []),
    'Kofi': ('קופי', 'M', []),
    'Nelson': ('נלסון', 'M', []),
    'Olusegun': ('אולוסגון', 'M', []),
    'Mandela': ('מנדלה', 'M', []),

    # Japanese names
    'Takeshi': ('טקשי', 'M', []),
    'Kenji': ('קנג׳י', 'M', []),
    'Hiroshi': ('הירושי', 'M', []),
    'Yuki': ('יוקי', 'M', []),
    'Akira': ('אקירה', 'M', []),
    'Taro': ('טארו', 'M', []),

    # Korean names
    'Joon': ("ג'ון", 'M', []),
    'Min': ('מין', 'M', []),
    'Hyun': ('היון', 'M', []),
    'Sung': ('סונג', 'M', []),

    # ===== TOP FEMALE NAMES =====
    # English/American
    'Mary': ('מרי', 'F', ['מארי']),
    'Patricia': ('פטרישיה', 'F', []),
    'Jennifer': ("ג'ניפר", 'F', []),
    'Linda': ('לינדה', 'F', []),
    'Barbara': ('ברברה', 'F', []),
    'Elizabeth': ('אליזבת', 'F', []),
    'Susan': ('סוזן', 'F', []),
    'Jessica': ("ג'סיקה", 'F', []),
    'Sarah': ('שרה', 'F', []),
    'Karen': ('קרן', 'F', []),
    'Lisa': ('ליסה', 'F', []),
    'Nancy': ('ננסי', 'F', []),
    'Betty': ('בטי', 'F', []),
    'Margaret': ('מרגרט', 'F', []),
    'Sandra': ('סנדרה', 'F', []),
    'Ashley': ('אשלי', 'F', []),
    'Dorothy': ('דורותי', 'F', []),
    'Kimberly': ('קימברלי', 'F', []),
    'Emily': ('אמילי', 'F', []),
    'Donna': ('דונה', 'F', []),
    'Michelle': ('מישל', 'F', []),
    'Carol': ('קרול', 'F', []),
    'Amanda': ('אמנדה', 'F', []),
    'Melissa': ('מליסה', 'F', []),
    'Deborah': ('דבורה', 'F', []),
    'Stephanie': ('סטפני', 'F', []),
    'Rebecca': ('רבקה', 'F', []),
    'Sharon': ('שרון', 'F', []),
    'Laura': ('לורה', 'F', []),
    'Cynthia': ('סינתיה', 'F', []),
    'Kathleen': ('קתלין', 'F', []),
    'Amy': ('איימי', 'F', []),
    'Angela': ("אנג'לה", 'F', []),
    'Shirley': ('שירלי', 'F', []),
    'Anna': ('אנה', 'F', []),
    'Brenda': ('ברנדה', 'F', []),
    'Pamela': ('פמלה', 'F', []),
    'Emma': ('אמה', 'F', []),
    'Nicole': ('ניקול', 'F', []),
    'Helen': ('הלן', 'F', []),
    'Samantha': ('סמנתה', 'F', []),
    'Katherine': ('קתרין', 'F', []),
    'Christine': ('כריסטין', 'F', []),
    'Debra': ('דברה', 'F', []),
    'Rachel': ('רייצ׳ל', 'F', ['רחל']),
    'Carolyn': ('קרולין', 'F', []),
    'Janet': ("ג'נט", 'F', []),
    'Catherine': ('קתרין', 'F', []),
    'Maria': ('מריה', 'F', []),
    'Heather': ('הדר', 'F', []),
    'Diane': ('דיאן', 'F', []),
    'Ruth': ('רות', 'F', []),
    'Julie': ("ג'ולי", 'F', []),
    'Olivia': ('אוליביה', 'F', []),
    'Joyce': ("ג'ויס", 'F', []),
    'Virginia': ('וירג׳יניה', 'F', []),
    'Victoria': ('ויקטוריה', 'F', []),
    'Kelly': ('קלי', 'F', []),
    'Lauren': ('לורן', 'F', []),
    'Christina': ('כריסטינה', 'F', []),
    'Joan': ("ג'ואן", 'F', []),
    'Evelyn': ('אוולין', 'F', []),
    'Judith': ("ג'ודית", 'F', ['יהודית']),
    'Megan': ('מייגן', 'F', []),
    'Andrea': ('אנדראה', 'F', []),
    'Cheryl': ("שריל", 'F', []),
    'Hannah': ('חנה', 'F', []),
    'Jacqueline': ("ז'קלין", 'F', []),
    'Martha': ('מרתה', 'F', []),
    'Gloria': ('גלוריה', 'F', []),
    'Teresa': ('טרזה', 'F', []),
    'Ann': ('אן', 'F', []),
    'Sara': ('שרה', 'F', []),
    'Madison': ('מדיסון', 'F', []),
    'Frances': ('פרנסס', 'F', []),
    'Kathryn': ('קתרין', 'F', []),
    'Janice': ("ג'ניס", 'F', []),
    'Jean': ("ז'אן", 'F', []),
    'Abigail': ('אביגיל', 'F', []),
    'Alice': ('אליס', 'F', []),
    'Judy': ("ג'ודי", 'F', []),
    'Sophia': ('סופיה', 'F', []),
    'Grace': ('גרייס', 'F', []),
    'Denise': ('דניז', 'F', []),
    'Amber': ('אמבר', 'F', []),
    'Doris': ('דוריס', 'F', []),
    'Marilyn': ('מרילין', 'F', []),
    'Danielle': ('דניאל', 'F', []),
    'Beverly': ('בוורלי', 'F', []),
    'Isabella': ('איזבלה', 'F', []),
    'Theresa': ('תרזה', 'F', []),
    'Diana': ('דיאנה', 'F', []),
    'Natalie': ('נטלי', 'F', []),
    'Brittany': ('בריטני', 'F', []),
    'Charlotte': ("שרלוט", 'F', []),
    'Marie': ('מרי', 'F', []),
    'Kayla': ('קיילה', 'F', []),
    'Alexis': ('אלכסיס', 'F', []),
    'Lori': ('לורי', 'F', []),

    # Arabic/Muslim female names
    'Fatima': ('פאטמה', 'F', ['פטימה']),
    'Aisha': ('עאישה', 'F', ['עישה']),
    'Khadija': ('חדיג׳ה', 'F', []),
    'Maryam': ('מרים', 'F', []),
    'Zahra': ('זהרה', 'F', []),
    'Nour': ('נור', 'F', []),
    'Layla': ('לילה', 'F', ['ליילה']),
    'Hana': ('הנא', 'F', []),
    'Amira': ('אמירה', 'F', []),
    'Yasmin': ('יסמין', 'F', []),
    'Rania': ('ראניה', 'F', []),
    'Samira': ('סמירה', 'F', []),
    'Leila': ('לילה', 'F', ['ליילה']),
    'Dina': ('דינה', 'F', []),
    'Salma': ('סלמה', 'F', []),
    'Noura': ('נורה', 'F', []),
    'Huda': ('הודא', 'F', []),
    'Sawsan': ('סוסן', 'F', []),
    'Iman': ('אימאן', 'F', []),
    'Nawal': ('נוואל', 'F', []),

    # Russian female names
    'Natasha': ('נטשה', 'F', []),
    'Olga': ('אולגה', 'F', []),
    'Tatiana': ('טטיאנה', 'F', []),
    'Irina': ('אירינה', 'F', []),
    'Svetlana': ('סבטלנה', 'F', []),
    'Elena': ('ילנה', 'F', ['אלנה']),
    'Anastasia': ('אנסטסיה', 'F', []),
    'Marina': ('מרינה', 'F', []),
    'Ekaterina': ('יקטרינה', 'F', []),
    'Nadia': ('נדיה', 'F', []),
    'Lyudmila': ('לודמילה', 'F', []),
    'Galina': ('גלינה', 'F', []),
    'Valentina': ('ולנטינה', 'F', []),
    'Larisa': ('לריסה', 'F', []),
    'Yelena': ('ילנה', 'F', []),

    # Spanish female names
    'Carmen': ('כרמן', 'F', []),
    'Rosa': ('רוזה', 'F', []),
    'Isabel': ('איזבל', 'F', []),
    'Lucia': ('לוסיה', 'F', []),
    'Gabriela': ('גבריאלה', 'F', []),
    'Elena': ('אלנה', 'F', []),
    'Catalina': ('קטלינה', 'F', []),
    'Sofia': ('סופיה', 'F', []),
    'Valentina': ('ולנטינה', 'F', []),
    'Camila': ('קמילה', 'F', []),

    # French female names
    'Marie': ('מרי', 'F', []),
    'Isabelle': ('איזבל', 'F', []),
    'Monique': ('מוניק', 'F', []),
    'Brigitte': ('בריז׳יט', 'F', []),
    'Colette': ('קולט', 'F', []),
    'Simone': ('סימון', 'F', []),
    'Dominique': ('דומיניק', 'F', []),
    'Marguerite': ('מרגריט', 'F', []),
    'Celine': ('סלין', 'F', []),
    'Amelie': ('אמלי', 'F', []),

    # German female names
    'Ursula': ('אורסולה', 'F', []),
    'Heidi': ('היידי', 'F', []),
    'Ingrid': ('אינגריד', 'F', []),
    'Greta': ('גרטה', 'F', []),
    'Helga': ('הלגה', 'F', []),
    'Gertrude': ('גרטרוד', 'F', []),
    'Marlene': ('מרלן', 'F', []),
    'Sigrid': ('זיגריד', 'F', []),

    # Hebrew/Israeli female names
    'Rivka': ('רבקה', 'F', []),
    'Miriam': ('מרים', 'F', []),
    'Leah': ('לאה', 'F', []),
    'Tamar': ('תמר', 'F', []),
    'Yael': ('יעל', 'F', []),
    'Naomi': ('נעמי', 'F', []),
    'Esther': ('אסתר', 'F', []),
    'Chava': ('חוה', 'F', []),
    'Tzipora': ('ציפורה', 'F', []),
    'Batsheva': ('בת שבע', 'F', []),
    'Michal': ('מיכל', 'F', []),
    'Shira': ('שירה', 'F', []),
    'Noa': ('נועה', 'F', []),
    'Maya': ('מאיה', 'F', []),
    'Tali': ('טלי', 'F', []),
    'Mor': ('מור', 'F', []),
    'Yarden': ('ירדן', 'F', []),
    'Noga': ('נגה', 'F', []),
    'Ayelet': ('איילת', 'F', []),
    'Liora': ('ליאורה', 'F', []),

    # Japanese female names
    'Yuko': ('יוקו', 'F', []),
    'Keiko': ('קייקו', 'F', []),
    'Sakura': ('סאקורה', 'F', []),
    'Hana': ('האנה', 'F', []),
    'Aiko': ('אייקו', 'F', []),

    # Indian female names
    'Priya': ('פריה', 'F', []),
    'Anita': ('אניטה', 'F', []),
    'Sunita': ('סוניטה', 'F', []),
    'Sita': ('סיטה', 'F', []),
    'Lakshmi': ('לקשמי', 'F', []),
    'Meera': ('מירה', 'F', []),
    'Nisha': ('נישה', 'F', []),
    'Riya': ('ריה', 'F', []),
    'Deepa': ('דיפה', 'F', []),
    'Kavita': ('קוויטה', 'F', []),
}


# ============================================================
# EXTENDED NAME LISTS (English names for transliteration engine)
# ============================================================
# These will use the transliteration engine (not manually verified)
# Sources: US Social Security Administration top names, worldwide data

EXTENDED_MALE = [
    # US SSA top names + worldwide common names
    'Aiden', 'Alexander', 'Andre', 'Angelo', 'Archer', 'Arthur', 'Asher',
    'Bailey', 'Beau', 'Bennett', 'Blake', 'Bradley', 'Brody', 'Brooks',
    'Caleb', 'Cameron', 'Carson', 'Carter', 'Chase', 'Cody', 'Cole', 'Colin',
    'Cooper', 'Damian', 'Damon', 'Dane', 'Darren', 'Darryl', 'Dawson',
    'Dean', 'Derek', 'Devin', 'Dominic', 'Drake', 'Drew', 'Dustin',
    'Earl', 'Edgar', 'Edwin', 'Eli', 'Elliot', 'Ellis', 'Emilio',
    'Emmett', 'Enrique', 'Ernest', 'Evan', 'Everett', 'Ezra',
    'Felix', 'Finn', 'Floyd', 'Forrest', 'Francis', 'Frederick',
    'Gabriel', 'Garrett', 'Gilbert', 'Glenn', 'Gordon', 'Graham', 'Grant',
    'Grayson', 'Griffin', 'Harvey', 'Hector', 'Howard', 'Hudson', 'Hugh',
    'Hugo', 'Hunter', 'Irving', 'Isaac', 'Jace', 'Jackson', 'Jaden',
    'Jaime', 'Jared', 'Jasper', 'Javier', 'Jayden', 'Jerome', 'Joel',
    'Johnny', 'Jonah', 'Jordan', 'Julian', 'Julius', 'Kai', 'Kane',
    'Karl', 'Kendrick', 'Kingston', 'Lance', 'Landon', 'Lawrence',
    'Leland', 'Leo', 'Leon', 'Leonardo', 'Lincoln', 'Lloyd', 'Lucas',
    'Luther', 'Malcolm', 'Marcus', 'Marvin', 'Maxwell', 'Miles', 'Mitchell',
    'Morgan', 'Morris', 'Nathaniel', 'Neil', 'Nolan', 'Norman', 'Owen',
    'Parker', 'Percy', 'Preston', 'Quentin', 'Quincy', 'Rafael', 'Ralph',
    'Randall', 'Ray', 'Reed', 'Reginald', 'Reid', 'Reuben', 'Rex',
    'Riley', 'Rocco', 'Rodney', 'Roman', 'Ross', 'Rowan', 'Roy',
    'Ruben', 'Rupert', 'Sawyer', 'Sebastian', 'Seth', 'Shane', 'Sidney',
    'Simon', 'Spencer', 'Stanley', 'Stuart', 'Sullivan', 'Tanner', 'Theodore',
    'Tobias', 'Todd', 'Travis', 'Trevor', 'Tristan', 'Troy', 'Tucker',
    'Vance', 'Victor', 'Wade', 'Warren', 'Wesley', 'Weston', 'Wyatt',
    'Xavier', 'Zane', 'Zion',
    # More international names
    'Abdul', 'Abdulrahman', 'Abdullah', 'Abram', 'Achille', 'Adalbert',
    'Adil', 'Adolf', 'Adrian', 'Adriano', 'Agustin', 'Ahmad', 'Akbar',
    'Akhil', 'Aladdin', 'Alain', 'Alberto', 'Aldo', 'Aleksander',
    'Alfonso', 'Alfred', 'Alonzo', 'Alphonse', 'Alvin', 'Amadeo',
    'Amado', 'Amos', 'Anand', 'Anas', 'Angel', 'Angus', 'Anwar',
    'Aram', 'Ari', 'Ariel', 'Armand', 'Arnaud', 'Arnold', 'Arslan',
    'Arvind', 'Asad', 'Ashraf', 'Athanasios', 'Augusto', 'Aurelio',
    'Avery', 'Axel', 'Ayub', 'Aziz', 'Badr', 'Bahram', 'Bakr',
    'Balthazar', 'Barnabas', 'Barry', 'Bartholomew', 'Basil', 'Beckett',
    'Benito', 'Benson', 'Bernardo', 'Bertrand', 'Bjorn', 'Blaise',
    'Bogdan', 'Bojan', 'Brad', 'Brendan', 'Brock', 'Bruno', 'Bryan',
    'Burton', 'Byron', 'Caius', 'Calvin', 'Camilo', 'Casimir',
    'Cecil', 'Cedric', 'Cesar', 'Chad', 'Chandler', 'Chester',
    'Chip', 'Clark', 'Clement', 'Cliff', 'Clint', 'Clive', 'Colby',
    'Collin', 'Conor', 'Conrad', 'Cornelius', 'Craig', 'Cristian',
    'Curtis', 'Dalton', 'Damon', 'Dario', 'Darrell', 'Darwin',
    'Demetrius', 'Denis', 'Desmond', 'Devon', 'Dirk', 'Dmitry',
    'Dorian', 'Douglas', 'Dragan', 'Duane', 'Duncan', 'Dustin',
    'Dwight', 'Dylan', 'Eamon', 'Edmund', 'Edouard', 'Eitan',
    'Eldad', 'Eldon', 'Elias', 'Elio', 'Eliot', 'Emad', 'Emanuel',
    'Emerson', 'Emil', 'Emmanuel', 'Enoch', 'Enzo', 'Erasmus',
    'Erik', 'Ernesto', 'Erwin', 'Esteban', 'Etienne', 'Eugen',
    'Eyal', 'Ezekiel', 'Fabian', 'Fadel', 'Fahad', 'Fahim',
    'Farhan', 'Farooq', 'Federico', 'Felipe', 'Fergus', 'Fidel',
    'Filipe', 'Finley', 'Fletcher', 'Florian', 'Foster', 'Franco',
    'Franklin', 'Fraser', 'Fritz', 'Gael', 'Galen', 'Gavin',
    'Gennady', 'Geoff', 'Gerard', 'Geraldo', 'Gideon', 'Gil',
    'Gino', 'Glen', 'Gonzalo', 'Graeme', 'Greg', 'Grigor',
    'Guillermo', 'Gunnar', 'Gunther', 'Gustav', 'Guy', 'Habib',
    'Hafiz', 'Hamid', 'Hamlet', 'Hanif', 'Harlan', 'Harold',
    'Harris', 'Heath', 'Helmut', 'Herbert', 'Herman', 'Hernan',
    'Hilal', 'Homer', 'Horace', 'Horatio', 'Hossein', 'Howard',
    'Hubert', 'Humberto', 'Hunter', 'Hussam', 'Idris', 'Ignacio',
    'Ilya', 'Imran', 'Inder', 'Ira', 'Irfan', 'Irving',
    'Isidor', 'Issa', 'Itai', 'Itamar', 'Ivo', 'Jabari',
    'Jacobo', 'Jacques', 'Jafar', 'Jaime', 'Jalal', 'Jamal',
    'Jamil', 'Jan', 'Janus', 'Jaroslav', 'Jay', 'Jayson',
    'Jedidiah', 'Jeremiah', 'Jermaine', 'Joao', 'Joaquin', 'Jody',
    'Johan', 'Jon', 'Jonas', 'Josue', 'Julio', 'Jurgen',
    'Kaan', 'Kamil', 'Kareem', 'Kashif', 'Kaspar', 'Keith',
    'Kenji', 'Kenny', 'Kenzo', 'Khalil', 'Kieran', 'Kirk',
    'Kirill', 'Konstantin', 'Korey', 'Kurt', 'Lachlan', 'Lambert',
    'Lars', 'Laurent', 'Lazar', 'Leandro', 'Lennox', 'Lenny',
    'Leonard', 'Leopold', 'Lester', 'Levi', 'Lewis', 'Linus',
    'Lionel', 'Llewellyn', 'Lorenzo', 'Lothar', 'Lucian', 'Luciano',
    'Ludovic', 'Luigi', 'Lukas', 'Luther', 'Lyle', 'Lyndon',
    'Maciej', 'Magnus', 'Mahdi', 'Mahmoud', 'Malek', 'Malik',
    'Mansur', 'Marcel', 'Marcello', 'Marcos', 'Marek', 'Marko',
    'Marshall', 'Massimo', 'Mateo', 'Mathias', 'Mattias', 'Mauricio',
    'Maverick', 'Mehdi', 'Melvin', 'Merlin', 'Micah', 'Milan',
    'Miles', 'Milo', 'Milton', 'Mirko', 'Miroslav', 'Monroe',
    'Montgomery', 'Mordecai', 'Morton', 'Moses', 'Muhammad', 'Munir',
    'Naim', 'Napoleon', 'Nasir', 'Navid', 'Neel', 'Neville',
    'Niall', 'Nicola', 'Nils', 'Noah', 'Noel', 'Norbert',
    'Octavio', 'Oded', 'Olaf', 'Olivier', 'Orion', 'Orlando',
    'Orville', 'Otis', 'Otto', 'Owain', 'Oz', 'Paco',
    'Pascal', 'Patricio', 'Patrik', 'Pearce', 'Pedro', 'Penn',
    'Perry', 'Pete', 'Petros', 'Pierce', 'Piotr', 'Porter',
    'Prashant', 'Prince', 'Quinton', 'Radek', 'Rafiq', 'Ragnar',
    'Rainer', 'Rajeev', 'Rajesh', 'Rakesh', 'Ramon', 'Ramsey',
    'Randolph', 'Raphael', 'Rashad', 'Ravi', 'Raul', 'Rayan',
    'Raymund', 'Reece', 'Regis', 'Renato', 'Renzo', 'Rhett',
    'Ricardo', 'Robin', 'Rocco', 'Roderick', 'Rodrigo', 'Roger',
    'Roland', 'Rolf', 'Romeo', 'Ronaldo', 'Rory', 'Ruben',
    'Rudolf', 'Rufus', 'Ruslan', 'Saad', 'Sabri', 'Sadiq',
    'Said', 'Salman', 'Salvador', 'Samir', 'Samson', 'Sander',
    'Santiago', 'Santos', 'Sasha', 'Saul', 'Seamus', 'Sebastian',
    'Selim', 'Serge', 'Severino', 'Shahid', 'Shane', 'Sharif',
    'Sheldon', 'Sherman', 'Shmuel', 'Siegfried', 'Sigmund', 'Silvio',
    'Simeon', 'Sol', 'Solomon', 'Soren', 'Spencer', 'Sterling',
    'Stewart', 'Sunil', 'Sven', 'Sylvester', 'Tahir', 'Tarek',
    'Tariq', 'Terence', 'Thaddeus', 'Theo', 'Thibaut', 'Thorsten',
    'Tiberius', 'Tim', 'Titus', 'Tobias', 'Tomasz', 'Tomas',
    'Torsten', 'Trenton', 'Tristan', 'Tyrone', 'Ulrich', 'Umberto',
    'Uri', 'Valentino', 'Valerio', 'Vasil', 'Vernon', 'Vicente',
    'Vijay', 'Vilhelm', 'Vincenzo', 'Vinod', 'Vitaly', 'Vittorio',
    'Vivek', 'Vlad', 'Volker', 'Walker', 'Wallace', 'Wendell',
    'Wilbur', 'Wilfrid', 'Willem', 'Winston', 'Wolf', 'Wolfgang',
    'Woody', 'Wyclef', 'Yehoshua', 'Yoav', 'Yonatan', 'Yoshio',
    'Yousuf', 'Yves', 'Zach', 'Zacharias', 'Zaid', 'Zakariya',
    'Zaki', 'Zbigniew', 'Zeki', 'Zenon', 'Zev', 'Zinedine',
    'Zoltan', 'Zubin',
]

EXTENDED_FEMALE = [
    'Aaliyah', 'Abby', 'Ada', 'Adele', 'Adelina', 'Adriana', 'Adrienne',
    'Agatha', 'Agnes', 'Aida', 'Ailsa', 'Aimee', 'Alana', 'Alejandra',
    'Alessandra', 'Alexandra', 'Alexia', 'Alicia', 'Alina', 'Alison',
    'Allegra', 'Alma', 'Alyssa', 'Amalia', 'Amara', 'Amelia', 'Anastasia',
    'Anabel', 'Angelina', 'Anika', 'Anissa', 'Annabel', 'Annette',
    'Antonia', 'April', 'Arabella', 'Ariana', 'Arielle', 'Arlene',
    'Astrid', 'Athena', 'Audrey', 'Aurora', 'Autumn', 'Ava', 'Avery',
    'Ayah', 'Ayesha', 'Azalea', 'Bailey', 'Beatrice', 'Becky', 'Bella',
    'Bernadette', 'Bernice', 'Beth', 'Bethany', 'Bianca', 'Blanca',
    'Bonnie', 'Briana', 'Bridget', 'Brooke', 'Calista', 'Camille',
    'Candace', 'Cara', 'Carina', 'Carla', 'Carlotta', 'Carmela',
    'Carolina', 'Cassandra', 'Cecilia', 'Celeste', 'Celia', 'Chandra',
    'Chantal', 'Charity', 'Chelsea', 'Chloe', 'Christy', 'Cindy',
    'Claire', 'Clara', 'Clarissa', 'Claudia', 'Clementine', 'Colleen',
    'Constance', 'Cora', 'Cordelia', 'Corinne', 'Crystal', 'Cynthia',
    'Dahlia', 'Daisy', 'Dakota', 'Dalila', 'Dana', 'Daphne',
    'Daria', 'Darla', 'Dawn', 'Deanna', 'Delia', 'Delilah',
    'Denise', 'Desiree', 'Destiny', 'Devon', 'Dolores', 'Dominika',
    'Dora', 'Edith', 'Eileen', 'Elaine', 'Eleanor', 'Elisa',
    'Elise', 'Ella', 'Ellen', 'Eloise', 'Elsa', 'Elvira',
    'Emilia', 'Erica', 'Erin', 'Estella', 'Eva', 'Evangeline',
    'Eve', 'Evelyn', 'Fae', 'Faith', 'Farida', 'Faye',
    'Felicity', 'Fern', 'Fiona', 'Flora', 'Florence', 'Francesca',
    'Frida', 'Gail', 'Genevieve', 'Georgia', 'Geraldine', 'Gina',
    'Giselle', 'Gladys', 'Glenda', 'Golda', 'Gracia', 'Gwendolyn',
    'Hadley', 'Haley', 'Halima', 'Harper', 'Harriet', 'Hattie',
    'Haven', 'Hayley', 'Hazel', 'Heather', 'Helena', 'Henrietta',
    'Hester', 'Hilary', 'Hilda', 'Holly', 'Hope', 'Ida',
    'Ilse', 'Imani', 'Ines', 'Inga', 'Ingrid', 'Iona',
    'Irene', 'Iris', 'Isla', 'Ivana', 'Ivy', 'Jacinta',
    'Jade', 'Jamie', 'Jane', 'Janelle', 'Jasmine', 'Jeanette',
    'Jenna', 'Jenny', 'Jillian', 'Jo', 'Joanna', 'Jocelyn',
    'Joelle', 'Jolene', 'Josephine', 'Joy', 'Juana', 'Juanita',
    'Julia', 'Juliana', 'Juliet', 'June', 'Justine', 'Kaia',
    'Kaitlyn', 'Kamila', 'Kara', 'Karina', 'Karla', 'Katarina',
    'Kate', 'Katrina', 'Kay', 'Keira', 'Kelsey', 'Kendra',
    'Kenya', 'Kerry', 'Kimberly', 'Kira', 'Klara', 'Kristen',
    'Kristina', 'Kylie', 'Lacey', 'Lana', 'Lara', 'Larissa',
    'Latasha', 'Latoya', 'Laurel', 'Lavinia', 'Lea', 'Leah',
    'Lena', 'Leticia', 'Lila', 'Lilian', 'Lillian', 'Lily',
    'Lindsay', 'Livia', 'Lola', 'Lorena', 'Loretta', 'Lorna',
    'Lorraine', 'Louisa', 'Louise', 'Lucia', 'Lucille', 'Lucy',
    'Luna', 'Lydia', 'Lynette', 'Lynn', 'Mabel', 'Macy',
    'Madeleine', 'Madeline', 'Maeve', 'Magdalena', 'Maggie', 'Maia',
    'Mallory', 'Mandy', 'Mara', 'Marcella', 'Marcia', 'Margo',
    'Margot', 'Mariam', 'Marianne', 'Maribel', 'Marina', 'Marisa',
    'Marjorie', 'Marlena', 'Marta', 'Martina', 'Matilda', 'Maude',
    'Maureen', 'Maxine', 'Meagan', 'Melanie', 'Melinda', 'Melody',
    'Mercedes', 'Meredith', 'Mia', 'Michaela', 'Mila', 'Mildred',
    'Milena', 'Mina', 'Mindy', 'Miranda', 'Miriam', 'Moira',
    'Molly', 'Monica', 'Morgan', 'Muriel', 'Myrna', 'Myrtle',
    'Nadine', 'Nadia', 'Naima', 'Nancy', 'Nanette', 'Naomi',
    'Natalia', 'Natalie', 'Nathalie', 'Nell', 'Nerissa', 'Nia',
    'Nina', 'Noa', 'Noel', 'Nola', 'Nora', 'Noreen',
    'Norma', 'Odessa', 'Odette', 'Olena', 'Olympia', 'Opal',
    'Ophelia', 'Paige', 'Paloma', 'Pandora', 'Patience', 'Paula',
    'Paulina', 'Pearl', 'Penelope', 'Penny', 'Perla', 'Petra',
    'Philippa', 'Phoebe', 'Phyllis', 'Pilar', 'Polly', 'Portia',
    'Priscilla', 'Quinn', 'Rachael', 'Ramona', 'Raquel', 'Regina',
    'Renata', 'Renee', 'Rhea', 'Rhonda', 'Rita', 'Roberta',
    'Robin', 'Rochelle', 'Roma', 'Rosalie', 'Rosalind', 'Rosanna',
    'Rosemary', 'Rosie', 'Roxanne', 'Ruby', 'Sabina', 'Sabrina',
    'Sadie', 'Sally', 'Salome', 'Sana', 'Sandy', 'Saoirse',
    'Savannah', 'Scarlett', 'Selena', 'Selma', 'Seraphina', 'Serena',
    'Shannon', 'Sheila', 'Shelby', 'Shirley', 'Sierra', 'Silvia',
    'Siobhan', 'Skylar', 'Sonia', 'Stacy', 'Stella', 'Summer',
    'Susanna', 'Suzanne', 'Sydney', 'Sylvia', 'Tabitha', 'Tamara',
    'Tammy', 'Tanya', 'Tara', 'Tatyana', 'Taylor', 'Thalia',
    'Thea', 'Theodora', 'Tracy', 'Trina', 'Trinity', 'Trisha',
    'Trudy', 'Uma', 'Una', 'Ursula', 'Valentina', 'Valeria',
    'Vanessa', 'Vera', 'Veronica', 'Violet', 'Virginia', 'Vivian',
    'Vivienne', 'Wanda', 'Wendy', 'Whitney', 'Wilhelmina', 'Willow',
    'Winona', 'Xena', 'Ximena', 'Yael', 'Yasmine', 'Yolanda',
    'Yvette', 'Yvonne', 'Zahira', 'Zara', 'Zelda', 'Zena',
    'Zinnia', 'Zoe', 'Zoey', 'Zora', 'Zoya',
]


def clean_wiki_name(title):
    """Clean Wikipedia article title to extract just the name."""
    # Remove disambiguation suffixes like "(פירושונים)"
    title = re.sub(r'\s*\(.*?\)\s*$', '', title)
    return title.strip()


def is_hebrew(s):
    """Check if string contains Hebrew characters."""
    return bool(re.search(r'[\u0590-\u05FF]', s))


def build_name_dict(gender_label, wiki_names, verified_names, extended_names):
    """Build a name dictionary combining all sources."""
    entries = {}

    # 1. Add Wikipedia-verified names
    for raw_name in wiki_names:
        name = clean_wiki_name(raw_name)
        if not name or len(name) < 2:
            continue
        if not is_hebrew(name):
            continue
        # Skip multi-word names for ELS (spaces won't match)
        if ' ' in name:
            continue
        key = name
        if key not in entries:
            entries[key] = {
                'word': name,
                'gender': gender_label,
                'sources': ['wikipedia'],
                'alts': [],
                'verified': True,
            }

    # 2. Add manually verified transliterations
    for eng_name, (heb, g, alts) in verified_names.items():
        if g != gender_label:
            continue
        # Clean geresh variants
        heb_clean = heb.replace('׳', "'")
        key = heb_clean
        if key not in entries:
            entries[key] = {
                'word': heb_clean,
                'gender': gender_label,
                'sources': ['verified'],
                'alts': [a.replace('׳', "'") for a in alts],
                'verified': True,
                'english': eng_name,
            }
        else:
            # Merge alt spellings
            for a in alts:
                a_clean = a.replace('׳', "'")
                if a_clean not in entries[key]['alts']:
                    entries[key]['alts'].append(a_clean)
            if 'verified' not in entries[key].get('sources', []):
                entries[key]['sources'].append('verified')

    # 3. Add extended names via transliteration engine
    for eng_name in extended_names:
        heb = transliterate(eng_name)
        if not heb or len(heb) < 2:
            continue
        key = heb
        if key not in entries:
            entries[key] = {
                'word': heb,
                'gender': gender_label,
                'sources': ['transliterated'],
                'alts': [],
                'verified': False,
                'english': eng_name,
            }

    return entries


def main():
    # Load Wikipedia-verified names
    wiki_path = PROJ / 'tools' / 'wiki-data' / 'wiki-names-raw.json'
    if wiki_path.exists():
        with open(wiki_path) as f:
            wiki_data = json.load(f)
        wiki_male = wiki_data.get('male', [])
        wiki_female = wiki_data.get('female', [])
    else:
        print("WARNING: wiki-names-raw.json not found. Run Wikipedia name extraction first.")
        wiki_male = []
        wiki_female = []

    # Build dictionaries
    male_dict = build_name_dict('M', wiki_male, VERIFIED_NAMES, EXTENDED_MALE)
    female_dict = build_name_dict('F', wiki_female, VERIFIED_NAMES, EXTENDED_FEMALE)

    # Also add alt spellings as their own entries (for search matching)
    for d in [male_dict, female_dict]:
        alts_to_add = {}
        for key, entry in d.items():
            for alt in entry.get('alts', []):
                if alt not in d and alt not in alts_to_add:
                    alts_to_add[alt] = {
                        'word': alt,
                        'gender': entry['gender'],
                        'sources': ['alt_spelling'],
                        'alts': [key],  # link back to primary
                        'verified': entry.get('verified', False),
                        'primary': key,
                    }
        d.update(alts_to_add)

    print(f"Male names: {len(male_dict)}")
    print(f"Female names: {len(female_dict)}")

    # Output in dictionary format compatible with existing system
    out_dir = PROJ / 'data' / 'dictionaries'

    for gender, d, filename in [
        ('male', male_dict, 'names-male.json.gz'),
        ('female', female_dict, 'names-female.json.gz'),
    ]:
        output = {
            'metadata': {
                'name': f'Hebrew {gender.title()} Names Dictionary',
                'short_name': f'names-{gender}',
                'description': f'Common {gender} given names in Hebrew transliteration. Sources: Hebrew Wikipedia, manual verification, transliteration engine.',
                'version': '1.0',
                'count': len(d),
            },
            'entries': {}
        }
        for key, entry in d.items():
            output['entries'][key] = {
                'word': entry['word'],
                'definitions': [f"{gender.title()} given name" + (f" ({entry.get('english', '')})" if entry.get('english') else '')],
                'sources': entry['sources'],
                'pos': 'proper_noun',
                'era': 'modern',
                'gender': entry['gender'],
                'alts': entry.get('alts', []),
                'verified': entry.get('verified', False),
            }

        out_path = out_dir / filename
        with gzip.open(out_path, 'wt', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False)

        print(f"Written: {out_path} ({len(d)} entries)")

        # Print sample
        sample = list(d.keys())[:10]
        print(f"  Sample: {sample}")

if __name__ == '__main__':
    main()
