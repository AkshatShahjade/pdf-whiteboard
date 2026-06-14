export interface Point {
    x: number; 
    y: number;
}

export interface RectMark {
    id: string;
    type: 'rect'
    x: number; 
    y: number;
    w: number;
    h: number;
}
export interface LassoMark {
    id: string;
    type: 'lasso'
    x: number;  // the top left point, idk why?? TODO change this....
    y: number;
    w: number;
    h: number;
    points: Point[]
}

export interface SectionMark {
    id: string;
    type: 'section'
    y: number
    h: number
    w: number
}

export type Mark = RectMark | LassoMark | SectionMark

// export interface Mark {
//     const newId = `reg_${Date.now()}`;
//     { id: newId, type: 'lasso', ...shape }
// }

export type Selection = RectSel | LassoSel | SectionSel

export interface RectSel {
    type: 'rect'
    startX: number | null
    startY: number | null
    currentX: number | null
    currentY: number | null
}

export interface LassoSel {
    type: 'lasso'
    points: Point[] | null
}

export interface SectionSel {
    type: 'section'
    start: number | null
    end: number | null
}

export interface SelectionContext {
    minPointDistance?: number
    zoom?: number
    PDFWIDTH?: number 
}

export interface RenderMarkContext {
    minPointDistance?: number
    zoom?: number
    PDFWIDTH?: number 
    tool?: string
    color?: string 
    idx?: number
    isSelected?: boolean
    onClick: (e: React.MouseEvent, id: string) => void;
}

export const STROKE_HIT_WIDTH = 12;
export const SECTION_BASE_WIDTH = 16;
export const SECTION_WIDTH_STEP = 8;
export const DEFAULT_SECTION_WIDTH = SECTION_BASE_WIDTH + SECTION_WIDTH_STEP;
