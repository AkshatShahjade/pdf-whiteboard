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

export interface MarkType {
    id: string
    isDrawable: boolean

    hasSelectedBorder: (pt: Point, r: Mark, ctx: SelectionContext) => boolean   

    createFinalizedShape?: (selection: Selection) => any

    initiateShape?: (coords: Point) => Selection

    updateSelection?: (prev: Selection, coords: Point, ctx: SelectionContext) => Selection

    renderSelectionPreview: (selection: Selection, ctx: SelectionContext) => any

    // createNewMark:(selection: Selection) => Mark

    // updateMark: (selection:Selection) => Mark
    
    render: () => void
}

// export interface Mark {
//     const newId = `reg_${Date.now()}`;
//     { id: newId, type: 'lasso', ...shape }
// }

export type Selection = RectDrag | LassoPoints | SectionRange

export interface RectDrag {
    type: 'rect'
    startX: number
    startY: number
    currentX: number
    currentY: number
}

export interface LassoPoints {
    type: 'lasso'
    points: Point[]
}

export interface SectionRange {
    type: 'section'
    start: number
    end: number
}

export interface SelectionContext {
    minPointDistance?: number
    zoom?: number
    borderWidth?: number
    PDFWIDTH?: number // TODO... renmove this....
}

export const STROKE_HIT_WIDTH = 12;
