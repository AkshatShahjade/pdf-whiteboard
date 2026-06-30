import { LassoSel, Mark, Point, RenderMarkContext, Selection, SelectionContext, STROKE_HIT_WIDTH } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { distToSegmentSquared } from "../../../helper";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";
import { PDFMarkRendererType } from "../../../renderer_registry/pdf/mark_renderer_registry";

export const lassoMark: PDFMarkRendererType = {
    id : 'lasso',
    isDrawable: true,

    onBorderEditStart({ hit, coords, actions }) {
      if (hit.type !== 'lasso') return false
      actions.setEditingShapeId(hit.id)
      actions.setShapeBackup({ ...hit })
      actions.setTool('lasso')
      actions.setMovingRegion({ id: hit.id, offsetX: coords.x - hit.x, offsetY: coords.y - hit.y })
      return true
    },

    returnDrawableMarkWithoutId(selection: Selection) {
        if(selection.type === 'lasso'){
            return createLassoSel(selection)
        } else{
            console.error("ISSUE OOGABOOGA");
        }
    },

    initiateShape(coords) {
        return {type: 'lasso',  points:[{ x: coords.x, y: coords.y }]};
    },


    updateSelection(prev: Selection, coords: Point, ctx: { minPointDistance?: number }) {
        if (prev.type !== 'lasso'){ console.error("BOOGA OOGA ERR"); return prev}
        if (!Array.isArray(prev.points) || prev.points.length === 0) {
            return { ...prev, points: [coords] };
        }

        const last = prev.points[prev.points.length - 1]
        if (!last) {
            return { ...prev, points: [coords] }
        }

        const min = ctx.minPointDistance ?? 0
        const dx = last.x - coords.x
        const dy = last.y - coords.y

        if ((dx * dx) + (dy * dy) >= min * min) {
            return { ...prev, points: [...prev.points, coords] }
        }

        return prev
    },

    returnNewDrawableMark(selection) {
      if(selection.type === "lasso") {
        const new_sel = createLassoSel(selection);
        if (!new_sel) return null;
        return { id: createMarkId(), ...new_sel }
      }
      console.error("BAOSIK");
      return null
    },

    

    // createNewRegion(selection) {
    //     if (w > 10 / ctx.zoom && h > 10 / zoom) {
    //         shape = createLassoRegion(selection)
    //         const newId = `reg_${Date.now()}`;
    //         return { id: newId, type: 'lasso', ...shape }
    //     }
    // },


    // updateRegion(selection) {
    //     if (w > 10 / zoom && h > 10 / zoom) {
    //         shape = createLassoRegion(selection)
    //         setRegions(prev => prev.map(r => r.id === editingShapeId ? { ...r, ...shape } : r));
    //     }
    //   },

    renderSelectionPreview(selection, ctx) {
        if(selection.type==='lasso' && Array.isArray(selection.points) && selection.points.length > 0 && ctx.zoom !== undefined){
            return (
                <polyline 
                    points={selection.points.map(p => `${p.x * ctx.zoom},${p.y * ctx.zoom}`).join(' ')} 
                    fill="rgba(59,130,246,0.1)" 
                    stroke="#3B82F6" // TODO: Hardcoded?
                    strokeWidth={1.5} 
                    strokeDasharray="5 4" 
                    style={{ pointerEvents: 'none' }} 
                />
            );
        }
    },
    
    render(r:Mark, ctx: RenderMarkContext){
        if (r.type === 'lasso'
            && Array.isArray(r.points)
            && ctx.zoom !== undefined && ctx.color !== undefined && ctx.tool !== undefined && ctx.idx !== undefined && ctx.isSelected !== undefined && ctx.onClick !== undefined
        ) {
            const borderWidth = STROKE_HIT_WIDTH;
            const rx = r.x * ctx.zoom, ry = r.y * ctx.zoom, rw = r.w * ctx.zoom, rh = r.h * ctx.zoom;
            const pointsStr = r.points.map(p => `${rx + (p.x * ctx.zoom)},${ry + (p.y * ctx.zoom)}`).join(' ');
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
                    stroke-width: 2px !important;
                    stroke-dasharray: none !important;
                  }
                  .mark-candidate-${r.id}:hover {
                    cursor: pointer;
                  }
                `}</style>

                {/* Pulsating background glow for source mark */}
                {isSourceMark && (
                    <polygon className="pulse-glow" points={pointsStr} fill="none" stroke="#3B82F6" strokeWidth={6} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                )}

                {/* Faint pulsating glow for target candidates */}
                {isTargetCandidate && (
                    <polygon className="candidate-glow" points={pointsStr} fill="none" stroke="#10B981" strokeWidth={5} style={{ pointerEvents: 'none', transition: 'all 0.2s' }} />
                )}

                <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (ctx.tool === 'rect' || ctx.tool === 'section' || ctx.tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; ctx.onClick(e, r.id); }}>
                <polygon points={pointsStr} fill="transparent" stroke="transparent" strokeWidth={borderWidth} style={{ pointerEvents: 'stroke', cursor: isSelectionMode ? 'pointer' : (ctx.tool === 'select' ? 'pointer' : 'crosshair') }} />
                </g>
                <polygon className="visual-border" points={pointsStr} fill={ctx.isSelected ? `${ctx.color}1A` : 'none'} stroke={ctx.color} strokeWidth={ctx.isSelected ? 2 : 1.5} strokeDasharray={ctx.isSelected ? 'none' : '7 3'} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${ctx.idx + 1}`}</text>
            </g>
            );
        }
    },

}


function createLassoSel(lassoPoints: LassoSel): any {
    if (!Array.isArray(lassoPoints.points) || lassoPoints.points.length <= 5) {
        return null;
    }

    const xs = lassoPoints.points.map(p => p.x);
    const ys = lassoPoints.points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX;
    const h = maxY - minY;

    const relativePoints = lassoPoints.points.map(p => ({ x: p.x - minX, y: p.y - minY }));
    return { type:"lasso" ,x: minX, y: minY, w, h, points: relativePoints };
}
