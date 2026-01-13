/**
 * Matrix View Engine
 *
 * Creates rectangular character grids for ELS visualization and pattern detection.
 * Supports:
 * - Custom starting position (s)
 * - Characters per row (n)
 * - Number of rows (r)
 * - Highlighting specific sequences
 * - ELS pattern overlay
 */

import { openDB } from '../db/schema.js';
import { getCharacterRange } from '../db/query.js';

/**
 * Matrix configuration
 * @typedef {Object} MatrixConfig
 * @property {number} start - Starting character position (0-based global index)
 * @property {number} width - Characters per row (n)
 * @property {number} height - Number of rows (r)
 * @property {string} [book] - Optional: restrict to specific book
 * @property {boolean} [consonantalOnly] - Show only consonants (no niqqud/taamim)
 * @property {Array<Highlight>} [highlights] - Sequences to highlight
 */

/**
 * Highlight configuration
 * @typedef {Object} Highlight
 * @property {Array<number>} positions - Global character positions to highlight
 * @property {string} color - CSS color value
 * @property {string} [label] - Optional label for this highlight
 */

/**
 * Matrix cell
 * @typedef {Object} MatrixCell
 * @property {number} globalPos - Global character position
 * @property {string} char - Character to display
 * @property {Object} metadata - Book/chapter/verse reference
 * @property {Array<Highlight>} highlights - Applied highlights
 * @property {number} row - Row index (0-based)
 * @property {number} col - Column index (0-based)
 */

export class MatrixEngine {
    constructor() {
        this.db = null;
    }

    async init() {
        this.db = await openDB();
    }

    /**
     * Generate a character matrix
     * @param {MatrixConfig} config - Matrix configuration
     * @returns {Promise<Object>} Matrix data and metadata
     */
    async generateMatrix(config) {
        if (!this.db) await this.init();

        const { start, width, height, book, consonantalOnly = true, highlights = [] } = config;
        const totalChars = width * height;

        // Fetch characters from database
        const chars = await this.fetchCharacters(start, totalChars, book);

        // Build matrix grid
        const matrix = this.buildGrid(chars, width, height, consonantalOnly);

        // Apply highlights
        if (highlights.length > 0) {
            this.applyHighlights(matrix, highlights, start);
        }

        // Calculate metadata
        const metadata = this.calculateMetadata(chars, width, height);

        return {
            matrix,
            metadata,
            config
        };
    }

    /**
     * Fetch characters from database
     * @param {number} start - Starting position
     * @param {number} count - Number of characters
     * @param {string} [book] - Optional book filter
     * @returns {Promise<Array>} Character data
     */
    async fetchCharacters(start, count, book = null) {
        const end = start + count - 1;

        if (book) {
            // Fetch from specific book
            const tx = this.db.transaction(['chars'], 'readonly');
            const store = tx.objectStore('chars');
            const index = store.index('by_book');

            const chars = [];
            const range = IDBKeyRange.only(this.getBookNumber(book));

            let cursor = await index.openCursor(range);
            let skipCount = 0;

            while (cursor && chars.length < count) {
                if (skipCount >= start) {
                    chars.push(cursor.value);
                }
                skipCount++;
                cursor = await cursor.continue();
            }

            return chars;
        } else {
            // Fetch by global position
            return await getCharacterRange(start, end);
        }
    }

    /**
     * Build the matrix grid
     * @param {Array} chars - Character data
     * @param {number} width - Characters per row
     * @param {number} height - Number of rows
     * @param {boolean} consonantalOnly - Strip diacritics
     * @returns {Array<Array<MatrixCell>>} 2D matrix grid
     */
    buildGrid(chars, width, height, consonantalOnly) {
        const matrix = [];
        let charIndex = 0;

        for (let row = 0; row < height; row++) {
            const rowCells = [];

            for (let col = 0; col < width; col++) {
                if (charIndex < chars.length) {
                    const charData = chars[charIndex];

                    rowCells.push({
                        globalPos: charData.id,
                        char: consonantalOnly ? charData.base_char : this.getFullChar(charData),
                        metadata: {
                            book: charData.book,
                            chapter: charData.chapter,
                            verse: charData.verse,
                            bookName: this.getBookName(charData.book),
                            verseCharIndex: charData.verse_char_index,
                            wordIndex: charData.word_index
                        },
                        highlights: [],
                        row,
                        col,
                        isFinal: charData.final_form || false
                    });

                    charIndex++;
                } else {
                    // Padding for incomplete rows
                    rowCells.push({
                        globalPos: -1,
                        char: '',
                        metadata: {},
                        highlights: [],
                        row,
                        col,
                        isFinal: false
                    });
                }
            }

            matrix.push(rowCells);
        }

        return matrix;
    }

    /**
     * Get full character with niqqud/taamim
     * @param {Object} charData - Character data from database
     * @returns {string} Full character
     */
    getFullChar(charData) {
        let char = charData.base_char;
        if (charData.niqqud) char += charData.niqqud;
        if (charData.taamim) char += charData.taamim;
        return char;
    }

    /**
     * Apply highlights to matrix cells
     * @param {Array<Array<MatrixCell>>} matrix - Matrix grid
     * @param {Array<Highlight>} highlights - Highlights to apply
     * @param {number} startPos - Matrix starting position
     */
    applyHighlights(matrix, highlights, startPos) {
        highlights.forEach(highlight => {
            highlight.positions.forEach(globalPos => {
                // Calculate position within matrix
                const relativePos = globalPos - startPos;
                if (relativePos < 0) return;

                const row = Math.floor(relativePos / matrix[0].length);
                const col = relativePos % matrix[0].length;

                if (row >= 0 && row < matrix.length && col >= 0 && col < matrix[0].length) {
                    matrix[row][col].highlights.push({
                        color: highlight.color,
                        label: highlight.label || ''
                    });
                }
            });
        });
    }

    /**
     * Calculate metadata about the matrix
     * @param {Array} chars - Character data
     * @param {number} width - Matrix width
     * @param {number} height - Matrix height
     * @returns {Object} Metadata
     */
    calculateMetadata(chars, width, height) {
        if (chars.length === 0) {
            return {
                startPos: 0,
                endPos: 0,
                totalChars: 0,
                width,
                height,
                books: [],
                verses: []
            };
        }

        const books = new Set();
        const verses = new Set();

        chars.forEach(char => {
            books.add(this.getBookName(char.book));
            verses.add(`${this.getBookName(char.book)} ${char.chapter}:${char.verse}`);
        });

        return {
            startPos: chars[0].id,
            endPos: chars[chars.length - 1].id,
            totalChars: chars.length,
            width,
            height,
            actualRows: Math.ceil(chars.length / width),
            books: Array.from(books),
            verses: Array.from(verses),
            spansSingleBook: books.size === 1
        };
    }

    /**
     * Find ELS patterns in matrix
     * @param {Array<Array<MatrixCell>>} matrix - Matrix grid
     * @param {string} term - Search term (consonantal)
     * @param {number} skip - Skip distance (can be negative)
     * @returns {Array<Object>} Found patterns
     */
    findELSInMatrix(matrix, term, skip) {
        const width = matrix[0].length;
        const height = matrix.length;
        const totalCells = width * height;

        // Flatten matrix to 1D array for easier searching
        const flatMatrix = matrix.flat();

        const results = [];

        // Search through all possible starting positions
        for (let startIdx = 0; startIdx < totalCells; startIdx++) {
            const positions = [];
            let found = true;

            for (let i = 0; i < term.length; i++) {
                const pos = startIdx + (i * skip);

                if (pos < 0 || pos >= totalCells) {
                    found = false;
                    break;
                }

                const cell = flatMatrix[pos];
                if (cell.char !== term[i]) {
                    found = false;
                    break;
                }

                positions.push({
                    globalPos: cell.globalPos,
                    row: cell.row,
                    col: cell.col,
                    char: cell.char
                });
            }

            if (found && positions.length === term.length) {
                results.push({
                    term,
                    skip,
                    startPos: positions[0].globalPos,
                    positions,
                    direction: this.getDirection(skip, width)
                });
            }
        }

        return results;
    }

    /**
     * Determine pattern direction based on skip and width
     * @param {number} skip - Skip distance
     * @param {number} width - Matrix width
     * @returns {string} Direction description
     */
    getDirection(skip, width) {
        if (skip === 1) return 'horizontal-right';
        if (skip === -1) return 'horizontal-left';
        if (skip === width) return 'vertical-down';
        if (skip === -width) return 'vertical-up';
        if (skip === width + 1) return 'diagonal-down-right';
        if (skip === width - 1) return 'diagonal-down-left';
        if (skip === -(width + 1)) return 'diagonal-up-left';
        if (skip === -(width - 1)) return 'diagonal-up-right';
        return `custom-${skip}`;
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

    /**
     * Convert verse reference to global character position
     * @param {string} book - Book name
     * @param {number} chapter - Chapter number
     * @param {number} verse - Verse number
     * @returns {Promise<number>} Starting character position
     */
    async verseToPosition(book, chapter, verse) {
        const bookNum = this.getBookNumber(book);

        const tx = this.db.transaction(['chars'], 'readonly');
        const store = tx.objectStore('chars');
        const index = store.index('by_verse');

        const key = [bookNum, chapter, verse];
        const cursor = await index.openCursor(IDBKeyRange.only(key));

        if (cursor) {
            return cursor.value.id;
        }

        return 0;
    }
}

// Create singleton instance
export const matrixEngine = new MatrixEngine();
