import { Point, Region, MarkType } from "../domain_models/mark_model";

export const markRegistry = new Map<string, MarkType>();

export function registerMark(impl: MarkType): void {
    if (markRegistry.has(impl.id)) {
        throw new Error(`Duplicate mark implementation: ${impl.id}`)
    }
    markRegistry.set(impl.id, impl)
}

export function getMarkImplementation (id: string): MarkType {
    const imp = markRegistry.get(id)

    if(!imp){
        throw new Error(`No mark implementation of id: ${id}`)
    }
    return imp 
}