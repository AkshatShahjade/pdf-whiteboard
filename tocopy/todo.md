read workwinodw, and the pdf renderer implementaiton, coapability implementations. Get a feel of whethere the content separation is proper or not. Then work on creating slot datas, and screens

Critique all the recent changes that were made to the codebase from 2 commits back. These included generalizing the slot system to left and right, and making contents be callable from the left and right. adding path showing bars at the top, etc. Score them based on how much they followed the pre-existing architecture. Then ideate how all the logic in the 2-slot system we have made, can be generalized into the Kram sequencing system to be applied at the screen level. so that all the logic and behavioural stuff that if this then that for slot opening, onMarkActivation, onLoading, onClosing, etc. can be edited by users, and new behaviours can be created. Allowing for a modular UX. no implementation.

\

First, add modes to all the marking tools in pdf and the pin tool in whiteboard. for now 2- "autolink to <we cna set content type like whiteboard and other derivable contents>" and "Basic"- simple shape tools that don't create any marks.
Remove the shape_mark tool from whiteboard - however don't delete the code as it will be repurposed later.
Then create a screen level toolbar, and add the link tool.
In every shape / markable object producing tool like rec

\

why is it that when I create a mark in a whiteboard on the right slot it opens in the elft slot, but then If I create a mark in the elft slot no whiteboard opens.
Also, ther is no indication that a tldraw shape has been marked in the ui. There should be a linked symbol next to the shape.
research the reasons for why this is happening and propse fixes.
It should be that on right clicking a shape in the whiteboard, a new option in the options pane is added 'Open Link' opens the linked mark, or on clicking the link symbol next to the shape it also opens the linked mark.

\ Whiteboard Mark registry

\

\ Mark tool mods
The current functioning of the mark tools (to immediately create a new whiteboard and open it) is one 'mark mode' out of many. Infact the current functioning is one mode of the mark tool family called "instant link to new whiteboard". The basic mode however is when the mark tools just create the unlinked marks. Then we can link those marks to other marks or contents using the link tool. 
in the ui of the mark tools, there will be an option to change the tool mode and that would be persisted as a personalizable state for each mark tool. it will later also be possible to add multiple rectangle tools into your toolbar, operating with different modes - some autolink to code editors, others to whiteboards, some are default...
there should be a button called 'presets' (in the horizontal drawer for the pdf marking tools - similar to the horizontal drawer that appears when clicking secction tool) which opens a a mini pane (similar to the shortcut tool pane) that allows you to edit the config and modes. In this pane, if the tool is tied to a personalizable state, then there will be a scope selector which is an n-state toggle between options like "content, content type, slot, slot type, global" for content related tools, or "slot, slot type, screen, global" for slot related tools, "screen, global" for screen level tools. this is so the user can decide the scope of the tool preset that is made.
\
\
messages like this:
console.log("Link Tool activated (dummy)");
Never vanish, they stay at the bottom of the screen forever.
\

\
rename currentSelection to draftSelection and 
what is shape? do you mean mark of tldraw shape? if you mean mark then rename.
    editingShapeId: string | null;
    shapeBackup: any | null;
    editingSectionId: string | null;
    sectionTarget: 'start' | 'end';
\

\
Create a succinct explanation of how the buttons in the section tool function. When each is green / red/ deactivated, etc.
\
all the toolbars should have 2 states: minimized and expanded. In minimized, the whole toolbar is just one maximize button. on clikcing the full toolbar shows and there is one minimize button. Click that and it minimzes.
These buttons are similar to the tools in appearance in the toolbar (at least for now.)

The workspace header shouldn't need to show the name of the content. as there is already a path shower bar for each slot.
\

\
One of the big goals with the ui design is that it should be invisible until it is needed - and there is a strong push for users to learn and configure their keyboard shortcuts so they don't need the ui. This is to maximize screen space for content and not ui. 
Acheived by:
    1. hidden ui that appears when mouse enters a certain region (highlight the activation region in a faint primary colour glow). eg- for workspace header or screen level toolbar
    2. minimize / maximize buttons. eg - for toolbars
    3. Roopa Screens are absolute slot placements (will add sliders later), and then we can create multiple screen views for any specific screen like 25%-75, 50-50 or others, and then toggling between those should be very easy - keybrd shortcut or something else. Repeatedly dragging a slider is slow. And then kram is for shifting between screens (not views)
        changing slider ratios, some presets can be that the left slot fills the whole screen and right slot is a tiny in picture view, and vice versa....
\

\
There is an issue with the library folder selection. it isn't setting.
\

\
Specific values once made must also be updated if changes happen. in the 4-level system.
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