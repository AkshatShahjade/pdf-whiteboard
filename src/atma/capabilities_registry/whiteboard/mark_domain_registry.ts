export interface MarkDomainType {
    id: string  

    validate?: (mark: any) => { isValid: boolean; error?: string };
    parseRaw: (raw: any) => any;
}

export const markDomainRegistry = new Map<string, MarkDomainType>();

export function registerMarkDomainType(impl: MarkDomainType): void {
    if (markDomainRegistry.has(impl.id)) {
        throw new Error(`Duplicate whiteboard mark implementation: ${impl.id}`)
    }
    markDomainRegistry.set(impl.id, impl)
}

export function getMarkDomainType(id: string): MarkDomainType {
    const imp = markDomainRegistry.get(id)
    if (!imp) {
        throw new Error(`No whiteboard mark implementation of id: ${id}`)
    }
    return imp 
}
