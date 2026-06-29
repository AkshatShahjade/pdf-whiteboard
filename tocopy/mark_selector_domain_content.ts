import { ContentDomainType } from "../../capabilities_registry/content_domain_registry"

export const markSelectorDomainContent: ContentDomainType = {
    id: 'mark_selector',
    can_be_source: false,
    can_be_derived: false,
    capabilities: {},
    markDomainRegistry: new Map(),
    stateVariables: []
}
