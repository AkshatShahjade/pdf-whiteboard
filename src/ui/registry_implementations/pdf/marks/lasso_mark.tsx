import { LassoSel, Mark, Point, RenderMarkContext, Selection, SelectionContext, STROKE_HIT_WIDTH } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { distToSegmentSquared } from "../../../helper";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";
import { MarkRendererType } from "../../../capabilty_registry/pdf/mark_pdf_registry";

export const lassoMark: MarkRendererType = {
    id : 'lasso',
    isDrawable: true,

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        if(ctx.zoom === undefined) return false  
        const hitThreshold = (STROKE_HIT_WIDTH / 2) / ctx.zoom;
        return isInLassoBorder(point, region, hitThreshold)
    },

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
            return (
            <g key={r.id}>
                <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (ctx.tool === 'rect' || ctx.tool === 'section' || ctx.tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; ctx.onClick(e, r.id); }}>
                <polygon points={pointsStr} fill="transparent" stroke="transparent" strokeWidth={borderWidth} style={{ pointerEvents: 'stroke', cursor: ctx.tool === 'select' ? 'pointer' : 'crosshair' }} />
                </g>
                <polygon points={pointsStr} fill={ctx.isSelected ? `${ctx.color}1A` : 'none'} stroke={ctx.color} strokeWidth={ctx.isSelected ? 2 : 1.5} strokeDasharray={ctx.isSelected ? 'none' : '7 3'} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${ctx.idx + 1}`}</text>
            </g>
            );
        }
    },

    validate(mark: any) {
        const { x, y, w, h, points } = mark;
        if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
            return { isValid: false, error: 'Lasso coordinates (x, y, w, h) must be numeric.' };
        }
        if (x < 0 || y < 0 || w <= 0 || h <= 0) {
            return { isValid: false, error: 'Lasso dimensions must be positive and non-negative.' };
        }
        if (!Array.isArray(points) || points.length === 0) {
            return { isValid: false, error: 'Lasso must contain points.' };
        }
        for (const pt of points) {
            if (typeof pt.x !== 'number' || typeof pt.y !== 'number') {
                return { isValid: false, error: 'Lasso points must have numeric coordinates.' };
            }
            const absX = x + pt.x;
            const absY = y + pt.y;
            if (absX < 0 || absX > 800 || absY < 0) {
                return { isValid: false, error: `Lasso point (${absX}, ${absY}) is outside page boundary.` };
            }
        }
        return { isValid: true };
    }
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

export const isInLassoBorder = (coords: Point, r: Mark, threshold:number) => {
  if(r.type !== 'lasso'){
    throw new Error(" must pass Lasso into isInLassoBorder ")
  }
  if (!Array.isArray(r.points) || r.points.length === 0) return false;
  
  if (coords.x < r.x - threshold || coords.x > r.x + r.w + threshold ||
      coords.y < r.y - threshold || coords.y > r.y + r.h + threshold) return false;

  const thresh2 = threshold * threshold;
  for(let i=0; i<r.points.length; i++) {
    const p1 = { x: r.x + r.points[i].x, y: r.y + r.points[i].y };
    const p2 = { x: r.x + r.points[(i+1)%r.points.length].x, y: r.y + r.points[(i+1)%r.points.length].y };
    if (distToSegmentSquared(coords, p1, p2) <= thresh2) return true;
  }
  return false;
};
