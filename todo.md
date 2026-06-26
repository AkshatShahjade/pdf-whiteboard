read workwinodw, and the pdf renderer implementaiton, coapability implementations. Get a feel of whethere the content separation is proper or not. Then work on creating slot datas, and screens

reuse much of the style and code of the recents panel, and library explorer from the homescreen. 
In fact, create a separate folder called selector_components in roopa, where each of the individual sub pieces of the homescreen are stored like library explorer, recents tab, import document, etc. modify them a little so that they can be used elsewhere, then build the system_search logic and ui from these components. Each component file should contain renderer and capability code separated. 
Also add the search file component. 

now, let us add a system_search content type. this is a system content - not user editable content like pdf or whiteboard -  but it is a content because it can be put into whatever slot type we want. This content has a search bar, a recents subpanel and its job is to show and allow selection of new contents from the library. it can be opened with a ui tool called system_search_tool from the pdf.

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