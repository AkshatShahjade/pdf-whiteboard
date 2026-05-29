// export interface ToolType{
//     id: string
// }

import { Content, content_id } from "./content_models"
import { Selection } from "./mark_model"

export type ToolCategory = "mark-spatial" | "edit" | "link" | "layer" | "system"

export interface ToolType {
    id: string
    content: content_id
    category: ToolCategory
    isDrawable: boolean
    createsSelections: boolean

    createNullSelection?: ()=> Selection
}

export interface Tool {
    id: string
    name: string
    config: RoopaTool
}

export interface RoopaTool{} // TODO: maybe this isn't the way? or it is?