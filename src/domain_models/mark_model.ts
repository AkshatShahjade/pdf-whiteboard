
export interface Point {
    x: number; 
    y: number;
}

export interface Rect {
    type: 'rect'
    x: number; 
    y: number;
    w: number;
    h: number;
}
export interface Lasso {
    type: 'lasso'
    x: number;  // the top left point, idk why?? TODOL change this....
    y: number;
    w: number;
    h: number;
    points: Point[]
}

export interface Section {
    type: 'section'
    y_st: number
    y_en: number
}

export type Region = Rect | Lasso | Section

export interface MarkType {
    id: string

    hasSelectedBorder: (pt: Point, r: Region, border_width: number) => boolean   
}