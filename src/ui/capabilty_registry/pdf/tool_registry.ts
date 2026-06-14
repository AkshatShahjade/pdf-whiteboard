import { ToolType } from "../../../shared_doman_models_and_dtos/tool_models"

export const toolRegistry = new Map<string, ToolType>
const toolHotkeyRegistry = new Map<string, ToolType>()

export function registerToolType(tool: ToolType): void {
    if (toolRegistry.has(tool.id)) {
        throw new Error(`Duplicate tool implementation: ${tool.id}`)
    }
    toolRegistry.set(tool.id, tool)
    if (tool.hotkey) {
        toolHotkeyRegistry.set(tool.hotkey.toLowerCase(), tool)
    }
}

export function getToolType (name: string): ToolType {
    const imp = toolRegistry.get(name)   

    if(!imp){
        throw new Error(`No tool implementation of name: ${name}`)  
    }
    return imp 
}

export function getToolByHotkey(key: string): ToolType | undefined {
    return toolHotkeyRegistry.get(key.toLowerCase())
}
