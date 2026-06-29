# Architecture Discussion: Content Naming and ID Agnosticism

This document archives the design decisions and strategy for implementing a robust, content-agnostic document indexing system in LemmaMap. This will be implemented after proper content creation UI/UX workflows (like PDF importing and Whiteboard management) are fully established.

---

## The Goal
To ensure that all documents (PDFs and Whiteboards) are referred to globally by unique, immutable internal IDs rather than filepaths or filenames. This allows users to rename or relocate files using external file managers (like Nautilus or Finder) without breaking spatial links, marks, or annotations within LemmaMap.

---

## Architectural Strategy: Option B (Internal ID Mapping)

### 1. Database Resolution (`CONTENTS` Table)
Instead of storing raw filepaths in the marks or active slots databases, we store a unique, stable internal ID (e.g. `doc_12345` or `wb_98765`).
* A central `CONTENTS` table maps:
  `id` (Primary Key) $\rightarrow$ `file_path`
* When loading a document, the UI controllers query by `id`. The repository resolves this to the current `file_path`.
* If a file is moved externally:
  1. The app detects a missing file at the stored `file_path`.
  2. The app prompts the user: *"Differential Equations.pdf is missing. Click here to locate it."*
  3. The user re-locates the file.
  4. The app updates **only one row** in the `CONTENTS` table.
  5. All spatial links and annotations immediately function again because they refer to the stable `id`.

---

## Decoupling File Names from IDs

### For Whiteboards (`.tldr` files)
Currently, whiteboard files are named after their IDs (e.g. `wb_1719641234567.tldr`). To allow human-readable names (e.g. `Linear Algebra.tldr`) without breaking links:

1. **Internal ID Injection**:
   Every `.tldr` file contains a JSON payload. We inject a custom metadata key at the top level of the JSON document when saving:
   ```json
   {
     "store": { ... },
     "schema": { ... },
     "lemmaMapId": "wb_1719641234567"
   }
   ```
2. **File Explorer Opening Flow**:
   When the user opens a `.tldr` file via the app browser:
   * The app reads the file, parses the JSON, and extracts `lemmaMapId`.
   * It ensures this ID and the current filepath are registered/updated in the SQLite `CONTENTS` table.
   * If a `.tldr` file has no `lemmaMapId` (e.g., it was created externally), the app generates a new ID, writes it back into the file, and registers the mapping.

3. **Fallback Resolution**:
   If a whiteboard is requested by `id` but is not registered in the SQLite database (e.g., if the user imported a database backup that missed this mapping, or it was loaded on a fresh machine):
   * The app scans the library directory for `.tldr` files.
   * It reads their JSON headers to find the file containing the matching `lemmaMapId`.
   * It registers the mapping automatically, recovering the file location gracefully.

---

## Deferred Implementation
This refactor has been postponed until the core content creation systems and robust UI/UX elements for importing and creating documents are in place. At that point, we will rewrite the file explorer, save/load repositories, and document creation handlers under this unified standard.
