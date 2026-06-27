# Registry Implementations Tool Hierarchy

This document lists all of the tools currently implemented under the `src/ui/registry_implementations` directory, grouped by content domain and category.

## 1. PDF Tools (`pdf/tools/`)
* **System Tools**
  * `shortcut_system_tool.ts` — Handles keyboard shortcuts.
  * `remove_mark_tool.ts` — Global tool to delete marks.
  * `content_selector_tool.ts` — Triggers selection of different content elements.
  * `open_system_tool.ts` — Manages opening files or contexts.
  * `selection_tool.ts` — Main pointer tool for selecting items.
  * `shortcut_tool_state.ts` — Support file for state management.
* **Marking Tools**
  * **Textual marking**
    * `section_textual_mark_tool.ts` — Marking textual document sections.
    * `highlight_textual_mark_tool.ts` — standard text highlighter.
  * **Spatial marking**
    * `rectangle_mark_tool.ts` — Draws rectangular mark box overlays.
    * `pin_mark_tool.ts` — Drops spatial pins on pages.
    * `lasso_mark_tool.ts` — Custom freeform selector.
    * `spatial_section_mark_tool.ts` — Rectangular selection mapped to sections.
  * **Objectual marking**
    * `annotation_object_mark_tool.ts` — Text annotations or comments on objects.
    * `shape_object_mark_tool.ts` — Adds shapes on elements.
    * `block_object_mark_tool.ts` — Identifies specific block contents.
  * **Generic Marking**
    * `remove_mark_tool.ts`
    * `update_mark_tool.ts`
    * `pane_mark_tool.ts`
* **Linking Tools**
  * `single_pane_link_tool.ts` — Initiates connection endpoints within a single page.
  * `double_pane_link_tool.ts` — Syncs connections across left and right split-panes.
* **Overlay Tools**
  * `handwriting_overlay_tool.ts` — Draws ink overlay on PDF.
  * `eraser_overlay_tool.ts` — Erases ink markings.
  * `selection_overlay_tool.ts` — Selects overlay items.
  * `handgrab_overlay_tool.ts` — Pan/scroll navigation tool.
* **Layer Tools**
  * `hide_layer_tool.ts` — Toggles mark visibility layer.
* **Editing Tools**
  * `reorder_pages_pdf_tools.ts` — Interactively sorts page arrays.
  * `split_pdf_pdf_tools.ts` — Extracts ranges to separate documents.
  * `merge_pdfs_pdf_tool.ts` — Concatenates documents together.
  * `rotate_page_pdf_tool.ts` — Rotates individual sheets.
  * `add_media_editing_tool.ts` — Embeds images or video frames.

## 2. Whiteboard Tools (`whiteboard/tools/`)
* **System Tools**
  * `shortcut_system_tool.ts`
  * `open_system_tool.ts`
* **Marking Tools**
  * **Textual marking**
    * `section_textual_mark_tool.ts`
    * `highlight_textual_mark_tool.ts`
  * **Spatial marking**
    * `pin_whiteboard_tool.tsx` — Custom native Tldraw pin shape utility.
    * `tldraw_mark_tool.ts` — Click-to-mark existing Tldraw shapes.
    * `shape_mark_tool.ts`
  * **Objectual marking**
    * `annotation_object_mark_tool.ts`
    * `shape_object_mark_tool.ts`
    * `block_object_mark_tool.ts`
  * **Generic Marking**
    * `remove_mark_tool.ts`
    * `update_mark_tool.ts`
    * `pane_mark_tool.ts`
* **Linking Tools**
  * `single_pane_link_tool.ts`
  * `double_pane_link_tool.ts`
* **Overlay Tools**
  * `handwriting_overlay_tool.ts`
  * `eraser_overlay_tool.ts`
  * `selection_overlay_tool.ts`
  * `handgrab_overlay_tool.ts`
* **Layer Tools**
  * `hide_layer_tool.ts`
* **Editing Tools**
  * `handwriting_whiteboard_editing_tool.jsx` — Legacy handwriting shape.

## 3. Code Editor Tools (`code_editor/tools/`)
* **System Tools**
  * `shortcut_system_tool.ts`
  * `open_system_tool.ts`
* **Marking Tools**
  * **Textual marking**
    * `section_textual_mark_tool.ts`
    * `highlight_textual_mark_tool.ts`
  * **Spatial marking**
    * `rectangle_mark_tool.ts`
    * `pin_mark_tool.ts`
    * `lasso_mark_tool.ts`
    * `spatial_section_mark_tool.ts`
  * **Objectual marking**
    * `annotation_object_mark_tool.ts`
    * `shape_object_mark_tool.ts`
    * `block_object_mark_tool.ts`
  * **Generic Marking**
    * `remove_mark_tool.ts`
    * `update_mark_tool.ts`
    * `pane_mark_tool.ts`
* **Linking Tools**
  * `single_pane_link_tool.ts`
  * `double_pane_link_tool.ts`
* **Overlay Tools**
  * `handwriting_overlay_tool.ts`
  * `eraser_overlay_tool.ts`
  * `selection_overlay_tool.ts`
  * `handgrab_overlay_tool.ts`
* **Layer Tools**
  * `hide_layer_tool.ts`

## 4. Blocktext Tools (`blocktext/tools/`)
* **System Tools**
  * `shortcut_system_tool.ts`
  * `open_system_tool.ts`
* **Marking Tools**
  * **Textual marking**
    * `section_textual_mark_tool.ts`
    * `highlight_textual_mark_tool.ts`
  * **Spatial marking**
    * `rectangle_mark_tool.ts`
    * `pin_mark_tool.ts`
    * `lasso_mark_tool.ts`
    * `spatial_section_mark_tool.ts`
  * **Objectual marking**
    * `annotation_object_mark_tool.ts`
    * `shape_object_mark_tool.ts`
    * `block_object_mark_tool.ts`
  * **Generic Marking**
    * `remove_mark_tool.ts`
    * `update_mark_tool.ts`
    * `pane_mark_tool.ts`
* **Linking Tools**
  * `single_pane_link_tool.ts`
  * `double_pane_link_tool.ts`
* **Overlay Tools**
  * `handwriting_overlay_tool.ts`
  * `eraser_overlay_tool.ts`
  * `selection_overlay_tool.ts`
  * `handgrab_overlay_tool.ts`
* **Layer Tools**
  * `hide_layer_tool.ts`
