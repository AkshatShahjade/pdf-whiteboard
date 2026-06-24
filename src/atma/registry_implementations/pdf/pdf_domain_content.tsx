import { ContentDomainType } from "../../capabilities_registry/content_domain_registry";
import { markDomainRegistry } from "../../capabilities_registry/pdf/mark_domain_registry";

export const pdfContentDomain: ContentDomainType = {
    id: 'pdf',
    can_be_source: true,
    can_be_derived: false,
    capabilities: {
        importFile: {
            supported_extensions: ['.pdf'],
        },
        exportFile: {
            supported_extensions: ['.pdf'],
        },
    },
    markDomainRegistry: markDomainRegistry,
}