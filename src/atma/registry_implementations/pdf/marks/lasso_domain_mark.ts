import { LassoSel, Mark, Point, RenderMarkContext, Selection, SelectionContext, STROKE_HIT_WIDTH } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { distToSegmentSquared } from "../../../../ui/helper";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";
import { MarkDomainType } from "../../../capabilities_registry/pdf/mark_domain_registry";

export const lassoMark: MarkDomainType = {
    id : 'lasso',

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        if(ctx.zoom === undefined) return false  
        const hitThreshold = (STROKE_HIT_WIDTH / 2) / ctx.zoom;
        return isInLassoBorder(point, region, hitThreshold)
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

const isInLassoBorder = (coords: Point, r: Mark, threshold:number) => {
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
