/**
 * storage.js — LemmaMap persistence layer
 *
 * TWO storage backends, chosen deliberately:
 *
 *   localStorage  →  session metadata (regions, active region, scroll position,
 *                    PDF path, splitter position). Tiny JSON, synchronous reads
 *                    on startup with zero latency. Key: `lemmamap:session:<pdfKey>`
 *
 *   IndexedDB     →  Tldraw canvas snapshots, one record per region ID.
 *                    Tldraw snapshots contain the full shape/asset graph and can
 *                    be several hundred KB; IndexedDB has no practical size cap
 *                    and handles structured data natively.
 *                    DB: "LemmaMap", Store: "whiteboards", Key: regionId
 *
 * Auto-save is debounced at the call site — these functions are plain
 * read/write with no internal debouncing so callers control the frequency.
 */

// ─── IndexedDB ────────────────────────────────────────────────────────────────

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

// ─── localStorage — Session Metadata ─────────────────────────────────────────

/**
 * Derive a stable localStorage key from the PDF path/URL.
 * We strip query strings and trailing slashes for robustness.
 */
export function sessionKey(pdfPath) {
  const clean = (pdfPath || 'default').replace(/\?.*$/, '').replace(/\/$/, '');
  return `lemmamap:session:${clean}`;
}

/**
 * Session schema (all fields optional on read — apply defaults at call site):
 * {
 *   pdfPath:         string,   // path or URL of the PDF
 *   regions:         Region[], // [{id, x, y, w, h}, ...]
 *   selectedRegionId: string | null,
 *   scrollTop:       number,   // PDF pane scroll position (px)
 *   leftPct:         number,   // splitter position (%)
 *   savedAt:         number,   // Date.now() timestamp
 * }
 */

export function saveSession(pdfPath, data) {
  try {
    const key     = sessionKey(pdfPath);
    const payload = { ...data, pdfPath, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // localStorage can throw in private browsing when storage is full
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

/**
 * Returns a debounced version of `fn` that fires after `ms` ms of inactivity.
 * Used at the call site to throttle auto-saves without losing the final write.
 */
export function debounce(fn, ms) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  // Flush immediately (e.g. on beforeunload)
  debounced.flush = (...args) => {
    clearTimeout(timer);
    fn(...args);
  };
  return debounced;
}