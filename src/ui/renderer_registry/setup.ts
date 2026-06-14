import { lassoMark } from "../registry_implementations/pdf/vertical_pane/marks/lasso_mark";
import { rectangleMark } from "../registry_implementations/pdf/vertical_pane/marks/rectangle_mark";
import { sectionMark } from "../registry_implementations/pdf/vertical_pane/marks/section_mark";
import { lassoTool } from "../registry_implementations/pdf/vertical_pane/tools/marking/spatial/lasso_mark_tool";
import { rectTool } from "../registry_implementations/pdf/vertical_pane/tools/marking/spatial/rectangle_mark_tool";
import { sectionTool } from "../registry_implementations/pdf/vertical_pane/tools/marking/spatial/spatial_section_mark_tool";
import { removeTool } from "../registry_implementations/pdf/vertical_pane/tools/system/remove_mark_tool";
import { selectionTool } from "../registry_implementations/pdf/vertical_pane/tools/system/selection_tool";
import { markRendererRegistry, registerMarkRendererType } from "./pdf/vertical_pane/mark_renderer_registry";
import { registerToolRendererType, toolRendererRegistry } from "./pdf/vertical_pane/tool_renderer_registry";
import { registerSlotRendererType } from "./pdf/slot_renderer_registry";
import { setupAllRegistries as setupAtmaRegistries } from "../../atma/capabilities_registry/setup";

export function setupMarkRegistry() {
    if (!markRendererRegistry.has(lassoMark.id)) {
        registerMarkRendererType(lassoMark);
    }
    if (!markRendererRegistry.has(rectangleMark.id)) {
        registerMarkRendererType(rectangleMark);
    }
    if (!markRendererRegistry.has(sectionMark.id)) {
        registerMarkRendererType(sectionMark);
    }
}

export function setupToolRegistry() {
    if (!toolRendererRegistry.has(rectTool.id.id)) {
        registerToolRendererType(rectTool);
    }
    if (!toolRendererRegistry.has(lassoTool.id.id)) {
        registerToolRendererType(lassoTool);
    }
    if (!toolRendererRegistry.has(sectionTool.id.id)) {
        registerToolRendererType(sectionTool);
    }
    if (!toolRendererRegistry.has(selectionTool.id.id)) {
        registerToolRendererType(selectionTool);
    }
    if (!toolRendererRegistry.has(removeTool.id.id)) {
        registerToolRendererType(removeTool);
    }
}

export function setupAllRegistries() {
    setupAtmaRegistries();
    setupMarkRegistry();
    setupToolRegistry();
    registerSlotRendererType({
        id: "verticalPane",
        markRendererRegistry: markRendererRegistry,
        toolRendererRegistry: toolRendererRegistry
    } as any);
}