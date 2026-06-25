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
    stateVariables: [
        { name: 'zoom', scope: 'app', persistence: 'personalizable', defaultValue: 1.0 },
        { name: 'tool', scope: 'app', persistence: 'personalizable', defaultValue: 'select' },
        { name: 'scrollTop', scope: 'app', persistence: 'personalizable', defaultValue: 0 },
        { name: 'selectedMarkId', scope: 'app', persistence: 'personalizable', defaultValue: null },
        { name: 'currentPage', scope: 'ui', persistence: 'volatile', defaultValue: 1 },
        { name: 'pageInput', scope: 'ui', persistence: 'volatile', defaultValue: '1' },
        { name: 'editingShapeId', scope: 'ui', persistence: 'volatile', defaultValue: null },
        { name: 'shapeBackup', scope: 'ui', persistence: 'volatile', defaultValue: null },
        { name: 'editingSectionId', scope: 'ui', persistence: 'volatile', defaultValue: null },
        { name: 'sectionTarget', scope: 'ui', persistence: 'volatile', defaultValue: 'start' }
    ]
}