/**
 * Query API for Hebrew Bible Analysis Suite
 *
 * Provides high-level query functions for accessing the character-level
 * database via IndexedDB.
 */

/**
 * Get a single character by global ID
 * @param {number} id - Global character ID (0..304805)
 * @returns {Promise<Object|null>} Character object or null
 */
async function getCharById(id) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chars', 'readonly');
    const store = transaction.objectStore('chars');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all characters for a specific verse
 * @param {number} book - Book number (1-39)
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Array>} Array of character objects
 */
async function getCharsByVerse(book, chapter, verse) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chars', 'readonly');
    const store = transaction.objectStore('chars');
    const index = store.index('verse');
    const request = index.getAll([book, chapter, verse]);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all characters for a specific chapter
 * @param {number} book - Book number
 * @param {number} chapter - Chapter number
 * @returns {Promise<Array>} Array of character objects
 */
async function getCharsByChapter(book, chapter) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chars', 'readonly');
    const store = transaction.objectStore('chars');
    const index = store.index('chapter');
    const request = index.getAll([book, chapter]);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all characters for a specific book
 * @param {number} book - Book number
 * @returns {Promise<Array>} Array of character objects
 */
async function getCharsByBook(book) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chars', 'readonly');
    const store = transaction.objectStore('chars');
    const index = store.index('book');
    const request = index.getAll(book);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a range of characters by global ID
 * @param {number} startId - Start ID (inclusive)
 * @param {number} endId - End ID (inclusive)
 * @returns {Promise<Array>} Array of character objects
 */
async function getCharRange(startId, endId) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chars', 'readonly');
    const store = transaction.objectStore('chars');
    const range = IDBKeyRange.bound(startId, endId);
    const request = store.getAll(range);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a specific word by word ID
 * @param {number} wordId - Word ID
 * @returns {Promise<Object|null>} Word object or null
 */
async function getWord(wordId) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('words', 'readonly');
    const store = transaction.objectStore('words');
    const request = store.get(wordId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all words for a specific verse
 * @param {number} book - Book number
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Array>} Array of word objects
 */
async function getWordsByVerse(book, chapter, verse) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('words', 'readonly');
    const store = transaction.objectStore('words');
    const index = store.index('verse');
    const request = index.getAll([book, chapter, verse]);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a specific verse
 * @param {number} book - Book number
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Object|null>} Verse object or null
 */
async function getVerse(book, chapter, verse) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('verses', 'readonly');
    const store = transaction.objectStore('verses');
    const index = store.index('reference');
    const request = index.get([book, chapter, verse]);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all verses for a specific chapter
 * @param {number} book - Book number
 * @param {number} chapter - Chapter number
 * @returns {Promise<Array>} Array of verse objects
 */
async function getVersesByChapter(book, chapter) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('verses', 'readonly');
    const store = transaction.objectStore('verses');
    const index = store.index('chapter');
    const request = index.getAll([book, chapter]);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all verses for a specific book
 * @param {number} book - Book number
 * @returns {Promise<Array>} Array of verse objects
 */
async function getVersesByBook(book) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('verses', 'readonly');
    const store = transaction.objectStore('verses');
    const index = store.index('book');
    const request = index.getAll(book);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search words by gematria value
 * @param {number} value - Gematria value to search
 * @param {string} method - 'standard', 'reduced', or 'ordinal'
 * @returns {Promise<Array>} Array of word objects
 */
async function searchWordsByGematria(value, method = 'standard') {
  const db = await getDatabase();
  const indexName = method === 'reduced' ? 'gematriaReduced' : 'gematria';

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('words', 'readonly');
    const store = transaction.objectStore('words');
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search verses by gematria value
 * @param {number} value - Gematria value to search
 * @returns {Promise<Array>} Array of verse objects
 */
async function searchVersesByGematria(value) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('verses', 'readonly');
    const store = transaction.objectStore('verses');
    const index = store.index('gematria');
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search for words containing specific text
 * @param {string} searchText - Hebrew text to search for
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching word objects
 */
async function searchWords(searchText, options = {}) {
  const {
    exactMatch = false,
    book = null
  } = options;

  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('words', 'readonly');
    const store = transaction.objectStore('words');

    // Use index if searching specific book
    const source = book !== null
      ? store.index('book')
      : store;

    const request = book !== null
      ? source.getAll(book)
      : source.getAll();

    request.onsuccess = () => {
      const results = request.result.filter(word => {
        const text = word.word_text_consonantal;
        if (exactMatch) {
          return text === searchText;
        } else {
          return text.includes(searchText);
        }
      });
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Search verses by text content
 * @param {string} searchText - Hebrew text to search for
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching verse objects
 */
async function searchVerses(searchText, options = {}) {
  const {
    book = null,
    chapter = null
  } = options;

  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('verses', 'readonly');
    const store = transaction.objectStore('verses');

    // Determine which index to use
    let request;
    if (chapter !== null && book !== null) {
      const index = store.index('chapter');
      request = index.getAll([book, chapter]);
    } else if (book !== null) {
      const index = store.index('book');
      request = index.getAll(book);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const results = request.result.filter(verse => {
        return verse.verse_text_consonantal.includes(searchText);
      });
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get full verse context (verse, words, and characters)
 * @param {number} book - Book number
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Object>} Object with verse, words, and chars arrays
 */
async function getVerseContext(book, chapter, verse) {
  const [verseObj, words, chars] = await Promise.all([
    getVerse(book, chapter, verse),
    getWordsByVerse(book, chapter, verse),
    getCharsByVerse(book, chapter, verse)
  ]);

  return {
    verse: verseObj,
    words,
    chars
  };
}

/**
 * Get consonantal text from character range (for ELS searches)
 * @param {number} startId - Start character ID
 * @param {number} endId - End character ID
 * @returns {Promise<string>} Consonantal text
 */
async function getConsonанtalText(startId, endId) {
  const chars = await getCharRange(startId, endId);
  return chars.map(c => c.base_char).join('');
}

/**
 * Get all consonantal text for loaded books (WARNING: memory intensive)
 * @returns {Promise<string>} Full consonantal text
 */
async function getAllConsonantalText() {
  console.warn('⚠️  Loading ALL consonantal text into memory - this may be slow');

  const db = await getDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chars', 'readonly');
    const store = transaction.objectStore('chars');
    const request = store.getAll();

    request.onsuccess = () => {
      const text = request.result.map(c => c.base_char).join('');
      console.log(`  ✅ Loaded ${text.length.toLocaleString()} characters`);
      resolve(text);
    };

    request.onerror = () => reject(request.error);
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCharById,
    getCharsByVerse,
    getCharsByChapter,
    getCharsByBook,
    getCharRange,
    getWord,
    getWordsByVerse,
    getVerse,
    getVersesByChapter,
    getVersesByBook,
    searchWordsByGematria,
    searchVersesByGematria,
    searchWords,
    searchVerses,
    getVerseContext,
    getConsonantalText,
    getAllConsonantalText
  };
}
