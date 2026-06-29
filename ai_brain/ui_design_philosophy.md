# UI Design Philosophy: Invisible UI & Space Maximization

The fundamental value proposition of LemmaMap is spatial, multi-slot knowledge management. However, on screens smaller than a massive desktop monitor (laptops, tablets), screen real estate becomes the ultimate bottleneck. If the UI chrome consumes the screen, the slots become too small, and the app devolves into a cramped, linear experience.

To solve this, LemmaMap adheres to the **Invisible UI Doctrine**.

## 1. The Invisible UI Doctrine
The interface should be invisible until it is explicitly needed. Screen real estate belongs 100% to the content.
* **Proximity Activation:** Elements like the `WorkspaceHeader` or the `ScreenToolbar` remain hidden. They only appear when the user's mouse enters a specific trigger region.
* **Visual Cues:** To prevent the user from guessing where hidden UI lives, the activation regions emit a faint, primary-color glow to signal interactivity without taking up structural space.
* **Minimize/Maximize States:** Any persistent toolbars (like the Whiteboard bottom bar or PDF sidebars) must have one-click minimize/maximize toggles to get out of the way instantly.

## 2. Keyboard-First Navigation
Because the UI is designed to disappear, power users should not need to hunt for hidden menus.
* **Shortcut Driven:** Every major action (switching views, activating link mode, toggling slots) must have a configurable keyboard shortcut.
* **Workflow Speed:** The goal is that a user can operate LemmaMap entirely with their keyboard and content-canvas clicks, minimizing mouse-travel to UI toolbars.

## 3. Slot Views and Presets (The Roopa Screen System)
Instead of forcing the user to manually drag split-pane sliders (which is slow and tedious on small screens), Roopa Screens manage layout via **View Presets**.
* **Pre-configured Ratios:** A user can instantly toggle between standard ratios via keyboard shortcuts (e.g., `50/50`, `25/75`, `75/25`).
* **Picture-in-Picture (PiP) / Focus Mode:** On small laptop screens, 50/50 is often unreadable. A preset where the active slot is 100% fullscreen, and the secondary slot is a floating "Picture-in-Picture" window (or a hidden drawer that peeks out) is essential.
* **Screen vs. View distinction:** 
  * *Views* change the slider ratios and focus of the *current* slots.
  * *Kram Logic* changes the actual *Screens* (swapping out what content is actually loaded in the layout).

By adhering to these principles, LemmaMap can deliver a multi-slot, spatial experience even on standard 13-inch laptop displays, avoiding the pitfall of feeling cramped or overwhelming.
