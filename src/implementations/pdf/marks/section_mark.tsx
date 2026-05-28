import { Mark, MarkType, Point, Selection, SectionRange, SelectionContext } from "../../../domain_models/mark_model";

export const sectionMark: MarkType = {
    id: 'section',
    isDrawable: false,

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        return isInSectionBorder(point, region, ctx)
    },

    renderSelectionPreview(selection, ctx) {
        if(selection.type==="section" && ctx.zoom && ctx.PDFWIDTH){
            return (
                <>
                    {selection.start !== null && (
                        <line
                            x1={0}
                            x2={ctx.PDFWIDTH * ctx.zoom}
                            y1={selection.start * ctx.zoom}
                            y2={selection.start * ctx.zoom}
                            stroke="#10B981"
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                        />
                    )}

                    {selection.end !== null && (
                        <line
                            x1={0}
                            x2={ctx.PDFWIDTH * ctx.zoom}
                            y1={selection.end * ctx.zoom}
                            y2={selection.end * ctx.zoom}
                            stroke="#10B981"
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                        />
                    )}
                </>
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
