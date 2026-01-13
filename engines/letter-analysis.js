/**
 * Letter & Word Analysis Engine
 *
 * Statistical analysis of Hebrew letters and words:
 * - Letter frequency analysis
 * - Word length distributions
 * - Character patterns (final letters, etc.)
 * - Book/chapter/verse-level statistics
 */

import { openDB } from '../db/schema.js';

export class LetterAnalysisEngine {
    constructor() {
        this.db = null;
        this.hebrewLetters = [
            'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
            'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
        ];
        this.finalLetters = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    }

    async init() {
        if (!this.db) {
            this.db = await openDB();
        }
    }

    /**
     * Analyze letter frequencies
     * @param {Object} scope - Analysis scope (book/chapter/verse range)
     * @returns {Promise<Object>} Letter frequency data
     */
    async analyzeLetterFrequency(scope = {}) {
        await this.init();

        const { bookNum, chapter, verseStart, verseEnd } = scope;

        const tx = this.db.transaction(['chars'], 'readonly');
        const store = tx.objectStore('chars');

        const letterCounts = {};
        const finalLetterCounts = {};
        let totalChars = 0;

        // Initialize counts
        this.hebrewLetters.forEach(letter => letterCounts[letter] = 0);
        this.finalLetters.forEach(letter => finalLetterCounts[letter] = 0);

        // Query strategy based on scope
        let cursor;
        if (bookNum) {
            const index = store.index('by_book');
            cursor = await index.openCursor(IDBKeyRange.only(bookNum));
        } else {
            cursor = await store.openCursor();
        }

        // Iterate through characters
        while (cursor) {
            const char = cursor.value;

            // Apply chapter/verse filters
            if (chapter && char.chapter !== chapter) {
                cursor = await cursor.continue();
                continue;
            }

            if (verseStart && char.verse < verseStart) {
                cursor = await cursor.continue();
                continue;
            }

            if (verseEnd && char.verse > verseEnd) {
                cursor = await cursor.continue();
                continue;
            }

            // Count base character
            if (char.base_char) {
                letterCounts[char.base_char] = (letterCounts[char.base_char] || 0) + 1;
                totalChars++;
            }

            // Count final forms
            if (char.final_form) {
                const finalChar = this.getFinalForm(char.base_char);
                finalLetterCounts[finalChar] = (finalLetterCounts[finalChar] || 0) + 1;
            }

            cursor = await cursor.continue();
        }

        // Calculate percentages
        const frequencies = {};
        Object.entries(letterCounts).forEach(([letter, count]) => {
            frequencies[letter] = {
                count,
                percentage: totalChars > 0 ? (count / totalChars * 100) : 0,
                rank: 0
            };
        });

        // Rank by frequency
        const sorted = Object.entries(frequencies)
            .sort(([, a], [, b]) => b.count - a.count);

        sorted.forEach(([letter, data], index) => {
            frequencies[letter].rank = index + 1;
        });

        return {
            frequencies,
            finalLetters: finalLetterCounts,
            totalChars,
            scope,
            topLetters: sorted.slice(0, 10).map(([letter, data]) => ({
                letter,
                ...data
            }))
        };
    }

    /**
     * Analyze word length distribution
     * @param {Object} scope - Analysis scope
     * @returns {Promise<Object>} Word length statistics
     */
    async analyzeWordLengths(scope = {}) {
        await this.init();

        const { bookNum } = scope;

        const tx = this.db.transaction(['words'], 'readonly');
        const store = tx.objectStore('words');

        const lengthCounts = {};
        let totalWords = 0;
        let totalLength = 0;

        let cursor;
        if (bookNum) {
            const index = store.index('by_book');
            cursor = await index.openCursor(IDBKeyRange.only(bookNum));
        } else {
            cursor = await store.openCursor();
        }

        while (cursor) {
            const word = cursor.value;
            const length = word.word_length_chars || 0;

            lengthCounts[length] = (lengthCounts[length] || 0) + 1;
            totalWords++;
            totalLength += length;

            cursor = await cursor.continue();
        }

        // Calculate statistics
        const distribution = {};
        Object.entries(lengthCounts).forEach(([length, count]) => {
            distribution[length] = {
                count,
                percentage: totalWords > 0 ? (count / totalWords * 100) : 0
            };
        });

        const average = totalWords > 0 ? totalLength / totalWords : 0;

        // Find mode (most common length)
        const mode = Object.entries(lengthCounts)
            .sort(([, a], [, b]) => b - a)[0];

        return {
            distribution,
            totalWords,
            averageLength: average,
            modeLength: mode ? parseInt(mode[0]) : 0,
            modeCount: mode ? mode[1] : 0,
            scope
        };
    }

    /**
     * Analyze character patterns
     * @param {Object} scope - Analysis scope
     * @returns {Promise<Object>} Pattern statistics
     */
    async analyzePatterns(scope = {}) {
        await this.init();

        const { bookNum } = scope;

        const patterns = {
            totalChars: 0,
            charsWithNiqqud: 0,
            charsWithTaamim: 0,
            finalLetters: 0,
            regularLetters: 0
        };

        const tx = this.db.transaction(['chars'], 'readonly');
        const store = tx.objectStore('chars');

        let cursor;
        if (bookNum) {
            const index = store.index('by_book');
            cursor = await index.openCursor(IDBKeyRange.only(bookNum));
        } else {
            cursor = await store.openCursor();
        }

        while (cursor) {
            const char = cursor.value;

            patterns.totalChars++;

            if (char.has_niqqud) patterns.charsWithNiqqud++;
            if (char.has_taamim) patterns.charsWithTaamim++;
            if (char.final_form) {
                patterns.finalLetters++;
            } else {
                patterns.regularLetters++;
            }

            cursor = await cursor.continue();
        }

        // Calculate percentages
        const total = patterns.totalChars;
        return {
            ...patterns,
            percentages: {
                withNiqqud: total > 0 ? (patterns.charsWithNiqqud / total * 100) : 0,
                withTaamim: total > 0 ? (patterns.charsWithTaamim / total * 100) : 0,
                finalLetters: total > 0 ? (patterns.finalLetters / total * 100) : 0
            },
            scope
        };
    }

    /**
     * Compare letter frequencies between books
     * @param {Array<number>} bookNums - Book numbers to compare
     * @returns {Promise<Object>} Comparison data
     */
    async compareBooks(bookNums) {
        const comparisons = {};

        for (const bookNum of bookNums) {
            const freq = await this.analyzeLetterFrequency({ bookNum });
            comparisons[this.getBookName(bookNum)] = freq;
        }

        return {
            comparisons,
            books: bookNums.map(num => this.getBookName(num))
        };
    }

    /**
     * Analyze verse statistics
     * @param {Object} scope - Analysis scope
     * @returns {Promise<Object>} Verse statistics
     */
    async analyzeVerses(scope = {}) {
        await this.init();

        const { bookNum } = scope;

        const tx = this.db.transaction(['verses'], 'readonly');
        const store = tx.objectStore('verses');

        const stats = {
            totalVerses: 0,
            totalChars: 0,
            totalWords: 0,
            avgCharsPerVerse: 0,
            avgWordsPerVerse: 0,
            longestVerse: null,
            shortestVerse: null
        };

        let longest = { chars: 0 };
        let shortest = { chars: Infinity };

        let cursor;
        if (bookNum) {
            const index = store.index('by_book');
            cursor = await index.openCursor(IDBKeyRange.only(bookNum));
        } else {
            cursor = await store.openCursor();
        }

        while (cursor) {
            const verse = cursor.value;

            stats.totalVerses++;
            stats.totalChars += verse.char_count || 0;
            stats.totalWords += verse.word_count || 0;

            // Track longest and shortest
            if (verse.char_count > longest.chars) {
                longest = {
                    chars: verse.char_count,
                    book: verse.book,
                    chapter: verse.chapter,
                    verse: verse.verse,
                    text: verse.verse_text_consonantal
                };
            }

            if (verse.char_count < shortest.chars) {
                shortest = {
                    chars: verse.char_count,
                    book: verse.book,
                    chapter: verse.chapter,
                    verse: verse.verse,
                    text: verse.verse_text_consonantal
                };
            }

            cursor = await cursor.continue();
        }

        stats.avgCharsPerVerse = stats.totalVerses > 0
            ? stats.totalChars / stats.totalVerses
            : 0;

        stats.avgWordsPerVerse = stats.totalVerses > 0
            ? stats.totalWords / stats.totalVerses
            : 0;

        stats.longestVerse = longest.chars > 0 ? longest : null;
        stats.shortestVerse = shortest.chars < Infinity ? shortest : null;

        return { ...stats, scope };
    }

    /**
     * Get final form of a letter
     * @param {string} letter - Base letter
     * @returns {string} Final form
     */
    getFinalForm(letter) {
        const finals = {
            'כ': 'ך',
            'מ': 'ם',
            'נ': 'ן',
            'פ': 'ף',
            'צ': 'ץ'
        };
        return finals[letter] || letter;
    }

    /**
     * Get book name by number
     * @param {number} bookNum - Book number (1-39)
     * @returns {string} Book name
     */
    getBookName(bookNum) {
        const books = [
            'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
            'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
            '1 Kings', '2 Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
            'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah',
            'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
            'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
            'Song of Songs', 'Ecclesiastes', 'Lamentations', 'Esther', 'Daniel',
            'Ezra', 'Nehemiah', '1 Chronicles', '2 Chronicles'
        ];
        return books[bookNum - 1] || `Book ${bookNum}`;
    }

    /**
     * Get book number by name
     * @param {string} bookName - Book name
     * @returns {number} Book number (1-39)
     */
    getBookNumber(bookName) {
        const books = {
            'genesis': 1, 'exodus': 2, 'leviticus': 3, 'numbers': 4, 'deuteronomy': 5,
            'joshua': 6, 'judges': 7, 'ruth': 8, '1samuel': 9, '2samuel': 10,
            '1kings': 11, '2kings': 12, 'isaiah': 13, 'jeremiah': 14, 'ezekiel': 15,
            'hosea': 16, 'joel': 17, 'amos': 18, 'obadiah': 19, 'jonah': 20,
            'micah': 21, 'nahum': 22, 'habakkuk': 23, 'zephaniah': 24, 'haggai': 25,
            'zechariah': 26, 'malachi': 27, 'psalms': 28, 'proverbs': 29, 'job': 30,
            'song': 31, 'ecclesiastes': 32, 'lamentations': 33, 'esther': 34, 'daniel': 35,
            'ezra': 36, 'nehemiah': 37, '1chronicles': 38, '2chronicles': 39
        };
        return books[bookName.toLowerCase().replace(/\s+/g, '')] || 1;
    }
}

// Create singleton instance
export const letterAnalysisEngine = new LetterAnalysisEngine();
