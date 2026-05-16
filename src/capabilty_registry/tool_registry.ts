import { ToolType } from "../domain_models/tool_models"

export const toolRegistry = new Map<string, ToolType>

export function registerTool(impl: ToolType): void {
    if (toolRegistry.has(impl.id)) {
        throw new Error(`Duplicate tool implementation: ${impl.id}`)
    }
    toolRegistry.set(impl.id, impl)
}

export function gettoolImplementation (id: string): ToolType {
    const imp = toolRegistry.get(id)

    if(!imp){
        throw new Error(`No tool implementation of id: ${id}`)
    }
    return imp 
}