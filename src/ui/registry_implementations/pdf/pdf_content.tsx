import { ContentType } from "../../../shared_doman_models_and_dtos/content_models";

export const pdfContentType: ContentType = {
    id: 'pdf',
    name: 'PDF',
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