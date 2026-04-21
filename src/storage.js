/**
 * storage.js — LemmaMap persistence layer
 *
 * TWO storage backends, chosen deliberately:
 *
 * localStorage  →  session metadata (regions, active region, scroll position,
 * PDF path, splitter position). Tiny JSON, synchronous reads
 * on startup with zero latency. Key: `lemmamap:session:<pdfKey>`
 *
 * IndexedDB     →  Tldraw canvas snapshots, one record per region ID.
 * Tldraw snapshots contain the full shape/asset graph and can
 * be several hundred KB; IndexedDB has no practical size cap
 * and handles structured data natively.
 * DB: "LemmaMap", Store: "whiteboards", Key: regionId
 *
 * Auto-save is debounced at the call site — these functions are plain
 * read/write with no internal debouncing so callers control the frequency.
 */

// ─── IndexedDB ────────────────────────────────────────────────────────────────
import { writeTextFile, remove, exists } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';


const DB_NAME    = 'LemmaMap';
const DB_VERSION = 1;
const STORE_NAME = 'whiteboards';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // keyed by regionId
      }
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

/**
 * Save a Tldraw snapshot for a given regionId.
 * `snapshot` is the object returned by editor.getSnapshot().
 */
export async function saveWhiteboard(regionId, snapshot) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(snapshot, regionId);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Load a Tldraw snapshot for a given regionId.
 * Returns the snapshot object, or null if none exists yet.
 */
export async function loadWhiteboard(regionId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(regionId);
    req.onsuccess = (e) => resolve(e.target.result ?? null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Delete the whiteboard snapshot for a regionId (called when region is removed).
 */
export async function deleteWhiteboard(regionId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(regionId);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ─── Data Export / Import ─────────────────────────────────────────────────────

export async function getAllData() {
  const data = { local: {}, idb: {} };
  // 1. Gather all localStorage data
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('lemmamap:')) {
      data.local[k] = localStorage.getItem(k);
    }
  }
  // 2. Gather all IndexedDB whiteboard data
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    const reqKeys = store.getAllKeys();

    req.onsuccess = () => {
      reqKeys.onsuccess = () => {
        const values = req.result;
        const keys = reqKeys.result;
        keys.forEach((k, idx) => { data.idb[k] = values[idx]; });
        resolve(data);
      };
    };
    req.onerror = () => reject(req.error);
  });
}

export async function restoreAllData(data) {
  // 1. Restore localStorage
  if (data.local) {
    for (const [k, v] of Object.entries(data.local)) {
      localStorage.setItem(k, v);
    }
  }
  // 2. Restore IndexedDB
  if (data.idb) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const [k, v] of Object.entries(data.idb)) {
        store.put(v, k);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ─── Rolling Backup ───────────────────────────────────────────────────────────

export async function performRollingBackup() {
  const backupDir = localStorage.getItem('lemmamap:backupPath');
  if (!backupDir) throw new Error("No backup folder selected. Please set one in Settings.");

  let currentIndex = parseInt(localStorage.getItem('lemmamap:backupIndex') || '0', 10);
  const nextIndex = currentIndex + 1;

  const data = await getAllData();
  const jsonStr = JSON.stringify(data, null, 2);

  const newFileName = `backup_${nextIndex}.json`;
  const newPath = await join(backupDir, newFileName);

  await writeTextFile(newPath, jsonStr);

  // Delete i - 1 (which is nextIndex - 2)
  const oldIndex = nextIndex - 2;
  if (oldIndex > 0) {
    const oldFileName = `backup_${oldIndex}.json`;
    const oldPath = await join(backupDir, oldFileName);
    if (await exists(oldPath)) {
      try {
        await remove(oldPath);
      } catch (err) {
        console.warn("[LemmaMap] Failed to remove old backup:", err);
      }
    }
  }

  localStorage.setItem('lemmamap:backupIndex', nextIndex.toString());
  return nextIndex;
}

// ─── localStorage — Session Metadata ─────────────────────────────────────────

/**
 * Derive a stable localStorage key from the PDF path/URL.
 * We strip query strings and trailing slashes for robustness.
 */
export function sessionKey(pdfPath) {
  const clean = (pdfPath || 'default').replace(/\?.*$/, '').replace(/\/$/, '');
  return `lemmamap:session:${clean}`;
}

export function saveSession(pdfPath, data) {
  try {
    const key     = sessionKey(pdfPath);
    const payload = { ...data, pdfPath, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[LemmaMap] session save failed:', err);
  }
}

export function loadSession(pdfPath) {
  try {
    const key  = sessionKey(pdfPath);
    const raw  = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[LemmaMap] session load failed:', err);
    return null;
  }
}

// ─── Debounce utility ─────────────────────────────────────────────────────────

export function debounce(fn, ms) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.flush = (...args) => {
    clearTimeout(timer);
    fn(...args);
  };
  return debounced;
}
