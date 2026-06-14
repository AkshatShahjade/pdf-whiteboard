import { content_id } from "./content_domain_models"

export type Scope = "fileLevel" | content_id
export type ToolCategory = "mark-spatial" | "edit" | "link" | "layer" | "system"

export interface ToolDomainType {
    id: string
    scope: Scope
    category: ToolCategory
}

//custom tools instances that get persisted 
export interface Tool {
    id: string
    name: string
    scope: Scope
    toolRenderer: any
    category: ToolCategory
}
