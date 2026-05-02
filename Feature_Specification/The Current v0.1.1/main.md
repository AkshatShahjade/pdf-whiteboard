# LemmaMap Documentation

Welcome to the LemmaMap documentation. This project is a specialized tool for bridging the gap between static PDF documents and infinite digital whiteboards. It allows users to define regions within a PDF and associate them with independent Tldraw canvases for spatial thinking and derivation.

## Navigation

- [Backend Architecture](./backend-architecture.md): Overview of the Tauri-based backend and native integrations.
- [Persistence Layer](./persistence.md): Deep dive into how data is stored using localStorage and IndexedDB.
- [Frontend Systems](./frontend-systems.md): Detailed look at PDF rendering, region mapping, and Tldraw integration.

## Project Overview

LemmaMap is built as a **Tauri application**, combining a high-performance Rust backend with a flexible React frontend.

### Core Philosophy

The app is designed around the idea of **Contextual Whiteboarding**. Instead of having one giant whiteboard for a whole document, LemmaMap encourages creating small, focused "workspaces" tied to specific theorems, proofs, or diagrams within a PDF.

### Key Technologies

- **Frontend**: React, Vite, Tailwind CSS (for styling), Tldraw (infinite canvas), react-pdf (PDF rendering).
- **Backend**: Rust, Tauri, Tauri Plugins (fs, dialog, persisted-scope).
- **Storage**: Browser-native `localStorage` and `IndexedDB`.

## How It Works

1.  **PDF Loading**: Users select a PDF from their local library or import a new one.
2.  **Region Definition**: Using the Rectangle, Lasso, or Section tools, users mark specific areas of the PDF.
3.  **Workspace Association**: Each region is assigned a unique ID and its own Tldraw snapshot.
4.  **Persistence**: As the user draws, the Tldraw state is debounced and saved to IndexedDB. Session metadata (scroll position, region coordinates) is saved to localStorage.
5.  **Backups**: Periodic "Rolling Backups" consolidate all browser-based data into a single JSON file on the user's filesystem for safety.
