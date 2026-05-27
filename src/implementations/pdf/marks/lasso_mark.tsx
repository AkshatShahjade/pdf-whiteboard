import { LassoPoints, Mark, MarkType, Point, Selection } from "../../../domain_models/mark_model";
import { distToSegmentSquared } from "../../../helper";

export const lassoMark: MarkType = {
    id : 'lasso',

    hasSelectedBorder(point: Point, region: Mark, width: number) {
            return isInLassoBorder(point, region, width)
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
    //     if (w > 10 / zoom && h > 10 / zoom) {
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
    
    render(){}
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
