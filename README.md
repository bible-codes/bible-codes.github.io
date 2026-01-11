# Hebrew Bible Analysis Suite 📜

## Project Link
Visit the app at [bible-codes.github.io](https://bible-codes.github.io/)

---

## Overview

Welcome to the **Hebrew Bible Analysis Suite** – a comprehensive, browser-based platform for exploring the Hebrew Bible through multiple analytical lenses. This unified application combines traditional Torah study tools with modern computational analysis, all running entirely in your browser with full offline capability.

---

## 🎯 Current Features

### 🔴 Active Tools
- **ELS Bible Codes Search** ([bible-codes.html](https://bible-codes.github.io/bible-codes.html))
  - Equidistant Letter Sequence (ELS) searches
  - Precomputed hashes for common phrases
  - Dynamic search for custom inputs
  - Skip distance analysis

### 🟡 In Development
- **Hebrew Text Search** - Advanced pattern matching and verse lookup
- **Gematria Calculator** - Multiple calculation methods (standard, reduced, ordinal)
- **Notarikon Tool** - Acronym and abbreviation analysis

### 🟢 Planned Features
- **Letter & Word Analysis** - Character-level statistical analysis
- **Cantillation Viewer** - Taamim analysis including alternate traditions
- **Cross-Reference Index** - Links to Talmud, Midrash, and Zohar citations
- **Anagram Solver** - Pattern detection and permutations

---

## ⚡ Key Features

### Comprehensive Analysis Tools
- **ELS Search**: Fast, efficient Equidistant Letter Sequence searches
- **Text Search**: Keyword, phrase, and pattern matching
- **Gematria**: Multiple calculation methods with value-based searches
- **Notarikon**: First/last letter extraction and acronym analysis
- **Statistical Analysis**: Letter counts, word patterns, structural queries

### Technical Excellence
- **100% Client-Side**: No server required, runs entirely in browser
- **Offline Capable**: Full PWA support with service worker caching
- **Character-Level Database**: Future-proof architecture using IndexedDB
- **Web Workers**: Heavy computations run in background threads
- **Cross-Platform**: Works on desktop, tablet, and mobile devices

### Data Features
- **Niqqud Aware**: Supports vowel points in searches
- **Taamim Support**: Cantillation marks analysis
- **Alternate Traditions**: Support for variant readings (e.g., Aseret HaDibrot)
- **Precomputed Values**: Fast lookups for common searches
- **Compressed Storage**: Efficient data storage for offline use

---

## 🔧 Technology Stack

### Frontend
- **JavaScript (ES6+)**: Core application logic
- **IndexedDB**: Large dataset storage and querying
- **Web Workers**: Background processing for searches
- **Service Worker**: Offline caching and PWA functionality

### Data Architecture
- **Character-Level Database**: Canonical storage of every Hebrew letter
- **Derived Views**: Words, verses, and analysis built on character data
- **Precomputed Indices**: Gematria values, letter positions, skip patterns
- **Compressed JSON**: Efficient storage and transfer

### Search Algorithms
- **KMP & Boyer-Moore**: Optimized string matching
- **Hash-Based Lookups**: Fast ELS pattern detection
- **Indexed Queries**: Efficient database operations

---

## 🚀 Architecture

### Database Schema

The application uses a character-level canonical database where each Hebrew letter is a record:

```javascript
Character Record {
  id: global position (0..304,805)
  book, chapter, verse, word_index
  base_char, final_form
  niqqud, taamim, alt_taamim
  gematria_standard, gematria_reduced, gematria_ordinal
}
```

This enables:
- ELS searches via global position
- First/last letter queries
- Gematria calculations
- Cantillation analysis
- Statistical queries

### File Structure
```
/
├── index.html              # Main dashboard
├── bible-codes.html        # ELS search tool
├── CLAUDE.md               # Implementation plan
├── data/                   # Text and precomputed data
├── engines/                # Search and analysis engines
├── ui/                     # UI components
└── torah-codes/            # Python reference implementation
```

---

## 📚 Background and Inspiration

This project builds on research into Bible codes and computational text analysis:

- **Witztum, Doron, et al.** "Equidistant Letter Sequences in the Book of Genesis." *Statistical Science*, vol. 9, no. 3, 1994, pp. 429–38. JSTOR.
- Works by Michael Drosnin and Jeffrey Satinover on hidden codes
- Traditional Jewish approaches to gematria and notarikon
- Modern computational linguistics and statistical analysis

---

## 🌟 Open Source

This project is **open source and free to use**. Contributions are welcome!

### Related Projects
- [Bible Codes App](https://github.com/bible-codes/bible-codes.github.io) - This repository
- [Bible Data Science](https://github.com/roni762583/bible-data-science.github.io) - Jupyter notebooks and research tools

---

## 🤝 Contributing

We welcome contributions of all kinds:

1. **Fork the Repository**: Start by forking this project
2. **Submit Issues**: Report bugs or request features in [Issues](https://github.com/bible-codes/bible-codes.github.io/issues)
3. **Open Pull Requests**: Submit PRs for bug fixes or new features
4. **Improve Documentation**: Help make the project more accessible
5. **Share Ideas**: Suggest new analysis tools or features

### Development Setup

See [CLAUDE.md](CLAUDE.md) for detailed implementation plans and architecture documentation.

---

## 📖 Usage

1. **Visit** [bible-codes.github.io](https://bible-codes.github.io/)
2. **Choose a tool** from the dashboard
3. **Install as PWA** (optional) for offline use
4. **Explore** the Hebrew Bible with powerful analysis tools

---

## 📧 Contact

- **Email**: roni762583@protonmail.com
- **GitHub**: [bible-codes](https://github.com/bible-codes)

---

## 📄 License

See [LICENSE](LICENSE) for details.

---

*Last Updated: 2026-01-11*

Thank you for exploring the Hebrew Bible Analysis Suite!
