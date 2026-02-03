/**
 * ELS (Equidistant Letter Sequence) Search Web Worker
 *
 * Performs computationally intensive Bible codes (ELS) searches
 * in a background thread to prevent UI blocking.
 *
 * ELS Search: Finding sequences of letters at equal intervals (skip distances)
 * Example: With skip=3, reading every 3rd letter: position 0, 3, 6, 9, ...
 *
 * This worker:
 * - Operates on character-level database
 * - Supports positive and negative skip distances
 * - Provides progress updates during search
 * - Can be cancelled mid-search
 * - Returns all matches with position information
 */

// Import IndexedDB schema (for Web Worker context)
importScripts('../db/schema.js');

let searchCancelled = false;

/**
 * Message handler for Web Worker
 */
self.onmessage = async function(e) {
    const { action, data } = e.data;

    switch (action) {
        case 'search':
            await performELSSearch(data);
            break;

        case 'cancel':
            searchCancelled = true;
            break;

        case 'ping':
            self.postMessage({ type: 'pong' });
            break;

        default:
            self.postMessage({
                type: 'error',
                error: `Unknown action: ${action}`
            });
    }
};

/**
 * Perform ELS search
 * @param {Object} params - Search parameters
 */
async function performELSSearch(params) {
    const {
        term,
        minSkip,
        maxSkip,
        book = null,
        chapter = null,
        startPosition = 0,
        endPosition = null
    } = params;

    searchCancelled = false;

    try {
        // Validate parameters
        if (!term || term.length === 0) {
            throw new Error('Search term cannot be empty');
        }

        // Note: Skip 0 and ±1 are filtered out in the search loop
        // They are not errors, just excluded per academic standard

        // Open IndexedDB
        const db = await self.openDB();

        // Load character data
        self.postMessage({
            type: 'progress',
            stage: 'loading',
            message: 'Loading character data...'
        });

        const chars = await loadCharacterData(db, book, chapter, startPosition, endPosition);

        if (searchCancelled) {
            self.postMessage({ type: 'cancelled' });
            return;
        }

        self.postMessage({
            type: 'progress',
            stage: 'loaded',
            message: `Loaded ${chars.length} characters`,
            charCount: chars.length
        });

        // Perform search across skip range
        const allMatches = [];

        // Calculate total skips
        // Skip 0 is meaningless (same position repeated) - exclude
        // Skip ±1 are open text (forward/backward) - could include but typically excluded in worker
        // For now, exclude all skip values with |skip| < 2
        let skipValues = [];
        for (let skip = minSkip; skip <= maxSkip; skip++) {
            if (Math.abs(skip) < 2) continue; // Exclude 0 and ±1 (open text handled separately)
            skipValues.push(skip);
        }

        const totalSkips = skipValues.length;
        let skipsProcessed = 0;

        for (const skip of skipValues) {
            if (searchCancelled) {
                self.postMessage({ type: 'cancelled' });
                return;
            }

            const matches = findELSMatches(chars, term, skip);
            allMatches.push(...matches);

            skipsProcessed++;
            if (skipsProcessed % 10 === 0 || skipsProcessed === totalSkips) {
                self.postMessage({
                    type: 'progress',
                    stage: 'searching',
                    message: `Searching skip ${skip}...`,
                    currentSkip: skip,
                    skipsProcessed: skipsProcessed,
                    totalSkips: totalSkips,
                    progress: Math.round((skipsProcessed / totalSkips) * 100),
                    matchesFound: allMatches.length
                });
            }
        }

        // Search complete
        self.postMessage({
            type: 'complete',
            matches: allMatches,
            matchCount: allMatches.length,
            searchParams: params
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
}

/**
 * Load character data from IndexedDB
 */
async function loadCharacterData(db, book, chapter, startPosition, endPosition) {
    const tx = db.transaction('chars', 'readonly');
    const store = tx.objectStore('chars');

    let chars = [];

    if (book) {
        // Load by book/chapter filter
        const index = store.index('by_book');
        let cursor = await index.openCursor(book);

        while (cursor) {
            const char = cursor.value;

            // Apply chapter filter if specified
            if (chapter === null || char.chapter === chapter) {
                // Apply position filter if specified
                if ((startPosition === null || char.id >= startPosition) &&
                    (endPosition === null || char.id <= endPosition)) {
                    chars.push({
                        id: char.id,
                        baseChar: char.base_char,
                        book: char.book,
                        chapter: char.chapter,
                        verse: char.verse,
                        verseCharIndex: char.verse_char_index
                    });
                }
            }

            cursor = await cursor.continue();
        }
    } else {
        // Load all or by position range
        const range = endPosition !== null
            ? IDBKeyRange.bound(startPosition || 0, endPosition)
            : IDBKeyRange.lowerBound(startPosition || 0);

        let cursor = await store.openCursor(range);

        while (cursor) {
            const char = cursor.value;
            chars.push({
                id: char.id,
                baseChar: char.base_char,
                book: char.book,
                chapter: char.chapter,
                verse: char.verse,
                verseCharIndex: char.verse_char_index
            });

            cursor = await cursor.continue();
        }
    }

    await tx.done;
    return chars;
}

/**
 * Find all ELS matches for a given term and skip distance
 * Implements proper bidirectional search per Rips et al. (1994)
 *
 * Skip conventions:
 * - skip > 0: Forward search (positions p, p+d, p+2d, ...)
 * - skip < 0: Backward search (positions p, p-d, p-2d, ...)
 * - skip = 0, ±1: Should be filtered out before calling this function
 */
function findELSMatches(chars, term, skip) {
    const matches = [];
    const termLength = term.length;
    const absSkip = Math.abs(skip);

    if (skip > 0) {
        // Forward search
        const maxStartPos = chars.length - (termLength - 1) * skip;

        if (maxStartPos < 0) {
            return matches; // Term too long for this text with this skip
        }

        for (let startIdx = 0; startIdx <= maxStartPos; startIdx++) {
            if (searchCancelled) break;

            let match = true;
            const positions = [];

            // Extract forward sequence: startIdx, startIdx+skip, startIdx+2*skip, ...
            for (let i = 0; i < termLength; i++) {
                const charIdx = startIdx + (i * skip);

                if (charIdx >= chars.length) {
                    match = false;
                    break;
                }

                const char = chars[charIdx];
                if (char.baseChar !== term[i]) {
                    match = false;
                    break;
                }

                positions.push({
                    globalId: char.id,
                    book: char.book,
                    chapter: char.chapter,
                    verse: char.verse,
                    verseCharIndex: char.verseCharIndex,
                    letter: char.baseChar
                });
            }

            if (match) {
                const endIdx = startIdx + (termLength - 1) * skip;
                matches.push({
                    term: term,
                    skip: skip,
                    startPosition: chars[startIdx].id,
                    endPosition: chars[endIdx].id,
                    positions: positions,
                    startBook: positions[0].book,
                    startChapter: positions[0].chapter,
                    startVerse: positions[0].verse,
                    endBook: positions[positions.length - 1].book,
                    endChapter: positions[positions.length - 1].chapter,
                    endVerse: positions[positions.length - 1].verse,
                    spanLength: Math.abs(chars[endIdx].id - chars[startIdx].id)
                });
            }
        }

    } else {
        // Backward search (skip < 0)
        // Must start from positions that have enough room to go backward
        const minStartPos = (termLength - 1) * absSkip;

        if (minStartPos >= chars.length) {
            return matches; // Term too long for this text with this skip
        }

        for (let startIdx = minStartPos; startIdx < chars.length; startIdx++) {
            if (searchCancelled) break;

            let match = true;
            const positions = [];

            // Extract backward sequence: startIdx, startIdx-absSkip, startIdx-2*absSkip, ...
            for (let i = 0; i < termLength; i++) {
                const charIdx = startIdx - (i * absSkip);

                if (charIdx < 0) {
                    match = false;
                    break;
                }

                const char = chars[charIdx];
                if (char.baseChar !== term[i]) {
                    match = false;
                    break;
                }

                positions.push({
                    globalId: char.id,
                    book: char.book,
                    chapter: char.chapter,
                    verse: char.verse,
                    verseCharIndex: char.verseCharIndex,
                    letter: char.baseChar
                });
            }

            if (match) {
                const endIdx = startIdx - (termLength - 1) * absSkip;
                matches.push({
                    term: term,
                    skip: skip,
                    startPosition: chars[startIdx].id,
                    endPosition: chars[endIdx].id,
                    positions: positions,
                    startBook: positions[0].book,
                    startChapter: positions[0].chapter,
                    startVerse: positions[0].verse,
                    endBook: positions[positions.length - 1].book,
                    endChapter: positions[positions.length - 1].chapter,
                    endVerse: positions[positions.length - 1].verse,
                    spanLength: Math.abs(chars[endIdx].id - chars[startIdx].id)
                });
            }
        }
    }

    return matches;
}

/**
 * Calculate statistics for a set of matches
 */
function calculateMatchStatistics(matches) {
    if (matches.length === 0) {
        return null;
    }

    const skipDistribution = {};
    const spanLengths = [];
    const bookDistribution = {};

    for (const match of matches) {
        // Skip distribution
        if (!skipDistribution[match.skip]) {
            skipDistribution[match.skip] = 0;
        }
        skipDistribution[match.skip]++;

        // Span lengths
        spanLengths.push(match.spanLength);

        // Book distribution
        if (!bookDistribution[match.startBook]) {
            bookDistribution[match.startBook] = 0;
        }
        bookDistribution[match.startBook]++;
    }

    // Calculate span statistics
    spanLengths.sort((a, b) => a - b);
    const minSpan = spanLengths[0];
    const maxSpan = spanLengths[spanLengths.length - 1];
    const medianSpan = spanLengths[Math.floor(spanLengths.length / 2)];
    const avgSpan = spanLengths.reduce((a, b) => a + b, 0) / spanLengths.length;

    return {
        totalMatches: matches.length,
        skipDistribution: skipDistribution,
        uniqueSkips: Object.keys(skipDistribution).length,
        spanStatistics: {
            min: minSpan,
            max: maxSpan,
            median: medianSpan,
            average: Math.round(avgSpan)
        },
        bookDistribution: bookDistribution
    };
}

// Helper function to open IndexedDB in worker context
self.openDB = async function() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('HebrewBibleDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            // Database schema should already exist
            // This is just for opening an existing database
            const db = event.target.result;
            if (!db.objectStoreNames.contains('chars')) {
                reject(new Error('Database not initialized. Please load data first.'));
            }
        };
    });
};
