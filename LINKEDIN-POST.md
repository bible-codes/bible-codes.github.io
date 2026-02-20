# LinkedIn Post — Hebrew Bible Analysis Suite

---

**I Built the First Open-Source JavaScript Replication of the 1994 WRR Bible Codes Experiment — Running Entirely in Your Browser**

In 1994, three mathematicians published a controversial paper in the peer-reviewed journal *Statistical Science* claiming they found statistically significant letter-pattern encodings in the Book of Genesis — names and death dates of 32 famous rabbis, hidden at equidistant letter intervals. Their reported result: P < 0.00002.

The paper ignited decades of debate. But the original software was proprietary, and no fully open-source replication existed in a modern, accessible format.

I grew up fascinated by the intersection of scripture and mathematics. The idea that a rigorous statistical claim about the Torah could be tested — transparently, by anyone — felt like something that should exist. So I built it.

---

**What the tool does:**

The Hebrew Bible Analysis Suite is a browser-based platform with 11 interactive research tools for computational analysis of the Torah and Tanakh. Highlights:

- ELS (Equidistant Letter Sequence) search across 304,805 Hebrew letters
- Full WRR 1994 replication with c(w,w') perturbation statistic and permutation testing
- 3D WebGL matrix visualization (Three.js with auto-rotate and video capture)
- Hebrew calendar date heatmap from 1.74M pre-computed ELS hits

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

I systematically tested and eliminated potential sources of the gap: cylindrical wrapping, D(w) corrections, compound distance formulas, alternative P-statistics, and domain-of-minimality weighting. That last one — where each ELS occurrence is weighted by the text region it dominates — actually made WRR1 results worse (P = 0.018), confirming it's a WRR2-specific technique. The remaining gap likely traces to undocumented appellation-matching details or minor distance-formula variants in the original closed-source implementation.

Every formula, every constant, every decision is in the open source. You can inspect it, reproduce it, or improve it.

That is the point. Replication should be transparent, not proprietary.

---

**Try it:** https://bible-codes.github.io
**Source:** https://github.com/bible-codes/bible-codes.github.io

Built with vanilla JavaScript, Three.js, Web Workers, and hours of examining Hebrew consonants.

I used AI-assisted development — Claude Code (Anthropic) — as a coding accelerator throughout this project.

This project is dedicated in loving memory of my Dad and teacher, Shmuel Zbaida z"l.

#JavaScript #OpenSource #DataScience #WebDevelopment #Statistics #ComputationalLinguistics #HebrewBible #WebGL #PWA #ScientificReplication
