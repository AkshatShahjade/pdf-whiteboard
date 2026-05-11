type UUID = string
type ISOTimestamp = string

export interface Window {
    id: UUID
    slots: Slot[]
    roopa_window_config: null
    multipane_preset: MultiPanePreset
}

export type MultiPanePreset = NoMultiPane | LinkAndTray

export interface NoMultiPane{}
export interface LinkAndTray{}

export interface Slot{
    id: UUID
    content: ContentPaneType
    back_navigation_list: ContentPaneType[]
    is_core: boolean
    roopa_slot_config: null
}

// export interface Content{
//     id: UUID
//     pane_type: ContentPaneType

// }

export type ContentPaneType = DerivedContent | SourceContent

export interface DerivedContent {
    id: UUID
    content_type: DerivedContentType
    parent_content: ContentPaneType
}

export interface SourceContent {
    id: UUID
    content_type: SourceContentType
    file_name: string
    file_path: FilePath
}

export type FilePath = string // TODO

export type SourceContentType = PDF | WhiteBoard //| CodeEditor | BlockText | Image | Video | PPT | Spreadsheet | KeyboardMindMap
export type DerivedContentType = WhiteBoard //| CodeEditor | BlockText | Image | Video | Spreadsheet | KeyboardMindMap

export interface PDF{
    id: UUID
    content_pane_type: ContentPaneType
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