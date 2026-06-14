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

