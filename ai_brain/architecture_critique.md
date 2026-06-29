# Architecture Critique & Kram Sequencing Ideation

## Part 1: Critique of Recent Codebase Changes

The recent evolution of the application introduced a generalized 2-slot system, allowing arbitrary content (PDFs, whiteboards, selectors) to be loaded dynamically in either slot, backed by history stacks and concurrent synchronization.

Here is an architectural critique of these changes, scored on their adherence to the pre-existing Atma (Domain) / Roopa (UI) / Singleton separation of concerns.

### 1. Slot Generalization & Content Agnosticism (Score: 9/10)
**The Change:** Refactoring `vertical_pane_slot.tsx` to read `contentType` and dynamically dispatch to the correct renderer using `getContentRendererType()`.
**Critique:** Excellent architecture adherence. This decoupled the layout layer from the specific domain renderers. A slot is now truly just a container, and adding a new content type (e.g., a video player) requires zero changes to the layout system.

### 2. FilePathViewer Integration (Score: 8/10)
**The Change:** Adding a unified address bar to the top of the slot container.
**Critique:** High adherence. Placing the viewer at the slot level rather than inside the `ContentRenderer` was the right choice. It keeps the domain renderers completely unaware of the application's window chrome and navigation mechanisms.

### 3. Renaming `main`/`side` to `left`/`right` (Score: 4/10)
**The Change:** Changing the default slot IDs to spatial identifiers (`left`, `right`).
**Critique:** Low adherence. While it accurately describes the current UI, "left" and "right" are spatial concepts belonging to the Roopa (UI) layer. Hardcoding these IDs into the Atma layer (`AppStateStore`) couples the domain state to a specific 2-pane visual layout. If a user wants a top/bottom split or a 3-pane layout, the Atma layer's naming convention breaks down. Slot IDs should ideally be abstract UUIDs or functional names.

### 4. Slot History Stack (Score: 6/10)
**The Change:** Embedding a `history` array directly into the slot state to manage back-navigation.
**Critique:** Medium adherence. While functional, mixing navigation state (history) with current presentation state inside the same object muddies the store. It requires careful `Omit<SlotState, 'history'>` maneuvering when capturing snapshots. A better architectural pattern would be a dedicated Navigation Store or Router that manages the stack externally.

### 5. Mark Synchronization & Sync Loop Prevention (Score: 3/10)
**The Change:** Using `lastSyncedIdRef` and hardcoding `const otherSlotId = slotId === 'left' ? 'right' : 'left'` inside `pdf_content_renderer.tsx` to handle whiteboard opening and closing.
**Critique:** Poor architecture adherence. This is the biggest architectural violation of the recent sprint. A content renderer (`pdf_content_renderer.tsx`) should never possess knowledge of the application's layout topology (knowing that an `otherSlot` exists, or deciding *where* secondary content should open). The `lastSyncedIdRef` hack, while effective in React, is a symptom of this tangling. It forces the PDF renderer to act as a layout manager.

**Overall Recent Changes Score:** **6.0 / 10**
*The system works reliably, but the layout orchestration logic has leaked into the domain renderers.*

---

## Part 2: Ideation for the "Kram" Sequencing System

To achieve a modular, user-editable UX, we need to extract all the hardcoded `if-this-then-that` logic out of the renderers and UI controllers, and elevate it to a screen-level orchestration layer: **The Kram Sequencing System**.

### Core Concept
The Kram system acts as a programmable rules engine sitting between the **OutputAPI** (Domain Events) and the **InputAPI** (Action Commands). Renderers become "dumb" publishers of intent, and the Kram engine determines the consequence based on user-defined sequences.

### 1. Pure Renderers (The Publishers)
In the Kram architecture, `pdf_content_renderer` no longer knows about `otherSlotId` or whiteboards. When a user clicks a mark, the renderer simply emits a pure domain event:
```json
{
  "trigger": "MARK_ACTIVATED",
  "sourceSlot": "slot-uuid-1",
  "payload": { "markId": "mark_123", "type": "whiteboard_link" }
}
```

### 2. The Kram Sequences (The Logic)
A "Kram" is a sequence of logic defined in JSON/YAML that maps triggers to layout actions. Users can edit these to build custom behaviors.

**Example 1: The "Split and Open" Kram (Replacing the current hardcoded logic)**
```yaml
kram_id: "open_linked_whiteboard"
trigger: "MARK_ACTIVATED"
conditions:
  - "payload.type == 'whiteboard_link'"
sequence:
  - step: 1
    action: "ResolveTargetSlot"
    strategy: "opposite_of_source" # Could be changed to 'floating_window' or 'new_tab'
    output_variable: "$target_slot"
    
  - step: 2
    action: "LoadContent"
    slot_id: "$target_slot"
    content_id: "payload.markId"
    content_type: "whiteboard"
```

**Example 2: The "Clean Close" Kram (Replacing the `lastSyncedIdRef` hack)**
```yaml
kram_id: "handle_slot_closure"
trigger: "SLOT_CLOSED"
sequence:
  - step: 1
    action: "FindDependentSlots"
    condition: "slot.selectedMarkId == event.closedContentId"
    output_variable: "$dependent_slots"
    
  - step: 2
    action: "ClearSelection"
    targets: "$dependent_slots"
```

### 3. Screen-Level State Machine
By moving layout decisions to the Kram engine, the screen becomes a deterministic state machine.
- **On Loading:** A Kram intercepts `APP_START`, reads the user's workspace settings, and dispatches actions to instantiate layout areas (Left/Right, Grid, Floating).
- **On Mark Activation:** The Kram engine resolves the user's preferred layout strategy and commands the UI Controller to allocate a slot.
- **On Closing:** The Kram engine intercepts the close request, cascades deselection events to any dependent slots, and pops the navigation history.

### Benefits of the Kram Architecture
1. **Total Decoupling:** `ContentRenderers` become completely portable. You could drop the `pdf_content_renderer` into a completely different application frame, and it would work perfectly because it no longer manages layout.
2. **Modular UX:** Users can craft their own UX. A user working on a massive monitor might change the `MARK_ACTIVATED` Kram to open whiteboards in an entirely new 3rd column, rather than replacing the content in the 2nd column.
3. **No More React Ref Hacks:** Synchronization loops are eliminated natively. The Kram engine ensures that a `SLOT_CLOSED` event deterministically results in a `CLEAR_SELECTION` command, eliminating the need for renderers to maintain stateful refs to "guess" what the user did.
