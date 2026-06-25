- Session .mode -> .screen
- toasts are handled inside the slot components. It should be screen level.
- pdf page size adapts to content size (eg- ppt should be landscape....)
- ui_state_store = app_state_store & screen_specific_state + slot_specific_state for each slot
- app_state_store is also screen specific + slot specific for each slot
- ui store and controller instantiated not in WorkSpaceContainer, but instead at the beginning on app launch
- Shortcut Tool configs not peristed
    - WHy is there a null here:  restoredSession: null
- id given to marks are not created in backend, but instead frontend
- this logic should be elsewhere: 
        if (!pdfPath) return null;
        const slash = Math.max(pdfPath.lastIndexOf('/'), pdfPath.lastIndexOf('\\'));
        if (slash < 0) return null;
        return pdfPath.slice(0, slash);
- setMarksWithSectionWidths - too much business logic in ui
- 4 layer storage isn't working properly. Defaulted variabels are being stored in specific variable table. why are global scoped variables being store in specific variable table?
- Should the event listeners and input handlers be slot by slot or screen by screen coordinated with activeSlot variables?

- Keyboard shortcuts must have a separate controller. But keyboard shortcuts and scoped variables management is late stage.
- refactoring to thick client architecture is late stage if ever - currently using double cache where ui state is super set of app state.
- all the confusion is with what values to load the appstate and uistate. I think the user should be able to decide whether the changes made to personalizable variables are scoped at the jodo_content level (ie content_type level), or content, or slot, or jodo_slot, etc. level. 
But that is a later feature. For now, persist with scope being that of the doc: ; and the function that is loading the state doesn't search for slotid in the data table, but instead the doc: id of the conetnt that is loaded in the slot. 