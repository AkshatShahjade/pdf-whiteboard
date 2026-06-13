ATMA: Capability and Persistence
    Content - an information carrying structure - persistent storage related - gets loaded into Slot
    mark - the persisted location
    link - connection between 2 marks


ROOPA: UX
    Screen - UX element - old version was Window
    Slots - Screen composed of many slots - it has many types
        VerticalPane - UX element, loads Content - old version was Slot
        HorizontalPane
        GridSlot
        Card
    ToolBox - can be configured

UI
    Selection - ephemeral, can be converted to mark


files and directories: app_state_store.ts for example. No camel case.
interfaces: ToolType - capital case
functions, variables: resetDrawableToolState - camel case

    