/**
 * Gematria Calculator Engine for Hebrew Bible
 *
 * Provides comprehensive gematria calculation and search capabilities:
 * - Standard gematria (א=1, ב=2, ..., ת=400)
 * - Reduced gematria (sum of digits)
 * - Ordinal gematria (א=1, ב=2, ..., ת=22)
 * - Search by gematria value
 * - Comparative analysis
 *
 * Uses IndexedDB character-level database for calculations.
 */

import { openDB } from '../db/schema.js';
import { getWordsByGematria, getVersesByGematria } from '../db/query.js';

/**
 * Hebrew letter to standard gematria value mapping
 */
const GEMATRIA_STANDARD = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400
};

/**
 * Hebrew letter to ordinal gematria value mapping
 */
const GEMATRIA_ORDINAL = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 11, 'ך': 11, 'ל': 12, 'מ': 13, 'ם': 13, 'נ': 14, 'ן': 14,
    'ס': 15, 'ע': 16, 'פ': 17, 'ף': 17, 'צ': 18, 'ץ': 18, 'ק': 19, 'ר': 20,
    'ש': 21, 'ת': 22
};

/**
 * Gematria calculation methods
 */
export const GematriaMethod = {
    STANDARD: 'standard',
    REDUCED: 'reduced',
    ORDINAL: 'ordinal'
};

/**
 * Calculate gematria value of Hebrew text
 * @param {string} text - Hebrew text (consonantal)
 * @param {string} method - Calculation method (standard, reduced, ordinal)
 * @returns {number} - Gematria value
 */
export function calculateGematria(text, method = GematriaMethod.STANDARD) {
    if (!text || text.length === 0) {
        return 0;
    }

    let value = 0;
    const mapping = method === GematriaMethod.ORDINAL ? GEMATRIA_ORDINAL : GEMATRIA_STANDARD;

    for (const char of text) {
        if (mapping[char]) {
            value += mapping[char];
        }
    }

    if (method === GematriaMethod.REDUCED) {
        value = reduceToSingleDigit(value);
    }

    return value;
}

/**
 * Reduce a number to a single digit by summing its digits
 * @param {number} num - Number to reduce
 * @returns {number} - Reduced value
 */
function reduceToSingleDigit(num) {
    while (num > 9) {
        num = String(num).split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return num;
}

/**
 * Calculate gematria for each letter in text
 * @param {string} text - Hebrew text
 * @param {string} method - Calculation method
 * @returns {Array<{char: string, value: number}>} - Array of letter values
 */
export function calculateLetterValues(text, method = GematriaMethod.STANDARD) {
    const mapping = method === GematriaMethod.ORDINAL ? GEMATRIA_ORDINAL : GEMATRIA_STANDARD;
    const result = [];

    for (const char of text) {
        if (mapping[char]) {
            let value = mapping[char];
            if (method === GematriaMethod.REDUCED) {
                value = reduceToSingleDigit(value);
            }
            result.push({ char, value });
        }
    }

    return result;
}

/**
 * Search for words with specific gematria value
 * @param {number} value - Target gematria value
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching words
 */
export async function searchWordsByGematria(value, options = {}) {
    const {
        method = GematriaMethod.STANDARD,
        limit = 100,
        book = null
    } = options;

    const fieldMap = {
        [GematriaMethod.STANDARD]: 'gematria_standard',
        [GematriaMethod.REDUCED]: 'gematria_reduced',
        [GematriaMethod.ORDINAL]: 'gematria_ordinal'
    };

    const field = fieldMap[method];
    if (!field) {
        throw new Error(`Unknown gematria method: ${method}`);
    }

    const db = await openDB();
    const results = [];

    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const index = store.index(`by_${field}`);

    const range = IDBKeyRange.only(value);
    let cursor = await index.openCursor(range);

    while (cursor && results.length < limit) {
        const word = cursor.value;

        // Apply book filter if specified
        if (book === null || word.book === book) {
            results.push({
                wordId: word.word_id,
                book: word.book,
                chapter: word.chapter,
                verse: word.verse,
                wordIndex: word.word_index,
                text: word.word_text_consonantal,
                textFull: word.word_text_full,
                gematriaValue: word[field]
            });
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Search for verses with specific gematria value
 * @param {number} value - Target gematria value
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching verses
 */
export async function searchVersesByGematria(value, options = {}) {
    const {
        method = GematriaMethod.STANDARD,
        limit = 100,
        book = null
    } = options;

    const fieldMap = {
        [GematriaMethod.STANDARD]: 'gematria_standard',
        [GematriaMethod.REDUCED]: 'gematria_reduced',
        [GematriaMethod.ORDINAL]: 'gematria_ordinal'
    };

    const field = fieldMap[method];
    if (!field) {
        throw new Error(`Unknown gematria method: ${method}`);
    }

    const db = await openDB();
    const results = [];

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');
    const index = store.index(`by_${field}`);

    const range = IDBKeyRange.only(value);
    let cursor = await index.openCursor(range);

    while (cursor && results.length < limit) {
        const verse = cursor.value;

        // Apply book filter if specified
        if (book === null || verse.book === book) {
            results.push({
                verseId: verse.verse_id,
                book: verse.book,
                chapter: verse.chapter,
                verse: verse.verse,
                text: verse.verse_text_consonantal,
                textFull: verse.verse_text_full,
                gematriaValue: verse[field],
                wordCount: verse.word_count,
                charCount: verse.char_count
            });
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Search for words/verses within a gematria range
 * @param {number} minValue - Minimum gematria value
 * @param {number} maxValue - Maximum gematria value
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching items
 */
export async function searchGematriaRange(minValue, maxValue, options = {}) {
    const {
        method = GematriaMethod.STANDARD,
        level = 'word', // 'word' or 'verse'
        limit = 100,
        book = null
    } = options;

    const fieldMap = {
        [GematriaMethod.STANDARD]: 'gematria_standard',
        [GematriaMethod.REDUCED]: 'gematria_reduced',
        [GematriaMethod.ORDINAL]: 'gematria_ordinal'
    };

    const field = fieldMap[method];
    if (!field) {
        throw new Error(`Unknown gematria method: ${method}`);
    }

    const db = await openDB();
    const results = [];

    const storeName = level === 'verse' ? 'verses' : 'words';
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(`by_${field}`);

    const range = IDBKeyRange.bound(minValue, maxValue);
    let cursor = await index.openCursor(range);

    while (cursor && results.length < limit) {
        const item = cursor.value;

        // Apply book filter if specified
        if (book === null || item.book === book) {
            if (level === 'verse') {
                results.push({
                    verseId: item.verse_id,
                    book: item.book,
                    chapter: item.chapter,
                    verse: item.verse,
                    text: item.verse_text_consonantal,
                    gematriaValue: item[field]
                });
            } else {
                results.push({
                    wordId: item.word_id,
                    book: item.book,
                    chapter: item.chapter,
                    verse: item.verse,
                    text: item.word_text_consonantal,
                    gematriaValue: item[field]
                });
            }
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Find words with the same gematria value as given text
 * @param {string} text - Hebrew text
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of words with matching gematria
 */
export async function findMatchingGematria(text, options = {}) {
    const { method = GematriaMethod.STANDARD, limit = 100 } = options;

    const value = calculateGematria(text, method);
    const results = await searchWordsByGematria(value, { ...options, method, limit });

    // Filter out the original text
    return results.filter(r => r.text !== text);
}

/**
 * Calculate gematria statistics for a range of verses
 * @param {string} book - Book name
 * @param {number} startChapter - Starting chapter
 * @param {number} endChapter - Ending chapter
 * @param {string} method - Calculation method
 * @returns {Promise<Object>} - Statistical analysis
 */
export async function analyzeGematriaStatistics(book, startChapter, endChapter, method = GematriaMethod.STANDARD) {
    const db = await openDB();

    const fieldMap = {
        [GematriaMethod.STANDARD]: 'gematria_standard',
        [GematriaMethod.REDUCED]: 'gematria_reduced',
        [GematriaMethod.ORDINAL]: 'gematria_ordinal'
    };

    const field = fieldMap[method];
    if (!field) {
        throw new Error(`Unknown gematria method: ${method}`);
    }

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');
    const index = store.index('by_book');

    const values = [];
    let cursor = await index.openCursor(book);

    while (cursor) {
        const verse = cursor.value;
        if (verse.chapter >= startChapter && verse.chapter <= endChapter) {
            values.push(verse[field]);
        }
        cursor = await cursor.continue();
    }

    await tx.done;

    // Calculate statistics
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sortedValues = values.sort((a, b) => a - b);
    const median = sortedValues[Math.floor(values.length / 2)];
    const min = sortedValues[0];
    const max = sortedValues[values.length - 1];

    // Calculate standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
        count: values.length,
        sum,
        mean: Math.round(mean * 100) / 100,
        median,
        min,
        max,
        stdDev: Math.round(stdDev * 100) / 100,
        values: sortedValues
    };
}

/**
 * Get gematria distribution (histogram) for a book
 * @param {string} book - Book name
 * @param {string} method - Calculation method
 * @param {number} bucketSize - Size of histogram buckets
 * @returns {Promise<Object>} - Histogram data
 */
export async function getGematriaDistribution(book, method = GematriaMethod.STANDARD, bucketSize = 100) {
    const db = await openDB();

    const fieldMap = {
        [GematriaMethod.STANDARD]: 'gematria_standard',
        [GematriaMethod.REDUCED]: 'gematria_reduced',
        [GematriaMethod.ORDINAL]: 'gematria_ordinal'
    };

    const field = fieldMap[method];
    const histogram = {};

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');
    const index = store.index('by_book');

    let cursor = await index.openCursor(book);

    while (cursor) {
        const verse = cursor.value;
        const value = verse[field];
        const bucket = Math.floor(value / bucketSize) * bucketSize;

        if (!histogram[bucket]) {
            histogram[bucket] = 0;
        }
        histogram[bucket]++;

        cursor = await cursor.continue();
    }

    await tx.done;

    return histogram;
}

/**
 * Compare gematria values of two texts
 * @param {string} text1 - First Hebrew text
 * @param {string} text2 - Second Hebrew text
 * @returns {Object} - Comparison results
 */
export function compareGematria(text1, text2) {
    const methods = [GematriaMethod.STANDARD, GematriaMethod.REDUCED, GematriaMethod.ORDINAL];
    const results = {};

    for (const method of methods) {
        const value1 = calculateGematria(text1, method);
        const value2 = calculateGematria(text2, method);

        results[method] = {
            text1: { text: text1, value: value1 },
            text2: { text: text2, value: value2 },
            equal: value1 === value2,
            difference: Math.abs(value1 - value2)
        };
    }

    return results;
}

export default {
    GematriaMethod,
    calculateGematria,
    calculateLetterValues,
    searchWordsByGematria,
    searchVersesByGematria,
    searchGematriaRange,
    findMatchingGematria,
    analyzeGematriaStatistics,
    getGematriaDistribution,
    compareGematria
};
