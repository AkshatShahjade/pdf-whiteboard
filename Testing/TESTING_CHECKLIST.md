# LemmaMap v0.1.1 — Manual Testing Checklist

> Run this checklist before every commit that touches feature code.
> Check off each item as you test. A failed item = fix before committing.
> Add new items at the bottom of each section when you ship new features.
>
> Estimated time for full run: ~15 minutes
> Estimated time for a targeted section: 2–4 minutes

---

## HOW TO USE THIS

1. Open the app fresh (restart the Tauri app, don't just refresh)
2. Have a test PDF ready (any multi-page PDF, 5+ pages recommended)
3. Go section by section, checking each box
4. If anything fails, open a bug note at the bottom before committing

---

## SECTION A — Home Screen

### A1. Library Setup
- [ ] App opens to HomeScreen when no session is active
- [ ] DropZone is visible and greyed out before library is set
- [ ] Clicking DropZone before setting library shows error toast: "Please set a Library Folder first!"
- [ ] Set Library Folder via Settings → picker opens → selecting a folder saves it
- [ ] After setting library, DropZone becomes active (no longer greyed out)
- [ ] Library folder path shown in Settings drawer

### A2. Importing a PDF
- [ ] Click DropZone → native file picker opens → selecting a PDF navigates to workspace
- [ ] Drag a PDF onto the DropZone → copies file to library → navigates to workspace
- [ ] Dragging a non-PDF file shows no crash (gracefully ignored)

### A3. Recents
- [ ] Opening a PDF creates a card in Recents section
- [ ] Card shows: filename, time-ago, region count (if any)
- [ ] Clicking a recent card reopens that PDF
- [ ] Clicking ✕ on a recent card removes the card (does not delete file)
- [ ] After removal, card is gone after re-render (not just hidden)
- [ ] Recents list preserved after app restart

### A4. Library Browser (Whiteboard creation)
- [ ] Add Folder button creates a new subfolder in the library tree
- [ ] Add Whiteboard button next to a folder creates a `.whiteboard.json` file in that folder
- [ ] Created whiteboard appears in library tree
- [ ] Clicking a whiteboard in library opens WhiteboardOnlyApp

### A5. Settings Drawer
- [ ] Settings drawer opens and closes without crash
- [ ] Changing Default Split and re-opening a PDF respects the new value
- [ ] Changing Default Tool: opening a whiteboard starts with that tool active in Tldraw
- [ ] Max Global PDF Tools: setting to 2 limits tool slots to 2 in workspace
- [ ] Export All Data: opens save dialog, creates a `.json` file
- [ ] Import All Data: opens file picker, importing the previously exported file restores data and reloads
- [ ] Manual Backup button: creates `backup_N.json` in backup folder, shows success toast
- [ ] Manual Backup without backup folder set: shows error toast with helpful message
- [ ] Clear Session Data: shows confirm dialog before clearing
- [ ] Clear Session Data: after confirm, Recents list is empty; PDF sessions (regions) are NOT deleted
- [ ] Set Backup Folder: picker opens, selected path shown in settings

### A6. Help Modal
- [ ] ? button opens help modal
- [ ] Help modal shows all 4 sections (Philosophy, Shortcuts, View Controls, Architecture)
- [ ] ✕ button closes modal
- [ ] "Understood" button closes modal

---

## SECTION B — PDF Workspace: Loading & Navigation

### B1. PDF Load
- [ ] "Loading document into memory..." shown briefly before PDF renders
- [ ] PDF renders correctly (pages visible, no blank white)
- [ ] Multiple pages render with separator lines between them
- [ ] Page counter shows "Page 1 / N" at bottom center

### B2. Zoom
- [ ] + button increments zoom by 25%
- [ ] − button decrements zoom by 25%
- [ ] Zoom display updates correctly (e.g., "125%")
- [ ] Zoom capped at maximum 300% (+ button greyed or unresponsive)
- [ ] Zoom capped at minimum 50% (− button greyed or unresponsive)
- [ ] Ctrl+Scroll up zooms in
- [ ] Ctrl+Scroll down zooms out
- [ ] Ctrl+0 resets zoom to 100%

### B3. Scrolling & Page Navigation
- [ ] Scrollwheel scrolls the PDF vertically
- [ ] Page counter updates as you scroll through pages
- [ ] Type a page number in the input + Enter → scrolls to that page
- [ ] Type an invalid page number → reverts to current page on blur
- [ ] Shift+Scroll pans horizontally at a zoomed-in level
- [ ] Scroll position is saved and restored on app restart (test: scroll to page 3, close, reopen)

### B4. Pane Splitter
- [ ] Dragging the splitter resizes both panes
- [ ] Split clamped between ~15% and ~85%
- [ ] Ctrl+\ snaps split to 55% when a whiteboard is open
- [ ] Ctrl+\ does nothing when no region is selected (no whiteboard open)
- [ ] Split position restored on app restart

### B5. Header
- [ ] Moving mouse to top edge of screen reveals the header
- [ ] Moving mouse away hides the header again
- [ ] PDF filename shown in header
- [ ] Home button returns to HomeScreen
- [ ] Backup button in header triggers rolling backup (same as manual backup)
- [ ] "✓ saved" indicator flashes briefly after any save

---

## SECTION C — Region Tools

### C1. Select Tool (V)
- [ ] Press V activates Select tool (button highlighted in toolbar)
- [ ] Click on a region border → whiteboard opens in right pane, region highlighted
- [ ] Click on empty PDF area → no action (region stays selected)
- [ ] Esc closes the whiteboard pane (deselects region)

### C2. Rect Tool (R)
- [ ] Press R activates Rect tool
- [ ] Cursor changes to crosshair
- [ ] Click+drag draws a blue dashed preview rectangle
- [ ] Releasing mouse creates a region (colored border + label badge)
- [ ] Newly created region is immediately selected (whiteboard opens)
- [ ] Tiny drag (< ~10px) does NOT create a region
- [ ] Ctrl+Click on a rect region border → enters edit mode (Cancel/Update buttons appear)
- [ ] In edit mode: draw a new rect → click Update → region shape changes, whiteboard data preserved
- [ ] In edit mode: click Cancel → region shape reverts to original
- [ ] In edit mode: press Esc → region shape reverts to original

### C3. Lasso Tool (C)
- [ ] Press C activates Lasso tool
- [ ] Custom lasso cursor shown
- [ ] Freehand draw creates a polyline preview (blue dashed)
- [ ] Releasing mouse closes the lasso and creates a region
- [ ] Newly created region is immediately selected
- [ ] Tiny lasso does NOT create a region
- [ ] Ctrl+Click on lasso border (horizontal/vertical edge) → enters edit mode
- [ ] Edit mode: redraw + Update changes shape, whiteboard data preserved
- [ ] Edit mode: Cancel/Esc reverts

### C4. Section Tool (S)
- [ ] Press S activates Section tool
- [ ] Mini-menu appears next to Section button: Start, End, Confirm, Cancel
- [ ] Press S again → deactivates section tool (back to Select)
- [ ] Click in PDF → sets Start line (green dashed horizontal line)
- [ ] Click again → sets End line (second green dashed line)
- [ ] Confirm button enabled once both lines are set
- [ ] Clicking Confirm creates a section region (colored bars on left and right edges)
- [ ] Newly created section is immediately selected (whiteboard opens)
- [ ] Esc during section tool → cancels, lines removed, tool returns to Select
- [ ] Cancel button in mini-menu → same as Esc
- [ ] Ctrl+Click on a section bar → re-opens section edit mode for that region
- [ ] In section edit mode: clicking Update changes the section bounds
- [ ] Cursor shows bracket-down when targeting Start, bracket-up when targeting End
- [ ] Start/End buttons in mini-menu switch the active target
- [ ] Nested sections show increasing bar width (inner section has narrower bar)

### C5. Remove Tool (X)
- [ ] Press X activates Remove tool
- [ ] Custom red X cursor shown
- [ ] Click on region border → native confirm dialog appears
- [ ] Confirm deletion → region disappears, whiteboard data erased
- [ ] Cancel → region stays intact
- [ ] After deletion, whiteboard pane closes if deleted region was selected

### C6. Region Rendering
- [ ] Each region has a colored label badge (R1, R2... for rect/lasso, S1, S2... for sections)
- [ ] Selected region: solid stroke + light color fill
- [ ] Unselected region: dashed stroke, no fill
- [ ] Up to 8 distinct colors cycle through the region palette
- [ ] Drawing at the edge of the page doesn't crash
- [ ] Regions persist after app restart (test: create region, close, reopen)

### C7. Auto-scroll During Drawing
- [ ] While dragging a rect region, moving mouse to bottom edge → PDF auto-scrolls down
- [ ] While drawing a lasso, moving mouse to top edge → PDF auto-scrolls up
- [ ] Region correctly captures the scrolled coordinates (not offset from scroll)

---

## SECTION D — Global Whiteboard Tools

### D1. Basic Setup
- [ ] Toolbox shows Roman numeral "I" button by default
- [ ] + button adds a new slot (II, III...)
- [ ] + button disappears when max slots (from settings) is reached
- [ ] Slot count and links persisted across app restart

### D2. Unlinked Tool
- [ ] Clicking an unlinked tool slot opens the Select Whiteboard panel
- [ ] Panel lists all whiteboards in the library
- [ ] Clicking a whiteboard in the panel → opens that whiteboard in the right pane
- [ ] Creating a new whiteboard via the panel's input+Create → new whiteboard linked and opened
- [ ] Cancel button closes panel without any change

### D3. Linked Tool
- [ ] Clicking a linked tool slot opens the linked whiteboard
- [ ] Controls shown: Update, Close, Delete Tool
- [ ] Update → opens select panel; choosing a different whiteboard changes the link
- [ ] Update → closing panel without choosing keeps original link unchanged
- [ ] Close → closes whiteboard pane, tool slot remains
- [ ] Delete Tool (when >1 slot) → confirm dialog → slot removed, remaining slots renumbered
- [ ] Delete Tool (when only 1 slot) → Delete Tool button is NOT shown

### D4. ESC View Stack
- [ ] Open region whiteboard (by clicking a region)
- [ ] Click global tool I → global whiteboard opens, pushing region onto stack
- [ ] Press Esc → region whiteboard restores (global closes)
- [ ] Press Esc again → whiteboard pane closes entirely
- [ ] Open global tool I → open global tool II → Esc → tool I restored → Esc → pane closes
- [ ] Number keys (1, 2, 3...) open the corresponding global tool slot

---

## SECTION E — Whiteboard Pane

### E1. Tldraw Basics
- [ ] Tldraw loads when a region is selected
- [ ] "loading workspace…" shown while IndexedDB loads
- [ ] Whiteboard tools work: select (v), draw (d), text (t), eraser (e)
- [ ] Drawing in one region's whiteboard does NOT appear in another region's whiteboard
- [ ] Whiteboard content persists after: select another region → come back to first region
- [ ] Whiteboard content persists after app restart
- [ ] "✓ saved" indicator appears after drawing (800ms debounce)

### E2. Handwriting Tool (W)
- [ ] Press W activates handwriting tool (icon appears in Tldraw toolbar)
- [ ] Drawing with handwriting tool produces smooth curves
- [ ] Handwriting strokes persist like regular shapes
- [ ] Handwriting tool uses color/size from Tldraw's active style picker

### E3. Focus Isolation
- [ ] While drawing in Tldraw, pressing V/R/C/S/X does NOT switch PDF tools
- [ ] While PDF pane is hovered, Tldraw shortcuts (v for select, d for draw) do NOT fire

### E4. Shift+Scroll in Whiteboard
- [ ] Shift+Scroll horizontally pans the Tldraw canvas

---

## SECTION F — Session Persistence (End-to-End)

### F1. Full Session Round-Trip
- [ ] Create 3 regions (1 rect, 1 lasso, 1 section)
- [ ] Add content to each region's whiteboard
- [ ] Scroll to page 3
- [ ] Set split to ~30%
- [ ] Link global tool I to a whiteboard
- [ ] Close the app (via Home → close window, or title bar X)
- [ ] Reopen the same PDF
- [ ] All 3 regions are present with correct shapes
- [ ] All 3 whiteboards have their content
- [ ] Scroll position is at page 3
- [ ] Split is at ~30%
- [ ] Global tool I is still linked

### F2. Export / Import
- [ ] Export All Data creates a valid `.json` file
- [ ] Delete all regions in a session
- [ ] Import the exported file → all regions and whiteboard data restored
- [ ] App reloads automatically after import

### F3. Rolling Backup
- [ ] Manual backup creates `backup_1.json` in backup folder
- [ ] Second manual backup creates `backup_2.json`
- [ ] Third manual backup creates `backup_3.json` AND deletes `backup_1.json`
- [ ] `lemmamap:backupIndex` in localStorage increments correctly

---

## SECTION G — Keyboard Shortcuts (Full Map)

Run these with the PDF pane hovered (active):

- [ ] V → Select tool active
- [ ] R → Rect tool active
- [ ] C → Lasso tool active
- [ ] S → Section tool active
- [ ] S (again) → Section tool cancelled, back to Select
- [ ] X → Remove tool active
- [ ] Ctrl+0 → zoom resets to 100%
- [ ] Ctrl+\ (with region selected) → split snaps to 55%
- [ ] Ctrl+\ (no region selected) → nothing happens
- [ ] 1 (numpad or top-row) → opens global tool slot 1
- [ ] Esc (region selected, no drawing active) → deselects region
- [ ] Esc (section tool active) → cancels section

Run these with the Tldraw pane active (hover whiteboard pane):

- [ ] V → Tldraw Select tool (not PDF tool change)
- [ ] R → no PDF tool change (R is not a default Tldraw shortcut)
- [ ] D → Tldraw Draw tool activates
- [ ] T → Tldraw Text tool activates

Confirm no cross-contamination:
- [ ] Hover PDF → draw a shape in Tldraw area → V key switches PDF tool, not Tldraw tool
- [ ] Hover Whiteboard → press R → PDF rect tool does NOT activate

---

## SECTION H — WhiteboardOnlyApp

- [ ] Opening a whiteboard from HomeScreen opens full-screen Tldraw
- [ ] No PDF pane visible
- [ ] Header shows whiteboard name
- [ ] Home button returns to HomeScreen
- [ ] Backup button works
- [ ] Whiteboard content persists across sessions (open, draw, close, reopen)

---

## BUG LOG (fill in when items fail)

| Date | Section | Item | Description | Status |
|------|---------|------|-------------|--------|
|      |         |      |             |        |
