import { content_type, ImportCapability, ExportCapability, RAGCapability } from "../../shared_doman_models_and_dtos/content_domain_models"
import { MarkDomainType } from "./pdf/mark_domain_registry"

export interface ContentDomainType {
    id: content_type

    can_be_source: boolean
    can_be_derived: boolean

    capabilities: {
        importFile?: ImportCapability
        exportFile?: ExportCapability
        RAGSearch?: RAGCapability
    }

    markDomainRegistry: Map<string, MarkDomainType>
}

export const contentDomainRegistry = new Map<string, ContentDomainType>()

export function registerContentDomainType(impl: ContentDomainType): void {
    if (contentDomainRegistry.has(impl.id)) {
        throw new Error(`Duplicate content domain type: ${impl.id}`)
    }
    contentDomainRegistry.set(impl.id, impl)
}

export function getContentDomainType(id: string): ContentDomainType {
    const impl = contentDomainRegistry.get(id)
    if (!impl) {
        throw new Error(`No content domain type registered for id: ${id}`)
    }
    return impl
}