import { SpatialMarkingToolType } from "../../domain_models/tool_models"

export const pdfToolMarkingSpatialRegistry = new Map<string, SpatialMarkingToolType>

export function registerPdfToolMarkingSpatial(impl: SpatialMarkingToolType): void {
    if (pdfToolMarkingSpatialRegistry.has(impl.name)) {
        throw new Error(`Duplicate tool implementation: ${impl.name}`)
    }
    pdfToolMarkingSpatialRegistry.set(impl.name, impl)
}

export function getPdfToolMarkingSpatialImplementation (name: string): SpatialMarkingToolType {
    const imp = pdfToolMarkingSpatialRegistry.get(name)   

    if(!imp){
        throw new Error(`No tool implementation of name: ${name}`)  
    }
    return imp 
}