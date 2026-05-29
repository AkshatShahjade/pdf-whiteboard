import { ToolType } from "../../../../../domain_models/tool_models"

export const rectTool: ToolType = {
    id: "rect",
    content: 'pdf',
    category: 'mark-spatial',
    isDrawable: true,
    createsSelections : true,

    createNullSelection() {
        return {type:"rect", startX: null, startY: null, currentX: null, currentY: null}
    },
}