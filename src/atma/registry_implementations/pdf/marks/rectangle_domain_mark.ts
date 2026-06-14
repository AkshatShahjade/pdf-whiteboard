import { Selection, Point, Mark, STROKE_HIT_WIDTH, RectSel, RectMark, SelectionContext, RenderMarkContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";
import { MarkDomainType } from "../../../capabilities_registry/pdf/mark_domain_registry";

export const rectangleMark: MarkDomainType = {
    id : 'rect',

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
      if(ctx.zoom === undefined) return false  
      const hitThreshold = (STROKE_HIT_WIDTH / 2) / ctx.zoom;
      return isInRectBorder(point, region, hitThreshold)
    },

    validate(mark: any) {
      const { x, y, w, h } = mark;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
        return { isValid: false, error: 'Rect coordinates (x, y, w, h) must be numeric.' };
      }
      if (x < 0 || y < 0 || w <= 0 || h <= 0) {
        return { isValid: false, error: 'Rect dimensions must be positive and non-negative.' };
      }
      if (x + w > 800) {
        return { isValid: false, error: `Rect bounds exceed the page width: ${x + w} > 800` };
      }
      return { isValid: true };
    }
}

const isInRectBorder = (coords: Point, r: Mark, threshold = STROKE_HIT_WIDTH / 2) => {
  if(r.type !== 'rect'){
    throw new Error(" must pass Rect into isInRectBorder ")
  }
  const { x, y } = coords;
  const inX = x >= r.x - threshold && x <= r.x + r.w + threshold;
  const inY = y >= r.y - threshold && y <= r.y + r.h + threshold;
  return (
    (Math.abs(x - r.x)         < threshold && inY) ||
    (Math.abs(x - (r.x + r.w)) < threshold && inY) ||
    (Math.abs(y - r.y)         < threshold && inX) ||
    (Math.abs(y - (r.y + r.h)) < threshold && inX)
  );
};
