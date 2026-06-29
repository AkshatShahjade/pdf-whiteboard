# Architecture Vision: Roopa, Kram, and Dynamic Slots

This document outlines the architectural vision for **Roopa** (the layout builder), **Kram** (the logic builder), and their relationship with **Content Slots** in the LemmaMap ecosystem.

Unlike traditional hard-coded applications, LemmaMap is designed as a **dynamic, user-configurable platform** (akin to a low-code environment or Figma prototyping). The architecture empowers users to design their own workflows, layouts, and rules without writing code.

---

## 1. Roopa: The Visual Layout Builder

Roopa is not just a collection of hard-coded React components; it is a **dynamic UI configuration engine**. 
* **User-Defined Layouts:** Users can utilize a visual builder to create custom UI arrangements (Roopa configs). They can place standardized building blocks (like `ButtonSquare`, `LibraryExplorer`, or layout grids) to design exactly how their workspace looks.
* **The Presentation Layer:** Roopa handles rendering the UI based on these dynamic configs and exposes actionable "triggers" (e.g., `onClick`), without knowing what those triggers actually do.

## 2. Kram: The Visual Logic Engine

Just as Roopa lets users build the UI, **Kram lets users build the logic.**
* **User-Defined Rules:** Through a visual interface, users can define Kram configurations. They map the triggers exposed by Roopa (e.g., "When this specific ButtonSquare is clicked") to specific actions or rule chains (e.g., "Close the right slot, open a new Whiteboard, and maximize the window").
* **The Brains:** Kram evaluates these user-defined rule configurations in real-time, dictating the flow of the application and sending the final execution commands down to the base system (`UIController`).

## 3. Content Slots: The Pluggable Workhorses

The true power of this architecture lies in the separation of the *frame* (Roopa/Kram) and the *content* (Slots).
* **Agnostic Content Containers:** A "Slot" is simply an empty container defined by a Roopa layout. 
* **Pluggable Capabilities:** Into these slots, the base application can inject highly complex, fully functional content renderers (like the deeply interactive **PDF Viewer** or the infinite-canvas **Whiteboard**). 
* **Infinite Extensibility:** Because the slots are generic, the system can support an infinite variety of content types in the future (code editors, web browsers, rich text documents, video players). 
* **Unchanged Base Functionality:** No matter how wildly a user configures their Roopa layout or Kram logic, the PDF or Whiteboard injected into a slot retains 100% of its core base functionality (drawing, zooming, linking marks, etc.).

---

## Summary: A Composable Ecosystem

1. **Roopa** builds the skeleton and the buttons (The Layout).
2. **Kram** wires the buttons to specific rules and workflows (The Logic).
3. **Content Slots** fill the skeleton with heavy-duty, base-app functionalities like PDFs and Whiteboards (The Meat).

This tripartite architecture transforms LemmaMap from a static tool into an **extensible, programmable operating environment** for personal knowledge management.
