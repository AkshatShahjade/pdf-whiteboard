import React, { useEffect, useMemo, useRef, useState } from "react";

const CELL_SIZE = 70;

type GridInfo = {
  cellSize: number;
  cols: number;
  rows: number;
};

type Slot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const resize = () =>
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return size;
}

function calculateGrid(width: number, height: number): GridInfo {
  return {
    cellSize: CELL_SIZE,
    cols: Math.floor(width / CELL_SIZE),
    rows: Math.floor(height / CELL_SIZE),
  };
}

function scaleGridDown(grid: GridInfo, scale_factor: number = 1): GridInfo {
  return {
    cellSize: grid.cellSize * scale_factor,
    cols: Math.floor(grid.cols * scale_factor),
    rows: Math.floor(grid.rows * scale_factor),
  };
} 

function overlap(a: Slot, b: Slot) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export default function ScreenBuilder() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { width, height } = useWindowSize();

  const grid = useMemo(
    () => scaleGridDown(calculateGrid(width, height)),
    [width, height]
  );

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{x:number;y:number}|null>(null);
  const [preview, setPreview] = useState<Slot|null>(null);

  function pointToCell(x:number,y:number) {
    const rect = containerRef.current!.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(grid.cols-1,
        Math.floor((x-rect.left)/CELL_SIZE))),
      y: Math.max(0, Math.min(grid.rows-1,
        Math.floor((y-rect.top)/CELL_SIZE))),
    };
  }

  function valid(slot:Slot) {
    if (
      slot.x + slot.w > grid.cols ||
      slot.y + slot.h > grid.rows
    ) return false;

    return !slots.some(s => overlap(slot,s));
  }

  function mouseDown(e:React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.slot) return;

    const p = pointToCell(e.clientX,e.clientY);

    setDrawing(true);
    setStart(p);
    setPreview({...p,id:"preview",w:1,h:1});
    setSelected(null);
  }

  function mouseMove(e:React.MouseEvent) {
    if (!drawing || !start) return;

    const p = pointToCell(e.clientX,e.clientY);

    setPreview({
      id:"preview",
      x:Math.min(start.x,p.x),
      y:Math.min(start.y,p.y),
      w:Math.abs(p.x-start.x)+1,
      h:Math.abs(p.y-start.y)+1,
    });
  }

  function mouseUp() {
    if (preview) {
      const slot = {...preview,id:crypto.randomUUID()};
      if (valid(slot)) setSlots(s=>[...s,slot]);
    }

    setDrawing(false);
    setPreview(null);
    setStart(null);
  }

  function remove() {
    setSlots(s=>s.filter(x=>x.id!==selected));
    setSelected(null);
  }

  return (
    <div style={{
      width:"100vw",
      height:"100vh",
      overflow:"hidden",
      padding:20,
      boxSizing:"border-box"
    }}>
      <button onClick={remove}>Delete</button>
      <div
        ref={containerRef}
        onMouseDown={mouseDown}
        onMouseMove={mouseMove}
        onMouseUp={mouseUp}
        style={{
          position:"relative",
          width:grid.cols*CELL_SIZE,
          height:grid.rows*CELL_SIZE,
          backgroundImage:`
            linear-gradient(#ddd 1px, transparent 1px),
            linear-gradient(90deg,#ddd 1px,transparent 1px)
          `,
          backgroundSize:`${CELL_SIZE}px ${CELL_SIZE}px`,
          border:"1px solid #aaa",
          userSelect:"none"
        }}
      >
        {slots.map(s=>(
          <div
            key={s.id}
            data-slot
            onClick={e=>{
              e.stopPropagation();
              setSelected(s.id);
            }}
            style={{
              position:"absolute",
              left:s.x*CELL_SIZE,
              top:s.y*CELL_SIZE,
              width:s.w*CELL_SIZE,
              height:s.h*CELL_SIZE,
              background:selected===s.id
                ? "rgba(0,120,255,.5)"
                : "rgba(0,120,255,.25)",
              border:"2px solid blue",
              boxSizing:"border-box"
            }}
          />
        ))}

        {preview && (
          <div style={{
            position:"absolute",
            left:preview.x*CELL_SIZE,
            top:preview.y*CELL_SIZE,
            width:preview.w*CELL_SIZE,
            height:preview.h*CELL_SIZE,
            background:"rgba(0,255,0,.2)",
            border:"2px dashed green",
            pointerEvents:"none"
          }}/>
        )}
      </div>
    </div>
  );
}
