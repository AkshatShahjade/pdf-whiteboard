import { ToolType } from "../../../../../domain_models/tool_models"

export const sectionTool: ToolType = {
    id: "section",
    content: 'pdf',
    category: 'mark-spatial',
    isDrawable: false,
    createsSelections : true,

    createNullSelection() {
        return {type:"section", start: null, end: null}
    },
}