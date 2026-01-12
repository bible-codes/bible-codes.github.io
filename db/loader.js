/**
 * IndexedDB Data Loader for Hebrew Bible Analysis Suite
 *
 * Loads compressed JSON data files into IndexedDB for offline access.
 * Handles decompression, progress tracking, and error recovery.
 */

/**
 * Load status tracking
 */
const LoadStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Fetch and decompress a gzipped JSON file
 * @param {string} url - URL to .json.gz file
 * @param {Function} progressCallback - Optional progress callback (percent)
 * @returns {Promise<Object>} Parsed JSON data
 */
async function fetchCompressedJSON(url, progressCallback = null) {
  console.log(`📥 Fetching ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Get content length for progress tracking
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // Read response as stream for progress tracking
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    received += value.length;

    if (progressCallback && total > 0) {
      const percent = (received / total) * 100;
      progressCallback(percent);
    }
  }

  // Concatenate chunks into single Uint8Array
  const blob = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
    blob.set(chunk, position);
    position += chunk.length;
  }

  console.log(`  ✅ Downloaded ${(received / 1024).toFixed(1)} KB`);

  // Decompress using browser's native DecompressionStream (Chrome 80+, Firefox 113+)
  try {
    const decompressedStream = new Response(
      blob.stream().pipeThrough(new DecompressionStream('gzip'))
    );
    const decompressedText = await decompressedStream.text();
    const data = JSON.parse(decompressedText);
    console.log(`  ✅ Decompressed and parsed JSON`);
    return data;
  } catch (e) {
    // Fallback: try parsing uncompressed (in case file is not actually gzipped)
    console.warn('  ⚠️  Decompression failed, trying uncompressed...');
    const text = new TextDecoder().decode(blob);
    return JSON.parse(text);
  }
}

/**
 * Load data array into an IndexedDB object store
 * @param {IDBDatabase} db - Database instance
 * @param {string} storeName - Object store name
 * @param {Array} data - Array of objects to insert
 * @param {Function} progressCallback - Optional progress callback (percent)
 * @returns {Promise<number>} Number of records inserted
 */
async function loadDataIntoStore(db, storeName, data, progressCallback = null) {
  console.log(`💾 Loading ${data.length.toLocaleString()} records into '${storeName}'...`);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    let loaded = 0;
    const total = data.length;
    const batchSize = 1000; // Insert in batches for performance

    // Process in batches
    const processBatch = (startIdx) => {
      const endIdx = Math.min(startIdx + batchSize, total);

      for (let i = startIdx; i < endIdx; i++) {
        const request = store.put(data[i]);

        request.onerror = () => {
          console.error(`  ❌ Error inserting record ${i}:`, request.error);
        };

        request.onsuccess = () => {
          loaded++;

          if (progressCallback && loaded % 100 === 0) {
            const percent = (loaded / total) * 100;
            progressCallback(percent);
          }
        };
      }

      // Schedule next batch
      if (endIdx < total) {
        setTimeout(() => processBatch(endIdx), 0);
      }
    };

    transaction.oncomplete = () => {
      console.log(`  ✅ Loaded ${loaded.toLocaleString()} records`);
      resolve(loaded);
    };

    transaction.onerror = () => {
      console.error(`  ❌ Transaction failed:`, transaction.error);
      reject(transaction.error);
    };

    // Start processing
    processBatch(0);
  });
}

/**
 * Load a book's data into the database
 * @param {string} bookName - Book name (e.g., 'genesis')
 * @param {number} bookNumber - Book number (1-39)
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} Load results
 */
async function loadBook(bookName, bookNumber, options = {}) {
  const {
    baseUrl = './data',
    onProgress = null
  } = options;

  console.log(`\n📖 Loading ${bookName} (Book ${bookNumber})...`);

  const db = await getDatabase();

  // Check if already loaded
  const metadata = await getMetadata('loaded_books');
  const loadedBooks = metadata ? metadata.value : [];

  if (loadedBooks.includes(bookNumber)) {
    console.log(`  ℹ️  ${bookName} already loaded`);
    return { status: 'already_loaded', bookNumber };
  }

  try {
    // Load characters
    const charsUrl = `${baseUrl}/${bookName}-chars.json.gz`;
    const chars = await fetchCompressedJSON(charsUrl, (pct) => {
      if (onProgress) onProgress('chars', pct);
    });

    await loadDataIntoStore(db, 'chars', chars, (pct) => {
      if (onProgress) onProgress('chars_db', pct);
    });

    // Load words
    const wordsUrl = `${baseUrl}/${bookName}-words.json.gz`;
    const words = await fetchCompressedJSON(wordsUrl, (pct) => {
      if (onProgress) onProgress('words', pct);
    });

    await loadDataIntoStore(db, 'words', words, (pct) => {
      if (onProgress) onProgress('words_db', pct);
    });

    // Load verses
    const versesUrl = `${baseUrl}/${bookName}-verses.json.gz`;
    const verses = await fetchCompressedJSON(versesUrl, (pct) => {
      if (onProgress) onProgress('verses', pct);
    });

    await loadDataIntoStore(db, 'verses', verses, (pct) => {
      if (onProgress) onProgress('verses_db', pct);
    });

    // Update metadata
    loadedBooks.push(bookNumber);
    await setMetadata('loaded_books', loadedBooks);

    console.log(`\n✨ ${bookName} loaded successfully!`);

    return {
      status: 'success',
      bookNumber,
      stats: {
        chars: chars.length,
        words: words.length,
        verses: verses.length
      }
    };
  } catch (error) {
    console.error(`\n❌ Failed to load ${bookName}:`, error);
    return {
      status: 'failed',
      bookNumber,
      error: error.message
    };
  }
}

/**
 * Get metadata value
 * @param {string} key - Metadata key
 * @returns {Promise<Object|null>} Metadata entry or null
 */
async function getMetadata(key) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('metadata', 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set metadata value
 * @param {string} key - Metadata key
 * @param {*} value - Value to store
 * @returns {Promise<void>}
 */
async function setMetadata(key, value) {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('metadata', 'readwrite');
    const store = transaction.objectStore('metadata');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get list of loaded books
 * @returns {Promise<Array<number>>} Array of loaded book numbers
 */
async function getLoadedBooks() {
  const metadata = await getMetadata('loaded_books');
  return metadata ? metadata.value : [];
}

/**
 * Check if a specific book is loaded
 * @param {number} bookNumber - Book number (1-39)
 * @returns {Promise<boolean>}
 */
async function isBookLoaded(bookNumber) {
  const loadedBooks = await getLoadedBooks();
  return loadedBooks.includes(bookNumber);
}

/**
 * Get loading status summary
 * @returns {Promise<Object>} Status summary
 */
async function getLoadStatus() {
  const stats = await getDatabaseStats();
  const loadedBooks = await getLoadedBooks();
  const quota = await checkQuota();

  return {
    loadedBooks,
    stats,
    quota
  };
}

/**
 * Clear all loaded data (keep schema)
 * @returns {Promise<void>}
 */
async function clearAllData() {
  console.log('🗑️  Clearing all data...');
  await clearDatabase();
  console.log('  ✅ All data cleared');
}

/**
 * Initialize database and load Genesis if needed
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Initialization result
 */
async function initializeDatabase(options = {}) {
  const {
    autoLoadGenesis = true,
    onProgress = null
  } = options;

  console.log('🔧 Initializing database...');

  // Open/create database
  const db = await getDatabase();
  console.log('  ✅ Database ready');

  // Check current status
  const status = await getLoadStatus();
  console.log(`  ℹ️  Books loaded: ${status.loadedBooks.length}`);
  console.log(`  ℹ️  Characters: ${status.stats.chars.toLocaleString()}`);
  console.log(`  ℹ️  Storage: ${status.quota.usageMB} MB / ${status.quota.quotaMB} MB (${status.quota.percentUsed}%)`);

  // Auto-load Genesis if requested and not loaded
  if (autoLoadGenesis && !status.loadedBooks.includes(1)) {
    console.log('\n📚 Auto-loading Genesis...');
    const result = await loadBook('genesis', 1, { onProgress });

    if (result.status === 'success') {
      console.log('  ✅ Genesis loaded automatically');
    } else {
      console.warn('  ⚠️  Failed to auto-load Genesis:', result.error);
    }
  }

  // Get updated status
  const finalStatus = await getLoadStatus();

  return {
    initialized: true,
    status: finalStatus
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LoadStatus,
    fetchCompressedJSON,
    loadDataIntoStore,
    loadBook,
    getMetadata,
    setMetadata,
    getLoadedBooks,
    isBookLoaded,
    getLoadStatus,
    clearAllData,
    initializeDatabase
  };
}
