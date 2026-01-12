/**
 * Acronym/Notarikon Engine for Hebrew Bible
 *
 * Notarikon (נוטריקון) is a traditional Jewish hermeneutical technique
 * that creates acronyms by extracting first or last letters of words.
 *
 * This engine provides:
 * - First letter acronym extraction (Roshei Teivot - ראשי תיבות)
 * - Last letter acronym extraction (Sofei Teivot - סופי תיבות)
 * - Middle letter extraction
 * - Pattern matching and search
 * - Reverse lookup (find verses that form specific acronyms)
 *
 * Uses IndexedDB character-level database for precise letter extraction.
 */

import { openDB } from '../db/schema.js';
import { getWordsByVerseId, getCharsByWordId } from '../db/query.js';

/**
 * Acronym extraction methods
 */
export const AcronymMethod = {
    FIRST_LETTERS: 'first',      // Roshei Teivot (ראשי תיבות)
    LAST_LETTERS: 'last',         // Sofei Teivot (סופי תיבות)
    MIDDLE_LETTERS: 'middle',     // Middle letters of each word
    ALTERNATING: 'alternating'    // First, last, first, last...
};

/**
 * Extract acronym from verse
 * @param {number} verseId - Verse ID
 * @param {string} method - Extraction method
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} - Acronym data
 */
export async function extractAcronym(verseId, method = AcronymMethod.FIRST_LETTERS, options = {}) {
    const {
        skipShortWords = false,      // Skip words with 1-2 letters
        minWordLength = 1,           // Minimum word length to include
        includePositions = true      // Include character positions
    } = options;

    const db = await openDB();

    // Get verse information
    const tx = db.transaction(['verses', 'words', 'chars'], 'readonly');
    const verseStore = tx.objectStore('verses');
    const verse = await verseStore.get(verseId);

    if (!verse) {
        throw new Error(`Verse ${verseId} not found`);
    }

    // Get words for this verse
    const words = await getWordsByVerseId(verseId);

    const letters = [];
    const positions = [];
    const wordIndices = [];

    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        // Apply word length filter
        if (skipShortWords && word.word_length_chars <= 2) {
            continue;
        }
        if (word.word_length_chars < minWordLength) {
            continue;
        }

        let letterToExtract;
        let charPosition;

        switch (method) {
            case AcronymMethod.FIRST_LETTERS:
                letterToExtract = word.word_text_consonantal[0];
                charPosition = word.first_char_id;
                break;

            case AcronymMethod.LAST_LETTERS:
                letterToExtract = word.word_text_consonantal[word.word_text_consonantal.length - 1];
                charPosition = word.last_char_id;
                break;

            case AcronymMethod.MIDDLE_LETTERS:
                const middleIndex = Math.floor(word.word_text_consonantal.length / 2);
                letterToExtract = word.word_text_consonantal[middleIndex];
                // For middle letter, we need to calculate the char_id
                charPosition = word.first_char_id + middleIndex;
                break;

            case AcronymMethod.ALTERNATING:
                if (i % 2 === 0) {
                    letterToExtract = word.word_text_consonantal[0];
                    charPosition = word.first_char_id;
                } else {
                    letterToExtract = word.word_text_consonantal[word.word_text_consonantal.length - 1];
                    charPosition = word.last_char_id;
                }
                break;

            default:
                throw new Error(`Unknown acronym method: ${method}`);
        }

        letters.push(letterToExtract);
        if (includePositions) {
            positions.push(charPosition);
        }
        wordIndices.push(i);
    }

    await tx.done;

    return {
        verseId: verse.verse_id,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        verseText: verse.verse_text_consonantal,
        method: method,
        acronym: letters.join(''),
        letters: letters,
        positions: includePositions ? positions : null,
        wordIndices: wordIndices,
        letterCount: letters.length
    };
}

/**
 * Extract acronyms from a range of verses
 * @param {string} book - Book name
 * @param {number} startChapter - Start chapter
 * @param {number} startVerse - Start verse
 * @param {number} endChapter - End chapter
 * @param {number} endVerse - End verse
 * @param {string} method - Extraction method
 * @param {Object} options - Extraction options
 * @returns {Promise<Array>} - Array of acronym objects
 */
export async function extractAcronymsFromRange(
    book,
    startChapter,
    startVerse,
    endChapter,
    endVerse,
    method = AcronymMethod.FIRST_LETTERS,
    options = {}
) {
    const db = await openDB();
    const results = [];

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');
    const index = store.index('by_book');

    let cursor = await index.openCursor(book);

    while (cursor) {
        const verse = cursor.value;

        // Check if verse is in range
        const inRange =
            (verse.chapter > startChapter || (verse.chapter === startChapter && verse.verse >= startVerse)) &&
            (verse.chapter < endChapter || (verse.chapter === endChapter && verse.verse <= endVerse));

        if (inRange) {
            const acronym = await extractAcronym(verse.verse_id, method, options);
            results.push(acronym);
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Search for verses that form a specific acronym
 * @param {string} targetAcronym - Target acronym to find
 * @param {string} method - Extraction method
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching verses
 */
export async function searchByAcronym(targetAcronym, method = AcronymMethod.FIRST_LETTERS, options = {}) {
    const {
        book = null,
        limit = 100,
        exactMatch = true,
        allowPartial = false
    } = options;

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

        try {
            const acronym = await extractAcronym(verse.verse_id, method, {
                ...options,
                includePositions: false
            });

            let matches = false;

            if (exactMatch) {
                matches = acronym.acronym === targetAcronym;
            } else if (allowPartial) {
                matches = acronym.acronym.includes(targetAcronym);
            } else {
                matches = acronym.acronym.startsWith(targetAcronym);
            }

            if (matches) {
                results.push(acronym);
            }
        } catch (e) {
            // Skip verses that can't be processed
            console.warn(`Error processing verse ${verse.verse_id}:`, e);
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return results;
}

/**
 * Find all unique acronyms in a book
 * @param {string} book - Book name
 * @param {string} method - Extraction method
 * @param {number} minLength - Minimum acronym length
 * @returns {Promise<Object>} - Map of acronyms to verse references
 */
export async function findUniqueAcronyms(book, method = AcronymMethod.FIRST_LETTERS, minLength = 2) {
    const db = await openDB();
    const acronymMap = {};

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');
    const index = store.index('by_book');

    let cursor = await index.openCursor(book);

    while (cursor) {
        const verse = cursor.value;

        try {
            const acronym = await extractAcronym(verse.verse_id, method, {
                includePositions: false
            });

            if (acronym.acronym.length >= minLength) {
                if (!acronymMap[acronym.acronym]) {
                    acronymMap[acronym.acronym] = [];
                }
                acronymMap[acronym.acronym].push({
                    chapter: verse.chapter,
                    verse: verse.verse,
                    verseId: verse.verse_id
                });
            }
        } catch (e) {
            console.warn(`Error processing verse ${verse.verse_id}:`, e);
        }

        cursor = await cursor.continue();
    }

    await tx.done;
    return acronymMap;
}

/**
 * Extract cross-verse acronym (acronym spanning multiple verses)
 * @param {Array<number>} verseIds - Array of verse IDs
 * @param {string} method - Extraction method
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} - Combined acronym data
 */
export async function extractCrossVerseAcronym(verseIds, method = AcronymMethod.FIRST_LETTERS, options = {}) {
    const allLetters = [];
    const allPositions = [];
    const verseData = [];

    for (const verseId of verseIds) {
        const acronym = await extractAcronym(verseId, method, options);

        allLetters.push(...acronym.letters);
        if (acronym.positions) {
            allPositions.push(...acronym.positions);
        }

        verseData.push({
            verseId: acronym.verseId,
            book: acronym.book,
            chapter: acronym.chapter,
            verse: acronym.verse,
            contribution: acronym.acronym
        });
    }

    return {
        method: method,
        acronym: allLetters.join(''),
        letters: allLetters,
        positions: allPositions.length > 0 ? allPositions : null,
        letterCount: allLetters.length,
        verses: verseData,
        verseCount: verseIds.length
    };
}

/**
 * Analyze acronym patterns in a book
 * @param {string} book - Book name
 * @param {string} method - Extraction method
 * @returns {Promise<Object>} - Pattern analysis
 */
export async function analyzeAcronymPatterns(book, method = AcronymMethod.FIRST_LETTERS) {
    const acronymMap = await findUniqueAcronyms(book, method, 1);

    // Calculate statistics
    const acronyms = Object.keys(acronymMap);
    const totalAcronyms = acronyms.length;
    const lengthDistribution = {};
    const letterFrequency = {};
    const duplicates = [];

    for (const acronym of acronyms) {
        const length = acronym.length;
        if (!lengthDistribution[length]) {
            lengthDistribution[length] = 0;
        }
        lengthDistribution[length]++;

        // Count letter frequency
        for (const letter of acronym) {
            if (!letterFrequency[letter]) {
                letterFrequency[letter] = 0;
            }
            letterFrequency[letter]++;
        }

        // Find duplicates (same acronym in multiple verses)
        if (acronymMap[acronym].length > 1) {
            duplicates.push({
                acronym: acronym,
                count: acronymMap[acronym].length,
                verses: acronymMap[acronym]
            });
        }
    }

    // Sort duplicates by frequency
    duplicates.sort((a, b) => b.count - a.count);

    // Sort letter frequency
    const sortedLetters = Object.entries(letterFrequency)
        .sort(([, a], [, b]) => b - a)
        .map(([letter, count]) => ({ letter, count }));

    return {
        book: book,
        method: method,
        totalUniqueAcronyms: totalAcronyms,
        lengthDistribution: lengthDistribution,
        letterFrequency: sortedLetters,
        duplicates: duplicates,
        mostCommonAcronyms: duplicates.slice(0, 10)
    };
}

/**
 * Check if text forms a valid Hebrew word/root
 * @param {string} text - Hebrew text to check
 * @returns {boolean} - Whether text is a valid word/root
 */
export function isValidHebrewWord(text) {
    // Simple validation: check if all characters are Hebrew letters
    const hebrewLetterRegex = /^[\u0590-\u05FF]+$/;
    return hebrewLetterRegex.test(text);
}

/**
 * Find meaningful acronyms (those that form actual Hebrew words)
 * @param {string} book - Book name
 * @param {string} method - Extraction method
 * @param {Array<string>} dictionary - Array of valid Hebrew words
 * @returns {Promise<Array>} - Array of meaningful acronyms
 */
export async function findMeaningfulAcronyms(book, method = AcronymMethod.FIRST_LETTERS, dictionary = []) {
    const acronymMap = await findUniqueAcronyms(book, method, 2);
    const meaningful = [];

    for (const [acronym, verses] of Object.entries(acronymMap)) {
        if (dictionary.length > 0) {
            // Check against provided dictionary
            if (dictionary.includes(acronym)) {
                meaningful.push({
                    acronym: acronym,
                    verses: verses,
                    meaningType: 'dictionary'
                });
            }
        } else {
            // Simple heuristic: check if it forms a known Hebrew pattern
            // This is a placeholder - would need actual Hebrew dictionary integration
            if (isValidHebrewWord(acronym) && acronym.length >= 3) {
                meaningful.push({
                    acronym: acronym,
                    verses: verses,
                    meaningType: 'pattern'
                });
            }
        }
    }

    return meaningful;
}

export default {
    AcronymMethod,
    extractAcronym,
    extractAcronymsFromRange,
    searchByAcronym,
    findUniqueAcronyms,
    extractCrossVerseAcronym,
    analyzeAcronymPatterns,
    findMeaningfulAcronyms,
    isValidHebrewWord
};
