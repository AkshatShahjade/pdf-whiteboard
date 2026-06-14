import { MarkType, Selection } from "../../../shared_doman_models_and_dtos/mark_model";

export const markRegistry = new Map<string, MarkType>();

export function registerMarkType(impl: MarkType): void {
    if (markRegistry.has(impl.id)) {
        throw new Error(`Duplicate mark implementation: ${impl.id}`)
    }
    markRegistry.set(impl.id, impl)
}

export function getMarkType (id: string): MarkType {
    const imp = markRegistry.get(id)

    if(!imp){
        throw new Error(`No mark implementation of id: ${id}`)
    }
    return imp 
}
