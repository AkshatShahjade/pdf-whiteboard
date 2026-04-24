# LemmaMap v0.1.1 — Complete Feature Inventory

> Derived from full source audit of: `App.jsx`, `HomeScreen.jsx`, `storage.js`, `HandwritingTool.jsx`
> Status key: ✅ Implemented & tested  ⚠️ Implemented, known issues  🔲 Planned

---

## 1. HOME SCREEN

### 1.1 Library Management
- ✅ Set Library Folder (via Tauri file picker, stored in `lemmamap:library`)
- ✅ Library folder persists across sessions
- ✅ PDF files in library are displayed in a folder-tree browser
- ✅ Add Folder button creates subfolders inside the library tree
- ✅ Add Whiteboard button creates a `.whiteboard.json` file in any folder
- ✅ Drag & Drop PDF onto DropZone copies it into the library folder
- ✅ Click DropZone opens native file picker to import PDF
- ✅ DropZone is disabled (with error toast) if no library folder is set

### 1.2 Recents
- ✅ Recently opened PDFs and Whiteboards shown as cards
- ✅ Each recent card shows: name, time-ago timestamp, region count, last page
- ✅ Clicking a recent card reopens the item directly
- ✅ Clicking ✕ on a recent card removes it from recents only (does not delete file)
- ✅ Recents list capped at 8 entries (oldest removed on overflow)
- ✅ Recents persist in `lemmamap:recents` localStorage key

### 1.3 Settings Drawer
- ✅ Default Split (pane ratio, 10–90%)
- ✅ Theme setting stored (dark default)
- ✅ Autosave interval (ms)
- ✅ Max Global PDF Tools (1–8)
- ✅ Default Tldraw tool on open (`draw` default)
- ✅ Set Backup Folder via Tauri picker
- ✅ Export All Data → opens save dialog, writes `lemmamap_backup.json`
- ✅ Import All Data → opens open dialog, restores from JSON, reloads app
- ✅ Manual Backup button (triggers rolling backup immediately)
- ✅ Clear Session Data clears `lemmamap:recents` only
- ✅ Confirm dialog shown before Clear Session Data
- ✅ Auto-backup on a timer (interval from settings, min 1 minute)
- ✅ Backup folder path shown in settings; missing path shows warning toast

### 1.4 Help Modal
- ✅ Opens from ? button on HomeScreen
- ✅ Describes all tools, shortcuts, architecture
- ✅ Closed by ✕ button or "Understood" button

### 1.5 Navigation to Workspace
- ✅ Opening a PDF → navigates to WorkspaceApp (pdf mode)
- ✅ Opening a Whiteboard from library → navigates to WhiteboardOnlyApp
- ✅ Session for the PDF is loaded on open (regions, scroll, split, global tools)
- ✅ pdfLocalPath passed alongside URL path for directory resolution

---

## 2. PDF WORKSPACE (WorkspaceApp)

### 2.1 PDF Rendering
- ✅ PDF loaded into memory as `Uint8Array` via `fetch()` then passed to `react-pdf`
- ✅ "Loading document into memory..." shown while fetching
- ✅ Lazy page rendering (IntersectionObserver, 800px root margin, first 2 pages eager)
- ✅ Page separator line between pages (2px solid black border-bottom)
- ✅ PDF_WIDTH fixed at 800px; scale applied via `zoom` state

### 2.2 Zoom
- ✅ Zoom In button (+) increments by 0.25, max 3.0
- ✅ Zoom Out button (-) decrements by 0.25, min 0.5
- ✅ Current zoom % displayed between buttons
- ✅ Ctrl+Scroll zooms in/out (debounced at 250ms per step)
- ✅ Ctrl+0 resets zoom to 1.0 (100%)
### 2.3 Page Navigation
- ✅ Page input field at bottom center shows current page / total pages
- ✅ Type a page number and press Enter to jump to that page
- ✅ Invalid page input reverts to current page on blur
- ✅ Scrolling updates the current page counter automatically
- ✅ Page counter does not update while the input is focused

### 2.4 Scrolling
- ✅ Vertical scroll via scrollwheel in PDF pane
- ✅ Shift+Scroll pans horizontally
- ✅ Scroll position saved and restored on session reload

### 2.5 Pane Splitter
- ✅ Draggable divider between PDF and whiteboard panes
- ✅ Clamped between MIN_PANE_PCT (15%) and MAX_PANE_PCT (85%)
- ✅ Split position saved to session, restored on reload
- ✅ Ctrl+\ snaps split to 55%
- ✅ Whiteboard pane hidden entirely when no region is selected
- ✅ Smooth CSS transition on width change

### 2.6 Focus / Active Pane
- ✅ `activePane` set to `'pdf'` on mouse enter of PDF pane
- ✅ `activePane` set to `'whiteboard'` on mouse enter of whiteboard pane
- ✅ PDF keyboard shortcuts (v/r/c/s/x) only fire when activePane === 'pdf'
- ✅ Tldraw keyboard shortcuts only fire when Tldraw pane is focused (Tldraw handles this internally)

---

## 3. REGION TOOLS

### 3.1 Select Tool (V)
- ✅ Click on a region border → opens its whiteboard in the right pane
- ✅ Selected region highlighted (fill + solid stroke vs. dashed)
- ✅ Ctrl+Click on border → enters edit mode for that region
- ✅ Ctrl+Click+Drag on border → moves region, then enters edit mode on mouse-up
- ✅ Clicking background while Select tool active has no effect (no region deselect on bare click — Esc deselects)

### 3.2 Rect Tool (R)
- ✅ Click+drag draws a rectangular region
- ✅ Minimum size enforced (10/zoom px each dimension)
- ✅ Region created with auto-incremented ID (`reg_<timestamp>`)
- ✅ New rect region immediately selected (whiteboard opens)
- ✅ In edit mode: drawing a new rect replaces the region's shape, whiteboard data preserved
- ✅ Cancel button in edit mode reverts to original shape
- ✅ Update button in edit mode confirms new shape
- ✅ Esc in edit mode reverts and exits

### 3.3 Lasso Tool (C)
- ✅ Freehand draw closes automatically on mouse-up
- ✅ Minimum size enforced (10/zoom px bounding box)
- ✅ Points sampled with 2/zoom minimum movement threshold
- ✅ Lasso stored as relative points inside bounding box (x, y, w, h, points[])
- ✅ New lasso region immediately selected
- ✅ In edit mode: redrawing replaces shape, whiteboard data preserved
- ✅ Cancel / Update / Esc same as Rect edit mode

### 3.4 Section Tool (S)
- ✅ Press S to activate; press S again to cancel back to Select
- ✅ Click once sets Start line (horizontal, full width)
- ✅ Click again sets End line
- ✅ Start and End lines shown as dashed green overlay
- ✅ Start / End buttons in mini-menu to re-target which line is being set
- ✅ Confirm/Update button finalizes section (disabled until both lines set)
- ✅ Cancel button resets section tool
- ✅ Enter key also confirms section
- ✅ Esc during section creation cancels and resets
- ✅ Ctrl+Click on section sidebar → re-enters section edit mode for that region
- ✅ Sections render as colored vertical bars on left and right edges
- ✅ Nested sections shown with increasing bar width (computed `sectionWidths`)
- ✅ Cursor is bracket-down for Start target, bracket-up for End target

### 3.5 Remove Tool (X)
- ✅ Click on any region border → shows native confirm dialog
- ✅ On confirm: region deleted from state, whiteboard data deleted from IndexedDB, selection cleared
- ✅ On cancel: no change
- ✅ Custom red X cursor shown

### 3.6 Region Rendering (SVG Overlay)
- ✅ All regions rendered as SVG overlay positioned absolutely over PDF content
- ✅ Each region has a colored label badge (R1, R2... / S1, S2...)
- ✅ Color assigned from 8-color palette by region index mod 8
- ✅ Hit area for borders uses transparent `STROKE_HIT_WIDTH` (12px) wide path/rect
- ✅ Selected region shows fill + solid stroke; unselected shows dashed stroke, no fill
- ✅ In-progress rect drag shown as dashed blue rect preview
- ✅ In-progress lasso shown as dashed blue polyline preview
- ✅ Auto-scroll during drag when mouse is within 80px of top/bottom edge

### 3.7 Region Cursors
- ✅ Default: `default`
- ✅ Rect tool: `crosshair`
- ✅ Lasso tool: custom lasso SVG cursor
- ✅ Remove tool: custom red X cursor
- ✅ Section tool (Start target): bracket-down SVG cursor
- ✅ Section tool (End target): bracket-up SVG cursor
- ✅ Moving region: `grabbing`

---

## 4. GLOBAL WHITEBOARD TOOLS

### 4.1 Tool Slots
- ✅ Default 1 tool slot shown (Roman numeral I)
- ✅ + button adds slots up to `maxGlobalPdfTools` (default 8)
- ✅ + button hidden when at max
- ✅ Slots labeled I, II, III, IV... in Roman numerals
- ✅ Slot count and links persisted in session

### 4.2 Unlinked Tool (no whiteboard assigned)
- ✅ Clicking opens the Select Whiteboard panel (inline, right of toolbar)
- ✅ Panel lists all `.whiteboard.json` files found in library tree
- ✅ Clicking a whiteboard in the list selects it and opens it immediately
- ✅ Text input + Create button creates a new whiteboard and links it
- ✅ Cancel button closes panel without linking
- ✅ Delete Tool button (if >1 slot) removes the slot with confirm dialog

### 4.3 Linked Tool
- ✅ Clicking opens the linked whiteboard in the right pane
- ✅ Controls shown: Update, Close, Delete Tool
- ✅ Update opens the select panel; only changes link if a new whiteboard is chosen
- ✅ Close closes the whiteboard pane and clears selectedGlobalToolIdx
- ✅ Delete Tool (if >1 slot) removes slot with confirm dialog
- ✅ Selecting a global tool sets selectedGlobalToolIdx and clears selectedRegionId

### 4.4 View Stack (ESC Navigation)
- ✅ Opening a global tool while a region (or other global tool) is open pushes current view to viewStack
- ✅ Esc pops viewStack: restores previous whiteboard (region or global)
- ✅ Final Esc (empty stack) closes whiteboard pane entirely

---

## 5. WHITEBOARD PANE

### 5.1 Loading & Persistence
- ✅ `WhiteboardPane` loads snapshot from IndexedDB on mount
- ✅ "loading workspace..." shown while IndexedDB read is in flight
- ✅ Snapshot loaded into Tldraw via `editor.loadSnapshot()`
- ✅ Changes debounced-saved to IndexedDB (800ms default)
- ✅ Flush on unmount (saves immediately when whiteboard pane closes)
- ✅ Each regionId maps to exactly one IndexedDB record

### 5.2 Tldraw Instance
- ✅ Default tool set from `settings.defaultTool` on mount
- ✅ Export background disabled by default
- ✅ Custom font variables injected via `<style>` (Helvetica for all Tldraw text)
- ✅ Handwriting tool added to toolbar (before the default draw tool)
- XX Shift+Scroll horizontal pan forwarded to Tldraw's internal wheel handler not workinf
- Must use alt+shift+scroll for horizontal pan

### 5.3 Handwriting Tool (W)
- ✅ Custom Tldraw tool registered as type `'handwriting'`
- ✅ Keyboard shortcut: W
- ✅ Uses quadratic bezier path rendering (reduced smoothing vs. full midpoint curve)
- ✅ Stroke sizes: s=2, m=4, l=8, xl=16
- ✅ Pressure support for pen/stylus (z-value detection)
- ✅ Min point distance: 0.01 (very fine resolution)
- ✅ Shape persists via standard Tldraw snapshot mechanism
- ✅ Uses `drawShapeProps` and `DrawShapeUtil` base (inherits color, size, etc.)

---

## 6. WHITEBOARD-ONLY APP (WhiteboardOnlyApp)

- ✅ Full-screen Tldraw with no PDF pane
- ✅ Same WorkspaceHeader (Home, title, Backup, SaveIndicator)
- ✅ Backup triggers rolling backup same as WorkspaceApp
- ✅ Toast notifications for backup success/failure

---

## 7. HEADER & NAVIGATION

- ✅ WorkspaceHeader appears on mouse-hover near top edge (height 16px → 48px)
- ✅ Header contains: Home button, document/whiteboard title, Backup button, SaveIndicator
- ✅ Header uses glassmorphism style (blur, semi-transparent)
- ✅ Home button returns to HomeScreen (session is saved before navigation)
- ✅ SaveIndicator flashes "✓ saved" for 1.8s after each debounced save

---

## 8. SESSION PERSISTENCE (storage.js)

### 8.1 Session (localStorage)
- ✅ `sessionKey(pdfPath)` strips query strings and trailing slashes
- ✅ `saveSession(pdfPath, data)` — saves regions, selectedRegionId, scrollTop, leftPct, globalToolCount, globalToolLinks
- ✅ `loadSession(pdfPath)` — returns parsed session or null
- ✅ Session saved on: region change, selection change, split change, scroll (400ms debounce), beforeunload (flushed)

### 8.2 Whiteboards (IndexedDB)
- ✅ `saveWhiteboard(regionId, snapshot)` — puts snapshot keyed by regionId
- ✅ `loadWhiteboard(regionId)` — returns snapshot or null
- ✅ `deleteWhiteboard(regionId)` — removes record
- ✅ Single shared DB instance (`_db` singleton, opened once)

### 8.3 Export / Import
- ✅ `getAllData()` — gathers all `lemmamap:*` localStorage keys + all IndexedDB records
- ✅ `restoreAllData(data)` — writes all keys back to localStorage + IndexedDB
- ✅ Export triggered from Settings → writes JSON via Tauri `writeTextFile`
- ✅ Import triggered from Settings → reads JSON, calls restoreAllData, reloads app

### 8.4 Rolling Backup
- ✅ `performRollingBackup()` — exports all data, writes `backup_<n>.json`, deletes `backup_<n-2>.json`
- ✅ Backup index persisted in `lemmamap:backupIndex`
- ✅ Backup path persisted in `lemmamap:backupPath`
- ✅ Auto-backup fires on a timer (configurable interval, min 60s)
- ✅ Manual backup button in header of both WorkspaceApp and WhiteboardOnlyApp

### 8.5 Global Whiteboard Registry (localStorage)
- ✅ `getAllWhiteboards()` — returns deduped whiteboard metadata array
- ✅ `createWhiteboard(name, folderPath)` — creates metadata + writes `.whiteboard.json` file
- ✅ `deleteGlobalWhiteboard(id)` — removes from registry + folder map + IndexedDB
- ✅ `pruneWhiteboards(validIds)` — removes any registry entries not in the valid set
- ✅ `getWhiteboardsForFolder(folderPath)` — returns whiteboards belonging to a folder

### 8.6 Utilities
- ✅ `debounce(fn, ms)` — standard debounce with `.flush()` method
- ✅ `toRoman(n)` — converts integer to Roman numeral string

---

## 9. KEYBOARD SHORTCUTS (full map)

| Key | Context | Action |
|-----|---------|--------|
| V | PDF pane focused | Select tool |
| R | PDF pane focused | Rect tool |
| C | PDF pane focused | Lasso tool |
| S | PDF pane focused | Toggle Section tool (activate / cancel back to Select) |
| X | PDF pane focused | Remove tool |
| Enter | Section tool active, both lines set | Confirm/finalize section |
| Enter | Shape edit mode active | Confirm shape edit |
| Esc | Shape edit mode | Revert shape, exit edit mode |
| Esc | Section tool active | Cancel section creation/edit |
| Esc | Select panel open | Close select panel |
| Esc | Global tool open | Pop view stack (restore previous whiteboard) |
| Esc | Region selected, no stack | Deselect region |
| Ctrl+Scroll | PDF pane | Zoom in/out |
| Shift+Scroll | PDF pane | Pan horizontally |
| Ctrl+0 | Anywhere (not typing) | Reset PDF zoom to 100% |
| Ctrl+\ | Anywhere (not typing) | Snap split to 55% |
| 1–8 | Anywhere (not typing) | Activate global tool slot 1–8 |
| W | Tldraw focused | Handwriting tool |
| V,D,T,E,etc. | Tldraw focused | Standard Tldraw shortcuts (unmodified) |
| Alt+Shift+Scroll | Tldraw pane | Pan horizontally |
