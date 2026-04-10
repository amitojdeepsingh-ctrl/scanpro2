import { ScannedDocument } from './types';

const DB_NAME = 'scanpro-db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(db => {
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = callback(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  });
}

export const indexedDB = {
  async getAll(): Promise<ScannedDocument[]> {
    return withTransaction('readonly', store => store.getAll());
  },

  async get(id: string): Promise<ScannedDocument | undefined> {
    return withTransaction('readonly', store => store.get(id));
  },

  async put(doc: ScannedDocument): Promise<void> {
    return withTransaction('readwrite', store => store.put(doc)).then(() => {});
  },

  async delete(id: string): Promise<void> {
    return withTransaction('readwrite', store => store.delete(id)).then(() => {});
  },

  async clear(): Promise<void> {
    return withTransaction('readwrite', store => store.clear()).then(() => {});
  },

  async count(): Promise<number> {
    return withTransaction('readonly', store => store.count());
  },

  isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.indexedDB;
    } catch {
      return false;
    }
  }
};
