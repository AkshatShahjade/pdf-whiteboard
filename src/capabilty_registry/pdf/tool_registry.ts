import { ToolType } from "../../domain_models/tool_models"

export const toolRegistry = new Map<string, ToolType>

export function registerToolType(tool: ToolType): void {
    if (toolRegistry.has(tool.id)) {
        throw new Error(`Duplicate tool implementation: ${tool.id}`)
    }
    toolRegistry.set(tool.id, tool)
}

export function getToolType (name: string): ToolType {
    const imp = toolRegistry.get(name)   

    if(!imp){
        throw new Error(`No tool implementation of name: ${name}`)  
    }
    return imp 
}