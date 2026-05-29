import { ContentType } from "../../domain_models/content_models";

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