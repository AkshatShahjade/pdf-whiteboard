import { UUID } from "./window_slot_model"

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

export interface PDF {}

export interface WhiteBoard{}

// export interface CodeEditor{}

// export interface BlockText{}

// export interface Image{}

// export interface Video{}

// export interface PPT{}

// export interface Spreadsheet{}

// export interface KeyboardMindMap{}