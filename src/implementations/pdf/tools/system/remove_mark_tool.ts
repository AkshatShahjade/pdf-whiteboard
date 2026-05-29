import { ToolType } from "../../../../domain_models/tool_models"
import { deleteCursor } from "../../tool_cursors"

export const removeTool: ToolType = {
    id: "remove",
    content: 'pdf',
    category: 'system',
    isDrawable: false,
    createsSelections : false,
    hotkey: 'x',
    activationMode: 'toggle',
    cursor: deleteCursor,

    async onBorderClick({ regionId, selectedRegionId, actions }) {
        const isConfirmed = await actions.confirmDelete()
        if (!isConfirmed) return

        actions.deleteRegion(regionId)
        if (selectedRegionId === regionId) {
            actions.selectRegion(null)
        }
    },

}
