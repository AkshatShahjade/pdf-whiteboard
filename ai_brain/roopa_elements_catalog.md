# Roopa Elements Catalog

This document defines the strict, configurable Roopa Elements required to rebuild the entire LemmaMap UI as a fully composable system.

---

## 0. Dynamic State Binding (The Roopa/UIStore Connection)
To support a completely dynamic UI, the `UIStateStore` must be **modular**. Instead of hardcoding every possible UI state (like `pageInput` or `searchQuery`), the store is dynamically constructed based on the Roopa elements currently mounted in the view.
* If a `TextInput` (id: `search_bar`) is rendered by Roopa, it automatically registers its value in the UIStore under its ID.
* If it is unmounted, its state is cleaned up. 
This allows infinite flexibility for users configuring layouts, as the state tree mirrors the UI tree perfectly.

---

## 1. Atomic Primitives
These are the lowest-level building blocks. They contain no domain logic, only strict aesthetics and standard interactive triggers.

### `ButtonSquare`
* **Use Case:** Toolbars, quick actions (e.g., Home button, Link Tool).
* **Properties:** `icon` (string/SVG), `tooltip` (string), `isActive` (boolean), `permissionId` (UIMode permission key), `variant` (primary | ghost | danger).
* **Actions:** `onClick`.

### `ButtonFlat`
* **Use Case:** Standard text buttons in modals or menus (e.g., "Confirm", "Cancel").
* **Properties:** `label` (string), `icon` (optional string), `permissionId`, `disabled` (boolean).
* **Actions:** `onClick`.

### `Card`
* **Use Case:** Displaying encapsulated information blocks.
* **Properties:** `variant` ('basic' | 'mark_selector' | 'recent'), `title` (string), `subtitle` (string), `icon` (optional string), `permissionId`.
* **Actions:** `onClick`, `onDelete` (for 'basic' and 'recent' variants), `onContentSelect` (for 'mark_selector' variant).

### `TextInput`
* **Use Case:** Naming folders, searching content.
* **Properties:** `placeholder` (string), `value` (string bound to UIStore), `autoFocus` (boolean), `permissionId`.
* **Actions:** `onChange`, `onSubmit` (Enter key press).

### `DropdownSelect`
* **Use Case:** Settings pane (e.g., Default Tool).
* **Properties:** `options` (Array<{label, value}>), `selectedValue` (string), `permissionId`.
* **Actions:** `onSelect`.

### `MultiStateToggle`
* **Use Case:** Changing between multiple configurations (e.g., Dark/Light/System theme, layout modes).
* **Properties:** `states` (Array of string labels), `currentState` (string), `permissionId`.
* **Actions:** `onToggle` (Cycles to next state or selects specific state).

### `Slider`
* **Use Case:** Autosave interval, zoom levels.
* **Properties:** `min` (number), `max` (number), `value` (number), `permissionId`.
* **Actions:** `onChange`.

---

## 2. Domain Composites
These are higher-level blocks built from atomic primitives, designed specifically for LemmaMap's core features.

### `LibraryExplorer`
* **Use Case:** The main file browser.
* **Properties:** `libraryPath` (string - the root path to read from), `filters` (Array of extensions e.g., `['.pdf', '.tldr']`), `permissionId`.
* **Internal State:** Manages its own directory traversal (`currentPath`). Clicking a folder changes internal state, not outward app state.
* **Actions:** `onOpenFile` (triggers when a filtered file is clicked), `onCreateNew`.

### `DropZone`
* **Use Case:** Drag-and-drop area for importing external files.
* **Properties:** `acceptedTypes` (Array of extensions), `permissionId`.
* **Actions:** `onFileDrop`.

### `FilePathViewer`
* **Use Case:** Displaying the current document's breadcrumbs or path.
* **Properties:** `path` (string).
* **Actions:** None (purely display).

### `PageIndicator`
* **Use Case:** Showing current page / total pages for PDFs.
* **Properties:** `currentPage` (number), `totalPages` (number), `permissionId` (if it includes jump-to-page input).
* **Actions:** `onPageJump` (if interactive).

### `BackupSaveIndicator`
* **Use Case:** Displaying sync/save status.
* **Properties:** `lastSavedAt` (timestamp | null), `status` ('saving' | 'synced' | 'error').
* **Actions:** None.

### `WorkspaceHeaderPanel`
* **Use Case:** The invisible, hover-activated top bar in the workspace.
* **Properties:** `title` (string), `backupStatus` (timestamp | string).
* **Actions:** `onHomeClick`, `onBackupClick`.

### `ToolTrayVertical`
* **Use Case:** The screen toolbar or PDF annotation toolbar.
* **Properties:** `tools` (Array<{id, icon, tooltip}>), `activeToolId` (string).
* **Actions:** `onSelectTool`.

---

## 3. Structural Layout Blocks
These define the invisible grids, overlays, and pane managers.

### `SplitPane`
* **Use Case:** Managing side-by-side content slots.
* **Properties:** `splitRatio` (number 0-100), `orientation` (vertical | horizontal).
* **Actions:** `onResizeEnd` (fires when user finishes dragging).

### `TriggerZone`
* **Use Case:** Invisible layout regions that implement the "Invisible UI" doctrine.
* **Properties:** `position` (top | bottom | left | right), `thickness` (number), `glowColor` (string/hex).
* **Actions:** `onMouseEnter`, `onMouseLeave`. 
* *(Example: Placing a TriggerZone at the top of the screen triggers an action that reveals the WorkspaceHeaderPanel).*

### `ModalOverlay`
* **Use Case:** Dialog boxes (New Folder, Settings).
* **Properties:** `title` (string), `isOpen` (boolean).
* **Actions:** `onClose`.

### `SideDrawer`
* **Use Case:** "About" panel sliding in from the edge.
* **Properties:** `isOpen` (boolean), `direction` (left | right).
* **Actions:** `onClose`.

---

## Example Composition: The Current Workspace
To illustrate how these blocks compose together, the current main workspace layout can be thought of as a single `RoopaScreen` configured as follows:
1. A root `SplitPane` spanning 100% of the screen.
2. Inside the slots of the `SplitPane` sit the active content renderers.
3. Overlaid at the top of the screen is a top `TriggerZone`. When hovered, its `onMouseEnter` action displays the `WorkspaceHeaderPanel`.
4. Overlaid at the bottom center is a TriggerZone that reveals the `ToolTrayVertical` (Screen Toolbar).
