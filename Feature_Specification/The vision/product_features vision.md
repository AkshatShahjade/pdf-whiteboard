# Product Features

## 1. Home Screen

- Library explorer for browsing and opening files
- Supports opening a single file (loads as core pane) or two files simultaneously (one per slot; left slot defaults to core)
- Access to app settings
- Double-clicking a file opens it as the **core pane** in a new window session

---

## 2. Window & Slot Management

- Window is split into up to two slots divided by a **resizable drag bar**
- One slot always holds the designated **core pane**, though it may be temporarily displaced from view by navigation (derived panes, content panes opened on top)
- **Back navigation**: backing out of a derived pane returns to the content pane that opened it; backing further returns to the core pane alone in single-slot view
- Core pane can be **reassigned** at any time via a dedicated UI button, which swaps the core designation to whatever is loaded in the other slot. Button is disabled when the other slot is empty
- Closing the core pane exits the window entirely and returns to the Home Screen
- Non-core panes can be closed individually without ending the session

---

## 3. Tray Panel

The tray is a toggleable panel within each slot used to stage media. Only media types can be put in the tray.

- **Standard Tray**: one per pane. Not open by default. Add items by selecting objects in the content and choosing "put in tray," or by importing from local storage. When two panes are open, trays exchange items via drag-and-drop or the **Transfer** control (select items on one side → Transfer → items move to the other tray). 
- **Global Tray**: one app-wide tray, persistent across sessions and windows. Acts as a universal staging and clipboard area available from any pane.

---

## 4. PDF Features

| Category | Features |
|---|---|
| Viewing | Scroll, zoom, navigate pages |
| Importing | Open any `.pdf` file |
| Annotation editing | Edit, move, delete pre-existing annotations |
| Content creation | Add block-text boxes, draw shapes, freehand drawing, pen tool |
| Page management | Insert, delete, reorder pages; merge multiple PDFs; split into separate files; rotate pages |
| Text interaction | Select pre-existing text for highlighting and copy-paste (text itself is not editable) |
| Linking | Full linking tool support (outgoing + incoming marks) |
| Exporting | Export as `.pdf` |

---

## 5. Whiteboard Features

| Category | Features |
|---|---|
| Viewing | Pan, zoom on infinite canvas |
| Importing | Open `.tldr` files |
| Editing & Creation | Full TLDraw toolset: shapes, drawing, selection; custom handwriting tool |
| Embedding | Insert images, video, audio, and components (Whiteboard, Block Text, Markdown/Code) |
| Linking | Full linking tool support |
| Exporting | Export as `.tldr`, `.svg`, `.png` |

---

## 6. Block Text Editor Features

| Category | Features |
|---|---|
| Importing | Notion HTML exports, clipboard paste from Notion, `.txt` files |
| Block types | H1–H4 headings, paragraph, to-do list, bullet list, numbered list, toggle list, table (rich text cells; block-cell support planned), code block, divider, callout, all media types as blocks |
| Inline elements | Inline LaTeX equations, Symbol marks (`@`-mention style) |
| Block creation | `/` command to insert any block type |
| Link blocks | Dedicated button-style block that activates a link on click |
| Embedding | Insert images, video, audio, and components |
| Linking | Full linking tool support |
| Exporting | `.html` (PDF export planned) |

---

## 7. Code Editor Features

| Category | Features |
|---|---|
| Importing | `.md`, `.txt`, and common code file extensions |
| Editing | Plain-text Markdown editing with live rendering preview view feature |
| Code mode | Syntax highlighting for common programming languages |
| Linking | Full linking tool support |
| Exporting | Yes |

---

## 8. Selector Pane

A dedicated system pane for finding and opening content. Opened automatically by system tools or manually.

- Displays the full library of content panes and files in local storage
- Powerful search across all content
- Clipboard access: browse and select clipboard items as media
- Used as the navigation layer for the Open tool, Shortcut tool setup, and the link tool workflow

---

## 9. Component Embedding

Components are mini embeds of a content type, living as derived panes inside their host content. Supported everywhere media embedding is supported.

| Component | Expands to |
|---|---|
| **Whiteboard Component** | Full whiteboard editor (TLDraw) |
| **Block Text Component** | Full block text editor |
| **Code Component** | Full code editor |

- Displayed as small tiles in the host content; double-click to expand to full view
- **Component Conversion**: a component can be promoted to a standalone content pane manually (via UI) or automatically (when set as core pane). After conversion, the embedding link updates to the new standalone file.

---

## 10. Marking Tools (User-Facing)

Semantically, marking is persistent and selections are temporary. Not all marking tools can do selection — **Pin Mark** and **Symbol Mark** are marks only (not usable as selections).

### In PDFs and Whiteboards

| Tool | Selection? | How to use |
|---|---|---|
| **Rectangle Mark** | Yes | Draw a rectangle over any region |
| **Lasso Mark** | Yes | Draw a freeform shape around any region |
| **Section Mark** | Yes | (PDF only) Define a vertical start and end point to mark a page range |
| **Pin Mark** | **No** | Click any point to drop a pin at that exact location |
| **Button Mark** | Yes | Place a labeled, clickable button; clicking it triggers its link |
| **Object Mark** | Yes | Click any TLDraw shape or PDF annotation to mark that specific object |

### In Block Text and Markdown

| Tool | Selection? | How to use |
|---|---|---|
| **Highlight Mark** | Yes | Select a text range; anchored to first and last words |
| **Symbol Mark** | **No** | Place an inline, movable mark; click activates its link |
| **Button Mark** | Yes | A link block; labeled, clickable element in the content |
| **Object Mark** | Yes | Mark any specific block |

### All Content Types

| Tool | Selection? | How to use |
|---|---|---|
| **Pane-Level Mark** | Yes | Links to the content as a whole (no specific location within it) |

---

## 11. Marker Attributes

After creating a marker, attributes can be applied to it:

| Attribute | How to apply | Effect |
|---|---|---|
| **Outgoing** | Select the marker → apply the Outgoing Link tool | Marker becomes the source end of a link; opens Selector pane to choose destination |
| **Incoming** | Select the marker → apply the Incoming Link tool (visible only in Link Mode) | Marker becomes the destination end of a link |
| **Toggle** | Select a selection marker → apply the Toggle tool | Clicking the marker hides/shows it |

Also BidirectionalLink attribute.
And also broken link attribute (if it used to link to something and then that something got deleted)

---

## 12. Layer Tools

### Toggle Tool
Applied to any selection marker to give it a **toggle attribute**. Once toggled, clicking the marker hides or reveals the underlying content.

### Layer Tool - to implement
This will be the generalized veriosn of toggle tool. You will be able to write different things in the same space, and cycle between those things. And its not 2-state, but n-state, using a looper system to cycle between states. 

## 12. System Tools

### Open Tool
Click to open the Selector pane in the other slot. Browse and select any content pane or derived pane to load it alongside the current pane.

### Shortcut Tool
A bookmarkable sequence of locations (content panes, derived panes, or specific marks). Set up once via the Selector pane and selection tools. After setup, each press cycles to the next item in the sequence, opening it in the adjacent slot. Loops indefinitely — functions like an in-app Alt-Tab over a curated set of locations.

---

## 13. Linking Tool

Creates a directional, location-precise link between a marker in one pane and a marker in another.

### Standard Workflow
1. Create a marker in the source pane.
2. Apply the **Outgoing Link tool** to that marker → Selector pane opens in the adjacent slot.
3. Choose a destination → it opens in **Link Mode**.
4. Create a marker in the destination pane.
5. Apply the **Incoming Link tool** to that marker.
6. Exit the destination pane → link is complete. If no incoming mark was set, prompted to confirm; confirming reverts the partial link entirely.

### 2-Pane Shorthand
When both slots are loaded, the **2-pane link tool** is available. It auto-selects the two loaded panes as source and destination — the user only selects or creates the outgoing and incoming markers directly, with no Selector pane step.

### After Creation
- Clicking an outgoing marker opens the destination in the adjacent slot, scrolled so the incoming mark is in view
- Links can be converted to **two-way** or have their direction **reversed**
- If the destination is deleted, the outgoing marker becomes an **error marker**, which the user can inspect and remove

---

## 14. Pane Conversion

A derived pane can be promoted to a standalone content pane:

- **Manual**: select "Convert to content pane" in the UI
- **Automatic**: triggered when the derived pane is set as the core pane

After conversion, the pane appears in the library explorer and the link that pointed into the parent updates to point to the new standalone file. Applies to both regular derived panes and components (Component Conversion).

---

# 2. UI/UX Modularity
Can customize toolboxes, can increase or decrease number of shortcut tools in the toolbox.
Can 

## 1. Views (Per Pane)

Each pane has multiple toggleable views:

| View | What it shows |
|---|---|
| **Standard View** | Content with outgoing marks visible. Primary editing mode |
| **Outgoing Marker View** | All outgoing marks from this pane; can edit or remove them |
| **Incoming Marker View** | All backlinks pointing to this pane from other content |

And other specialized depending on content, like if markdown selected, then a markdown preview view for code editor.

A focus view in which all the UI is removed and it is just the content. But all the tools can still be used if you remember the keyboard shortcuts.
