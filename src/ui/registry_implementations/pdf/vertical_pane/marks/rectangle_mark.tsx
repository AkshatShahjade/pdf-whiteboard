import { Selection, Point, Mark, STROKE_HIT_WIDTH, RectSel, RectMark, SelectionContext, RenderMarkContext } from "../../../../../shared_doman_models_and_dtos/mark_domain_model";
import { generateMarkId as createMarkId } from "../../../../../shared_doman_models_and_dtos/factories";
import { PDFMarkRendererType } from "../../../../renderer_registry/pdf/vertical_pane/mark_renderer_registry";

export const rectangleMark: PDFMarkRendererType = {
    id : 'rect',
    isDrawable: true,
    
    onBorderEditStart({ hit, coords, actions }) {
      if (hit.type !== 'rect') return false
      actions.setEditingShapeId(hit.id)
      actions.setShapeBackup({ ...hit })
      actions.setTool('rect')
      actions.setMovingRegion({ id: hit.id, offsetX: coords.x - hit.x, offsetY: coords.y - hit.y })
      return true
    },

    returnDrawableMarkWithoutId(selection) {
      if(selection.type === 'rect'){
        return createRectSel(selection)
      }
    },

    initiateShape(coords) {
      return { type:'rect', startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y };
    },

    returnNewDrawableMark(selection) {
      const new_sel = createRectSel(selection)
      if (!new_sel) return null;
      return { id: createMarkId(), ...new_sel }
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
      if(selection.type==="rect" && ctx.zoom && selection.startX !== null && selection.startY !== null && selection.currentX !== null && selection.currentY !== null){
          const { x, y, w, h } = createRectSel(selection);
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
    },


}

function createRectSel (drag: RectSel) : any {
  if (drag.startX === null || drag.startY === null || drag.currentX === null || drag.currentY === null) {
    return null;
  }
  return {
      type:"rect",
      x: Math.min(drag.startX, drag.currentX),
      y: Math.min(drag.startY, drag.currentY),
      w: Math.abs(drag.startX - drag.currentX),
      h: Math.abs(drag.startY - drag.currentY),
    }
}
