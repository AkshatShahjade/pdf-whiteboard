import { Selection, MarkType, Point, Mark, STROKE_HIT_WIDTH, RectDrag, RectMark, SelectionContext, RenderMarkContext } from "../../../domain_models/mark_model";

export const rectangleMark: MarkType = {
    id : 'rect',
    isDrawable: true,
    
    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
      if(ctx.zoom === undefined) return false  
      const hitThreshold = (STROKE_HIT_WIDTH / 2) / ctx.zoom;
      return isInRectBorder(point, region, hitThreshold)
    },

    createFinalizedShape(selection) {
      if(selection.type === 'rect'){
        return createRectMarkShape(selection)
      }
    },

    initiateShape(coords) {
      return { type:'rect', startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y };
    },

    returnNewDrawableMark(selection) {
      const shape = getMarkType(currentSelection.type).createFinalizedShape(currentSelection)
      [...prev, { id: newId, type: currentSelection.type, ...shape }]
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

    render(r: Mark, ctx: RenderMarkContext){
      if(r.type === 'rect' && ctx.zoom !== undefined && ctx.idx !== undefined){
        const rx = r.x * ctx.zoom, ry = r.y * ctx.zoom, rw = r.w * ctx.zoom, rh = r.h * ctx.zoom;
        return (
          <g key={r.id}>
            <g style={{ pointerEvents: 'auto' }} onMouseDown={(e) => { if (e.ctrlKey || e.metaKey) return; if (ctx.tool === 'rect' || ctx.tool === 'section' || ctx.tool === 'lasso') return; e.stopPropagation(); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) return; ctx.onClick(e, r.id); }}>
              <rect x={rx} y={ry} width={rw} height={rh} fill="none" stroke="transparent" strokeWidth={STROKE_HIT_WIDTH} style={{ pointerEvents: 'stroke', cursor: ctx.tool === 'select' ? 'pointer' : 'crosshair' }} />
            </g>
            <rect x={rx} y={ry} width={rw} height={rh} fill={ctx.isSelected ? `${ctx.color}1A` : 'none'} stroke={ctx.color} strokeWidth={ctx.isSelected ? 2 : 1.5} strokeDasharray={ctx.isSelected ? 'none' : '7 3'} rx={2} style={{ pointerEvents: 'none', transition: 'fill 0.15s, stroke-width 0.1s' }} />
            <rect x={rx + 1} y={ry + 1} width={28} height={15} fill={ctx.color} rx={2} style={{ pointerEvents: 'none' }} />
            <text x={rx + 15} y={ry + 11} textAnchor="middle" fill="white" fontSize={9} fontFamily="'IBM Plex Mono', monospace" fontWeight="700" style={{ pointerEvents: 'none' }}>{`R${ctx.idx + 1}`}</text>
          </g>
        );
    }    
  }

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