import { Selection, Point, Mark, SelectionContext, RenderMarkContext } from "../../../shared_doman_models_and_dtos/mark_domain_model";

export interface MarkDomainType {
    id: string

    hasSelectedBorder: (pt: Point, r: Mark, ctx: SelectionContext) => boolean   

    validate?: (mark: any) => { isValid: boolean; error?: string };
}


export const markDomainRegistry = new Map<string, MarkDomainType>();

export function registerMarkDomainType(impl: MarkDomainType): void {
    if (markDomainRegistry.has(impl.id)) {
        throw new Error(`Duplicate mark implementation: ${impl.id}`)
    }
    markDomainRegistry.set(impl.id, impl)
}

export function getMarkDomainType (id: string): MarkDomainType {
    const imp = markDomainRegistry.get(id)

    if(!imp){
        throw new Error(`No mark implementation of id: ${id}`)
    }
    return imp 
}
