/**
 * Dictionary and Lexicon Schema for IndexedDB
 *
 * Extends the main database schema with linguistic data:
 * - Hebrew roots (שורש)
 * - Word definitions
 * - Morphological data
 * - Semantic embeddings
 */

/**
 * Dictionary object stores
 */
export const DICTIONARY_STORES = {
  // Hebrew root lexicon: word → root + morphology
  roots: {
    keyPath: 'word',
    indexes: [
      { name: 'root', keyPath: 'root', unique: false },
      { name: 'binyan', keyPath: 'binyan', unique: false },
      { name: 'pos', keyPath: 'pos', unique: false }
    ]
  },

  // Word definitions (Biblical + Modern Hebrew)
  definitions: {
    keyPath: 'word',
    indexes: [
      { name: 'source', keyPath: 'source', unique: false },
      { name: 'root', keyPath: 'root', unique: false }
    ]
  },

  // Semantic embeddings (word2vec, FastText)
  embeddings: {
    keyPath: 'word',
    indexes: [
      { name: 'model', keyPath: 'model', unique: false }
    ]
  },

  // Root semantic features
  rootFeatures: {
    keyPath: 'root',
    indexes: [
      { name: 'category', keyPath: 'category', unique: false }
    ]
  }
};

/**
 * Root entry schema
 */
export class RootEntry {
  constructor(word, root, binyan = null, pos = null, metadata = {}) {
    this.word = word;           // Normalized Hebrew word
    this.root = root;           // Tri/quad-literal root
    this.binyan = binyan;       // Verbal stem (qal, piel, hifil, etc.)
    this.pos = pos;             // Part of speech
    this.metadata = metadata;   // Additional info
  }
}

/**
 * Definition entry schema
 */
export class DefinitionEntry {
  constructor(word, root, definitions, source = 'biblical') {
    this.word = word;
    this.root = root;
    this.definitions = definitions; // Array of { lang, text, context }
    this.source = source;           // 'biblical', 'modern', 'rabbinic'
    this.examples = [];             // Usage examples
  }
}

/**
 * Embedding entry schema
 */
export class EmbeddingEntry {
  constructor(word, vector, model = 'tanakh-w2v') {
    this.word = word;
    this.vector = vector;       // Float32Array or regular array
    this.model = model;         // 'tanakh-w2v', 'fasttext', etc.
    this.dim = vector.length;
  }
}

/**
 * Root feature entry schema
 */
export class RootFeatureEntry {
  constructor(root, features) {
    this.root = root;
    this.features = features;   // { semantic, morphological, phonological }
    this.category = null;       // Action, state, object, etc.
    this.relatedRoots = [];     // Semantically related roots
  }
}

/**
 * Create dictionary stores in an existing database
 */
export async function createDictionaryStores(db) {
  const transaction = db.transaction(
    Object.keys(DICTIONARY_STORES),
    'readwrite'
  );

  console.log('Dictionary stores already exist or will be created on upgrade');
}

/**
 * Upgrade database to include dictionary stores
 */
export function upgradeDictionaryStores(db, oldVersion, newVersion) {
  console.log(`Upgrading dictionary stores: ${oldVersion} → ${newVersion}`);

  // Create stores if they don't exist
  for (const [storeName, config] of Object.entries(DICTIONARY_STORES)) {
    if (!db.objectStoreNames.contains(storeName)) {
      const store = db.createObjectStore(storeName, {
        keyPath: config.keyPath
      });

      // Create indexes
      if (config.indexes) {
        for (const index of config.indexes) {
          store.createIndex(index.name, index.keyPath, {
            unique: index.unique || false
          });
        }
      }

      console.log(`Created dictionary store: ${storeName}`);
    }
  }
}

/**
 * Get dictionary database version (includes dictionary stores)
 */
export const DICTIONARY_DB_VERSION = 3; // Increment from base version

/**
 * Open dictionary-enabled database
 */
export async function openDictionaryDB(dbName = 'BibleAnalysis') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DICTIONARY_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;

      upgradeDictionaryStores(db, oldVersion, newVersion);
    };
  });
}

/**
 * Check if dictionary data is loaded
 */
export async function isDictionaryLoaded(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      resolve(countRequest.result > 0);
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}

/**
 * Get dictionary statistics
 */
export async function getDictionaryStats(db) {
  const stats = {};

  for (const storeName of Object.keys(DICTIONARY_STORES)) {
    try {
      const count = await new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      stats[storeName] = count;
    } catch (error) {
      stats[storeName] = 0;
    }
  }

  return stats;
}
