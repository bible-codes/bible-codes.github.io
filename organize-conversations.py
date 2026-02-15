#!/usr/bin/env python3
"""
Organize three conversation transcript files by topic.
Splits at "You said:" boundaries, groups by category, outputs organized markdown.
"""
import re
import sys

# Define topic categories and keywords for auto-classification
CATEGORIES = {
    "Book Project & Bibliography": [
        "book", "chapter", "bibliography", "table of contents", "TOC", "synopsis",
        "preface", "appendix", "annotated bibliography", "deliverable"
    ],
    "ELS Methodology & WRR Experiment": [
        "WRR", "Witztum", "Rips", "Rosenberg", "Great Rabbis", "rabbi", "date format",
        "c(w,w')", "compactness", "proximity", "ELS mechanics", "skip-interval",
        "equidistant letter", "MBBK", "McKay", "Bar-Natan", "replication", "rebuttal",
        "Statistical Science", "Gans experiment", "date encoding", "composite hit",
        "co-occurrence", "intersection", "proximity matrix", "context window"
    ],
    "Tsirufim & Semantic Permutations": [
        "tsirufim", "permutation", "combinatorial semantic", "semantic attractor",
        "latent space", "embedding", "clustering", "HDBSCAN", "word2vec", "fastText",
        "root-based", "binyan", "morphological", "combinatorial explosion",
        "latent", "king.*queen", "word embedding"
    ],
    "Statistical Methods & Information Theory": [
        "entropy", "Shannon", "compression", "Monte Carlo", "permutation test",
        "multiple comparisons", "Bonferroni", "FDR", "null model", "Markov",
        "Kolmogorov", "information theory", "p-value", "power analysis",
        "false discovery", "randomization", "pre-registration"
    ],
    "Torah Statistics & Properties": [
        "304,805", "letter frequency", "word count", "corpus", "alphabet",
        "per-book", "factorization", "divisible", "Torah stats",
        "how many letters", "square", "traditional scroll"
    ],
    "Neural Networks & ML Architecture": [
        "neural network", "LSTM", "GRU", "transformer", "MoE", "mixture of experts",
        "char-level", "next character", "router", "expert", "graph attention",
        "GAT", "Node2Vec", "graph embedding", "hyperspace", "attention",
        "pre-compute all ELS"
    ],
    "AI Architecture & Knowledge Graphs": [
        "knowledge graph", "logic engine", "hermeneutical", "middot",
        "kal va-chomer", "gezerah shavah", "Talmud", "inference engine",
        "onion model", "Datalog", "Prolog", "Sefaria", "Bar-Ilan",
        "argument graph", "Hebrew core", "hyperspace core"
    ],
    "Software Tools & Implementation": [
        "TorahBibleCodes", "Docker", "installation", "GitHub", "repository",
        "docker-compose", "runtime", "benchmark", "optimization",
        "online ELS", "Bible Codes App", "Decoder", "software tool",
        "python3", "pip install"
    ],
    "3D Geometry & Matrix Visualization": [
        "3D", "cylinder", "3x3x3", "cube", "diagonal", "helix",
        "tic-tac-toe", "Qubic", "bounding matrix", "KD-tree",
        "ray", "perpendicular", "body diagonal", "pages"
    ],
    "Visualization & Multimedia": [
        "sonification", "sound", "frequency", "pitch", "music",
        "cantillation", "ta'amei", "image", "color", "visualization",
        "t-SNE", "UMAP", "hue", "saturation", "diatonic",
        "chord", "gematria.*frequenc"
    ],
    "Kabbalah & Traditional Sources": [
        "Kabbalah", "Sefirot", "Sefer Yetzirah", "231 gates",
        "Abulafia", "zodiac", "planet", "angel", "chariot",
        "Sefer HaMalchut", "astrology", "potentiality",
        "Scholem", "Kaplan", "Kabbalistic"
    ],
    "Cryptography & Steganography": [
        "steganograph", "cryptograph", "cipher", "Atbash", "transposition",
        "hidden message", "frequency analysis", "Kasiski", "substitution cipher",
        "academic.*name", "academic.*terminolog"
    ],
    "Web Development & UI": [
        "HTML", "CSS", "responsive", "text box", "button", "layout",
        "JavaScript", "DOM", "fetch", "browser", "PWA", "service worker",
        "GitHub Pages", "logo", "header", "style", "resize",
        "skip.*input", "search.*button", "text.*wrap"
    ],
    "Literature Review & Field Survey": [
        "research studies", "field survey", "literature review",
        "comprehensive overview", "active areas", "what has been done",
        "systematic review", "MDPI"
    ],
    "Experimental Design": [
        "experimental design", "protocol", "validation", "test",
        "null model.*text", "control corpus", "gold standard",
        "ablation", "baseline", "metric", "evaluation"
    ],
    "Puzzles & Miscellaneous": [
        "puzzle", "sequence", "riddle", "1,5,200", "tic-tac",
        "archived chat", "review.*chat"
    ]
}

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.readlines()

def split_exchanges(lines, source_label):
    """Split lines into exchanges at 'You said:' boundaries."""
    exchanges = []
    current = []
    current_start = 0

    for i, line in enumerate(lines):
        if line.strip() == "You said:" and current:
            exchanges.append({
                'lines': current,
                'start': current_start + 1,
                'end': i,
                'source': source_label,
                'text': ''.join(current)
            })
            current = [line]
            current_start = i
        else:
            current.append(line)

    if current:
        exchanges.append({
            'lines': current,
            'start': current_start + 1,
            'end': len(lines),
            'source': source_label,
            'text': ''.join(current)
        })

    return exchanges

def classify_exchange(exchange):
    """Classify an exchange into a category based on keyword matching."""
    text = exchange['text'].lower()
    scores = {}

    for category, keywords in CATEGORIES.items():
        score = 0
        for kw in keywords:
            if re.search(kw.lower(), text):
                score += 1
        scores[category] = score

    # Get category with highest score
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "Miscellaneous"
    return best

def make_exchange_title(exchange):
    """Generate a short title from the first user message."""
    text = exchange['text']
    # Find first "You said:" and get the content after it
    match = re.search(r'You said:\s*\n(.+?)(?:\n|$)', text)
    if match:
        title = match.group(1).strip()
        # Truncate
        if len(title) > 120:
            title = title[:117] + "..."
        return title
    return f"Exchange at line {exchange['start']}"

def main():
    files = [
        ("/home/aharon/projects/bible-codes.github.io/CONVERSATION-TO-SORT-OUT.TXT", "File 1"),
        ("/home/aharon/projects/bible-codes.github.io/CONVERSATION-TO-SORT-OUT-2.TXT", "File 2"),
        ("/home/aharon/projects/bible-codes.github.io/CONVERSATION-TO-SORT-OUT-3.TXT", "File 3"),
    ]

    all_exchanges = []
    for path, label in files:
        lines = read_file(path)
        exchanges = split_exchanges(lines, label)
        all_exchanges.extend(exchanges)
        print(f"  {label}: {len(exchanges)} exchanges from {len(lines)} lines", file=sys.stderr)

    # Classify each exchange
    categorized = {}
    for ex in all_exchanges:
        cat = classify_exchange(ex)
        if cat not in categorized:
            categorized[cat] = []
        categorized[cat].append(ex)

    # Define preferred category order
    cat_order = [
        "Book Project & Bibliography",
        "Literature Review & Field Survey",
        "ELS Methodology & WRR Experiment",
        "Tsirufim & Semantic Permutations",
        "Statistical Methods & Information Theory",
        "Torah Statistics & Properties",
        "3D Geometry & Matrix Visualization",
        "Neural Networks & ML Architecture",
        "AI Architecture & Knowledge Graphs",
        "Experimental Design",
        "Software Tools & Implementation",
        "Cryptography & Steganography",
        "Kabbalah & Traditional Sources",
        "Visualization & Multimedia",
        "Web Development & UI",
        "Puzzles & Miscellaneous",
        "Miscellaneous"
    ]

    # Output organized markdown
    out = []
    out.append("# Organized Research Conversations\n")
    out.append("*Combined and organized from three ChatGPT conversation transcripts.*\n")
    out.append(f"*Total exchanges: {len(all_exchanges)}*\n\n")
    out.append("---\n\n")

    # Master TOC
    out.append("## Table of Contents\n\n")
    toc_num = 1
    for cat in cat_order:
        if cat in categorized:
            count = len(categorized[cat])
            anchor = cat.lower().replace(' ', '-').replace('&', '').replace('/', '-')
            out.append(f"{toc_num}. [{cat}](#{anchor}) ({count} exchanges)\n")
            toc_num += 1
    # Any remaining categories
    for cat in sorted(categorized.keys()):
        if cat not in cat_order:
            count = len(categorized[cat])
            anchor = cat.lower().replace(' ', '-').replace('&', '').replace('/', '-')
            out.append(f"{toc_num}. [{cat}](#{anchor}) ({count} exchanges)\n")
            toc_num += 1

    out.append("\n---\n\n")

    # Output each category
    section_num = 1
    for cat in cat_order:
        if cat not in categorized:
            continue
        exchanges = categorized[cat]

        out.append(f"## {section_num}. {cat}\n\n")
        out.append(f"*{len(exchanges)} exchanges*\n\n")

        # Sub-TOC for this category
        out.append("### Contents\n\n")
        for i, ex in enumerate(exchanges, 1):
            title = make_exchange_title(ex)
            out.append(f"{i}. {title} *({ex['source']}, lines {ex['start']}-{ex['end']})*\n")
        out.append("\n---\n\n")

        # Full content
        for i, ex in enumerate(exchanges, 1):
            title = make_exchange_title(ex)
            out.append(f"### {section_num}.{i}. {title}\n")
            out.append(f"*Source: {ex['source']}, lines {ex['start']}-{ex['end']}*\n\n")
            # Write content, preserving original text
            for line in ex['lines']:
                out.append(line)
            out.append("\n---\n\n")

        section_num += 1

    # Any remaining
    for cat in sorted(categorized.keys()):
        if cat not in cat_order:
            exchanges = categorized[cat]
            out.append(f"## {section_num}. {cat}\n\n")
            out.append(f"*{len(exchanges)} exchanges*\n\n")
            for i, ex in enumerate(exchanges, 1):
                title = make_exchange_title(ex)
                out.append(f"### {section_num}.{i}. {title}\n")
                out.append(f"*Source: {ex['source']}, lines {ex['start']}-{ex['end']}*\n\n")
                for line in ex['lines']:
                    out.append(line)
                out.append("\n---\n\n")
            section_num += 1

    # Write output
    output_path = "/home/aharon/projects/bible-codes.github.io/README-CONVERSATIONS-ORGANIZED.md"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(out)

    print(f"\nOutput written to: {output_path}", file=sys.stderr)
    print(f"Total lines: {len(out)}", file=sys.stderr)

    # Print category summary
    print("\nCategory distribution:", file=sys.stderr)
    for cat in cat_order:
        if cat in categorized:
            print(f"  {cat}: {len(categorized[cat])} exchanges", file=sys.stderr)
    for cat in sorted(categorized.keys()):
        if cat not in cat_order:
            print(f"  {cat}: {len(categorized[cat])} exchanges", file=sys.stderr)

if __name__ == '__main__':
    main()
