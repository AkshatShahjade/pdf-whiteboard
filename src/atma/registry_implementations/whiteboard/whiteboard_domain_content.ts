import { ContentDomainType } from "../../capabilities_registry/content_domain_registry"
import { markDomainRegistry } from "../../capabilities_registry/whiteboard/mark_domain_registry"

export const whiteboardContentDomain: ContentDomainType = {
    id: 'whiteboard',
    can_be_source: true,
    can_be_derived: true,
    capabilities: {
        exportFile: {
            supported_extensions: ['.tldr'],
        },
        importFile: {
            supported_extensions: ['.tldr'],
        }
    },
    markDomainRegistry: markDomainRegistry,
    stateVariables: []
}
