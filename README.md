Bible Codes App (bible-codes.github.io)

Bible Codes App is a browser-based, open-source tool that allows users to search for Equidistant Letter Sequences (ELS) within the Hebrew Bible. By entering custom phrases or terms, users can identify patterns and meaningful sequences in the text with high speed and accuracy.

Our mission is to provide accessible and performant Bible code search functionality directly in the browser, making it easy to explore sequences without the need for specialized software or installations. This project is cross-platform and privacy-focused, designed to work entirely on the client-side.
Features and Approach

    Fast and Accurate Search: The app enables users to define specific phrases and skip ranges to uncover possible patterns within the Hebrew Bible.
    Precomputed and Dynamic Hashing:
        For frequently searched terms, hashes are precomputed and stored in JSON files for near-instant retrieval.
        Less common phrases are dynamically hashed during searches. This hybrid approach maintains speed without overloading user devices.
    Offline and Cross-Device Compatibility: Built entirely in JavaScript, the app uses a service worker to cache data, enabling offline search and functionality as a Progressive Web App (PWA).
    Privacy and Accessibility: All search computations occur in the browser, ensuring that no external server processing is needed. This means it works on various devices (desktops, tablets, and smartphones) without additional installations, ensuring privacy and cross-platform compatibility.

Technology Stack and Algorithms

    Technology Stack:
        Front-end: HTML, CSS, and JavaScript for logic and UI
        Storage: JSON for storing precomputed hashes, with caching handled by a service worker
        Offline Functionality: Powered by PWA service workers, ensuring the app remains functional without an internet connection.
    Core Algorithms:
        Knuth-Morris-Pratt (KMP) Algorithm: Used for direct (zero-skip) pattern matching, optimizing performance by precomputing pattern prefixes.
        Boyer-Moore Algorithm: For efficient searching with non-zero skip values, reducing unnecessary character comparisons.
        Hybrid Search Strategy: For more efficient lookups, the app uses precomputed hashes and dynamic searches that leverage prehashing of frequent substrings for optimal retrieval times.
        Prehashing Technique: Frequent substrings are prehashed to allow instant lookups, combining speed and flexibility with minimal user-side processing.

How It Works

    Enter a Search Term and Range: Users specify the term or phrase to search for in the Hebrew Bible, along with a minimum and maximum skip range.
    Efficient Search Process: The app evaluates each skip value within the range using optimized search algorithms, looking for instances of the search term based on user-defined criteria.
    Real-Time Results: Results are displayed on-screen, showing exact positions and skip ranges where the term was found, even highlighting the efficiency of precomputed hash lookups for common terms.

Academic Inspiration

This app draws inspiration from the foundational research in ELS studies, particularly the landmark paper:

    Witztum, Doron, et al. “Equidistant Letter Sequences in the Book of Genesis.” Statistical Science, vol. 9, no. 3, 1994, pp. 429–38. JSTOR Link.

Additional popularization of Bible codes and ELS has been explored in works by authors like Michael Drosnin and Jeffrey Satinover. Our app seeks to provide a modern, accessible tool for educational exploration in the same spirit.
Open Source and Collaboration

The Bible Codes App is open-source and welcomes contributions from the community. Whether you're interested in helping optimize algorithms, enhancing UI, or adding new features, we encourage collaboration to expand the app’s capabilities. Visit the GitHub repository (https://github.com/roni762583/bible-data-science.github.io) to explore the code, submit issues, or propose improvements.
