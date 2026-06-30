/**
 * storage.test.js — Unit tests for storage.js (LemmaMap v0.1.1)
 *
 * Run with:  npx vitest run
 * Watch:     npx vitest
 *
 * Setup:  npm install -D vitest
 *         Add to package.json scripts: "test": "vitest run", "test:watch": "vitest"
 *
 * These tests mock localStorage and IndexedDB so they run in Node/jsdom
 * with zero Tauri dependency.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ─── Mock Tauri modules (not available in test environment) ───────────────────
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  remove:        vi.fn().mockResolvedValue(undefined),
  exists:        vi.fn().mockResolvedValue(false),
}));
vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn((...parts) => Promise.resolve(parts.join('/'))),
}));

// ─── localStorage mock ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
    clear:      ()     => { store = {}; },
    get length()       { return Object.keys(store).length; },
    key:        (i)    => Object.keys(store)[i] ?? null,
    _dump:      ()     => ({ ...store }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// ─── IndexedDB mock ───────────────────────────────────────────────────────────
function makeIDBMock() {
  const stores = {};

  const makeStore = (name) => {
    if (!stores[name]) stores[name] = {};
    return {
      put: (value, key) => {
        stores[name][key] = value;
        return { onsuccess: null, onerror: null, result: undefined,
          set onsuccess(fn) { fn && fn({ target: { result: undefined } }); },
        };
      },
      get: (key) => {
        const result = stores[name][key];
        const req = { result };
        setTimeout(() => req.onsuccess?.({ target: { result } }), 0);
        return req;
      },
      delete: (key) => {
        delete stores[name][key];
        const req = {};
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      },
      getAll: () => {
        const result = Object.values(stores[name]);
        const req = { result };
        setTimeout(() => req.onsuccess?.({ target: { result } }), 0);
        return req;
      },
      getAllKeys: () => {
        const result = Object.keys(stores[name]);
        const req = { result };
        setTimeout(() => req.onsuccess?.({ target: { result } }), 0);
        return req;
      },
    };
  };

  const db = {
    transaction: (storeName, _mode) => {
      const store = makeStore(storeName);
      const tx = {
        objectStore: () => store,
        oncomplete: null,
        onerror: null,
      };
      setTimeout(() => tx.oncomplete?.(), 0);
      return tx;
    },
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
    _stores: stores,
  };

  global.indexedDB = {
    open: () => {
      const req = {};
      setTimeout(() => {
        req.onsuccess?.({ target: { result: db } });
      }, 0);
      return req;
    },
  };

  return db;
}

// ─── Import module under test ─────────────────────────────────────────────────
// We re-import after mocks are set so the module initializes with our mocks.
import {
  sessionKey,
  saveSession,
  loadSession,
  debounce,
  getAllWhiteboards,
  createWhiteboard,
  deleteGlobalWhiteboard,
  pruneWhiteboards,
  getWhiteboardsForFolder,
} from '../src/atma/storage/storage.js';  // Adjust path to match your project structure

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: sessionKey()
// ─────────────────────────────────────────────────────────────────────────────
describe('sessionKey()', () => {
  it('returns correct prefix', () => {
    expect(sessionKey('/docs/paper.pdf')).toBe('lemmamap:session:/docs/paper.pdf');
  });

  it('strips query strings', () => {
    expect(sessionKey('/docs/paper.pdf?v=2&foo=bar')).toBe('lemmamap:session:/docs/paper.pdf');
  });

  it('strips trailing slash', () => {
    expect(sessionKey('/docs/paper.pdf/')).toBe('lemmamap:session:/docs/paper.pdf');
  });

  it('strips both query string and trailing slash', () => {
  expect(sessionKey('/docs/paper.pdf/?foo=1')).toBe('lemmamap:session:/docs/paper.pdf');
  expect(sessionKey('/docs/paper.pdf/?')).toBe('lemmamap:session:/docs/paper.pdf');
});

  it('falls back to "default" for empty string', () => {
    expect(sessionKey('')).toBe('lemmamap:session:default');
  });

  it('falls back to "default" for null/undefined', () => {
    expect(sessionKey(null)).toBe('lemmamap:session:default');
    expect(sessionKey(undefined)).toBe('lemmamap:session:default');
  });

  it('handles Windows-style paths without mutation', () => {
    expect(sessionKey('C:\\Users\\docs\\paper.pdf')).toBe('lemmamap:session:C:\\Users\\docs\\paper.pdf');
  });

  it('two different paths produce different keys', () => {
    expect(sessionKey('/a/b.pdf')).not.toBe(sessionKey('/a/c.pdf'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: saveSession() / loadSession()
// ─────────────────────────────────────────────────────────────────────────────
describe('saveSession() / loadSession()', () => {
  beforeEach(() => localStorageMock.clear());

  it('round-trips basic session data', () => {
    const data = { regions: [], selectedRegionId: null, dualSplitPaneLeftPct: 50, scrollTop: 0 };
    saveSession('/docs/paper.pdf', data);
    const result = loadSession('/docs/paper.pdf');
    expect(result.regions).toEqual([]);
    expect(result.dualSplitPaneLeftPct).toBe(50);
    expect(result.pdfPath).toBe('/docs/paper.pdf');
  });

  it('savedAt is set to a recent timestamp', () => {
    const before = Date.now();
    saveSession('/docs/paper.pdf', { regions: [] });
    const result = loadSession('/docs/paper.pdf');
    expect(result.savedAt).toBeGreaterThanOrEqual(before);
    expect(result.savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns null for a path with no saved session', () => {
    expect(loadSession('/nonexistent/file.pdf')).toBeNull();
  });

  it('overwrites previous session on re-save', () => {
    saveSession('/docs/paper.pdf', { regions: ['reg_1'] });
    saveSession('/docs/paper.pdf', { regions: ['reg_1', 'reg_2'] });
    const result = loadSession('/docs/paper.pdf');
    expect(result.regions).toHaveLength(2);
  });

  it('preserves complex region data', () => {
    const regions = [
      { id: 'reg_1', type: 'rect', x: 10, y: 20, w: 100, h: 50 },
      { id: 'reg_2', type: 'lasso', x: 5, y: 5, w: 80, h: 60, points: [{ x: 0, y: 0 }, { x: 80, y: 60 }] },
      { id: 'reg_3', type: 'section', x: 0, y: 100, w: 16, h: 200 },
    ];
    saveSession('/docs/paper.pdf', { regions, selectedRegionId: 'reg_1', dualSplitPaneLeftPct: 60, scrollTop: 450 });
    const result = loadSession('/docs/paper.pdf');
    expect(result.regions).toHaveLength(3);
    expect(result.regions[1].points).toHaveLength(2);
    expect(result.selectedRegionId).toBe('reg_1');
    expect(result.scrollTop).toBe(450);
  });

  it('gracefully returns null if localStorage value is malformed JSON', () => {
    localStorage.setItem(sessionKey('/bad.pdf'), 'NOT_JSON{{{');
    expect(loadSession('/bad.pdf')).toBeNull();
  });

  it('sessions for different PDFs are independent', () => {
    saveSession('/a.pdf', { dualSplitPaneLeftPct: 40 });
    saveSession('/b.pdf', { dualSplitPaneLeftPct: 70 });
    expect(loadSession('/a.pdf').dualSplitPaneLeftPct).toBe(40);
    expect(loadSession('/b.pdf').dualSplitPaneLeftPct).toBe(70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: debounce()
// ─────────────────────────────────────────────────────────────────────────────
describe('debounce()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not call fn immediately', () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d('arg1');
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn after delay', () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d('arg1');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('arg1');
  });

  it('resets timer on successive calls (only last wins)', () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d('first');
    vi.advanceTimersByTime(200);
    d('second');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('flush() calls fn immediately and clears pending timer', () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d('queued');
    d.flush('flushed');
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('flushed');
    vi.advanceTimersByTime(300);
    // Should NOT be called again after flush
    expect(fn).toHaveBeenCalledOnce();
  });

  it('flush() without prior call invokes fn immediately', () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d.flush('direct');
    expect(fn).toHaveBeenCalledWith('direct');
  });

  it('multiple independent debouncers do not interfere', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const d1 = debounce(fn1, 100);
    const d2 = debounce(fn2, 200);
    d1('a');
    d2('b');
    vi.advanceTimersByTime(100);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn2).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Global Whiteboard Registry
// ─────────────────────────────────────────────────────────────────────────────
describe('getAllWhiteboards()', () => {
  beforeEach(() => localStorageMock.clear());

  it('returns empty array when nothing is stored', () => {
    expect(getAllWhiteboards()).toEqual([]);
  });

  it('returns empty array when stored value is malformed', () => {
    localStorage.setItem('lemmamap:whiteboards', 'GARBAGE');
    expect(getAllWhiteboards()).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify({ id: 'wb_1' }));
    expect(getAllWhiteboards()).toEqual([]);
  });

  it('deduplicates entries with the same id', () => {
    const wb = { id: 'wb_1', name: 'Test', type: 'standalone-whiteboard' };
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify([wb, wb, { ...wb, name: 'Dupe' }]));
    const result = getAllWhiteboards();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wb_1');
  });

  it('filters out entries missing an id', () => {
    const wbs = [
      { id: 'wb_1', name: 'Good' },
      { name: 'No ID' },
      null,
    ];
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify(wbs));
    const result = getAllWhiteboards();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wb_1');
  });
});

describe('pruneWhiteboards()', () => {
  beforeEach(() => localStorageMock.clear());

  it('removes whiteboards not in the valid id set', () => {
    const wbs = [
      { id: 'wb_1', name: 'Keep' },
      { id: 'wb_2', name: 'Remove' },
    ];
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify(wbs));
    pruneWhiteboards(['wb_1']);
    const result = getAllWhiteboards();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wb_1');
  });

  it('also prunes the folder map', () => {
    const wbs = [{ id: 'wb_1', name: 'Keep' }, { id: 'wb_2', name: 'Remove' }];
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify(wbs));
    localStorage.setItem('lemmamap:whiteboardFolders', JSON.stringify({
      '/library': ['wb_1', 'wb_2'],
    }));
    pruneWhiteboards(['wb_1']);
    const folderMap = JSON.parse(localStorage.getItem('lemmamap:whiteboardFolders'));
    expect(folderMap['/library']).toEqual(['wb_1']);
  });

  it('with empty validIds removes all whiteboards', () => {
    const wbs = [{ id: 'wb_1', name: 'A' }, { id: 'wb_2', name: 'B' }];
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify(wbs));
    pruneWhiteboards([]);
    expect(getAllWhiteboards()).toHaveLength(0);
  });
});

describe('getWhiteboardsForFolder()', () => {
  beforeEach(() => localStorageMock.clear());

  it('returns empty array when no library is set', () => {
    expect(getWhiteboardsForFolder(null)).toEqual([]);
    expect(getWhiteboardsForFolder('')).toEqual([]);
  });

  it('returns whiteboards mapped to the given folder', () => {
    const wbs = [
      { id: 'wb_1', name: 'A' },
      { id: 'wb_2', name: 'B' },
      { id: 'wb_3', name: 'C' },
    ];
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify(wbs));
    localStorage.setItem('lemmamap:whiteboardFolders', JSON.stringify({
      '/library/math': ['wb_1', 'wb_3'],
      '/library/phys': ['wb_2'],
    }));
    const result = getWhiteboardsForFolder('/library/math');
    expect(result).toHaveLength(2);
    expect(result.map(w => w.id)).toEqual(['wb_1', 'wb_3']);
  });

  it('deduplicates within folder result', () => {
    const wbs = [{ id: 'wb_1', name: 'A' }];
    localStorage.setItem('lemmamap:whiteboards', JSON.stringify(wbs));
    localStorage.setItem('lemmamap:whiteboardFolders', JSON.stringify({
      '/library': ['wb_1', 'wb_1'],
    }));
    const result = getWhiteboardsForFolder('/library');
    expect(result).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Geometry helpers (imported from App.jsx logic, tested inline)
// ─────────────────────────────────────────────────────────────────────────────
// These are pure functions extracted for testability. If you ever move them
// to a shared geometry.js module, import them here instead.

const rectFromDrag = (drag) => ({
  x: Math.min(drag.startX, drag.currentX),
  y: Math.min(drag.startY, drag.currentY),
  w: Math.abs(drag.startX - drag.currentX),
  h: Math.abs(drag.startY - drag.currentY),
});

const isNearBorder = (coords, r, threshold = 6) => {
  const { x, y } = coords;
  const inX = x >= r.x - threshold && x <= r.x + r.w + threshold;
  const inY = y >= r.y - threshold && y <= r.y + r.h + threshold;
  return (
    (Math.abs(x - r.x)         < threshold && inY) ||
    (Math.abs(x - (r.x + r.w)) < threshold && inY) ||
    (Math.abs(y - r.y)         < threshold && inX) ||
    (Math.abs(y - (r.y + r.h)) < threshold && inX)
  );
};

const toRoman = (n) => {
  const numerals = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
    [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ];
  let num = n, out = '';
  for (const [value, symbol] of numerals) {
    while (num >= value) { out += symbol; num -= value; }
  }
  return out || 'I';
};

describe('rectFromDrag()', () => {
  it('produces correct rect from top-left to bottom-right drag', () => {
    const r = rectFromDrag({ startX: 10, startY: 20, currentX: 110, currentY: 120 });
    expect(r).toEqual({ x: 10, y: 20, w: 100, h: 100 });
  });

  it('normalizes drag in reverse direction (bottom-right to top-left)', () => {
    const r = rectFromDrag({ startX: 110, startY: 120, currentX: 10, currentY: 20 });
    expect(r).toEqual({ x: 10, y: 20, w: 100, h: 100 });
  });

  it('handles zero-size drag', () => {
    const r = rectFromDrag({ startX: 50, startY: 50, currentX: 50, currentY: 50 });
    expect(r).toEqual({ x: 50, y: 50, w: 0, h: 0 });
  });

  it('handles diagonal drags correctly', () => {
    const r = rectFromDrag({ startX: 30, startY: 70, currentX: 80, currentY: 10 });
    expect(r).toEqual({ x: 30, y: 10, w: 50, h: 60 });
  });
});

describe('isNearBorder()', () => {
  const rect = { x: 100, y: 100, w: 200, h: 150 };
  const threshold = 6;

  it('detects point on left border', () => {
    expect(isNearBorder({ x: 103, y: 150 }, rect, threshold)).toBe(true);
  });

  it('detects point on right border', () => {
    expect(isNearBorder({ x: 297, y: 150 }, rect, threshold)).toBe(true);
  });

  it('detects point on top border', () => {
    expect(isNearBorder({ x: 200, y: 103 }, rect, threshold)).toBe(true);
  });

  it('detects point on bottom border', () => {
    expect(isNearBorder({ x: 200, y: 247 }, rect, threshold)).toBe(true);
  });

  it('returns false for point well inside rect', () => {
    expect(isNearBorder({ x: 200, y: 175 }, rect, threshold)).toBe(false);
  });

  it('returns false for point well outside rect', () => {
    expect(isNearBorder({ x: 50, y: 50 }, rect, threshold)).toBe(false);
  });

  it('detects corner points', () => {
    expect(isNearBorder({ x: 102, y: 102 }, rect, threshold)).toBe(true); // top-left
    expect(isNearBorder({ x: 298, y: 248 }, rect, threshold)).toBe(true); // bottom-right
  });
});

describe('toRoman()', () => {
  it('converts 1 to I', () => expect(toRoman(1)).toBe('I'));
  it('converts 2 to II', () => expect(toRoman(2)).toBe('II'));
  it('converts 3 to III', () => expect(toRoman(3)).toBe('III'));
  it('converts 4 to IV', () => expect(toRoman(4)).toBe('IV'));
  it('converts 5 to V', () => expect(toRoman(5)).toBe('V'));
  it('converts 8 to VIII', () => expect(toRoman(8)).toBe('VIII'));
  it('converts 9 to IX', () => expect(toRoman(9)).toBe('IX'));
  it('converts 0 to I (fallback)', () => expect(toRoman(0)).toBe('I'));
  it('converts 14 to XIV', () => expect(toRoman(14)).toBe('XIV'));
  it('converts 40 to XL', () => expect(toRoman(40)).toBe('XL'));
  it('converts 1999 to MCMXCIX', () => expect(toRoman(1999)).toBe('MCMXCIX'));
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: loadSettings() / saveSettings() (HomeScreen.jsx helpers)
// ─────────────────────────────────────────────────────────────────────────────
// Copy these out of HomeScreen.jsx into a shared settings.js for clean imports.
// Until then, the logic is re-stated here for direct testing.

const SETTINGS_KEY = 'lemmamap:settings';
const DEFAULT_SETTINGS = {
  theme: 'dark', autosaveMs: 800,
  maxGlobalPdfTools: 8, defaultTool: 'draw',
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

describe('loadSettings()', () => {
  beforeEach(() => localStorageMock.clear());

  it('returns defaults when nothing is saved', () => {
    const s = loadSettings();
    expect(s.maxGlobalPdfTools).toBe(8);
    expect(s.defaultTool).toBe('draw');
  });

  it('merges saved settings over defaults', () => {
    saveSettings({ maxGlobalPdfTools: 4 });
    const s = loadSettings();
    expect(s.maxGlobalPdfTools).toBe(4);
    expect(s.defaultTool).toBe('draw'); // default preserved
  });

  it('returns defaults if stored JSON is corrupt', () => {
    localStorage.setItem(SETTINGS_KEY, '{BAD JSON');
    const s = loadSettings();
    expect(s.maxGlobalPdfTools).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: Recents helpers (HomeScreen.jsx)
// ─────────────────────────────────────────────────────────────────────────────
const RECENTS_KEY = 'lemmamap:recents';

function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); }
  catch { return []; }
}

function pushRecent(entry) {
  try {
    const list = getRecents().filter(r => r.path !== entry.path).slice(0, 7);
    list.unshift({ ...entry, openedAt: Date.now() });
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function removeRecent(path) {
  try {
    const list = getRecents().filter(r => r.path !== path);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

describe('Recents helpers', () => {
  beforeEach(() => localStorageMock.clear());

  it('getRecents returns [] when nothing stored', () => {
    expect(getRecents()).toEqual([]);
  });

  it('pushRecent adds an entry', () => {
    pushRecent({ path: '/a.pdf', name: 'A' });
    expect(getRecents()).toHaveLength(1);
    expect(getRecents()[0].path).toBe('/a.pdf');
  });

  it('pushRecent deduplicates same path (newest at front)', () => {
    pushRecent({ path: '/a.pdf', name: 'A' });
    pushRecent({ path: '/b.pdf', name: 'B' });
    pushRecent({ path: '/a.pdf', name: 'A updated' });
    const list = getRecents();
    expect(list).toHaveLength(2);
    expect(list[0].path).toBe('/a.pdf');
  });

  it('pushRecent caps at 8 entries', () => {
    for (let i = 0; i < 10; i++) {
      pushRecent({ path: `/file${i}.pdf`, name: `File ${i}` });
    }
    expect(getRecents()).toHaveLength(8);
  });

  it('removeRecent removes only that entry', () => {
    pushRecent({ path: '/a.pdf', name: 'A' });
    pushRecent({ path: '/b.pdf', name: 'B' });
    removeRecent('/a.pdf');
    const list = getRecents();
    expect(list).toHaveLength(1);
    expect(list[0].path).toBe('/b.pdf');
  });

  it('removeRecent on non-existent path does nothing', () => {
    pushRecent({ path: '/a.pdf', name: 'A' });
    removeRecent('/nonexistent.pdf');
    expect(getRecents()).toHaveLength(1);
  });

  it('sets openedAt timestamp automatically', () => {
    const before = Date.now();
    pushRecent({ path: '/a.pdf', name: 'A' });
    const after = Date.now();
    const ts = getRecents()[0].openedAt;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
