# Backend Architecture

The "backend" of LemmaMap is powered by **Tauri**, a framework for building tiny, fast binaries for all major desktop platforms. While much of the application logic resides in the React frontend, the Rust-based backend provides the necessary bridge to the operating system.

## Tauri Integration

The backend is located in the `src-tauri/` directory. It is structured as a standard Tauri application.

### Entry Point

- **[main.rs](file:///home/akshat/Desktop/recursenotes/pdf-board/src-tauri/src/main.rs)**: The minimal entry point that simply calls the library's run function.
- **[lib.rs](file:///home/akshat/Desktop/recursenotes/pdf-board/src-tauri/src/lib.rs)**: Contains the main `run` function and configures the Tauri builder.

### Plugins and Capabilities

LemmaMap leverages several official Tauri plugins to handle native operations without writing custom Rust commands for everything:

1.  **[tauri-plugin-fs](https://github.com/tauri-apps/tauri-plugin-fs)**: Used for reading/writing files on the disk. This is critical for the "Rolling Backup" system and for managing the local PDF library.
2.  **[tauri-plugin-dialog](https://github.com/tauri-apps/tauri-plugin-dialog)**: Provides native OS dialogs for selecting folders (Library Folder) and confirming deletions.
3.  **[tauri-plugin-persisted-scope](https://github.com/tauri-apps/tauri-plugin-persisted-scope)**: Automatically persists window size, position, and filesystem permissions across restarts.
4.  **[tauri-plugin-log](https://github.com/tauri-apps/tauri-plugin-log)**: (Debug only) Provides integrated logging for easier development.

## Rust vs. JavaScript Responsibility

One of the design choices in LemmaMap is to keep the Rust side minimal and use the JavaScript API provided by Tauri for filesystem and dialog interactions. This keeps the codebase unified and reduces context switching between languages.

### File System Operations

All file operations (copying PDFs, writing backups, reading directory contents) are initiated from the frontend using `@tauri-apps/plugin-fs`. The backend handles the security and permission layer, ensuring the app only touches files it has been granted access to.

### System Events

Tauri handles the window lifecycle, ensuring that when the user closes the app, any pending debounced saves (like Tldraw snapshots) have a chance to finish (managed via the `flush` mechanism in `storage.js`).
