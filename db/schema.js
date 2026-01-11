/**
 * IndexedDB Schema for Hebrew Bible Analysis Suite
 *
 * Database: BibleAnalysisDB
 * Version: 1
 *
 * Character-level canonical database with derived views
 */

const DB_NAME = 'BibleAnalysisDB';
const DB_VERSION = 1;

/**
 * Database schema definition
 */
const SCHEMA = {
  dbName: DB_NAME,
  version: DB_VERSION,

  objectStores: {
    // Character table - canonical storage of every Hebrew letter
    chars: {
      keyPath: 'id', // global ordinal index (0..304805)
      autoIncrement: false,
      indices: [
        { name: 'book', keyPath: 'book', unique: false },
        { name: 'chapter', keyPath: ['book', 'chapter'], unique: false },
        { name: 'verse', keyPath: ['book', 'chapter', 'verse'], unique: false },
        { name: 'baseChar', keyPath: 'base_char', unique: false },
        { name: 'wordId', keyPath: 'word_id', unique: false }
      ]
    },

    // Word table - derived from characters
    words: {
      keyPath: 'word_id',
      autoIncrement: false,
      indices: [
        { name: 'book', keyPath: 'book', unique: false },
        { name: 'chapter', keyPath: ['book', 'chapter'], unique: false },
        { name: 'verse', keyPath: ['book', 'chapter', 'verse'], unique: false },
        { name: 'gematria', keyPath: 'gematria_standard', unique: false },
        { name: 'gematriaReduced', keyPath: 'gematria_reduced', unique: false }
      ]
    },

    // Verse table - derived from words and characters
    verses: {
      keyPath: 'verse_id',
      autoIncrement: false,
      indices: [
        { name: 'book', keyPath: 'book', unique: false },
        { name: 'chapter', keyPath: ['book', 'chapter'], unique: false },
        { name: 'reference', keyPath: ['book', 'chapter', 'verse'], unique: true },
        { name: 'gematria', keyPath: 'gematria_standard', unique: false }
      ]
    },

    // Metadata table - app state and loaded books
    metadata: {
      keyPath: 'key',
      autoIncrement: false,
      indices: []
    }
  }
};

/**
 * Initialize the database with schema
 * @returns {Promise<IDBDatabase>}
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log(`Opening IndexedDB: ${DB_NAME} v${DB_VERSION}`);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('Database opened successfully');
      const db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      console.log('Upgrading database schema...');
      const db = event.target.result;

      // Create object stores
      for (const [storeName, storeConfig] of Object.entries(SCHEMA.objectStores)) {
        // Delete old store if exists (for clean upgrade)
        if (db.objectStoreNames.contains(storeName)) {
          console.log(`Deleting old object store: ${storeName}`);
          db.deleteObjectStore(storeName);
        }

        // Create new store
        console.log(`Creating object store: ${storeName}`);
        const objectStore = db.createObjectStore(storeName, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement
        });

        // Create indices
        for (const indexConfig of storeConfig.indices) {
          console.log(`  Creating index: ${indexConfig.name}`);
          objectStore.createIndex(indexConfig.name, indexConfig.keyPath, {
            unique: indexConfig.unique
          });
        }
      }

      console.log('Schema upgrade complete');
    };
  });
}

/**
 * Get database instance (opens if not already open)
 */
let dbInstance = null;

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
}

/**
 * Clear all data from the database (keep schema)
 */
async function clearDatabase() {
  const db = await getDatabase();
  const transaction = db.transaction(
    Object.keys(SCHEMA.objectStores),
    'readwrite'
  );

  for (const storeName of Object.keys(SCHEMA.objectStores)) {
    const store = transaction.objectStore(storeName);
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
    console.log(`Cleared object store: ${storeName}`);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Delete the entire database
 */
function deleteDatabase() {
  return new Promise((resolve, reject) => {
    console.log(`Deleting database: ${DB_NAME}`);
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log('Database deleted successfully');
      dbInstance = null;
      resolve();
    };

    request.onerror = () => {
      console.error('Failed to delete database:', request.error);
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('Database deletion blocked. Close all tabs using this database.');
    };
  });
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  const db = await getDatabase();
  const stats = {};

  for (const storeName of Object.keys(SCHEMA.objectStores)) {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    stats[storeName] = await new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return stats;
}

/**
 * Check database quota usage (estimate)
 */
async function checkQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed: (estimate.usage / estimate.quota * 100).toFixed(2),
      usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
      quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2)
    };
  }
  return null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DB_NAME,
    DB_VERSION,
    SCHEMA,
    initDatabase,
    getDatabase,
    clearDatabase,
    deleteDatabase,
    getDatabaseStats,
    checkQuota
  };
}
