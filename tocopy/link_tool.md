# Implementation Plan: Screen-Level Link Tool UI/UX (Revised)

This updated plan incorporates your architectural feedback, focusing strictly on separation of concerns (SoC), explicit markability definitions, and slot-state preservation via Kram.

## User Review Required
> [!IMPORTANT]
> Please review the "Enforcing Separation of Concerns" section below, which outlines how Kram, UI State, Roopa, and Atma divide the linking logic. Let me know if you approve this architecture so we can begin execution!

## 1. Link Mode States & The Horizontal Drawer

The Link Tool (`🔗`) expands horizontally into a drawer with the following buttons:

| Button | State: Incomplete (Null) | State: Active / Target Mode | State: Complete |
| :--- | :--- | :--- | :--- |
| **Source** | 🔴 Red (`Src: None`) | 🟦 Highlighted background | 🟢 Green (`Src: Mark/Doc`) |
| **Destination** | 🔴 Red (`Dest: None`) | 🟦 Highlighted background | 🟢 Green (`Dest: Mark/Doc`) |

**Additional Controls:**
- **Direction Toggle:** Cycles 3 states: `↔ 2-way` → `→ Src to Dest` → `← Dest to Src`.
- **Cancel Button:** Always 🔴 Red. Exits link mode, cancels, and restores original slots.
- **Confirm Button:** ⚪ Gray/Disabled until both Source and Destination are Green. 🔵 Blue/Active when both are set.
- **Browse Button:** Opens the `mark_selector`. Must be clicked explicitly (no auto-open). Clicking it again toggles it off and restores the slots.

**Auto-Advance:** 
Setting the Source automatically shifts active mode to Destination. Setting the Destination automatically shifts active mode to Source.

---

## 2. Defining "Markable/Linkable" Objects

Rather than highlighting everything blindly, we will enforce explicit linkability at the domain level.
- **Domain Models:** We will update `MarkDomainType` in `mark_domain_registry.ts` to include `capabilities: { linkable: boolean }`.
- **Allowed Marks:** We will explicitly set this to `true` for all 4 PDF marks and general Tldraw shapes, while ensuring handwriting shapes (and future unsupported types) are `false`. 
- **Selection Glow:** Only objects with `linkable: true` will exhibit the highlight/glow on hover during Selection Mode.

---

## 3. Selecting Contents vs. Marks

### A. Selecting Loaded Contents
If a user wants to link to a content that is *already open* on the screen, they can use the path viewer (header).
- We will add a new button in `WorkspaceHeader`: `[🔗 Select Content]`. 
- **Visibility:** This button will *only* appear when Link Selection Mode is active.

### B. Selecting Unloaded Contents (The `mark_selector`)
For unloaded contents or finding marks across the workspace, the user clicks **Browse**, opening the `mark_selector` system view.

**Slot Management & Persistence:**
- The `mark_selector` opens in the slot that is **not currently in focus**.
- **No Auto-close:** Clicking a content card opens that content in the slot, but the `mark_selector` remains active. It does *not* close when a selection is made.
- **State Restoration:** Upon Confirming the link, Canceling, or toggling Browse off, the slots will instantly revert to exactly how they were before the Link Tool was activated, no matter how many documents were browsed.

---

## 4. Enforcing Separation of Concerns (SoC)

This update enforces strict boundaries across the architecture:

### 1. Kram (Slot & Layout Management)
- **Role:** Exclusively handles all slot logic and layout routing.
- **Action:** When `Browse` is clicked, the UI dispatches a `KramCommand` to open `mark_selector` in the inactive slot. 
- **Restoration:** Kram will snapshot the pre-link workspace state (which files were open in which slots) in memory. When the linking session ends (via Confirm/Cancel), Kram restores that snapshot. UI components will *never* directly manipulate the slot array.

### 2. UI State (`LinkModeStore`)
- **Role:** Exclusively holds transient React state. 
- **Action:** We will introduce a global Zustand/Context store in `uiState` that tracks `isActive`, `activeTarget` (Src/Dest), `direction`, and the selected UUIDs. This purely drives the React render cycles (like glowing borders) without touching disk or layouts.

### 3. Roopa (Dumb UI Elements)
- **Role:** Presentation only.
- **Action:** We will create `src/roopa/elements/content_cards/` containing:
  - `basic_card.jsx`: Used generically by `LibraryExplorer` and others.
  - `mark_selector_card.jsx`: Used specifically by `mark_selector` (includes the `[🔗 select content]` button).
- Existing components will be refactored to use these generic cards.

### 4. Atma (Domain & Storage)
- **Role:** Data persistence.
- **Action:** When Confirm is clicked, Atma processes the request. It uses the existing `LINKS` table in SQLite (which has `source_mark_id` and `target_mark_id`).
- For bidirectional (`2-way`) links, Atma simply executes two `INSERT` queries, swapping the source and target IDs, maintaining the uni-directional schema design.

---

## Proposed Changes Checklist

1. **Domain/Atma:** Add `linkable` capability to `MarkDomainType`. Update SQLite handlers to support inserting single/double rows.
2. **Kram:** Add `snapshotSlots()` and `restoreSlots()` methods to Kram.
3. **UI State:** Implement `LinkModeStore`.
4. **Roopa:** Create `content_cards` directory and refactor existing explorers. Update `WorkspaceHeader` with `[🔗 Select Content]`.
5. **Registry:** Create `mark_selector` system view registry entries. Build the `link_tool` UI drawer.
