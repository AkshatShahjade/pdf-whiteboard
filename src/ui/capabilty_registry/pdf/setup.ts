import { lassoMark } from "../../registry_implementations/pdf/marks/lasso_mark";
import { rectangleMark } from "../../registry_implementations/pdf/marks/rectangle_mark";
import { sectionMark } from "../../registry_implementations/pdf/marks/section_mark";
import { lassoTool } from "../../registry_implementations/pdf/tools/marking/spatial/lasso_mark_tool";
import { rectTool } from "../../registry_implementations/pdf/tools/marking/spatial/rectangle_mark_tool";
import { sectionTool } from "../../registry_implementations/pdf/tools/marking/spatial/spatial_section_mark_tool";
import { removeTool } from "../../registry_implementations/pdf/tools/system/remove_mark_tool";
import { selectionTool } from "../../registry_implementations/pdf/tools/system/selection_tool";
import { markRegistry, registerMarkType } from "./mark_registry";
import { registerToolType, toolRegistry } from "./tool_registry";

export function setupMarkRegistry(){
    if (!markRegistry.has(lassoMark.id)) {
        registerMarkType(lassoMark);
    }
    if (!markRegistry.has(rectangleMark.id)) {
        registerMarkType(rectangleMark);
    }
    if(!markRegistry.has(sectionMark.id)){
        registerMarkType(sectionMark);
    }
}

export function setupToolRegistry(){
    if(!toolRegistry.has(rectTool.id)) {
        registerToolType(rectTool);
    }
    if(!toolRegistry.has(lassoTool.id)) {
        registerToolType(lassoTool);
    }
    if(!toolRegistry.has(sectionTool.id)) {
        registerToolType(sectionTool);
    }
    if(!toolRegistry.has(selectionTool.id)) {
        registerToolType(selectionTool);
    }
    if(!toolRegistry.has(removeTool.id)) {
        registerToolType(removeTool);
    }
}
