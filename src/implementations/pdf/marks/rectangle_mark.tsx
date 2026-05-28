import { Selection, MarkType, Point, Mark, STROKE_HIT_WIDTH, RectDrag, RectMark, SelectionContext } from "../../../domain_models/mark_model";

export const rectangleMark: MarkType = {
    id : 'rect',
    isDrawable: true,
    
    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
      if(ctx.borderWidth === undefined) return false  
      return isInRectBorder(point, region, ctx.borderWidth)
    },

    createFinalizedShape(selection) {
      if(selection.type === 'rect'){
        return createRectMarkShape(selection)
      }
    },

    initiateShape(coords) {
      return { type:'rect', startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y };
    },

    updateSelection(prev: Selection, coords: Point) {
        if(prev.type === 'rect'){
          return { ...prev, currentX: coords.x, currentY: coords.y }
        }
        else{
          console.error("BOOGA OOGA ERR");
          return prev
        }
    },

    renderSelectionPreview(selection, ctx) {
      if(selection.type==="rect" && ctx.zoom){
          const { x, y, w, h } = createRectMarkShape(selection);
          return (
            <rect x={x * ctx.zoom} y={y * ctx.zoom} width={w * ctx.zoom} height={h * ctx.zoom} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 4" rx={2} style={{ pointerEvents: 'none' }} />
          );
      }else{
        console.error("BAAGU BOGU");
        
      }
    },

    render(){}    

}

function createRectMarkShape (drag: RectDrag) : any {
  return {
      x: Math.min(drag.startX, drag.currentX),
      y: Math.min(drag.startY, drag.currentY),
      w: Math.abs(drag.startX - drag.currentX),
      h: Math.abs(drag.startY - drag.currentY),
    }
}

export const isInRectBorder = (coords: Point, r: Mark, threshold = STROKE_HIT_WIDTH / 2) => {
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