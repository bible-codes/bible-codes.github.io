Bible Codes App 📜 

    bible-codes.github.io

Welcome to the Bible Codes App – an innovative, browser-based tool for exploring Equidistant Letter Sequences (ELS) in the Hebrew Bible. Designed to deliver fast and accessible ELS searches, this app allows users to search for hidden patterns and sequences in the text, inspired by the groundbreaking work on Bible codes.
🔍 Project Overview

The Bible Codes App enables users to input custom phrases or terms and identifies ELS patterns in the Hebrew Bible. Users can quickly find sequences for well-known phrases, such as Hebrew dates, or explore unique combinations with custom inputs.
⚡ Key Features

    Efficient Search: Combines precomputed and dynamic hashing to provide fast, accurate search results.
    Optimized for Common Phrases: Frequently searched phrases are precomputed, making searches almost instantaneous.
    Custom Input Flexibility: For unique or less common phrases, dynamic hashing offers real-time processing.
    Offline Functionality: Caching and storage options allow for continued use even without an internet connection.

🔧 Technology Stack

    Front-End: JavaScript powers the search algorithms and user interface.
    Data Storage: JSON files store precomputed hashes and search data.
    Service Worker: Provides offline caching and functionality.
    ELS Search Algorithms: Combines Knuth-Morris-Pratt (KMP) and Boyer-Moore optimizations for efficient string matching, supported by prehashed data structures for rapid lookups.

🚀 How It Works

    Hybrid Search Approach:
        Precomputed Hashes: For frequently searched terms, hashes are precomputed and stored in the app’s resources.
        Dynamic Hashing: For new, user-defined terms, the app calculates hashes in real time.

    Browser-Based Execution:
        Runs entirely on the client side, making it lightweight and accessible across devices without installation.
        Ensures high performance without platform-specific requirements, expanding compatibility across most modern devices.

    Caching for Offline Use:
        Precomputed hashes are cached locally, allowing for immediate lookups.
        Service worker ensures that essential resources are available offline.

📚 Background and Inspiration

This project is inspired by research into Bible codes, particularly the work by:

    Witztum, Doron, et al. “Equidistant Letter Sequences in the Book of Genesis.” Statistical Science, vol. 9, no. 3, 1994, pp. 429–38. JSTOR.

It also draws from popular works by Michael Drosnin and Jeffrey Satinover that explore the fascinating possibilities of hidden codes in ancient texts.
🌟 Open Source and Collaborative

The Bible Codes App is open source and free to use. Contributions are encouraged and welcome! Whether you're interested in exploring the code, suggesting new features, or contributing to development, please feel free to join us.

    GitHub Repository: Bible Codes App
    Bible Data Science Group Home: Bible Data Science Group

🤝 How to Contribute

    Fork the Repository: Start by forking the project on GitHub.
    Submit Issues: Report bugs or request features in the Issues section.
    Open a Pull Request: After making changes, submit a pull request for review.

Thank you for exploring and contributing to the Bible Codes App!
