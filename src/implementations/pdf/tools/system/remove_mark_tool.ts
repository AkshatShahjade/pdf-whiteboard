import { ToolType } from "../../../../domain_models/tool_models"

export const removeTool: ToolType = {
    id: "remove",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,

}