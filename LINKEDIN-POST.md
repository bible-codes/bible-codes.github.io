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

**The honest part — and the discovery:**

My implementation achieves P = 0.0012 on the WRR1 experiment (statistically significant — 1 in 840 chance by random). The published result is P = 0.00002 (1 in 62,500). That's a 75x gap.

I systematically tested and eliminated potential sources: cylindrical wrapping, D(w) corrections, compound distance formulas, alternative P-statistics, domain-of-minimality weighting, and the σ vs ω aggregation question. Every variation either made results worse or was ruled out.

Then I dug into the literature and found the real story:

**Nobody has ever independently reproduced WRR's P-value. Not a single researcher in 30+ years.**

McKay, Bar-Natan, Bar-Hillel, and Kalai (MBBK) — four mathematicians who published their critique in the same journal (*Statistical Science*, 1999) — wrote independent implementations and could not match WRR's exact distances. When they asked for the original code, WRR "were unable to provide their original computer programs." The programs they distributed had about half a dozen bugs. The specific program that generated the published results was described by Witztum himself as "presumably lost."

The Hebrew University Aumann Committee, chaired by Nobel laureate Robert Aumann (who started out sympathetic), ran two formal replications. Both came back non-significant. When Dr. Simcha Emanuel independently prepared appellations for the same 32 rabbis, the effect vanished. MBBK then showed they could produce a comparable effect in Tolstoy's War and Peace through appellation selection alone.

My ~75x gap isn't a bug — it's consistent with the fact that the published result appears to be unreproducible.

Every formula, every constant, every decision is in the open source. You can inspect it, reproduce it, or improve it.

That is the point. Replication should be transparent, not proprietary.

---

**Try it:** https://bible-codes.github.io
**Source:** https://github.com/bible-codes/bible-codes.github.io

Built with vanilla JavaScript, Three.js, Web Workers, and hours of examining Hebrew consonants.

I used AI-assisted development — Claude Code (Anthropic) — as a coding accelerator throughout this project.

This project is dedicated in loving memory of my Dad and teacher, Shmuel Zbaida z"l.

#JavaScript #OpenSource #DataScience #WebDevelopment #Statistics #ComputationalLinguistics #HebrewBible #WebGL #PWA #ScientificReplication
