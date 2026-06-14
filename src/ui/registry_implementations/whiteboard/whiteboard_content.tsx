import { ContentDomainType } from "../../../shared_doman_models_and_dtos/content_domain_models";

export const whiteboardContentType: ContentDomainType  = {
    id: 'whiteboard',
    can_be_source: true,
    can_be_derived: true,
    capabilities: {
        importFile: {
            supported_extensions: ['.whiteboard'],
        },
        exportFile: {
            supported_extensions: ['.whiteboard'],
        },
    },
}