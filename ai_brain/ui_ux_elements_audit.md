# LemmaMap: Exhaustive UI/UX Elements Audit

This document lists every user-interactable element, button, pane, shape, and state in LemmaMap.

---

## What is Mark Selection Mode?
Mark Selection Mode is an active state triggered by selecting the Link Tool, where the application awaits the selection of two spatial annotations (marks) to connect them with a structural link. During this mode, creation tools, file browsers, and configuration inputs are disabled so the user can focus entirely on clicking the target marks to establish the link.

---

## 1. Home Screen

The initial screen presented to the user on application launch. *Note: Mark Selection Mode only exists inside the Workspace Container, so all Home Screen elements are naturally inaccessible during that state.*

### Header Navigation
* **LemmaMap Title / Logo Button**: Clickable; opens the "About the Author" side panel.
* **Backup Button (`💾 Backup`)**: Clickable; triggers the database migration/backup backup task.
* **About Button (`◉ About`)**: Clickable; toggles the "About" side panel.
* **Settings Button (`⚙ Settings`)**: Clickable; opens the "Settings" overlay pane.

### Left Column: Import & History
* **Library Folder Config Button (`📁 Change Library Folder`)**: Opens the native OS folder selector to set the main workspaces directory.
* **Drop Zone**:
  * **Drag & Drop Target**: Active area where files (`.pdf`, `.tldr`) can be dropped to import them directly to the current library directory.
  * **Browse File Link**: Clickable; opens a file picker to copy a PDF/TLDR file into the library folder.
* **Recent List**:
  * **Recent Cards**: Clickable; opens the document directly into the workspace. Shows file name and relative time opened (e.g. *2m ago*).
  * **Remove Card Button (`✕`)**: Hovering over a card reveals this button; click to delete the card from the recent history.
  * **Clear All Button**: Clickable; wipes the entire recents list database.

### Right Column: Library Explorer
* **Up Directory Button (`📁 ..`)**: Clickable; navigates to the parent directory (disabled at library root).
* **New Folder Button (`📁+`)**: Clickable; pops open the "New Folder" dialog.
* **New Whiteboard Button (`🎨+`)**: Clickable; pops open the "New Whiteboard" dialog.
* **Explorer Grid Items**:
  * **Directory Cards**: Clickable; enters the subdirectory.
  * **PDF File Cards**: Clickable; launches the PDF in the Workspace Container.
  * **TLDR File Cards**: Clickable; launches the Whiteboard in the Workspace Container.

---

## 2. Interactive Matrix: Regular Mode vs. Mark Selection Mode

| Interactive Element | Regular Mode | Mark Selection Mode | Rationale for Selection Mode |
| :--- | :---: | :---: | :--- |
| **Workspace Header: Home Button (`🏠`)** | ✓ | ☐ | Prevent leaving the session mid-link without canceling. |
| **Workspace Header: Backup Button** | ✓ | ☐ | Disable background sync/saves until link state resolves. |
| **Workspace Pane Divider: Resize Handle** | ✓ | ☐ | Prevent accidental layout shifting while selecting endpoints. |
| **ScreenToolbar: Open Content (`📂`)** | ✓ | ☐ | Prevent opening a new document during link creation. |
| **ScreenToolbar: Link Tool Button (`🔗`)** | ✓ | ✓ | Click to cancel and exit Mark Selection Mode. |
| **ScreenToolbar: Close Slot Button (`✕`)** | ✓ | ☐ | Prevent closing a split pane mid-link. |
| **PDF Renderer: Page Scroll & Navigation** | ✓ | ✓ | Allow navigating pages to find the second mark. |
| **PDF Renderer: Existing Marks (Rect/Lasso/Pin)** | ✓ | ✓ | **Primary Interaction**: Required to select the link endpoints. |
| **PDF Renderer: Annotation Tools (Rect/Lasso/Pin/Eraser)** | ✓ | ☐ | Disable mark creation/deletion while a link is pending. |
| **Whiteboard Canvas: Panning & Zooming** | ✓ | ✓ | Allow navigating the whiteboard to find target shapes. |
| **Whiteboard Canvas: Creating New Shapes** | ✓ | ☐ | Prevent drawing new shapes while selecting endpoints. |
| **Whiteboard Canvas: Editing/Moving Shapes** | ✓ | ☐ | Prevent shape manipulation during selection. |
| **Whiteboard Canvas: Click Shape (tldraw Mark)** | ✓ | ✓ | **Primary Interaction**: Required to choose whiteboard endpoints. |
| **Whiteboard Canvas: Eraser Tool** | ✓ | ☐ | Disable deleting canvas elements during selection. |
| **Content Selector: Search Bar & Inputs** | ✓ | ☐ | Prevent searching while linking. |
| **Content Selector: Click Document Card** | ✓ | ☐ | Prevent loading new files while linking. |
