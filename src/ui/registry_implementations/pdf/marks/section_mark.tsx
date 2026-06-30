import { Mark, Point, Selection, SectionSel, SelectionContext, RenderMarkContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { PDFMarkRendererType } from "../../../renderer_registry/pdf/mark_renderer_registry";

export const sectionMark: PDFMarkRendererType = {
    id: 'section',
    isDrawable: false,

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

            const isSelectionMode = ctx.uiMode?.type === 'MARK_SELECTION';
            const isSourceMark = isSelectionMode && ctx.uiMode?.selectedMarkId === r.id;
            const isTargetCandidate = isSelectionMode && ctx.uiMode?.selectedMarkId !== r.id;

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
                        opacity: 0.8 !important;
                      }
                      .mark-candidate-${r.id}:hover {
                        cursor: pointer;
                      }
                    `}</style>

                    {/* Glowing vertical lines for Section borders */}
                    {isSourceMark && (
                        <>
                            <line className="pulse-glow" x1={leftW} y1={ry} x2={leftW} y2={ry + rh} stroke="#3B82F6" strokeWidth={6} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                            <line className="pulse-glow" x1={rightX} y1={ry} x2={rightX} y2={ry + rh} stroke="#3B82F6" strokeWidth={6} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                        </>
                    )}

                    {/* Faint pulsating glow for target candidates */}
                    {isTargetCandidate && (
                        <>
                            <line className="candidate-glow" x1={leftW} y1={ry} x2={leftW} y2={ry + rh} stroke="#10B981" strokeWidth={5} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                            <line className="candidate-glow" x1={rightX} y1={ry} x2={rightX} y2={ry + rh} stroke="#10B981" strokeWidth={5} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                        </>
                    )}

                    {/* Left Border Interactive & Display */}
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={handleMouseDown} onClick={handleElementClick}>
                        <rect x={0} y={ry} width={Math.max(leftW, 24 * ctx.zoom)} height={rh} fill="transparent" style={{ cursor: isSelectionMode ? 'pointer' : (ctx.tool === 'select' ? 'pointer' : 'crosshair') }} />
                    </g>
                    <rect className="visual-border" x={0} y={ry} width={leftW} height={rh} fill={ctx.color} opacity={ctx.isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s, filter 0.2s', pointerEvents: 'none' }} />
                    <rect x={leftW + 2} y={ry + 4} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={leftW + 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>
                        {`S${ctx.idx + 1}`}
                    </text>
                    {/* Right Border Interactive & Display */}
                    <g style={{ pointerEvents: 'auto' }} onMouseDown={handleMouseDown} onClick={handleElementClick}>
                        <rect x={rightX} y={ry} width={Math.max(leftW, 24 * ctx.zoom)} height={rh} fill="transparent" style={{ cursor: isSelectionMode ? 'pointer' : (ctx.tool === 'select' ? 'pointer' : 'crosshair') }} />
                    </g>
                    <rect className="visual-border" x={rightX} y={ry} width={leftW} height={rh} fill={ctx.color} opacity={ctx.isSelected ? 0.66 : 0.33} style={{ transition: 'opacity 0.15s, filter 0.2s', pointerEvents: 'none' }} />
                    <rect x={rightX - 30} y={ry + 4} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                    <text x={rightX - 16} y={ry + 14} textAnchor="middle" fill="white" fontSize={9} fontWeight="700" style={{ pointerEvents: 'none' }}>
                        {`S${ctx.idx + 1}`}
                    </text>
                </g>
            );
        }
    },

}
