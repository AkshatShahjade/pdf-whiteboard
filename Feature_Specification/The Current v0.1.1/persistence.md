# Persistence Layer

LemmaMap uses a multi-tiered storage strategy to balance performance, data size, and reliability. The core logic is encapsulated in [storage.js](file:///home/akshat/Desktop/recursenotes/pdf-board/src/storage.js).

## Dual-Backend Strategy

The application uses two distinct browser-based storage mechanisms:

### 1. localStorage (Metadata)

`localStorage` is used for lightweight, structured data that needs to be accessed synchronously or very quickly on startup.

- **Data stored**: Session info (PDF path, scroll position, pane splitter ratio), region coordinates (x, y, w, h, points for lasso), and application settings.
- **Key format**: `lemmamap:session:<pdfPath>`
- **Why?**: It allows the UI to reconstruct the layout immediately upon opening a PDF without waiting for asynchronous DB queries.

### 2. IndexedDB (Content)

`IndexedDB` is used for the heavyweight Tldraw canvas snapshots.

- **Data stored**: The full JSON graph of shapes, assets, and camera state for every region's whiteboard.
- **Key format**: `regionId` (e.g., `reg_123`)
- **Why?**: Tldraw snapshots can be several hundred KB or even MBs. `localStorage` has a strict ~5MB limit per origin, whereas `IndexedDB` can handle gigabytes of data efficiently.

## Auto-Save and Debouncing

To prevent performance bottlenecks during drawing, LemmaMap uses a **debounced save** mechanism:

- Every stroke in Tldraw triggers a store change event.
- This event is captured by the `TldrawWithPersistence` component in [App.jsx](file:///home/akshat/Desktop/recursenotes/pdf-board/src/App.jsx).
- The `saveWhiteboard` function in `storage.js` is called through a 800ms debounce.
- When the component unmounts (e.g., switching regions or closing the app), `debouncedSave.flush()` is called to ensure any pending changes are committed.

## Rolling Backups

Since both `localStorage` and `IndexedDB` are local to the browser's webview, they can be cleared if the user clears their browser cache (depending on OS behavior). To protect user data, LemmaMap implements a **Rolling Backup** system:

1.  **Consolidation**: The `getAllData()` function gathers all `lemmamap:` keys from `localStorage` and all records from `IndexedDB`.
2.  **Serialization**: This massive object is converted to a JSON string.
3.  **File System Write**: Using `tauri-plugin-fs`, the JSON is written to the user's selected "Library Folder" as `backup_N.json`.
4.  **Rotation**: The system keeps a small history of backups, deleting older ones as new ones are created.

## Data Restore

Users can restore their entire environment from a backup file. The `restoreAllData(data)` function takes a backup object, iterates through its keys, and repopulates both `localStorage` and `IndexedDB` before refreshing the application state.
