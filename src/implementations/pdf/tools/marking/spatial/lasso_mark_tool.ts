import { ToolType } from "../../../../../domain_models/tool_models"

export const lassoTool: ToolType = {
    id: "lasso",
    content: 'pdf',
    category: 'mark-spatial',
    isDrawable: true,
    createsSelections : true,

    createNullSelection() {
        return {type:"lasso", points: null}
    },
}