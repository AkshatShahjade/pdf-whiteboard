import { lassoMark } from "../../implementations/pdf/marks/lasso_mark";
import { rectangleMark } from "../../implementations/pdf/marks/rectangle_mark";
import { sectionMark } from "../../implementations/pdf/marks/section_mark";
import { lassoTool } from "../../implementations/pdf/tools/marking/spatial/lasso_mark_tool";
import { rectTool } from "../../implementations/pdf/tools/marking/spatial/rectangle_mark_tool";
import { sectionTool } from "../../implementations/pdf/tools/marking/spatial/spatial_section_mark_tool";
import { removeTool } from "../../implementations/pdf/tools/system/remove_mark_tool";
import { selectionTool } from "../../implementations/pdf/tools/system/selection_tool";
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
