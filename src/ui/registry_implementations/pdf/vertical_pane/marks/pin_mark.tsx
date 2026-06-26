import { Mark, PinMark, PinSel, Point, RenderMarkContext, Selection, SelectionContext, STROKE_HIT_WIDTH } from "../../../../../shared_doman_models_and_dtos/mark_domain_model";
import { generateMarkId as createMarkId } from "../../../../../shared_doman_models_and_dtos/factories";
import { PDFMarkRendererType } from "../../../../renderer_registry/pdf/vertical_pane/mark_renderer_registry";

export const pinMark: PDFMarkRendererType = {
    id: 'pin',
    isDrawable: true,

    onBorderEditStart({ hit, coords, actions }) {
        if (hit.type !== 'pin') return false;
        actions.setEditingShapeId(hit.id);
        actions.setShapeBackup({ ...hit });
        actions.setTool('pin');
        actions.setMovingRegion({ id: hit.id, offsetX: coords.x - hit.x, offsetY: coords.y - hit.y });
        return true;
    },

    returnDrawableMarkWithoutId(selection) {
        if (selection.type === 'pin') {
            return { type: 'pin', x: selection.x, y: selection.y };
        }
    },

    initiateShape(coords: Point) {
        return { type: 'pin', x: coords.x, y: coords.y };
    },

    returnNewDrawableMark(selection: Selection) {
        if (selection.type === 'pin' && selection.x !== null && selection.y !== null) {
            return { id: createMarkId(), type: 'pin', x: selection.x, y: selection.y };
        }
        return null;
    },

    updateSelection(prev: Selection, coords: Point) {
        if (prev.type === 'pin') {
            return { ...prev, x: coords.x, y: coords.y };
        }
        return prev;
    },

    renderSelectionPreview(selection: Selection, ctx: SelectionContext) {
        if (selection.type === 'pin' && selection.x !== null && selection.y !== null && ctx.zoom) {
            return renderPin(selection.x * ctx.zoom, selection.y * ctx.zoom, "rgba(59,130,246,0.5)");
        }
    },

    render(r: Mark, ctx: RenderMarkContext) {
        if (r.type === 'pin' && ctx.zoom !== undefined) {
            const rx = r.x * ctx.zoom;
            const ry = r.y * ctx.zoom;
            return (
                <g key={r.id}>
                    <g 
                        style={{ pointerEvents: 'auto' }} 
                        onMouseDown={(e) => { 
                            if (e.ctrlKey || e.metaKey) return; 
                            if (ctx.tool === 'rect' || ctx.tool === 'section' || ctx.tool === 'lasso' || ctx.tool === 'pin') return; 
                            e.stopPropagation(); 
                        }} 
                        onClick={(e) => { 
                            if (e.ctrlKey || e.metaKey) return; 
                            ctx.onClick(e, r.id); 
                        }}
                    >
                        {renderPin(rx, ry, ctx.isSelected ? ctx.color : '#6B7280')}
                        
                        {/* Hit area for selection */}
                        <circle cx={rx} cy={ry} r={12} fill="transparent" style={{ pointerEvents: 'fill', cursor: ctx.tool === 'select' ? 'pointer' : 'crosshair' }} />
                    </g>
                    
                    {/* Selected state indicator */}
                    {ctx.isSelected && (
                        <circle cx={rx} cy={ry} r={16} fill="none" stroke={ctx.color} strokeWidth={1.5} strokeDasharray="3 3" style={{ pointerEvents: 'none' }} />
                    )}
                    
                    {/* Index label if needed, matching other marks styling optionally */}
                    {ctx.idx !== undefined && (
                        <g style={{ pointerEvents: 'none' }}>
                            <rect x={rx + 12} y={ry - 8} width={28} height={15} fill={ctx.color} rx={2} />
                            <text x={rx + 26} y={ry + 2} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700">
                                {`P${ctx.idx + 1}`}
                            </text>
                        </g>
                    )}
                </g>
            );
        }
    }
};

function renderPin(x: number, y: number, color: string) {
    return (
        <g transform={`translate(${x - 12}, ${y - 24})`} style={{ pointerEvents: 'none' }}>
            {/* simple pin drop SVG icon */}
            <path 
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                fill={color} 
            />
        </g>
    );
}
