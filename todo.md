read workwinodw, and the pdf renderer implementaiton, coapability implementations. Get a feel of whethere the content separation is proper or not. Then work on creating slot datas, and screens

Critique all the recent changes that were made to the codebase from 2 commits back. These included generalizing the slot system to left and right, and making contents be callable from the left and right. adding path showing bars at the top, etc. Score them based on how much they followed the pre-existing architecture. Then ideate how all the logic in the 2-slot system we have made, can be generalized into the Kram sequencing system to be applied at the screen level. so that all the logic and behavioural stuff that if this then that for slot opening, onMarkActivation, onLoading, onClosing, etc. can be edited by users, and new behaviours can be created. Allowing for a modular UX. no implementation.


\


so why can't it be that you create a pin shaped tldraw shape, and treat that as a mark. In fact this is the direction I want to go towards. That any tldraw native shape (like rectangle) or drawing or text box can be considered a mark. So then we can link marks from 2 panes with each other. and that is when the link tool will work. The current system where on creating a mark, a new whiteboard immediately opens is a stepping stone, and this would eventually be removed. In the future, the rect / lasso / section / pin tools in pdf would just make the mark ui - like the rectangle tool in whiteboard right now. And then we would select mark and press the link tool to link it with another mark in same or different document. Then clikcing the mark would take us to that document place.  But for now we keep the open a new whiteboard logic. so my interest is that the pin tool in whiteabord, creates a pin shaped tldraw native shape, and then we develop a system that allows us to mark any tldraw shape as a lemmamap mark later on.

\
well then how do you save the whiteboard marks if the schema didn't change? 
Note that the Mark domain type nbeeds to be modified. Add TldrawMark as a type. Then link all the marks (from pin tool or mark tool iN THE WHITEBOARD to the tldraw mark type)
Also, why is the mark tool not working at all.
DO an extensive codebase search, and find the root cause. I suspect not enough generalization and modificaiton of codebase for a whiteboard type. 
Create survery report.
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