import { Content } from "./content_domain_models"
import { Mark } from "./mark_domain_model"

export type UUID = string
export type ISOTimestamp = string

export interface Screen {
    id: UUID
    kind: ScreenTypes
    slots: Slot[]
    roopa_Screen_config: null
}

export type ScreenTypes = 'standard' | 'CenterToolBar' | 'CenterToolBarAndTray'


// If it is the core slot, it will handle the back_navigation_stack, else null. 
// export interface Slot{
//     id: UUID
//     loaded_pane?: Pane | null // null if nothing loaded in
//     is_core: boolean
//     back_navigation_stack: ContentPane[] // Not Pane[] intentionally
//     roopa_slot_config: null // Later feature. ignore for now
// }

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