read workwinodw, and the pdf renderer implementaiton, coapability implementations. Get a feel of whethere the content separation is proper or not. Then work on creating slot datas, and screens

Critique all the recent changes that were made to the codebase from 2 commits back. These included generalizing the slot system to left and right, and making contents be callable from the left and right. adding path showing bars at the top, etc. Score them based on how much they followed the pre-existing architecture. Then ideate how all the logic in the 2-slot system we have made, can be generalized into the Kram sequencing system to be applied at the screen level. so that all the logic and behavioural stuff that if this then that for slot opening, onMarkActivation, onLoading, onClosing, etc. can be edited by users, and new behaviours can be created. Allowing for a modular UX. no implementation.

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



now, we must add whiteboard marks. We do this by both creating custom tools, integrated into tldraw - similar to how the handwriting tool was made - and by creating a shape mark type which creates a mark out of any pre-existing shape. 


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