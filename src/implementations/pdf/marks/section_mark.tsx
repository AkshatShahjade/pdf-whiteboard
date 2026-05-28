import { Mark, MarkType, Point, SectionRange, SelectionContext } from "../../../domain_models/mark_model";

export const sectionMark: MarkType = {
    id: 'section',

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        return isInSectionBorder(point, region, ctx)
    },

    createFinalizedShape(selection) {
        return null
    },

    initiateShape(coords) {
        return { type:'rect', startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y };
    },

    updateSelection(prev: Selection, coords: Point) {
        if(prev.type === 'rect'){
            return { ...prev, currentX: coords.x, currentY: coords.y }
        }
        else{
            console.error("BOOGA OOGA ERR");
            return prev
        }
    },

    renderSelectionPreview(selection, ctx) {
        if(selection.type==="rect" && ctx.zoom){
        const { x, y, w, h } = createRectMarkShape(selection);
            return (
            <rect x={x * ctx.zoom} y={y * ctx.zoom} width={w * ctx.zoom} height={h * ctx.zoom} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" rx={2} style={{ pointerEvents: 'none' }} />
            );
        }else{
        console.error("BAAGU BOGU");
        
        }
    },

    render(){}
}



export const isInSectionBorder = (coords: Point, r: Mark, ctx: SelectionContext) => {
    if(r.type !== 'section'){
        throw new Error(" must pass Section into isInSectionBorder ")
    }
    if(ctx.PDFWIDTH === undefined || ctx.borderWidth === undefined) return false
    
    const inY = coords.y >= r.y && coords.y <= r.y + r.h;
    const inLeft = coords.x >= 0 && coords.x <= ctx.borderWidth;
    const inRight = coords.x >= (ctx.PDFWIDTH - ctx.borderWidth) && coords.x <= ctx.PDFWIDTH;
    return inY && (inLeft || inRight);

}
