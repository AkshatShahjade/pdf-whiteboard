read workwinodw, and the pdf renderer implementaiton, coapability implementations. Get a feel of whethere the content separation is proper or not. Then work on creating slot datas, and screens

Critique all the recent changes that were made to the codebase from 2 commits back. These included generalizing the slot system to left and right, and making contents be callable from the left and right. adding path showing bars at the top, etc. Score them based on how much they followed the pre-existing architecture. Then ideate how all the logic in the 2-slot system we have made, can be generalized into the Kram sequencing system to be applied at the screen level. so that all the logic and behavioural stuff that if this then that for slot opening, onMarkActivation, onLoading, onClosing, etc. can be edited by users, and new behaviours can be created. Allowing for a modular UX. no implementation.


\


I want the current slot sequencing, and logic (that if mark activated opens whiteboard in opposite slot, and closing slot leads to going to the last open content in that slot or closing the slot - but not showing system contents like content_selector) - to be generalized and flexible, using the kram sequencing framework. I hate the refs and the hacks that were used inthe current sprint. I want the proper architecture, separation of concerns and modularity to return to the project.
For this kram must be implemented.
How to describe rules:
Its a bunch of triggers based on user action, of the format on<user_action>. Then some action is taken.
rough eg of the current 2-pane system:
- onClick : library explorer or recents card or library search result -> open content in left slot
- onActivateMark(when creating new mark or clicking preexisting mark) : open content on opposite slot
- onCloseSlot : open previous content in this slot. If none exists, close the slot. If this is the only slot and it is closed, return to homescreen

The kram elements can be thought of as nodes. each kram nodes allows certain actions. Then a state graph could be created where the edges are the user interactions triggering kram node webs that lead to some change in at the beginning just be of navigation and slot sequencing, but later it can also be for more complicated stuff and automation. 
kram elements include:
- marks -> actions: onMarkActivate, onMarkResize, onMarkMove, onMarkDelete
- slots -> actions: onSlotClose, onSlotOpen, etc.
- screen -> actions: openSlot, rearrangeSlots?....
- tools -> actions: onToolSelected, .....

The hardcoded logic we created for the 2-pane system is what gets abstracted at this step. a seperate event bus for kram is used, and all the triggers I decided to be a part ofkram emit events to this bus. Then, wherever currently the business logic resides for the 2-pane system, that logic gets modularized and separated into actions. Like somethweree there is logic written that when a mark is created, create a new whiteboard and open it in the slot nextdoor. So create new whiteboard is an action, open in slot is an action. Some actions already hae functions, others don't, so we create them. Then I can decide on the power of the kram sequencing based on which triggers I subscribe to the system, and which actions I make available to it. then the rules are just a bunch of 'if event_type detected {code using action functions and node properties}' OR using a staegraph. node properties are variables for the nodes, like which slot a content is in, which slot a mark is created in, etc.

Survey all the files that were modified to implement the hardcoded 2-pane system in the previous few commits. List them. Then propose what kram nodes we will make, what properties and actions do we expose for each; and what triggers are we exposing as well. Create a toolkit that is powerful enough to abstract the current 2-pane logic and flexible enough to support others.


\

Also, architecturally, kram would be reading the ui_state_store to get an idea of the state of the whole app and access to node properties, have its own capture method (something better than an event bus) that hooks to business logic functions throughout the codebase, and also executes actions by directly calling functions in ui_controller and other improtatnt places. so this sits a level of abstraction above the whole codebase right? Would this sit at the same level as Jodo API?
This is Jodo API - plugin system:
- Universal Plugin
    
    To support everything from visual elements (Screens, Slots, Contents, Marks, Tools) to background systems (Syncing, Weylus, Dual Monitors) without using classes, the plugin system needs to shift from **fixed exports** to a **Dependency Injection (API) model**.
    
    Instead of exporting specific variables, every mod exports a single `register` function. When your app loads the mod, it passes in a `jodoAPI` object. The mod uses this API to hook into whatever parts of the system it needs.
    
    Here is how the Jodo architecture handles all of this:
    
    ### 1. The Universal Entrypoint (No Classes)
    
    In your core app, you define TypeScript interfaces for your capabilities. The modder just returns plain JavaScript objects that satisfy those interfaces.
    
    ```tsx
    // main.js (The Mod)
    
    export function register(jodoAPI) {
    
      // 1. Register a Roopa Element (e.g., a Content type)
      jodoAPI.elements.registerContent('com.author.video_player', {
        renderer: VideoRendererComponent,
        capability: videoCapabilityObject // Plain object, no class!
      });
    
      // 2. Register a Tool
      jodoAPI.elements.registerTool('com.author.video_scissor', {
        renderer: ScissorIconComponent,
        capability: scissorCapabilityObject
      });
    
      // 3. Register a Sync Provider (Non-UI)
      jodoAPI.system.registerStorageAdapter('s3_cloud_sync', s3SyncAdapterObject);
    
      // 4. Hook into OS / App Lifecycle (Weylus / Dual Monitor)
      jodoAPI.lifecycle.onAppBoot(() => {
        setupWeylusWebsocketConnection();
      });
    }
    ```
    
    ### 2. Formatting Roopa Elements (Screens, Slots, Marks, Tools)
    
    Every Roopa element follows the exact same pattern: a `renderer` (React Component) and a `capability` (Plain JS Object).
    
    ```jsx
    // --- INTERFACES (For mental model) ---
    // interface SlotCapability { onLayoutChange: (layout) => void, ... }
    // interface MarkCapability { onHitTest: (x, y) => boolean, ... }
    
    // --- IMPLEMENTATIONS (Inside main.js) ---
    
    const verticalPaneSlotCapability = {
      onLayoutChange: (newConfig) => { /* update slot logic */ },
      canAcceptContent: (contentType) => contentType !== 'full_screen_only'
    };
    
    const highlightMarkCapability = {
      onHitTest: (x, y) => { /* logic */ },
      onHover: () => { /* logic */ }
    };
    
    // The mod registers them via the API:
    jodoAPI.elements.registerSlot('com.author.vertical_pane', {
      renderer: VerticalPaneReactComponent,
      capability: verticalPaneSlotCapability
    });
    
    jodoAPI.elements.registerMark('com.author.highlight', {
      renderer: HighlightSVGComponent,
      capability: highlightMarkCapability
    });
    ```
    
    ### 3. How Jodo Manages Non-UI Plugins (Sync, Hardware, OS)
    
    For plugins that don't render UI, the `jodoAPI` exposes **System Registries** and **Lifecycle Hooks**.
    
    - **Syncing Technology:** Your core app defines a `StorageAdapter` interface. A mod can register an implementation for AWS S3 or Google Drive. When the user selects "S3 Sync" in their settings, your app routes `saveWhiteboardSnapshot` through the mod's registered adapter instead of Tauri's local filesystem.
    - **Weylus Integration:** Weylus operates by broadcasting touch/stylus data over a local WebSocket server. A Weylus plugin wouldn't register UI; instead, it would use `jodoAPI.lifecycle.onAppBoot` to open a WebSocket connection to the Weylus port, intercept the stylus coordinates, and use `jodoAPI.input.emitPointerEvent(x, y, pressure)` to inject those hardware events directly into the app's event stream.
    - **Dual Monitor / Window Management:** Your core app (Tauri) controls window spawning. The `jodoAPI` would need to expose `jodoAPI.windows.createWindow()`. A Dual Monitor plugin would hook into `onAppBoot`, detect the user's screens, and tell the core app to spawn a second Tauri window, passing a `Screen` element ID to render inside it.
    
    ### The Tauri Caveat for System Plugins
    
    Because this is a Tauri app, Javascript plugins run in the frontend WebView.
    
    - A JS plugin **can** handle WebSockets (Weylus), LocalStorage, HTTP calls (Cloud Sync), and WebRTC.
    - A JS plugin **cannot** dynamically execute new Rust code or inject native C++ drivers at runtime. If a plugin needs deep OS access (like reading raw USB kernel events), your Core Tauri app must pre-compile those generic Rust permissions into the main binary and expose them via Tauri IPC commands, so the JS plugin can call them.
- dogfooding your internal plugins through JodoAPI. This will inevitably make the API more robust as well
    
    ### 1. Should Core Features be Plugins? ("Dogfooding")
    
    **Yes, you absolutely should route your own core features (`pdf`, `whiteboard`, default tools) through the Jodo API.**
    
    In software engineering, this is called **"Dogfooding"** (eating your own dog food). It is widely considered the gold standard for building extensible architectures. Applications like VS Code, Obsidian, and Chrome treat almost all of their default, pre-built features as internal plugins that use the exact same API that external developers use.
    
    **Why this is the better architecture:**
    
    1. **Guarantees a Powerful API:** If your core app uses the Jodo API, you are forced to make the API robust. If you try to build a feature and realize the API doesn't support it, you upgrade the API. If you treat core features as "special" and bypass the API, your plugin API will inevitably end up weak and limited.
    2. **Consistency:** You only have one way of registering things. Your `setupAllRegistries.ts` file just becomes a list of `jodoAPI.register(...)` calls for your internal modules, followed by a loop that does the same for user-downloaded mods.
    3. **Modder Documentation:** Your own core plugins become the perfect open-source examples for modders to look at when learning how to build for your app.
    
    ---
    
    ### 2. A Sample of the Jodo API
    
    Under the hood, the Jodo API is just a facade (a wrapper) around your existing `renderer_registry` and `capabilities_registry`. Here is what the object passed to a plugin's `register(api)` function should look like:
    
    ```tsx
    /**
     * The JodoAPI Object
     * Passed to every plugin (core or external) during application startup.
     */
    export interface JodoAPI {
    
      // ─── ROOPA ELEMENTS (Visuals & Data) ─────────────────────────
      elements: {
        registerContent: (id: string, config: {
          renderer: React.FC<ContentProps>,
          capability: ContentCapability
        }) => void;
    
        registerSlot: (id: string, config: {
          renderer: React.FC<SlotProps>,
          capability: SlotCapability
        }) => void;
    
        registerMark: (id: string, config: {
          renderer: React.FC<MarkProps>,
          capability: MarkCapability
        }) => void;
    
        registerTool: (id: string, config: {
          renderer: React.FC<ToolProps>,
          capability: ToolCapability
        }) => void;
      };
    
      // ─── SYSTEM & STORAGE (Background) ───────────────────────────
      system: {
        // Allows a mod to add a new way to save data (e.g., SQLite, S3, IPFS)
        registerStorageAdapter: (id: string, adapter: StorageAdapter) => void;
        // Allows a mod to add a new syncing engine
        registerSyncProvider: (id: string, provider: SyncProvider) => void;
      };
    
      // ─── LIFECYCLE HOOKS ─────────────────────────────────────────
      lifecycle: {
        onAppBoot: (callback: () => void) => void;
        onScreenLoad: (callback: (screenId: string) => void) => void;
        onAppQuit: (callback: () => void) => void;
      };
    
      // ─── OS / WINDOW MANAGEMENT ──────────────────────────────────
      windows: {
        // Allows a dual-monitor mod to spawn a new Tauri window
        spawnWindow: (screenId: string, displayIndex: number) => Promise<void>;
      };
    
      // ─── EVENT BUS (Inter-plugin communication) ──────────────────
      events: {
        // Allows a Weylus plugin to emit stylus events for the whiteboard to catch
        emit: (eventName: string, payload: any) => void;
        subscribe: (eventName: string, callback: (payload: any) => void) => () => void;
      };
    }
    ```
    
    ### How you would refactor your existing code
    
    Currently, you probably have a file like `setupAllRegistries.ts` that manually imports and pushes things into maps/dictionaries.
    
    Under the new architecture, you would create an `InternalCorePlugin.js` that looks exactly like a mod:
    
    ```jsx
    // src/plugins/core/InternalCorePlugin.js
    import { PdfRenderer } from '../../ui/registry_implementations/pdf/PdfRenderer';
    import { PdfCapability } from '../../atma/registry_implementations/pdf/PdfCapability';
    
    export function register(jodoAPI) {
      jodoAPI.elements.registerContent('core.pdf', {
        renderer: PdfRenderer,
        capability: PdfCapability
      });
    
      jodoAPI.elements.registerContent('core.whiteboard', {
        // ...
      });
    }
    ```
    
    And your boot sequence simply initializes the API and passes it to your internal plugin first, then to any user plugins.

\


Create roopa elements out of the WorkspaceHeader, (make the backup and save indicator be a separate element used in workspace header) and Settings Pane, vertical tool bar, page indicator. 

\

now, we must add whiteboard marks. We do this by both creating custom tools for the pin mark, integrated into tldraw - similar to how the handwriting tool was made - and by creating a shape mark type which creates a mark out of any pre-existing shape. 

\


- Session .mode -> .screen
- toasts are handled inside the slot components. It should be screen level.
- pdf page size adapts to content size (eg- ppt should be landscape....)
- Shortcut Tool configs not peristed
    - WHy is there a null here:  restoredSession: null
- id given to marks are not created in backend, but instead frontend
- this logic should be elsewhere: 
        if (!pdfPath) return null;
        const slash = Math.max(pdfPath.lastIndexOf('/'), pdfPath.lastIndexOf('\\'));
        if (slash < 0) return null;
        return pdfPath.slice(0, slash);
- setMarksWithSectionWidths - too much business logic in ui
- Should the event listeners and input handlers be slot by slot or screen by screen coordinated with activeSlot variables?

- Keyboard shortcuts must have a separate controller. But keyboard shortcuts and scoped variables management is late stage. 
    - issue with scoped management: why is lasso tool stuck to be the default tool that opens for marico pdf, eventhough I exit the pdf with a new tool. Its not updating. There needs to be a way to delete / update values sharing the same scope 
- refactoring to thick client architecture is late stage if ever - currently using double cache where ui state is super set of app state.
- all the confusion is with what values to load the appstate and uistate. I think the user should be able to decide whether the changes made to personalizable variables are scoped at the jodo_content level (ie content_type level), or content, or slot, or jodo_slot, etc. level. 
But that is a later feature. For now, persist with scope being that of the doc: ; and the function that is loading the state doesn't search for slotid in the data table, but instead the doc: id of the conetnt that is loaded in the slot. 