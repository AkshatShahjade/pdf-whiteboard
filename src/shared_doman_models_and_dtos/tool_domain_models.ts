import { content_type } from "./content_domain_models"

export type Scope = "fileLevel" | content_type
export type ToolCategory = "mark-spatial" | "edit" | "link" | "layer" | "system"

export interface ToolDomainType {
    id: string
    scope: Scope
    category: ToolCategory
}

//JODO : custom tools instances that get persisted 
export interface Tool {
    id: string
    name: string
    scope: Scope
    toolRenderer: any
    category: ToolCategory
}
