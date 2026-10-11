// ---------------------------------------------------------------------------
// Stores a user-uploaded background image in IndexedDB.
//
// Images are far too large for localStorage (which is also synchronous and
// string-only), so the file is kept here as a Blob and handed back to the app,
// which turns it into an object URL for the background layer. Everything
// degrades quietly: if IndexedDB is unavailable the upload still works for the
// current session (the caller keeps the blob URL in memory), it just will not
// be there after a refresh.
// ---------------------------------------------------------------------------

const DB_NAME = 'taskflow';
const DB_VERSION = 1;
const STORE_NAME = 'backgrounds';
const CUSTOM_KEY = 'custom-background';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Runs one request inside a transaction and resolves with its result once the
// transaction has committed. Resolving on `oncomplete` (rather than on the
// request) means the value is always readable and the connection is closed.
function runTransaction(mode, run) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(request ? request.result : undefined);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
      })
  );
}

export async function saveCustomImage(blob) {
  if (!hasIndexedDb()) return;
  await runTransaction('readwrite', (store) => store.put(blob, CUSTOM_KEY));
}

export async function loadCustomImage() {
  if (!hasIndexedDb()) return null;
  const blob = await runTransaction('readonly', (store) => store.get(CUSTOM_KEY));
  return blob || null;
}

export async function deleteCustomImage() {
  if (!hasIndexedDb()) return;
  await runTransaction('readwrite', (store) => store.delete(CUSTOM_KEY));
}
