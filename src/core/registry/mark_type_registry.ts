
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

export const markRegistry = new Map<string, MarkImplementation>();


export interface MarkImplementation {
    id: string

    hasSelectedBorder: (pt: Point, r: Region, border_width: number) => boolean   
}

export function registerMark(impl: MarkImplementation): void {
    if (markRegistry.has(impl.id)) {
        throw new Error(`Duplicate mark implementation: ${impl.id}`)
    }
    markRegistry.set(impl.id, impl)
}

export function getMarkImplementation (id: string): MarkImplementation {
    const imp = markRegistry.get(id)

    if(!imp){
        throw new Error(`No mark implementation of id: ${id}`)
    }
    return imp 
}