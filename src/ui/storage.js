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

// ─── Global Whiteboards Registry ──────────────────────────────────────────────

const WHITEBOARDS_KEY = 'lemmamap:whiteboards';
const WHITEBOARD_FOLDER_MAP_KEY = 'lemmamap:whiteboardFolders';
const WHITEBOARD_FILE_EXT = '.whiteboard.json';

export function getAllWhiteboards() {
  try {
    const raw = localStorage.getItem(WHITEBOARDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.filter((wb) => {
      if (!wb?.id || seen.has(wb.id)) return false;
      seen.add(wb.id);
      return true;
    });
  } catch {
    return [];
  }
}

function saveAllWhiteboards(whiteboards) {
  localStorage.setItem(WHITEBOARDS_KEY, JSON.stringify(whiteboards));
}

function getWhiteboardFolderMap() {
  try {
    const raw = localStorage.getItem(WHITEBOARD_FOLDER_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveWhiteboardFolderMap(folderMap) {
  localStorage.setItem(WHITEBOARD_FOLDER_MAP_KEY, JSON.stringify(folderMap));
}

export function getWhiteboardsForFolder(folderPath) {
  if (!folderPath) return [];
  const whiteboards = getAllWhiteboards();
  const folderMap = getWhiteboardFolderMap();
  const ids = folderMap[folderPath] || [];
  if (!Array.isArray(ids)) return [];
  const byId = new Map(whiteboards.map((wb) => [wb.id, wb]));
  const seen = new Set();
  return ids.map((id) => byId.get(id)).filter((wb) => {
    if (!wb || seen.has(wb.id)) return false;
    seen.add(wb.id);
    return true;
  });
}

function safeFileSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'whiteboard';
}

export async function createWhiteboard(name, folderPath = null) {
  const finalName = (name || '').trim();
  if (!finalName) throw new Error('Whiteboard name is required.');
  const libraryPath = localStorage.getItem('lemmamap:library');
  const targetFolder = folderPath || libraryPath;
  if (!targetFolder) throw new Error('Library folder is not set.');

  const whiteboards = getAllWhiteboards();
  const newWhiteboard = {
    id: `wb_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name: finalName,
    type: 'standalone-whiteboard',
    folderPath: targetFolder,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  whiteboards.push(newWhiteboard);
  saveAllWhiteboards(whiteboards);

  const folderMap = getWhiteboardFolderMap();
  const ids = Array.isArray(folderMap[targetFolder]) ? folderMap[targetFolder] : [];
  folderMap[targetFolder] = [...ids, newWhiteboard.id];
  saveWhiteboardFolderMap(folderMap);

  // Persist each standalone whiteboard as its own typed file in the library tree.
  const fileName = `${safeFileSlug(finalName)}${WHITEBOARD_FILE_EXT}`;
  const filePath = await join(targetFolder, fileName);
  const filePayload = {
    kind: 'standalone-whiteboard',
    id: newWhiteboard.id,
    name: newWhiteboard.name,
    createdAt: newWhiteboard.createdAt,
    updatedAt: newWhiteboard.updatedAt,
  };
  await writeTextFile(filePath, JSON.stringify(filePayload, null, 2));

  return newWhiteboard;
}

export function assignWhiteboardToFolder(whiteboardId, folderPath) {
  if (!whiteboardId || !folderPath) return;
  const folderMap = getWhiteboardFolderMap();
  for (const key of Object.keys(folderMap)) {
    const ids = Array.isArray(folderMap[key]) ? folderMap[key] : [];
    folderMap[key] = ids.filter((id) => id !== whiteboardId);
  }
  const nextIds = Array.isArray(folderMap[folderPath]) ? folderMap[folderPath] : [];
  folderMap[folderPath] = [...nextIds, whiteboardId];
  saveWhiteboardFolderMap(folderMap);
}

export function deleteGlobalWhiteboard(whiteboardId) {
  if (!whiteboardId) return;
  const whiteboards = getAllWhiteboards().filter((wb) => wb.id !== whiteboardId);
  saveAllWhiteboards(whiteboards);

  const folderMap = getWhiteboardFolderMap();
  for (const key of Object.keys(folderMap)) {
    const ids = Array.isArray(folderMap[key]) ? folderMap[key] : [];
    folderMap[key] = ids.filter((id) => id !== whiteboardId);
  }
  saveWhiteboardFolderMap(folderMap);
  deleteWhiteboard(whiteboardId);
}

export function pruneWhiteboards(validIds) {
  const allow = new Set(validIds || []);
  const whiteboards = getAllWhiteboards().filter((wb) => allow.has(wb.id));
  saveAllWhiteboards(whiteboards);

  const folderMap = getWhiteboardFolderMap();
  for (const key of Object.keys(folderMap)) {
    const ids = Array.isArray(folderMap[key]) ? folderMap[key] : [];
    folderMap[key] = ids.filter((id) => allow.has(id));
  }
  saveWhiteboardFolderMap(folderMap);
}
