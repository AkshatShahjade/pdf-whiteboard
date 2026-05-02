# Frontend Systems

The frontend of LemmaMap is a React application that orchestrates the PDF viewer, the region overlay, and the Tldraw whiteboards.

## Core Components

### 1. Root and App Orchestration

- **[App.jsx](file:///home/akshat/Desktop/recursenotes/pdf-board/src/App.jsx)**: The central hub. It manages the split-pane layout, the PDF scrolling state, and the active region state.
- **[HomeScreen.jsx](file:///home/akshat/Desktop/recursenotes/pdf-board/src/HomeScreen.jsx)**: The launchpad where users manage their PDF library, settings, and recents.

## PDF Rendering

LemmaMap uses `react-pdf` to render documents. 

### Optimization: Lazy Loading

To handle large PDFs (hundreds of pages) efficiently, the `LazyPage` component in `App.jsx` uses the **Intersection Observer API**. Pages are only rendered when they are close to the viewport, and a placeholder div with the correct aspect ratio is used to maintain scroll consistency.

## Region Mapping System

The most unique part of LemmaMap is the ability to "draw" on top of the PDF. This is implemented using a transparent SVG/Div overlay on top of the PDF pages.

### Tool Types

1.  **Rectangle Tool**: Standard bounding box defined by `startX, startY` and `currentX, currentY`.
2.  **Lasso Tool**: Captures an array of points. It auto-closes the path when the mouse is released.
3.  **Section Tool**: A horizontal divider that snaps to the full width of the page, useful for separating logical sections of a document.

### Coordinate Space

Coordinates for regions are stored **relative to the page width/height**. This ensures that if the user zooms in or out of the PDF, the boxes remain correctly positioned over the text.

## Tldraw Integration

Every region has its own instance of Tldraw.

- **Component**: `WhiteboardPane` in `App.jsx`.
- **Initialization**: When a region is selected, `WhiteboardPane` loads the snapshot from `IndexedDB` and mounts a new Tldraw editor.
- **Handwriting Tool**: A custom `HandwritingTool` is implemented in [HandwritingTool.jsx](file:///home/akshat/Desktop/recursenotes/pdf-board/src/HandwritingTool.jsx), providing a smoother ink experience tailored for mathematical derivations.

## Split-Pane Layout

The app uses a custom draggable splitter to divide the screen between the PDF and the Whiteboard. The position is saved in the session metadata, allowing users to customize their workspace per document.
