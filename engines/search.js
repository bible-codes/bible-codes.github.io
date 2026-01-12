/**
 * Text Search Engine for Hebrew Bible
 *
 * Provides comprehensive text search capabilities including:
 * - Keyword/phrase search
 * - Pattern matching with regex
 * - First/last letter filtering
 * - Consonantal and full text (with niqqud) search
 *
 * Uses IndexedDB character-level database for searches.
 */

import { openDB } from '../db/schema.js';
import { getVersesByReference, getCharsByVerseId, getWordsByVerseId } from '../db/query.js';

/**
 * Search options interface
 * @typedef {Object} SearchOptions
 * @property {string} mode - 'consonantal' or 'full' (with niqqud)
 * @property {boolean} caseSensitive - Case sensitive search (default: false)
 * @property {boolean} wholeWord - Match whole words only (default: false)
 * @property {boolean} regex - Treat query as regex pattern (default: false)
 * @property {number} limit - Maximum number of results (default: 100)
 * @property {string} book - Filter by book name (optional)
 * @property {number} chapter - Filter by chapter (optional)
 */

/**
 * Search result interface
 * @typedef {Object} SearchResult
 * @property {number} verseId - Verse ID
 * @property {string} book - Book name
 * @property {number} chapter - Chapter number
 * @property {number} verse - Verse number
 * @property {string} text - Verse text
 * @property {Array<{start: number, end: number}>} matches - Match positions
 * @property {number} matchCount - Number of matches in this verse
 */

/**
 * Search for text in the Hebrew Bible
 * @param {string} query - Search query
 * @param {SearchOptions} options - Search options
 * @returns {Promise<SearchResult[]>} - Array of search results
 */
export async function searchText(query, options = {}) {
    const {
        mode = 'consonantal',
        caseSensitive = false,
        wholeWord = false,
        regex = false,
        limit = 100,
        book = null,
        chapter = null
    } = options;

    if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
    }

    const db = await openDB();
    const results = [];

    // Prepare search pattern
    let pattern;
    if (regex) {
        try {
            pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
        } catch (e) {
            throw new Error(`Invalid regex pattern: ${e.message}`);
        }
    } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundary = wholeWord ? '\\b' : '';
        pattern = new RegExp(
            `${wordBoundary}${escapedQuery}${wordBoundary}`,
            caseSensitive ? 'g' : 'gi'
        );
    }

    // Build query constraints
    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');

    let cursor;
    if (book) {
        const index = store.index('by_book');
        cursor = await index.openCursor(book);
    } else {
        cursor = await store.openCursor();
    }

    // Iterate through verses
    while (cursor && results.length < limit) {
        const verse = cursor.value;

        // Apply chapter filter if specified
        if (chapter !== null && verse.chapter !== chapter) {
            cursor = await cursor.continue();
            continue;
        }

        // Choose text field based on mode
        const text = mode === 'consonantal'
            ? verse.verse_text_consonantal
            : verse.verse_text_full;

        // Search for matches in this verse
        const matches = [];
        let match;
        pattern.lastIndex = 0; // Reset regex

        while ((match = pattern.exec(text)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                matched: match[0]
            });
        }

        if (matches.length > 0) {
            results.push({
                verseId: verse.verse_id,
                book: verse.book,
                chapter: verse.chapter,
                verse: verse.verse,
                text: text,
                matches: matches,
                matchCount: matches.length
            });
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Search for verses by first letter(s) of words
 * @param {string} letters - Hebrew letters to match
 * @param {Object} options - Search options
 * @returns {Promise<SearchResult[]>} - Array of search results
 */
export async function searchFirstLetters(letters, options = {}) {
    const {
        consecutive = true, // Letters must appear in consecutive words
        limit = 100,
        book = null
    } = options;

    if (!letters || letters.length === 0) {
        throw new Error('Letters cannot be empty');
    }

    const db = await openDB();
    const results = [];

    // Get all verses
    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');

    let cursor;
    if (book) {
        const index = store.index('by_book');
        cursor = await index.openCursor(book);
    } else {
        cursor = await store.openCursor();
    }

    while (cursor && results.length < limit) {
        const verse = cursor.value;

        // Get words for this verse
        const words = await getWordsByVerseId(verse.verse_id);

        // Extract first letters
        const firstLetters = words.map(w => w.word_text_consonantal[0]).join('');

        // Check if pattern exists
        let matchIndex;
        if (consecutive) {
            matchIndex = firstLetters.indexOf(letters);
        } else {
            // Non-consecutive: check if all letters appear in order
            let letterIdx = 0;
            matchIndex = -1;
            for (let i = 0; i < firstLetters.length && letterIdx < letters.length; i++) {
                if (firstLetters[i] === letters[letterIdx]) {
                    if (letterIdx === 0) matchIndex = i;
                    letterIdx++;
                }
            }
            if (letterIdx < letters.length) matchIndex = -1;
        }

        if (matchIndex >= 0) {
            results.push({
                verseId: verse.verse_id,
                book: verse.book,
                chapter: verse.chapter,
                verse: verse.verse,
                text: verse.verse_text_consonantal,
                firstLetters: firstLetters,
                matchIndex: matchIndex
            });
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Search for verses by last letter(s) of words
 * @param {string} letters - Hebrew letters to match
 * @param {Object} options - Search options
 * @returns {Promise<SearchResult[]>} - Array of search results
 */
export async function searchLastLetters(letters, options = {}) {
    const {
        consecutive = true,
        limit = 100,
        book = null
    } = options;

    if (!letters || letters.length === 0) {
        throw new Error('Letters cannot be empty');
    }

    const db = await openDB();
    const results = [];

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');

    let cursor;
    if (book) {
        const index = store.index('by_book');
        cursor = await index.openCursor(book);
    } else {
        cursor = await store.openCursor();
    }

    while (cursor && results.length < limit) {
        const verse = cursor.value;

        // Get words for this verse
        const words = await getWordsByVerseId(verse.verse_id);

        // Extract last letters
        const lastLetters = words.map(w => {
            const text = w.word_text_consonantal;
            return text[text.length - 1];
        }).join('');

        // Check if pattern exists
        let matchIndex;
        if (consecutive) {
            matchIndex = lastLetters.indexOf(letters);
        } else {
            let letterIdx = 0;
            matchIndex = -1;
            for (let i = 0; i < lastLetters.length && letterIdx < letters.length; i++) {
                if (lastLetters[i] === letters[letterIdx]) {
                    if (letterIdx === 0) matchIndex = i;
                    letterIdx++;
                }
            }
            if (letterIdx < letters.length) matchIndex = -1;
        }

        if (matchIndex >= 0) {
            results.push({
                verseId: verse.verse_id,
                book: verse.book,
                chapter: verse.chapter,
                verse: verse.verse,
                text: verse.verse_text_consonantal,
                lastLetters: lastLetters,
                matchIndex: matchIndex
            });
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Search for verses containing specific letter patterns
 * @param {string} pattern - Letter pattern (e.g., 'א*ה' matches words with א and ה)
 * @param {Object} options - Search options
 * @returns {Promise<SearchResult[]>} - Array of search results
 */
export async function searchLetterPattern(pattern, options = {}) {
    const { limit = 100, book = null } = options;

    // Convert simple pattern to regex
    // * = any letters, ? = single letter
    const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

    return await searchText(regexPattern, {
        ...options,
        regex: true,
        mode: 'consonantal'
    });
}

/**
 * Get search suggestions based on partial input
 * @param {string} partial - Partial search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Promise<string[]>} - Array of suggestions
 */
export async function getSearchSuggestions(partial, limit = 10) {
    if (!partial || partial.length < 2) {
        return [];
    }

    const db = await openDB();
    const suggestions = new Set();

    // Search words that start with the partial query
    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const cursor = await store.openCursor();

    while (cursor && suggestions.size < limit) {
        const word = cursor.value;
        if (word.word_text_consonantal.startsWith(partial)) {
            suggestions.add(word.word_text_consonantal);
        }
        cursor = await cursor.continue();
    }

    await tx.done;
    return Array.from(suggestions).slice(0, limit);
}

/**
 * Count occurrences of a search term across the entire Bible
 * @param {string} query - Search query
 * @param {SearchOptions} options - Search options
 * @returns {Promise<{total: number, byBook: Object}>} - Occurrence counts
 */
export async function countOccurrences(query, options = {}) {
    const results = await searchText(query, { ...options, limit: Number.MAX_SAFE_INTEGER });

    const byBook = {};
    let total = 0;

    for (const result of results) {
        const book = result.book;
        if (!byBook[book]) {
            byBook[book] = 0;
        }
        byBook[book] += result.matchCount;
        total += result.matchCount;
    }

    return { total, byBook };
}

export default {
    searchText,
    searchFirstLetters,
    searchLastLetters,
    searchLetterPattern,
    getSearchSuggestions,
    countOccurrences
};
