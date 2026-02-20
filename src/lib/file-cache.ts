const DB_NAME = 'trueres-file-cache';
const STORE_NAME = 'files';
const DB_VERSION = 1;
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500 MB hard cap

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allKeys: IDBValidKey[] = await new Promise((res, rej) => {
      const r = store.getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const allVals: { data: ArrayBuffer; timestamp?: number }[] = await new Promise((res, rej) => {
      const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    let total = allVals.reduce((s, v) => s + (v?.data?.byteLength ?? 0), 0);
    if (total <= MAX_CACHE_BYTES) return;
    const entries = allKeys.map((k, i) => ({ key: k, ts: allVals[i]?.timestamp ?? i, size: allVals[i]?.data?.byteLength ?? 0 }));
    entries.sort((a, b) => a.ts - b.ts);
    for (const entry of entries) {
      if (total <= MAX_CACHE_BYTES) break;
      store.delete(entry.key);
      total -= entry.size;
    }
  } catch { /* graceful degradation */ }
}

export async function clearAllCached(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  } catch { /* graceful degradation */ }
}

export async function cacheFile(key: string, file: File): Promise<void> {
  try {
    const db = await openDB();
    const buf = await file.arrayBuffer();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ name: file.name, type: file.type, data: buf, timestamp: Date.now() }, key);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    await evictIfNeeded(db);
    db.close();
  } catch { /* graceful degradation */ }
}

export async function getCachedFile(key: string): Promise<File | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    const result = await new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    db.close();
    if (!result) return null;
    return new File([result.data], result.name, { type: result.type });
  } catch { return null; }
}

export async function clearCachedFile(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  } catch { /* graceful degradation */ }
}

export async function cacheBlob(key: string, blob: Blob, fileName: string): Promise<void> {
  try {
    const db = await openDB();
    const buf = await blob.arrayBuffer();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ name: fileName, type: blob.type, data: buf, timestamp: Date.now() }, key);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    await evictIfNeeded(db);
    db.close();
  } catch { /* graceful degradation */ }
}

export async function getCachedBlob(key: string): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    const result = await new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    db.close();
    if (!result) return null;
    return { blob: new Blob([result.data], { type: result.type }), fileName: result.name };
  } catch { return null; }
}
