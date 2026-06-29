import { lassoMark } from "../registry_implementations/pdf/marks/lasso_mark";
import { pinMark } from "../registry_implementations/pdf/marks/pin_mark";
import { rectangleMark } from "../registry_implementations/pdf/marks/rectangle_mark";
import { sectionMark } from "../registry_implementations/pdf/marks/section_mark";
import { lassoTool } from "../registry_implementations/pdf/tools/marking/spatial/lasso_mark_tool";
import { pinTool } from "../registry_implementations/pdf/tools/marking/spatial/pin_mark_tool";
import { rectTool } from "../registry_implementations/pdf/tools/marking/spatial/rectangle_mark_tool";
import { sectionTool } from "../registry_implementations/pdf/tools/marking/spatial/spatial_section_mark_tool";
import { removeTool } from "../registry_implementations/pdf/tools/system/remove_mark_tool";
import { selectionTool } from "../registry_implementations/pdf/tools/system/selection_tool";
import { markRendererRegistry, registerMarkRendererType } from "./pdf/mark_renderer_registry";
import { registerToolRendererType, toolRendererRegistry } from "./pdf/tool_renderer_registry";
import { whiteboardToolRendererRegistry, registerWhiteboardToolRendererType } from "./whiteboard/tool_renderer_registry";
import { pinWhiteboardTool } from "../registry_implementations/whiteboard/tools/marking/pin_whiteboard_tool";
import { tldrawMarkWhiteboardTool } from "../registry_implementations/whiteboard/tools/marking/tldraw_mark_tool";
import { contentRendererRegistry, registerContentRendererType } from "./content_renderer_registry";
import { setupAllRegistries as setupAtmaRegistries } from "../../atma/capabilities_registry/setup";
import { pdfContentRenderer } from "../registry_implementations/pdf/pdf_content_renderer";
import { whiteboardContentRenderer } from "../registry_implementations/whiteboard/whiteboard_content_renderer";
import { contentSelectorContentRenderer } from "../registry_implementations/content_selector/content_selector_content_renderer";
import { setupSlotRegistry } from "../../roopa/renderer_registry/setup";
import { linkToolRenderer } from "../registry_implementations/screen_level/tools/link_tool_renderer";
import { openContentToolRenderer } from "../registry_implementations/screen_level/tools/open_content_tool_renderer";
import { registerScreenToolRendererType, screenToolRendererRegistry } from "./screen_level/tool_renderer_registry";

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
    if (!markRendererRegistry.has(pinMark.id)) {
        registerMarkRendererType(pinMark);
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
    if (!toolRendererRegistry.has(pinTool.id.id)) {
        registerToolRendererType(pinTool);
    }
    if (!toolRendererRegistry.has(selectionTool.id.id)) {
        registerToolRendererType(selectionTool);
    }
    if (!toolRendererRegistry.has(removeTool.id.id)) {
        registerToolRendererType(removeTool);
    }
    if (!whiteboardToolRendererRegistry.has(pinWhiteboardTool.id.id)) {
        registerWhiteboardToolRendererType(pinWhiteboardTool);
    }
    if (!whiteboardToolRendererRegistry.has(tldrawMarkWhiteboardTool.id.id)) {
        registerWhiteboardToolRendererType(tldrawMarkWhiteboardTool);
    }
    if (!screenToolRendererRegistry.has(linkToolRenderer.id.id)) {
        registerScreenToolRendererType(linkToolRenderer);
    }
    if (!screenToolRendererRegistry.has(openContentToolRenderer.id.id)) {
        registerScreenToolRendererType(openContentToolRenderer);
    }
}

export function setupContentRendererRegistry() {
    if (!contentRendererRegistry.has(pdfContentRenderer.id)) {
        registerContentRendererType(pdfContentRenderer);
    }
    if (!contentRendererRegistry.has(whiteboardContentRenderer.id)) {
        registerContentRendererType(whiteboardContentRenderer);
    }
    if (!contentRendererRegistry.has(contentSelectorContentRenderer.id)) {
        registerContentRendererType(contentSelectorContentRenderer);
    }
}

export function setupAllRegistries() {
    setupAtmaRegistries();
    setupMarkRegistry();
    setupToolRegistry();
    setupContentRendererRegistry();
    setupSlotRegistry();
}