import { Mark, Point, Selection, SectionSel, SelectionContext, RenderMarkContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { MarkRendererType } from "../../../capabilty_registry/pdf/mark_pdf_registry";

export const sectionMark: MarkRendererType = {
    id: 'section',
    isDrawable: false,

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        return isInSectionBorder(point, region, ctx)
    },

    onBorderEditStart({ hit, actions }) {
      if (hit.type !== 'section') return false
      actions.setTool('section')
      actions.setCurrentSelection({ type: 'section', start: hit.y, end: hit.y + hit.h })
      actions.setEditingSectionId(hit.id)
      actions.setSectionTarget('start')
      return true
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

    render(r: Mark, ctx: RenderMarkContext){
        if (r.type === 'section' 
            && ctx.PDFWIDTH !== undefined && ctx.zoom !== undefined && ctx.color !== undefined && ctx.tool !== undefined && ctx.idx !== undefined && ctx.isSelected !== undefined && ctx.onClick !== undefined) {
            const leftW = r.w * ctx.zoom;
            const rightX = ctx.PDFWIDTH * ctx.zoom - leftW;
            const ry = r.y * ctx.zoom, rh = r.h * ctx.zoom;

            const handleMouseDown = (e: React.MouseEvent) => {
                if (e.ctrlKey || e.metaKey) return;
                if (ctx.tool === 'section' || ctx.tool === 'rect' || ctx.tool === 'lasso') return;
                e.stopPropagation();
            };
            const handleElementClick = (e: React.MouseEvent) => {
                if (e.ctrlKey || e.metaKey) return;
                ctx.onClick(e, r.id);
            };
            return (
                <g key={r.id}>
                    {/* Left Border Interactive & Display */}
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={handleMouseDown} onClick={handleElementClick}>
                        <rect x={0} y={ry} width={Math.max(leftW, 24 * ctx.zoom)} height={rh} fill="transparent" style={{ cursor: ctx.tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    <rect x={0} y={ry} width={leftW} height={rh} fill={ctx.color} opacity={ctx.isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }} />
                    <rect x={leftW + 2} y={ry + 4} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={leftW + 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>
                        {`S${ctx.idx + 1}`}
                    </text>
                    {/* Right Border Interactive & Display */}
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={handleMouseDown} onClick={handleElementClick}>
                        <rect x={rightX} y={ry} width={Math.max(leftW, 24 * ctx.zoom)} height={rh} fill="transparent" style={{ cursor: ctx.tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    <rect x={rightX} y={ry} width={leftW} height={rh} fill={ctx.color} opacity={ctx.isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }} />
                    <rect x={rightX - 30} y={ry + 4} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={rightX - 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>
                        {`S${ctx.idx + 1}`}
                    </text>
                </g>
            );
        }
    },

    validate(mark: any) {
        const { y, h, w } = mark;
        if (typeof y !== 'number' || typeof h !== 'number' || typeof w !== 'number') {
            return { isValid: false, error: 'Section dimensions must be numeric.' };
        }
        if (y < 0 || h <= 0 || w <= 0) {
            return { isValid: false, error: 'Section y-position must be non-negative, and height/width must be positive.' };
        }
        return { isValid: true };
    }
}



export const isInSectionBorder = (coords: Point, r: Mark, ctx: SelectionContext) => {
    if(r.type !== 'section'){
        throw new Error(" must pass Section into isInSectionBorder ")
    }
    if(ctx.PDFWIDTH === undefined) return false
    
    const inY = coords.y >= r.y && coords.y <= r.y + r.h;
    const inLeft = coords.x >= 0 && coords.x <= r.w;
    const inRight = coords.x >= (ctx.PDFWIDTH - r.w) && coords.x <= ctx.PDFWIDTH;
    return inY && (inLeft || inRight);

}
