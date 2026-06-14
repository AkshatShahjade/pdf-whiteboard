
import { lassoMark } from "../registry_implementations/pdf/marks/lasso_domain_mark";
import { rectangleMark } from "../registry_implementations/pdf/marks/rectangle_domain_mark";
import { sectionMark } from "../registry_implementations/pdf/marks/section_domain_mark";
import { markDomainRegistry, registerMarkDomainType } from "./pdf/mark_domain_registry";

export function setupMarkDomainRegistry() {
    if (!markDomainRegistry.has(lassoMark.id)) {
        registerMarkDomainType(lassoMark);
    }
    if (!markDomainRegistry.has(rectangleMark.id)) {
        registerMarkDomainType(rectangleMark);
    }
    if (!markDomainRegistry.has(sectionMark.id)) {
        registerMarkDomainType(sectionMark);
    }
}

export function setupAllRegistries() {
    setupMarkDomainRegistry();
}