# Backend Architecture

## 1. Screen Model

The app has two screens:

- **Home Screen** — library explorer, file selection, and settings entry point.
- **Window Screen** — the primary working environment, instantiated when content is opened.

---

## 2. Window Model

Each Window Screen instance is a **one-core window**: a workspace with up to two visible slots, separated by a resizable divider. One slot is always designated the **core slot**, though the core pane itself does not have to be visible at all times (see §3).

---

## 3. Pane System

Panes are what get loaded into slots. There are two pane types, distinguished by where they exist semantically.

### Content Panes
Standalone files that live in local storage and are accessible directly from the Home Screen. One content pane is always designated the **core pane** for the window session. The core pane defines the end of the back-navigation chain: backing out of everything else eventually returns to the core pane alone in a single-slot view. Closing the core pane exits the window and returns to the Home Screen.

The core pane does not have to be visible at all times. Example: the core pane is in the left slot; the user opens a content pane in the right slot; from there they open a derived pane, which loads into the left slot (displacing the core pane's view). The core pane remains the session anchor — backing out of the derived pane restores the content pane view, and backing further returns to only the core pane in a single-slot view.

The core pane can be **reassigned** at any time via a dedicated UI button, which switches the core designation to whatever content is loaded in the other slot. The button is disabled when the other slot is empty.

### Derived Panes
Panes that live *inside* a parent content pane. They are not standalone files in storage; they are accessed by opening their parent and activating the mark that points to them. A derived pane can be **converted** into a content pane (**pane conversion**), making it a standalone file; the link connecting them updates accordingly. Pane conversion also triggers automatically when a derived pane is promoted to core pane.

### System Panes
#### Selector Pane
- A dedicated system pane for browsing and selecting content
- Displays the full library of content panes and local storage with a powerful search function
- Also exposes clipboard contents as selectable media
- Opened automatically by system tools (Open tool, link tool workflow); can also be opened manually

### the Back Navigation system
---

## 4. Pane Modes

When content is loaded into a slot, it is loaded with a **mode** that is fixed for the lifetime of that load. The pane must be removed and reloaded to change it.

| Mode | Behavior |
|---|---|
| **Standard** | Default mode. Full editing and tool access. |
| **Link** | Opened automatically during the link tool workflow. The incoming link tool becomes visible (hidden in standard mode). On exit without an incoming mark set, the user is prompted to confirm; confirming reverts the partial link entirely. |

> Link Mode is not manually selected by the user — it is set internally by the link tool workflow.

---

## 5. Tray System

Trays are toggleable container areas used to stage and transfer media. Two tray scopes exist:

- **Standard Tray** — one per pane. Not open by default. Items are added by selecting objects and choosing "put in tray," or by importing from local file storage. When two panes are open, trays on each side can exchange items via drag-and-drop or a manual transfer control (select items → **Transfer**).

- **Global Tray** — one per app instance, persistent across all sessions and windows. A universal staging area accessible from anywhere in the app.

---

## 6. Content Types

Content is loaded into a pane, each defining the editing environment, tools, and supported media.

### PDF Content
- View, import `.pdf` files
- Append to existing PDFs or create new ones from blank
- Edit annotation layer only (pre-existing text/graphics are non-editable)
- Page operations: insert, delete, reorder, merge, split, rotate
- Select pre-existing text (for highlight/copy only; not for modification)
- Export as `.pdf`
- No component form

### Whiteboard Content
- Powered by the TLDraw library
- Import/export `.tldr`, `.svg`, `.png`
- Full drawing, shape, and selection toolset (TLDraw native)
- Custom handwriting tool (separate from TLDraw's default draw tool)
- Supports all media and component embedding
- Has a **Whiteboard Component** form (see §8)

### Block Text Content
- Notion-compatible schema: imports Notion HTML exports and clipboard-pasted Notion blocks
- Imports from `.txt`
- Block types: headings (H1–H4), paragraphs, to-do/bullet/numbered/toggle lists, tables (rich text cells; block-cell support planned), code blocks, dividers, callouts, all media types as media blocks, inline LaTeX equations
- Block creation via `/` command, mentions via `@`
- Export as `.html` (PDF export planned)
- Has a **Block Text Component** form (see §8)

### Code Editor Content
- Lightweight plain-text editor; no block system
- Full Markdown rendering and editing
- Code editor mode with syntax highlighting for a set of common programming languages
- Imports `.md`, `.txt`, and common code file extensions
- Export as `.md` or the relevant code file extension
- Has a **Code Component** form (see §8)

---

## 7. Media Object Types

Media objects are embeddable units that can be placed inside content panes where the content type supports it:

- Images
- Videos
- Audio (with playback controls: scrubbing, volume, looping)
- Components (see §8)

---

## 8. Component System

A **component** is a media type that is a miniaturized embedded version of a content type. The component's underlying content is a **derived pane**, not a standalone content pane. Three content types have a component form:

| Component | Based on | Behavior |
|---|---|---|
| **Whiteboard Component** | Whiteboard Content | Displayed as a small tile; double-click to expand to full editing view |
| **Block Text Component** | Block Text Content | Same expand behavior; full block editing when expanded |
| **Markdown/Code Component** | Markdown/Code Content | Same expand behavior; full markdown/code editing when expanded |

> PDF has no component form.

**Component Conversion** mirrors pane conversion: a component (derived pane) can be promoted to a standalone content pane manually via the UI, or automatically if promoted to core pane. After conversion, the embedding link updates to point to the new standalone file.

---

## 9. Tool Architecture

Tools are classified by **scope**:

### Single-Pane Tools
Operate within a single slot. Three categories:

- **Marking Tools** — create persistent or temporary marks on content (see §10).
- **System Tools** — app-level operations that open new panes or configure app-wide behaviors (see §11).
- **Layer Tools** (to be developed further)
    — Toggle Tool: grants a **toggle attribute** to a selection marker. Applied by: creating a selection marker → activating the toggle tool → selecting that marker. Once toggled, clicking the marker hides or shows it.

### Multi-Pane Tools
Span across slots. Currently one tool: the **Link Tool** (see §12).

A **2-pane shorthand** is available for any multi-pane tool when both slots are loaded. For the link tool, the 2-pane version auto-selects the two currently loaded panes as source and destination — the user only needs to select the outgoing and incoming markers, skipping the Selector pane entirely.

---

## 10. Marking & Selection System

Not all marking tools can do selection — **Pin Mark** and **Symbol Mark** are marks only.

### Marker Attributes

Attributes are applied to a marker after it is created (or during):

| Attribute | How applied | Effect |
|---|---|---|
| **Outgoing** | Apply the outgoing link tool to the marker | Marker becomes the source end of a link |
| **Incoming** | Apply the incoming link tool to the marker | Marker becomes the destination end of a link |
| **Toggle** | Apply the toggle tool to a selection marker | Clicking the marker hides/shows it |

bilinear, 
broken link

Outgoing and Incoming are not intrinsic properties of a marker type — they are attributes assigned through the link tool workflow.

---

### Spatial Marks *(PDF, Whiteboard)*

| Tool | Selection? | Description |
|---|---|---|
| Rectangle Mark | Yes | Marks a fixed rectangular region in space |
| Lasso Mark | Yes | Marks a freeform spatial region |
| Section Mark | Yes | (PDF only) Marks a vertical range (start Y → end Y) |
| Pin Mark | **No** | Marks a single XY coordinate; displayed as a small pin |
| Button Mark | Yes | A visible, labeled, clickable element; larger than a pin, displays text |
| Object Mark | Yes | Marks a specific object: a TLDraw shape or a PDF annotation |

### Textual Marks *(Block Text, Markdown)*

| Tool | Selection? | Description |
|---|---|---|
| Highlight Mark | Yes | Anchored to start and end words; expands/contracts with edits; prompts on anchor deletion |
| Symbol Mark | **No** | Inline, repositionable mark; functions like an `@mention`; triggers its link on click |
| Button Mark | Yes | A link block; visible, labeled, clickable element |
| Object Mark | Yes | Marks a specific block |

### Structural Marks *(All content types)*

| Tool | Selection? | Description |
|---|---|---|
| Pane-Level Mark | Yes | Links to the content as a whole, not to any specific location within it |

---

## 11. System Tools

System tools are single-pane tools that operate at the app or session level.

### Open Tool
Activates the Selector pane in the other slot. From there, the user can browse and open any content pane or derived pane, which then loads in the adjacent slot.

### Shortcut Tool
A configurable tool that stores a **sequence of links** to objects (content panes, derived panes, or specific marks within them). Setup:
1. Activate the shortcut tool.
2. The Selector pane opens; the user selects objects or marks to add to the sequence, using selection tools to specify exact locations.
3. Once configured, each press of the shortcut tool cycles to the next item in the sequence (opening it in the adjacent slot), looping indefinitely.

Serves as an in-app analogue to Alt-Tab for cycling through a defined set of locations across different content.

---

## 12. Link Tool

The only multi-pane tool. Creates a **directional, location-precise link** between a marker in one pane and a marker in another. Composed of two sub-tools:

- **Outgoing Link Tool** — applied to an existing marker in the source pane. Initiates the link workflow.
- **Incoming Link Tool** — applied to an existing marker in the destination pane. Visible only when that pane is in Link Mode.

### Standard Workflow (Single-Pane Initiation)
1. In the source pane, create a marker with any appropriate marking tool.
2. Apply the **outgoing link tool** to that marker → Selector pane opens in the adjacent slot.
3. Choose a destination from the Selector pane → destination pane opens in **Link Mode**.
4. In the destination pane, create a marker at the target location.
5. Apply the **incoming link tool** to that marker.
6. Exit the destination pane. If an incoming mark was set → link is complete. If not → prompted to confirm; confirming reverts the partial link entirely.

### 2-Pane Workflow (Both Slots Loaded)
1. With both slots occupied, activate the **2-pane link tool**.
2. The two loaded panes are auto-designated as source and destination.
3. Select or create the outgoing marker in the source pane.
4. Select or create the incoming marker in the destination pane (incoming link tool is now visible).
5. Link is registered when both markers are set.

### Link Behavior
- Clicking an outgoing marker opens the destination pane in the adjacent slot, scrolled so the incoming mark is centered in view.
- Links can be converted to **two-way** or have their direction **reversed** after creation.
- If a link target is deleted, the outgoing marker becomes an **error marker**, visually flagged for the user to inspect and remove manually.

### Identity Stability
- Moving or renaming a pane does not break any links.
- Only deletion of the linked target produces an error marker.

---

## 13. Views (Per Pane)

Each pane supports three toggleable views:

| View | Purpose |
|---|---|
| **Standard View** | Default editing experience. Shows content and outgoing marks only |
| **Outgoing Marker View** | Surfaces and allows management of all outgoing marks from this pane |
| **Incoming Marker View** | Surfaces all incoming references (backlinks) pointing to this pane |
