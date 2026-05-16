import { ContentType } from "../domain_models/content_models"

export const contentRegistry = new Map<string, ContentType>

export function registerContent(impl: ContentType): void {
    if (contentRegistry.has(impl.id)) {
        throw new Error(`Duplicate content implementation: ${impl.id}`)
    }
    contentRegistry.set(impl.id, impl)
}

export function getcontentImplementation (id: string): ContentType {
    const imp = contentRegistry.get(id)

    if(!imp){
        throw new Error(`No content implementation of id: ${id}`)
    }
    return imp 
}