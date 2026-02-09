/**
 * Gematria Calculator Engine for Hebrew Bible
 *
 * Pure calculation functions + IndexedDB search.
 * DB schema indices: words.gematria (standard), words.gematriaReduced (reduced)
 *                    verses.gematria (standard)
 */

const GEMATRIA_STANDARD = {
    '\u05D0': 1, '\u05D1': 2, '\u05D2': 3, '\u05D3': 4, '\u05D4': 5, '\u05D5': 6, '\u05D6': 7, '\u05D7': 8, '\u05D8': 9,
    '\u05D9': 10, '\u05DB': 20, '\u05DA': 20, '\u05DC': 30, '\u05DE': 40, '\u05DD': 40, '\u05E0': 50, '\u05DF': 50,
    '\u05E1': 60, '\u05E2': 70, '\u05E4': 80, '\u05E3': 80, '\u05E6': 90, '\u05E5': 90, '\u05E7': 100, '\u05E8': 200,
    '\u05E9': 300, '\u05EA': 400
};

const GEMATRIA_ORDINAL = {
    '\u05D0': 1, '\u05D1': 2, '\u05D2': 3, '\u05D3': 4, '\u05D4': 5, '\u05D5': 6, '\u05D6': 7, '\u05D7': 8, '\u05D8': 9,
    '\u05D9': 10, '\u05DB': 11, '\u05DA': 11, '\u05DC': 12, '\u05DE': 13, '\u05DD': 13, '\u05E0': 14, '\u05DF': 14,
    '\u05E1': 15, '\u05E2': 16, '\u05E4': 17, '\u05E3': 17, '\u05E6': 18, '\u05E5': 18, '\u05E7': 19, '\u05E8': 20,
    '\u05E9': 21, '\u05EA': 22
};

export const GematriaMethod = {
    STANDARD: 'standard',
    REDUCED: 'reduced',
    ORDINAL: 'ordinal'
};

function reduceToSingleDigit(num) {
    while (num > 9) {
        num = String(num).split('').reduce((sum, d) => sum + parseInt(d), 0);
    }
    return num;
}

/**
 * Calculate gematria value of Hebrew text
 */
export function calculateGematria(text, method = GematriaMethod.STANDARD) {
    if (!text) return 0;
    const mapping = method === GematriaMethod.ORDINAL ? GEMATRIA_ORDINAL : GEMATRIA_STANDARD;
    let value = 0;
    for (const ch of text) {
        if (mapping[ch]) value += mapping[ch];
    }
    if (method === GematriaMethod.REDUCED) value = reduceToSingleDigit(value);
    return value;
}

/**
 * Calculate gematria for each letter in text
 */
export function calculateLetterValues(text, method = GematriaMethod.STANDARD) {
    const mapping = method === GematriaMethod.ORDINAL ? GEMATRIA_ORDINAL : GEMATRIA_STANDARD;
    const result = [];
    for (const ch of text) {
        if (mapping[ch]) {
            let value = mapping[ch];
            if (method === GematriaMethod.REDUCED) value = reduceToSingleDigit(value);
            result.push({ char: ch, value });
        }
    }
    return result;
}

/**
 * Compare gematria values of two texts
 */
export function compareGematria(text1, text2) {
    const methods = [GematriaMethod.STANDARD, GematriaMethod.REDUCED, GematriaMethod.ORDINAL];
    const results = {};
    for (const method of methods) {
        const v1 = calculateGematria(text1, method);
        const v2 = calculateGematria(text2, method);
        results[method] = {
            text1: { text: text1, value: v1 },
            text2: { text: text2, value: v2 },
            equal: v1 === v2,
            difference: Math.abs(v1 - v2)
        };
    }
    return results;
}

// ============= IndexedDB helpers =============

const DB_NAME = 'BibleAnalysisDB';
const DB_VERSION = 1;

function getDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(new Error('Cannot open database'));
        req.onsuccess = () => {
            const db = req.result;
            // Verify the stores we need exist
            if (!db.objectStoreNames.contains('words') || !db.objectStoreNames.contains('verses')) {
                db.close();
                reject(new Error('Database exists but word/verse stores are missing. Load data via the Database page first.'));
                return;
            }
            resolve(db);
        };
        req.onupgradeneeded = () => {
            // Don't create stores here — that's schema.js's job.
            // If we got here, the DB hasn't been initialized yet.
        };
    });
}

/**
 * Check if DB has data
 */
async function ensureData(db, storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const countReq = store.count();
        countReq.onsuccess = () => {
            if (countReq.result === 0) {
                reject(new Error(`No ${storeName} data loaded. Go to the Database page (test-db.html) and load at least one book first.`));
            } else {
                resolve(countReq.result);
            }
        };
        countReq.onerror = () => reject(new Error(`Failed to count ${storeName}`));
    });
}

/**
 * Cursor-scan an index for an exact key, collecting up to `limit` results.
 * Uses raw IndexedDB event API (not idb library).
 */
function cursorScanExact(store, indexName, key, limit, transform, bookFilter) {
    return new Promise((resolve, reject) => {
        let index;
        try {
            index = store.index(indexName);
        } catch (e) {
            reject(new Error(`Index "${indexName}" not found in store. The database schema may need updating.`));
            return;
        }
        const range = IDBKeyRange.only(key);
        const results = [];
        const req = index.openCursor(range);
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor || results.length >= limit) { resolve(results); return; }
            const item = cursor.value;
            if (bookFilter === null || item.book === bookFilter) {
                results.push(transform(item));
            }
            cursor.continue();
        };
        req.onerror = () => reject(new Error('Cursor scan failed: ' + req.error));
    });
}

/**
 * Cursor-scan an index for a key range.
 */
function cursorScanRange(store, indexName, minKey, maxKey, limit, transform, bookFilter) {
    return new Promise((resolve, reject) => {
        let index;
        try {
            index = store.index(indexName);
        } catch (e) {
            reject(new Error(`Index "${indexName}" not found in store.`));
            return;
        }
        const range = IDBKeyRange.bound(minKey, maxKey);
        const results = [];
        const req = index.openCursor(range);
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor || results.length >= limit) { resolve(results); return; }
            const item = cursor.value;
            if (bookFilter === null || item.book === bookFilter) {
                results.push(transform(item));
            }
            cursor.continue();
        };
        req.onerror = () => reject(new Error('Range scan failed: ' + req.error));
    });
}

/**
 * Full-scan a store (no index), filtering by a computed field.
 * Used when no matching index exists (ordinal, or verses reduced/ordinal).
 */
function fullScanFilter(store, fieldName, matchFn, limit, transform, bookFilter) {
    return new Promise((resolve, reject) => {
        const results = [];
        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor || results.length >= limit) { resolve(results); return; }
            const item = cursor.value;
            if ((bookFilter === null || item.book === bookFilter) && matchFn(item[fieldName])) {
                results.push(transform(item));
            }
            cursor.continue();
        };
        req.onerror = () => reject(new Error('Full scan failed: ' + req.error));
    });
}

// Map method -> { indexName (or null for full-scan), fieldName }
// Based on actual schema indices:
//   words: 'gematria' -> gematria_standard, 'gematriaReduced' -> gematria_reduced
//   verses: 'gematria' -> gematria_standard
const WORD_INDEX_MAP = {
    standard:  { indexName: 'gematria',        fieldName: 'gematria_standard' },
    reduced:   { indexName: 'gematriaReduced', fieldName: 'gematria_reduced' },
    ordinal:   { indexName: null,              fieldName: 'gematria_ordinal' }   // no index, full scan
};
const VERSE_INDEX_MAP = {
    standard:  { indexName: 'gematria',        fieldName: 'gematria_standard' },
    reduced:   { indexName: null,              fieldName: 'gematria_reduced' },  // no index
    ordinal:   { indexName: null,              fieldName: 'gematria_ordinal' }   // no index
};

function wordTransform(fieldName) {
    return (item) => ({
        wordId: item.word_id,
        book: item.book,
        chapter: item.chapter,
        verse: item.verse,
        wordIndex: item.word_index,
        text: item.word_text_consonantal,
        textFull: item.word_text_full,
        gematriaValue: item[fieldName]
    });
}

function verseTransform(fieldName) {
    return (item) => ({
        verseId: item.verse_id,
        book: item.book,
        chapter: item.chapter,
        verse: item.verse,
        text: item.verse_text_consonantal,
        textFull: item.verse_text_full,
        gematriaValue: item[fieldName],
        wordCount: item.word_count,
        charCount: item.char_count
    });
}

// ============= Public search functions =============

export async function searchWordsByGematria(value, options = {}) {
    const { method = GematriaMethod.STANDARD, limit = 100, book = null } = options;
    const db = await getDB();
    await ensureData(db, 'words');

    const mapping = WORD_INDEX_MAP[method];
    if (!mapping) throw new Error(`Unknown method: ${method}`);

    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');

    if (mapping.indexName) {
        return cursorScanExact(store, mapping.indexName, value, limit, wordTransform(mapping.fieldName), book);
    } else {
        return fullScanFilter(store, mapping.fieldName, v => v === value, limit, wordTransform(mapping.fieldName), book);
    }
}

export async function searchVersesByGematria(value, options = {}) {
    const { method = GematriaMethod.STANDARD, limit = 100, book = null } = options;
    const db = await getDB();
    await ensureData(db, 'verses');

    const mapping = VERSE_INDEX_MAP[method];
    if (!mapping) throw new Error(`Unknown method: ${method}`);

    const tx = db.transaction('verses', 'readonly');
    const store = tx.objectStore('verses');

    if (mapping.indexName) {
        return cursorScanExact(store, mapping.indexName, value, limit, verseTransform(mapping.fieldName), book);
    } else {
        return fullScanFilter(store, mapping.fieldName, v => v === value, limit, verseTransform(mapping.fieldName), book);
    }
}

export async function searchGematriaRange(minValue, maxValue, options = {}) {
    const { method = GematriaMethod.STANDARD, level = 'word', limit = 100, book = null } = options;
    const db = await getDB();

    const isVerse = level === 'verse';
    const storeName = isVerse ? 'verses' : 'words';
    await ensureData(db, storeName);

    const indexMap = isVerse ? VERSE_INDEX_MAP : WORD_INDEX_MAP;
    const mapping = indexMap[method];
    if (!mapping) throw new Error(`Unknown method: ${method}`);

    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const transform = isVerse ? verseTransform(mapping.fieldName) : wordTransform(mapping.fieldName);

    if (mapping.indexName) {
        return cursorScanRange(store, mapping.indexName, minValue, maxValue, limit, transform, book);
    } else {
        return fullScanFilter(store, mapping.fieldName, v => v >= minValue && v <= maxValue, limit, transform, book);
    }
}

export async function findMatchingGematria(text, options = {}) {
    const { method = GematriaMethod.STANDARD, limit = 100 } = options;
    const value = calculateGematria(text, method);
    const results = await searchWordsByGematria(value, { ...options, method, limit });
    return results.filter(r => r.text !== text);
}

export async function analyzeGematriaStatistics(book, startChapter, endChapter, method = GematriaMethod.STANDARD) {
    const fieldMap = { standard: 'gematria_standard', reduced: 'gematria_reduced', ordinal: 'gematria_ordinal' };
    const field = fieldMap[method];
    if (!field) throw new Error(`Unknown method: ${method}`);

    const db = await getDB();
    await ensureData(db, 'verses');

    return new Promise((resolve, reject) => {
        const tx = db.transaction('verses', 'readonly');
        const store = tx.objectStore('verses');
        const index = store.index('book');
        const range = IDBKeyRange.only(book);
        const values = [];

        const req = index.openCursor(range);
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) {
                if (values.length === 0) { reject(new Error('No verses found for this book')); return; }
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / values.length;
                const sorted = values.sort((a, b) => a - b);
                const variance = values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length;
                resolve({
                    count: values.length, sum,
                    mean: Math.round(mean * 100) / 100,
                    median: sorted[Math.floor(values.length / 2)],
                    min: sorted[0], max: sorted[sorted.length - 1],
                    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
                    values: sorted
                });
                return;
            }
            const verse = cursor.value;
            if (verse.chapter >= startChapter && verse.chapter <= endChapter) {
                values.push(verse[field]);
            }
            cursor.continue();
        };
        req.onerror = () => reject(new Error('Statistics scan failed'));
    });
}

export async function getGematriaDistribution(book, method = GematriaMethod.STANDARD, bucketSize = 100) {
    const fieldMap = { standard: 'gematria_standard', reduced: 'gematria_reduced', ordinal: 'gematria_ordinal' };
    const field = fieldMap[method];
    if (!field) throw new Error(`Unknown method: ${method}`);

    const db = await getDB();
    await ensureData(db, 'verses');

    return new Promise((resolve, reject) => {
        const tx = db.transaction('verses', 'readonly');
        const store = tx.objectStore('verses');
        const index = store.index('book');
        const range = IDBKeyRange.only(book);
        const histogram = {};

        const req = index.openCursor(range);
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) { resolve(histogram); return; }
            const value = cursor.value[field];
            const bucket = Math.floor(value / bucketSize) * bucketSize;
            histogram[bucket] = (histogram[bucket] || 0) + 1;
            cursor.continue();
        };
        req.onerror = () => reject(new Error('Distribution scan failed'));
    });
}

export default {
    GematriaMethod, calculateGematria, calculateLetterValues, compareGematria,
    searchWordsByGematria, searchVersesByGematria, searchGematriaRange,
    findMatchingGematria, analyzeGematriaStatistics, getGematriaDistribution
};
