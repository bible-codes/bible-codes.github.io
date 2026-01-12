/**
 * Dictionary Data Loader
 *
 * Loads compressed dictionary data into IndexedDB:
 * - Hebrew roots lexicon
 * - Word definitions
 * - Semantic embeddings
 * - Root features
 */

import {
  openDictionaryDB,
  isDictionaryLoaded,
  RootEntry,
  DefinitionEntry,
  EmbeddingEntry,
  RootFeatureEntry
} from './dictionary-schema.js';

export class DictionaryLoader {
  constructor() {
    this.db = null;
    this.loadedStores = new Set();
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    if (!this.db) {
      this.db = await openDictionaryDB();
    }
    return this.db;
  }

  /**
   * Load Hebrew roots lexicon
   * @param {Function} onProgress - Progress callback (loaded, total)
   */
  async loadRoots(onProgress = null) {
    await this.initialize();

    // Check if already loaded
    if (await isDictionaryLoaded(this.db, 'roots')) {
      console.log('Roots lexicon already loaded');
      this.loadedStores.add('roots');
      return { success: true, count: 0, cached: true };
    }

    try {
      // Fetch compressed lexicon
      const response = await fetch('data/embeddings/hebrew-roots.json.gz');
      if (!response.ok) {
        throw new Error(`Failed to fetch roots: ${response.status}`);
      }

      // Decompress
      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();
      const lexicon = JSON.parse(text);

      // Convert to entries
      const entries = Object.entries(lexicon).map(([word, data]) =>
        new RootEntry(word, data.root, data.binyan, data.pos, data.metadata)
      );

      // Batch insert
      const count = await this.batchInsert('roots', entries, onProgress);

      this.loadedStores.add('roots');
      console.log(`Loaded ${count} root entries`);

      return { success: true, count, cached: false };

    } catch (error) {
      console.error('Failed to load roots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load word definitions
   */
  async loadDefinitions(onProgress = null) {
    await this.initialize();

    if (await isDictionaryLoaded(this.db, 'definitions')) {
      console.log('Definitions already loaded');
      this.loadedStores.add('definitions');
      return { success: true, count: 0, cached: true };
    }

    try {
      const response = await fetch('data/embeddings/definitions.json.gz');
      if (!response.ok) {
        throw new Error(`Failed to fetch definitions: ${response.status}`);
      }

      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();
      const definitions = JSON.parse(text);

      const entries = definitions.map(d =>
        new DefinitionEntry(d.word, d.root, d.definitions, d.source)
      );

      const count = await this.batchInsert('definitions', entries, onProgress);

      this.loadedStores.add('definitions');
      console.log(`Loaded ${count} definitions`);

      return { success: true, count, cached: false };

    } catch (error) {
      console.error('Failed to load definitions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load semantic embeddings
   */
  async loadEmbeddings(model = 'tanakh-w2v', onProgress = null) {
    await this.initialize();

    try {
      const response = await fetch(`data/embeddings/${model}.json.gz`);
      if (!response.ok) {
        throw new Error(`Failed to fetch embeddings: ${response.status}`);
      }

      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();
      const embeddings = JSON.parse(text);

      const entries = Object.entries(embeddings).map(([word, vector]) =>
        new EmbeddingEntry(word, vector, model)
      );

      const count = await this.batchInsert('embeddings', entries, onProgress);

      console.log(`Loaded ${count} embeddings (${model})`);

      return { success: true, count, model, cached: false };

    } catch (error) {
      console.error('Failed to load embeddings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load root features
   */
  async loadRootFeatures(onProgress = null) {
    await this.initialize();

    if (await isDictionaryLoaded(this.db, 'rootFeatures')) {
      console.log('Root features already loaded');
      this.loadedStores.add('rootFeatures');
      return { success: true, count: 0, cached: true };
    }

    try {
      const response = await fetch('data/embeddings/root-features.json.gz');
      if (!response.ok) {
        throw new Error(`Failed to fetch root features: ${response.status}`);
      }

      const blob = await response.blob();
      const ds = new DecompressionStream('gzip');
      const decompressedStream = blob.stream().pipeThrough(ds);
      const decompressedBlob = await new Response(decompressedStream).blob();
      const text = await decompressedBlob.text();
      const features = JSON.parse(text);

      const entries = Object.entries(features).map(([root, data]) =>
        new RootFeatureEntry(root, data)
      );

      const count = await this.batchInsert('rootFeatures', entries, onProgress);

      this.loadedStores.add('rootFeatures');
      console.log(`Loaded ${count} root features`);

      return { success: true, count, cached: false };

    } catch (error) {
      console.error('Failed to load root features:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch insert entries into a store
   */
  async batchInsert(storeName, entries, onProgress = null) {
    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        for (const entry of batch) {
          store.put(entry);
        }

        transaction.oncomplete = () => {
          inserted += batch.length;
          if (onProgress) {
            onProgress(inserted, entries.length);
          }
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      });
    }

    return inserted;
  }

  /**
   * Load all dictionary data
   */
  async loadAll(onProgress = null) {
    const results = {};

    console.log('Loading dictionary data...');

    // Load roots (required)
    results.roots = await this.loadRoots((loaded, total) => {
      if (onProgress) onProgress('roots', loaded, total);
    });

    // Load definitions (optional)
    results.definitions = await this.loadDefinitions((loaded, total) => {
      if (onProgress) onProgress('definitions', loaded, total);
    });

    // Load root features (optional)
    results.rootFeatures = await this.loadRootFeatures((loaded, total) => {
      if (onProgress) onProgress('rootFeatures', loaded, total);
    });

    // Load embeddings (optional, may be large)
    // Uncomment when embedding files are available:
    // results.embeddings = await this.loadEmbeddings('tanakh-w2v', (loaded, total) => {
    //   if (onProgress) onProgress('embeddings', loaded, total);
    // });

    console.log('Dictionary loading complete:', results);

    return results;
  }

  /**
   * Clear dictionary data
   */
  async clearDictionary(storeName = null) {
    await this.initialize();

    const stores = storeName ? [storeName] : Object.keys(DICTIONARY_STORES);

    for (const store of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.clear();

        request.onsuccess = () => {
          console.log(`Cleared ${store}`);
          this.loadedStores.delete(store);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get loading status
   */
  async getStatus() {
    await this.initialize();

    const status = {};

    for (const storeName of ['roots', 'definitions', 'embeddings', 'rootFeatures']) {
      const loaded = await isDictionaryLoaded(this.db, storeName);
      const count = await this.getStoreCount(storeName);

      status[storeName] = { loaded, count };
    }

    return status;
  }

  /**
   * Get count of entries in a store
   */
  async getStoreCount(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Singleton instance
 */
let loader = null;

/**
 * Get or create the global dictionary loader
 */
export function getDictionaryLoader() {
  if (!loader) {
    loader = new DictionaryLoader();
  }
  return loader;
}

/**
 * Convenience function: load all dictionary data
 */
export async function loadDictionary(onProgress = null) {
  const loader = getDictionaryLoader();
  return loader.loadAll(onProgress);
}

/**
 * Convenience function: check dictionary status
 */
export async function getDictionaryStatus() {
  const loader = getDictionaryLoader();
  return loader.getStatus();
}
