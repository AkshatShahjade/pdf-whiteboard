import { Selection, Point, Mark, SelectionContext, RenderMarkContext } from "../../../shared_doman_models_and_dtos/mark_domain_model";
import { MarkRendererType } from "../mark_tool_renderer_types";

/**
 * PDFMarkRendererType — extends the base MarkRendererType with PDF-specific
 * spatial selection and border-editing lifecycle hooks.
 */
export interface PDFMarkRendererType extends MarkRendererType {
    isDrawable: boolean

    onBorderEditStart?: (ctx: {
        hit: Mark
        coords: Point
        actions: {
            setTool: (next: string) => void
            setCurrentSelection: (next: any) => void
            setEditingSectionId: (next: string | null) => void
            setEditingShapeId: (next: string | null) => void
            setShapeBackup: (next: any) => void
            setMovingRegion: (next: any) => void
            setSectionTarget: (next: "start" | "end") => void
        }
    }) => boolean | void

    initiateShape?: (coords: Point) => Selection

    updateSelection?: (prev: Selection, coords: Point, ctx: SelectionContext) => Selection

    renderSelectionPreview: (selection: Selection, ctx: SelectionContext) => any

    returnDrawableMarkWithoutId?: (selection: Selection) => any

    returnNewDrawableMark?: (selection: Selection) => Mark

    render: (r: Mark, ctx: RenderMarkContext) => any
}

export const markRendererRegistry = new Map<string, PDFMarkRendererType>();

export function registerMarkRendererType(impl: PDFMarkRendererType): void {
    if (markRendererRegistry.has(impl.id)) {
        throw new Error(`Duplicate mark implementation: ${impl.id}`)
    }
    markRendererRegistry.set(impl.id, impl)
}

export function getMarkRendererType(id: string): PDFMarkRendererType {
    const imp = markRendererRegistry.get(id)

    if (!imp) {
        throw new Error(`No mark implementation of id: ${id}`)
    }
    return imp
}
