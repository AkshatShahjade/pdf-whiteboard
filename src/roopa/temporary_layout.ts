/**
 * Temporary Hardcoded Roopa Layout JSON
 * 
 * This file encodes the structural layout currently hardcoded in WorkWindow.jsx's WorkspaceContainer.
 * In the future, this JSON will be dynamically constructed and modified by the Visual Builder,
 * and persisted in the SQLite database to allow infinitely flexible workspace configurations.
 */

export const TEMPORARY_ROOPA_LAYOUT = {
    workspaceId: "default_workspace",
    name: "LemmaMap Workspace",
    activeScreenId: "screen_main",
    screens: [
        {
            screenId: "screen_main",
            name: "Main Split View",
            
            // Trigger Zones represent absolute-positioned overlay areas (like hover menus or toolbars)
            triggerZones: [
                {
                    zoneId: "zone_header",
                    position: "top",
                    alignment: "center",
                    elementRenderer: "WorkspaceHeader"
                },
                {
                    zoneId: "zone_toolbar",
                    position: "bottom",
                    alignment: "center",
                    elementRenderer: "ScreenToolbar"
                }
            ],
            
            // The core layout tree for this screen
            layout: {
                type: "DualSplitPane",
                direction: "horizontal",
                // This binds the split percentage to the 'dualSplitPaneLeftPct' state variable in the 4-layer architecture
                splitPctStateKey: "dualSplitPaneLeftPct", 
                
                children: [
                    {
                        type: "Slot",
                        slotId: "left",
                        slotType: "verticalPane"
                    },
                    {
                        type: "Slot",
                        slotId: "right",
                        slotType: "verticalPane"
                    }
                ]
            }
        }
    ]
};
