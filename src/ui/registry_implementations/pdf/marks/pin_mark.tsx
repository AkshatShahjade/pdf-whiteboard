import { Mark, PinMark, PinSel, Point, RenderMarkContext, Selection, SelectionContext, STROKE_HIT_WIDTH } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";
import { PDFMarkRendererType } from "../../../renderer_registry/pdf/mark_renderer_registry";

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
            const isSelectionMode = ctx.uiMode?.type === 'MARK_SELECTION';
            const isSourceMark = isSelectionMode && ctx.uiMode?.selectedMarkId === r.id;
            const isTargetCandidate = isSelectionMode && ctx.uiMode?.selectedMarkId !== r.id;

            return (
                <g key={r.id} className={`${isSourceMark ? 'mark-source-' + r.id : ''} ${isTargetCandidate ? 'mark-candidate-' + r.id : ''}`}>
                    <style>{`
                      @keyframes pulseSource-${r.id} {
                        0% { stroke-width: 6px; opacity: 0.5; stroke: #3B82F6; }
                        100% { stroke-width: 16px; opacity: 0.9; stroke: #93C5FD; }
                      }
                      @keyframes pulseCandidate-${r.id} {
                        0% { stroke-width: 4px; opacity: 0.15; }
                        100% { stroke-width: 7px; opacity: 0.35; }
                      }
                      .mark-source-${r.id} .pulse-glow {
                        animation: pulseSource-${r.id} 0.6s infinite alternate ease-in-out;
                      }
                      .mark-candidate-${r.id} .candidate-glow {
                        animation: pulseCandidate-${r.id} 1.5s infinite alternate ease-in-out;
                      }
                      .mark-candidate-${r.id}:hover .candidate-glow {
                        animation: none;
                        opacity: 0.8 !important;
                        stroke-width: 10px !important;
                        stroke: #34D399 !important;
                      }
                      .mark-candidate-${r.id}:hover .visual-border {
                        fill: #10B981 !important;
                      }
                      .mark-candidate-${r.id}:hover {
                        cursor: pointer;
                      }
                    `}</style>

                    {/* Glowing background circles for Pin drop */}
                    {isSourceMark && (
                        <circle className="pulse-glow" cx={rx} cy={ry} r={12} fill="none" stroke="#3B82F6" strokeWidth={6} style={{ pointerEvents: 'none' }} />
                    )}

                    {/* Faint pulsating glow for target candidates */}
                    {isTargetCandidate && (
                        <circle className="candidate-glow" cx={rx} cy={ry} r={12} fill="none" stroke="#10B981" strokeWidth={5} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                    )}

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
                        {renderPin(rx, ry, ctx.isSelected ? ctx.color : '#6B7280', 'visual-border')}
                        
                        {/* Hit area for selection */}
                        <circle cx={rx} cy={ry} r={12} fill="transparent" style={{ pointerEvents: 'fill', cursor: isSelectionMode ? 'pointer' : (ctx.tool === 'select' ? 'pointer' : 'crosshair') }} />
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

function renderPin(x: number, y: number, color: string, className?: string) {
    return (
        <g transform={`translate(${x - 12}, ${y - 24})`} style={{ pointerEvents: 'none' }}>
            {/* simple pin drop SVG icon */}
            <path 
                className={className}
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                fill={color} 
            />
        </g>
    );
}
