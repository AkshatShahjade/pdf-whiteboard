import { LassoPoints, Mark, MarkType, Point, RenderMarkContext, Selection, SelectionContext } from "../../../domain_models/mark_model";
import { distToSegmentSquared } from "../../../helper";

export const lassoMark: MarkType = {
    id : 'lasso',
    isDrawable: true,

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        if(ctx.borderWidth === undefined) return false  
        return isInLassoBorder(point, region, ctx.borderWidth)
    },

    createFinalizedShape(selection: Selection) {
        if(selection.type === 'lasso'){
            return createLassoMarkShape(selection)
        } else{
            console.error("ISSUE OOGABOOGA");
        }
    },

    initiateShape(coords) {
        return {type: 'lasso',  points:[{ x: coords.x, y: coords.y }]};
    },


    updateSelection(prev: Selection, coords: Point, ctx: { minPointDistance?: number }) {
        if (prev.type !== 'lasso'){ console.error("BOOGA OOGA ERR"); return prev}

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
        if(selection.type==='lasso' && selection.points.length > 0 && ctx.zoom !== undefined){
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
            && ctx.borderWidth !== undefined && ctx.zoom !== undefined && ctx.color !== undefined && ctx.tool !== undefined && ctx.idx !== undefined && ctx.isSelected !== undefined && ctx.onClick !== undefined
        ) {
            const rx = r.x * ctx.zoom, ry = r.y * ctx.zoom, rw = r.w * ctx.zoom, rh = r.h * ctx.zoom;
            const pointsStr = r.points.map(p => `${rx + (p.x * ctx.zoom)},${ry + (p.y * ctx.zoom)}`).join(' ');
            return (
            <g key={r.id}>
                <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (ctx.tool === 'rect' || ctx.tool === 'section' || ctx.tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; ctx.onClick(e, r.id); }}>
                <polygon points={pointsStr} fill="transparent" stroke="transparent" strokeWidth={ctx.borderWidth} style={{ pointerEvents: 'stroke', cursor: ctx.tool === 'select' ? 'pointer' : 'crosshair' }} />
                </g>
                <polygon points={pointsStr} fill={ctx.isSelected ? `${ctx.color}1A` : 'none'} stroke={ctx.color} strokeWidth={ctx.isSelected ? 2 : 1.5} strokeDasharray={ctx.isSelected ? 'none' : '7 3'} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
                <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
                <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${ctx.idx + 1}`}</text>
            </g>
            );
        }
    }
}


function createLassoMarkShape(lassoPoints: LassoPoints): any {
    if (lassoPoints.points.length <= 5) {
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
    return { x: minX, y: minY, w, h, points: relativePoints };
}

export const isInLassoBorder = (coords: Point, r: Mark, threshold:number) => {
  if(r.type !== 'lasso'){
    throw new Error(" must pass Lasso into isInLassoBorder ")
  }
  
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
