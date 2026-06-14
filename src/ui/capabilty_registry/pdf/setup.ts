import { lassoMark } from "../../registry_implementations/pdf/marks/lasso_mark";
import { rectangleMark } from "../../registry_implementations/pdf/marks/rectangle_mark";
import { sectionMark } from "../../registry_implementations/pdf/marks/section_mark";
import { lassoTool } from "../../registry_implementations/pdf/tools/marking/spatial/lasso_mark_tool";
import { rectTool } from "../../registry_implementations/pdf/tools/marking/spatial/rectangle_mark_tool";
import { sectionTool } from "../../registry_implementations/pdf/tools/marking/spatial/spatial_section_mark_tool";
import { removeTool } from "../../registry_implementations/pdf/tools/system/remove_mark_tool";
import { selectionTool } from "../../registry_implementations/pdf/tools/system/selection_tool";
import { markRegistry, registerMarkRendererType } from "./mark_pdf_registry";
import { registerToolRendererType, toolRendererRegistry } from "./tool_pdf_registry";

export function setupMarkRegistry(){
    if (!markRegistry.has(lassoMark.id)) {
        registerMarkRendererType(lassoMark);
    }
    if (!markRegistry.has(rectangleMark.id)) {
        registerMarkRendererType(rectangleMark);
    }
    if(!markRegistry.has(sectionMark.id)){
        registerMarkRendererType(sectionMark);
    }
}

export function setupToolRegistry(){
    if(!toolRendererRegistry.has(rectTool.id.id)) {
        registerToolRendererType(rectTool);
    }
    if(!toolRendererRegistry.has(lassoTool.id.id)) {
        registerToolRendererType(lassoTool);
    }
    if(!toolRendererRegistry.has(sectionTool.id.id)) {
        registerToolRendererType(sectionTool);
    }
    if(!toolRendererRegistry.has(selectionTool.id.id)) {
        registerToolRendererType(selectionTool);
    }
    if(!toolRendererRegistry.has(removeTool.id.id)) {
        registerToolRendererType(removeTool);
    }
}
