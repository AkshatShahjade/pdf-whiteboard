import { ToolDomainType } from "../../../shared_doman_models_and_dtos/tool_domain_models"

export const toolDomainRegistry = new Map<string, ToolDomainType>()

export function registerToolDomainType(impl: ToolDomainType): void {
    if (toolDomainRegistry.has(impl.id)) {
        throw new Error(`Duplicate tool domain type: ${impl.id}`)
    }
    toolDomainRegistry.set(impl.id, impl)
}

export function getToolDomainType(id: string): ToolDomainType {
    const impl = toolDomainRegistry.get(id)
    if (!impl) {
        throw new Error(`No tool domain type registered for id: ${id}`)
    }
    return impl
}
