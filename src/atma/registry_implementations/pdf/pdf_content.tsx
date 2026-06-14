import { ContentDomainType } from "../../../shared_doman_models_and_dtos/content_domain_models";

export const pdfContentType: ContentDomainType = {
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
}