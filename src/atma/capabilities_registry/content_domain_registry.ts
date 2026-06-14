import { content_id } from "../../shared_doman_models_and_dtos/content_domain_models"
import { MarkDomainType } from "./pdf/mark_domain_registry"

export const contentDomainRegistry = new Map<string, ContentDomainType>

export interface ContentDomainType {
    id: content_id
    markDomainRegistry: Map<string, MarkDomainType>
}


export function registerContentDomainType(impl: ContentDomainType): void {
    if (contentDomainRegistry.has(impl.id)) {
        throw new Error(`Duplicate content implementation: ${impl.id}`)
    }
    contentDomainRegistry.set(impl.id, impl)
}

export function getContentDomainType (id: string): ContentDomainType {
    const imp = contentDomainRegistry.get(id)

    if(!imp){
        throw new Error(`No content implementation of id: ${id}`)
    }
    return imp 
}