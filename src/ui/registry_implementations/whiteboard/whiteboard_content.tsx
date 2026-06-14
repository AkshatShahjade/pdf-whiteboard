import { ContentType } from "../../../shared_doman_models_and_dtos/content_models";

export const whiteboardContentType: ContentType  = {
    id: 'whiteboard',
    name: 'WhiteBoard',
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