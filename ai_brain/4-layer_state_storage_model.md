# The 4-Layer State Storage Model

This document outlines the architecture for state persistence and resolution in LemmaMap. It defines how state variables are classified, the hierarchy of the 4-layer resolution system, and how the State Schema Registry manages scope boundaries.

---

## 1. Available Scopes
Before understanding the layers, we must define the contexts (Scopes) at which state can be saved. Scopes dictate *what* a variable applies to.

1. **Global (`global`)**: Applies universally across the entire application instantly (e.g., Dark/Light Theme).
2. **Screen (`screen`)**: Applies to a specific Roopa Screen window/layout arrangement (e.g., Multi-monitor setups).
3. **Slot (`slot`)**: Applies to a specific physical UI container (e.g., the "left_slot"), regardless of what content is currently loaded inside it. Used for layout preferences.
4. **Slot Type (`slotType`)**: Applies to a *category* of slots across the application (e.g., all "sidebar" slots vs all "main" slots).
5. **Content (`content`)**: Applies strictly to the immutable internal ID of a specific file (e.g., a specific PDF or Whiteboard). Used for content preferences like `zoomLevel` or `scrollPosition`.
6. **Content Type (`contentType`)**: Applies to a *category* of content (e.g., all PDFs default to 150% zoom, all Whiteboards default to 50% zoom).

---

## 2. State Variable Classifications & The Schema Registry

Variables are categorized by how they handle persistence across application sessions. This definition—along with the variable's scope rules—is registered in a central **State Schema Registry**.

```json
{
  "key": "penColor",
  "classification": "personalizable",
  "layer3_resolution_scope": "content",
  "seed_default_value": "red"
}
```

### Classifications
Users can change a variable's classification dynamically via settings:
* **Volatile:** No persisted initial values. The state resets completely every time the app or component unmounts.
* **Defaulted:** Only *Scoped Presets* (Layer 2) are persisted. Session interactions are discarded upon quit. The app always reboots to the saved preset.
* **Personalizable:** Both presets (Layer 2) and *Specific Session Values* (Layer 3) are persisted. Session interactions are saved and restored on the next boot.

### The Role of the Registry (Scope Bounding)
The `layer3_resolution_scope` in the registry **does not limit Layer 2 defaults**. 
* **In Layer 2 (Settings Menu):** The user can save a preset for `penColor` at *any* scope (e.g., globally, or just for PDFs via `contentType`, or for a specific file via `content`).
* **In Layer 3 (Session Interaction):** When a user actually interacts with the tool (e.g., changes pen to Blue), Kram checks this registry. It sees `layer3_resolution_scope: "content"`. It instantly knows to grab the active Content's UUID and save the session state specifically tied to that ID.

---

## 3. The 4-Layer Resolution Hierarchy
When the application needs the value of a state variable, it cascades through these 4 layers (from most specific to least specific):

### Layer 1: Developer Seed Defaults (`state_initializer.ts`)
* **What it is:** The hardcoded fallback values shipped by the developer (defined in the `seed_default_value` of the Registry). 
* **When it is used:** Only executed once during DB creation, or when a user clicks "Reset to Defaults".

### Layer 2: Scoped Presets (The Default Value SQL Table)
* **What it is:** The user-modifiable default settings. 
* **Multiscope Cascading:** This layer is inherently multi-scoped. A user can save a default preset for a variable at *multiple levels simultaneously*. For example, a user can set the `contentType` (PDFs) Pen Color to Red, but save a `content` preset for "Math.pdf" to be Green. The app will resolve the most specific preset available.
* **The Override Rule:** If a user modifies a value in this layer, the corresponding Layer 3 Specific Value is automatically wiped. This guarantees the user immediately sees their new default.

### Layer 3: Personalized State (The Specific Value SQL Table)
* **What it is:** The session restoration layer. As the user interacts with the app (e.g., changes the pen to Blue), the exact state is saved here to be restored next time.
* **How it Saves:** Kram automatically saves the interaction into the `SPECIFIC_VALUE_TABLE` using the exact scope context defined by the `layer3_resolution_scope` in the Registry.
* **Constraint:** Data is only saved here if the variable's current classification is **Personalizable**.

### Layer 4: The Resolved Value
* **What it is:** The final value injected into the UI/App state memory.
* **Resolution Order:** Check Layer 3. If empty (or Defaulted), check Layer 2 (Content). If empty, check Layer 2 (ContentType)... cascading all the way up to Layer 2 (Global). If nothing exists, use Layer 1.


# Implementation:
there are 4 things only related to state persistance.
1) developper seeding during initialization
2) Resolving persistance cascade to use the correct state variable value on variable loading. Create a helper function that inputs the variable (like pen tool) and its situation (like which document the pen tool is in and which slot and which screen. ) and then it outputs the correct value that should be set for that variable.
3) updating Specific Values table whenever personalizable values are changed during session
4) updating Default VLaues tables through settings menu.

forget about the artefact for now. 
First ask clarifying questions about this integration system. 