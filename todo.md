read workwinodw, and the pdf renderer implementaiton, coapability implementations. Get a feel of whethere the content separation is proper or not. Then work on creating slot datas, and screens

- Create Screen, and slot elements, such that screen components takes a list of slot elements as input, and handles the arrangement of the slots using some screen arrangement logic. This logic should be in its own separate function so it can be modified. For now, use react grid. Now, the slots themselves can be of different types (SlotRegistry capabilities and renderer pattern?), but regardless of type, they input 1 or more content (depending on slot type like a vertical pane would only take one content, but in the future we could add a multi-tab pane that could open multiple contents). the exact implementation of how to show the content depends on content type. For ex, in vertical pane, if we input a .pdf file, it would have a certain ui, but if we put in whiteboard, it would be using tldraw library. So there is one slot element, that decided on the correct implementation depending on content type (by keeping all its code content agnostic using the content registries capability and renderer). To allow this, though, the content registries must be capable enough. Then, in later stages, we will work on building the screen arrangement logic, - but for now, let it be very simple. All code must be written to follow the architecture already established, not bypassing anything, doing it the proper way. Good code hygiene must b emaintained instead of doing quick and easy work.
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
- refactoring to thick client architecture is late stage if ever - currently using double cache where ui state is super set of app state.
- all the confusion is with what values to load the appstate and uistate. I think the user should be able to decide whether the changes made to personalizable variables are scoped at the jodo_content level (ie content_type level), or content, or slot, or jodo_slot, etc. level. 
But that is a later feature. For now, persist with scope being that of the doc: ; and the function that is loading the state doesn't search for slotid in the data table, but instead the doc: id of the conetnt that is loaded in the slot. 