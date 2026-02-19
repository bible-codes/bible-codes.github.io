# LinkedIn Post

---

**I Built the First Open-Source JavaScript Replication of the 1994 WRR Bible Codes Experiment — Running Entirely in Your Browser**

In 1994, three mathematicians published a paper in the peer-reviewed journal Statistical Science that shook the academic world. Witztum, Rips, and Rosenberg claimed they found statistically significant letter-pattern encodings in the Book of Genesis — names and death dates of 32 famous rabbis, hidden at equidistant letter intervals in a 3,300-year-old text. Their reported result: P < 0.00002.

The paper ignited decades of debate. But the original software was proprietary, and no fully open-source replication existed in a modern, accessible format.

So I built one. From scratch. In JavaScript. Running 100% in your browser.

---

**What the tool does:**

The Hebrew Bible Analysis Suite is a platform with 11 interactive research tools for computational analysis of the Torah and Tanakh:

- ELS (Equidistant Letter Sequence) search across 304,805 Hebrew letters
- Full WRR 1994 replication — 32 rabbis (List 2), c(w,w') perturbation statistic, permutation testing
- WRR Nations experiment (68 nations from Genesis 10)
- Gematria calculator (3 methods), acronym extraction, text search with regex
- 3D matrix visualization (Three.js WebGL with auto-rotate and video capture)
- Hebrew calendar date map — pre-computed ELS density across every day of the year
- Semantic permutation analysis (Tsirufim) with Hebrew word embeddings
- Hebrew OCR, traditional book reader, and more

No server. No account. No installation required. Works offline after first visit (PWA).

---

**The engineering under the hood:**

- Web Workers keep the UI fully responsive while scanning hundreds of thousands of skip values
- Custom GIF89a encoder with LZW compression for animated 3D matrix exports
- 39 compressed character databases (630 MB raw, served as 21 MB gzip) with per-letter metadata: book, chapter, verse, word position, gematria values
- KMP + Boyer-Moore pattern matching with Hebrew final-form letter normalization
- Zero npm packages. Zero build steps. Push to GitHub Pages and it's live.

---

**The honest part:**

My implementation achieves P = 0.001 on the WRR1 experiment. The published result is P = 0.00002. That's a 75x gap.

I'm not hiding this. I'm documenting it.

The gap is traceable to a specific algorithmic component — domain-of-minimality weighting — where each ELS occurrence is weighted by the range of row-lengths over which it achieves minimal proximity. My implementation uses unweighted proximity. I systematically tested and eliminated other sources: cylindrical wrapping, D(w) corrections, compound distance formulas, alternative P-statistics.

Every formula, every constant, every decision is in the open source. You can inspect it, reproduce it, or improve it.

That is the point. Replication should be transparent, not proprietary.

---

**Try it:** https://bible-codes.github.io
**Source:** https://github.com/bible-codes/bible-codes.github.io

Built with vanilla JavaScript, Three.js, Web Workers, Claude Code (Anthropic), and several thousand hours of staring at Hebrew consonants.

(Yes, I used AI-assisted development — Claude Code as a coding accelerator. The architecture, algorithm choices, WRR methodology, and all domain decisions are mine. The same transparency I apply to the P-value gap, I apply to how the code was written.)

#JavaScript #OpenSource #DataScience #WebDevelopment #Statistics #ComputationalLinguistics #HebrewBible #WebGL #PWA #FullStack
