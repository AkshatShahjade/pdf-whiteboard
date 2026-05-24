import {Point, Region, Rect} from '../core/registry/mark_type_registry'
import type React from 'react'

interface Drag {
    startX: number
    startY: number
    currentX: number
    currentY: number
}

const STROKE_HIT_WIDTH = 12;


const getLocalCoords = (e: React.MouseEvent<HTMLDivElement>,
  ref: React.RefObject<HTMLDivElement>) => {
  if (!ref.current) return { x: 0, y: 0 };
  const rect = ref.current.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

function rectFromDrag (drag: Drag) : Rect {
    return {
        type: 'rect',
        x: Math.min(drag.startX, drag.currentX),
        y: Math.min(drag.startY, drag.currentY),
        w: Math.abs(drag.startX - drag.currentX),
        h: Math.abs(drag.startY - drag.currentY),
        }
}

export const isInRectBorder = (coords: Point, r: Region, threshold = STROKE_HIT_WIDTH / 2) => {
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

const sqr = (x: number) => x * x;
const dist2 = (p1: Point, p2: Point) => sqr(p1.x - p2.x) + sqr(p1.y - p2.y);
const distToSegmentSquared = (p: Point, v: Point, w: Point) => {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
};

export const isInLassoBorder = (coords: Point, r: Region, threshold:number) => {
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

export const isInSectionBorder = (coords: Point, r: Region, threshold: number) => {

}