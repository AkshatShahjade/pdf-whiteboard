# LemmaMap
(AI Generated README)

**LemmaMap** is a high-performance spatial workspace designed specifically for mathematicians, researchers, and students. It bridges the gap between static PDF documents and infinite digital whiteboards by allowing users to anchor Tldraw canvases to specific regions within a document.

## ── The Core Philosophy ──

In traditional workflows, derivations are often disconnected from the source material. LemmaMap changes this by allowing you to:

1.  **Define Spatial Bounds:** Draw rectangular or lasso-based regions over theorems, proofs, or complex diagrams.
2.  **Anchor Context:** Every region you define acts as a portal to an independent, infinite whiteboard.
3.  **Maintain Flow:** Select a region on the left to immediately bring up your corresponding scratchpad on the right.

-----

## 🚀 Key Features

  * **Multimodal Region Mapping:**
      * **Freeform Rectangles:** Best for standard blocks of text and theorems.
      * **Lasso Tool:** Perfect for irregular diagrams or inline equations.
      * **Section Dividers:** Span the full width of the document for broad logical breaks.
  * **Infinite Whiteboard Integration:** Powered by **Tldraw**, providing a professional-grade drawing experience with native persistence.
  * **Hybrid Storage Architecture:**
      * **localStorage:** Zero-latency layout reconstruction (scroll position, pane split, region metadata).
      * **IndexedDB:** Robust handling of heavy Tldraw shape/asset graphs.
  * **Tauri-Powered Desktop Experience:** Fast, lightweight, and local-first. Includes native file system access for PDF library management.
  * **Rolling Backups:** Integrated version control that zips your entire workspace into unified JSON payloads.

-----

## 🛠 Tech Stack

  * **Frontend:** React, Tldraw, React-PDF
  * **Backend/Runtime:** Tauri (Rust-based desktop framework)
  * **Storage:** IndexedDB, LocalStorage
  * **Styling:** Custom CSS-in-JS with a focus on a high-contrast "Dark Mode" mathematical aesthetic.

-----

## ⌨️ Mechanics & Shortcuts

### **The PDF Pane (Left)**

  * `V` — **Select Tool**: Click regions to open whiteboards; `Ctrl + Click` to move/resize.
  * `R` — **Rectangle Tool**: Click and drag to create boxes.
  * `C` — **Lasso Tool**: Draw freehand around targets.
  * `S` — **Section Divider**: Horizontal bounds (Click Top → Click Bottom → `Enter`).
  * `X` — **Remove Tool**: Click a region to delete it and its associated data.

### **View Controls**

  * `Ctrl + Scroll` — Zoom PDF dynamically.
  * `Shift + Scroll` — Pan horizontally.
  * `Ctrl + \` — Reset splitter to 55% width.
  * `Esc` — Deselect tools or close the active whiteboard.

-----

## 📦 Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/AkshatShahjade/LemmaMap.git
    cd LemmaMap
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run in Development:**
    ```bash
    npm run tauri dev
    ```
4.  **Library Setup:** Upon first launch, select a "Library Folder." LemmaMap will automatically index and organize all PDFs within that directory.

-----

## 👤 Author

**Akshat Shahjade**

  * BS Mathematics & Scientific Computing, **IIT Kanpur**
  * GitHub: [@AkshatShahjade](https://www.google.com/search?q=https://github.com/AkshatShahjade)
  * Specializing in full-stack development, ML, and mathematical software.

-----

> *LemmaMap: Annotate theorems, anchor whiteboards, and never lose mathematical context again.*
