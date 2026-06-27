import { Selection, Point, Mark, SelectionContext, RenderMarkContext } from "../../../shared_doman_models_and_dtos/mark_domain_model";
import { MarkRendererType } from "../mark_tool_renderer_types";

export interface WhiteboardMarkRendererType extends MarkRendererType {
    isDrawable: boolean

    initiateShape?: (coords: Point) => Selection

    updateSelection?: (prev: Selection, coords: Point, ctx: SelectionContext) => Selection

    renderSelectionPreview: (selection: Selection, ctx: SelectionContext) => any

    returnDrawableMarkWithoutId?: (selection: Selection) => any

    returnNewDrawableMark?: (selection: Selection) => Mark

    render: (r: Mark, ctx: RenderMarkContext) => any
}

export const whiteboardMarkRendererRegistry = new Map<string, WhiteboardMarkRendererType>();

export function registerWhiteboardMarkRendererType(impl: WhiteboardMarkRendererType): void {
    if (whiteboardMarkRendererRegistry.has(impl.id)) {
        throw new Error(`Duplicate whiteboard mark implementation: ${impl.id}`)
    }
    whiteboardMarkRendererRegistry.set(impl.id, impl)
}

export function getWhiteboardMarkRendererType(id: string): WhiteboardMarkRendererType {
    const imp = whiteboardMarkRendererRegistry.get(id)
    if (!imp) {
        throw new Error(`No whiteboard mark implementation of id: ${id}`)
    }
    return imp
}
