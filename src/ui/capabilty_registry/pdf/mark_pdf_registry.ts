import { Selection, Point, Mark, SelectionContext, RenderMarkContext } from "../../../shared_doman_models_and_dtos/mark_domain_model";

export interface MarkRendererType {
    id: string
    isDrawable: boolean

    hasSelectedBorder: (pt: Point, r: Mark, ctx: SelectionContext) => boolean   
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

    returnNewDrawableMark?:(selection: Selection) => Mark

    // updateMark: (selection:Selection) => Mark
    
    render: (r: Mark, ctx: RenderMarkContext) => any

    validate?: (mark: any) => { isValid: boolean; error?: string };
}


export const markRegistry = new Map<string, MarkRendererType>();

export function registerMarkRendererType(impl: MarkRendererType): void {
    if (markRegistry.has(impl.id)) {
        throw new Error(`Duplicate mark implementation: ${impl.id}`)
    }
    markRegistry.set(impl.id, impl)
}

export function getMarkType (id: string): MarkRendererType {
    const imp = markRegistry.get(id)

    if(!imp){
        throw new Error(`No mark implementation of id: ${id}`)
    }
    return imp 
}
