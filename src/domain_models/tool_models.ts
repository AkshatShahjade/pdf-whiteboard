// export interface ToolType{
//     id: string
// }

import { Content } from "./content_models"

export type ToolCategory = "mark-bspatial" | "edit" | "link" | "layer"

export interface ToolType {
    id: string
    content: Content
    category: ToolCategory

    createNullMark: ()=> any
}

export interface Tool {
    id: string
    name: string
    config: RoopaTool
}

export interface RoopaTool{} // TODO: maybe this isn't the way? or it is?