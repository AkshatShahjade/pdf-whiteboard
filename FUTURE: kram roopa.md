# Unified Roopa & Kram Architecture

Your vision for Kram (the node-based visual logic layer) perfectly complements Roopa (the visual layout layer). By treating Roopa Elements as visual nodes, and Kram Actions as functional nodes that connect them, we get infinite flexibility.

To achieve this, the JSON format must be flattened so that every element is an independent "Node" with a unique ID. 

## 1. Suggested Kram Actions (The Bare Minimum)
To represent the app in its current state without hardcoding logic, we need to pre-create these reusable Kram Action functions:

1. `NavigateHome`: Clears the active session and returns to the home screen.
2. `TriggerSystemBackup`: Calls the global SQLite backup routine.
3. `UpdateStateVariable`: Sets a 4-layer state variable (e.g., `dualSplitPaneLeftPct`).
4. `ChangeActiveScreen`: Switches the workspace's active screen ID (for future multi-screen layouts).

## 2. Proposed Unified JSON Structure
Here is the JSON that completely describes the current app state, combining Roopa UI shells and Kram logic links. Notice how elements are stored flatly by ID (Pass 1), and then linked by the layout trees and Kram edges (Pass 2).

```json
{
  "workspaceId": "default_workspace",
  "name": "LemmaMap Workspace",
  "activeScreenId": "screen_main",
  
  "elements": {
    "header_1": {
      "type": "WorkspaceHeader",
      "properties": {
        "title": { "type": "dynamic", "source": "CONTENT_NAME" }
      }
    },
    "toolbar_1": {
      "type": "ScreenToolbar"
    },
    "split_1": {
      "type": "DualSplitPane",
      "properties": { "direction": "horizontal" }
    },
    "slot_left": {
      "type": "Slot",
      "properties": { "slotId": "left", "slotType": "verticalPane" }
    },
    "slot_right": {
      "type": "Slot",
      "properties": { "slotId": "right", "slotType": "verticalPane" }
    }
  },

  "layout": {
    "screen_main": {
      "tree": {
        "id": "split_1",
        "children": ["slot_left", "slot_right"]
      },
      "triggerZones": [
        { "position": "top", "elementId": "header_1" },
        { "position": "bottom", "elementId": "toolbar_1" }
      ]
    }
  },

  "kram_edges": [
    {
      "id": "edge_home",
      "source": "header_1",
      "outputPort": "onHome",
      "action": "NavigateHome"
    },
    {
      "id": "edge_backup",
      "source": "header_1",
      "outputPort": "onBackup",
      "action": "TriggerSystemBackup"
    },
    {
      "id": "edge_split",
      "source": "split_1",
      "outputPort": "onSplitPctChange",
      "action": "UpdateStateVariable",
      "params": {
        "key": "dualSplitPaneLeftPct",
        "value": "$PAYLOAD.pct"
      }
    }
  ]
}
```

## 3. How the 2-Pass Parser Works in React

To solve the issue you mentioned (elements needing to link to other elements that might not exist yet), we implement a **Virtual Node Graph** backed by a central Event Bus.

### Pass 1: The Shell Generator (Graph Instantiation)
- The parser iterates over the `elements` dictionary.
- It instantiates a lightweight runtime state object for every element ID (e.g., `header_1`).
- It does **not** render React components yet. It just builds the virtual graph registry in memory.

### Pass 2: The Kram Linker (Wiring the Edges)
- The parser iterates over `kram_edges`.
- Because all elements exist in the virtual graph from Pass 1, we can safely wire them together.
- We attach listeners to the Event Bus. For example, we register that if `header_1` fires the `onHome` event, the engine should execute the `NavigateHome` function.

### Finally: The React Render
- Now that the virtual graph and logic edges are fully wired, we pass the tree to the `RoopaLayoutRenderer`.
- When React renders `WorkspaceHeader`, it doesn't receive a hardcoded `onHome` function. It receives a generic dispatcher: `onHome={() => kramEngine.emit("header_1", "onHome")}`.
- The central engine catches the emission and executes the pre-created Kram Action!

## User Review Required
> [!IMPORTANT]
> How does this unified JSON structure and 2-pass Event Bus architecture align with your vision for the Kram visual builder? If approved, I will implement the parser, the Kram Engine, and update `temporary_layout.ts` to this format.
