import { Content } from "./content_models"
import { Mark } from "./mark_model"
import { ContentPane, Pane } from "./pane_model"

export type UUID = string
export type ISOTimestamp = string

export interface Window {
    id: UUID
    kind: WindowTypes
    slots: Slot[]
    roopa_window_config: null
}

export type WindowTypes = 'standard' | 'CenterToolBar' | 'CenterToolBarAndTray'


// If it is the core slot, it will handle the back_navigation_stack, else null. 
export interface Slot{
    id: UUID
    loaded_pane?: Pane | null // null if nothing loaded in
    is_core: boolean
    back_navigation_stack: ContentPane[] // Not Pane[] intentionally
    roopa_slot_config: null // Later feature. ignore for now
}

// export interface Content{
//     id: UUID
//     pane_type: ContentPaneType

// }

interface ContentTreeNode {
  content: Content;
  marks: Mark[];
  children: Map<string, ContentTreeNode>; // markId → child node
  parent: { markId: string; contentId: string } | null;
  depth: number;
}