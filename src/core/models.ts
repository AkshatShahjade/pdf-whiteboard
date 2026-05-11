type UUID = string
type ISOTimestamp = string

export interface Window {
    id: UUID
    slots: Slot[]
    roopa_window_config: null
    multipane_preset: MultiPanePreset
}

export type MultiPanePreset = NoneSpecial | OnlyLink | LinkAndTray

export interface NoneSpecial{}
export interface OnlyLink{}
export interface LinkAndTray{}

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

export type Pane = ContentPane | SystemPane
export type ContentPane_Type = 'derived' | 'source'

export interface ContentPane {
    id: UUID
    content_type: ContentPane_Type
    parent_content?: ContentPane | null // null if source type
    file_name: string
    blob_storage_path: BlobPath
}

export interface SystemPane {

}

export type BlobPath = string // TODO

export type SourceContentType = PDF | WhiteBoard //| CodeEditor | BlockText | Image | Video | PPT | Spreadsheet | KeyboardMindMap | ObsidianCanvas
export type DerivedContentType = WhiteBoard //| CodeEditor | BlockText | Image | Video | Spreadsheet | KeyboardMindMap | ObsidianCanvas

export interface PDF : ContentTypeImplementation{
    id: UUID
    content_pane_type: ContentPane
    file_name: string
    file_path: FilePath
}

export interface WhiteBoard{}

// export interface CodeEditor{}

// export interface BlockText{}

// export interface Image{}

// export interface Video{}

// export interface PPT{}

// export interface Spreadsheet{}

// export interface KeyboardMindMap{}