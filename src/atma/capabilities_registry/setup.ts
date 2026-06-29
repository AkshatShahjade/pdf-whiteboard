
import { lassoMark } from "../registry_implementations/pdf/marks/lasso_domain_mark";
import { rectangleMark } from "../registry_implementations/pdf/marks/rectangle_domain_mark";
import { sectionMark } from "../registry_implementations/pdf/marks/section_domain_mark";
import { pinDomainMark } from "../registry_implementations/pdf/marks/pin_domain_mark";

import { tldrawDomainMark as whiteboardTldrawDomainMark } from "../registry_implementations/whiteboard/marks/tldraw_domain_mark";
import { markDomainRegistry, registerMarkDomainType } from "./pdf/mark_domain_registry";
import { markDomainRegistry as whiteboardMarkDomainRegistry, registerMarkDomainType as registerWhiteboardMarkDomainType } from "./whiteboard/mark_domain_registry";
import { contentDomainRegistry, registerContentDomainType } from "./content_domain_registry";
import { pdfContentDomain } from "../registry_implementations/pdf/pdf_domain_content";
import { whiteboardContentDomain } from "../registry_implementations/whiteboard/whiteboard_domain_content";
import { contentSelectorDomainContent } from "../registry_implementations/content_selector/content_selector_domain_content";
import { linkToolDomain } from "../registry_implementations/screen_level/tools/link_tool_domain";
import { openContentToolDomain } from "../registry_implementations/screen_level/tools/open_content_tool_domain";
import { toolDomainRegistry, registerToolDomainType } from "./screen_level/tool_domain_registry";

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
    if (!markDomainRegistry.has(pinDomainMark.id)) {
        registerMarkDomainType(pinDomainMark);
    }

    if (!whiteboardMarkDomainRegistry.has(whiteboardTldrawDomainMark.id)) {
        registerWhiteboardMarkDomainType(whiteboardTldrawDomainMark);
    }
}

export function setupContentDomainRegistry() {
    if (!contentDomainRegistry.has(pdfContentDomain.id)) {
        registerContentDomainType(pdfContentDomain);
    }
    if (!contentDomainRegistry.has(whiteboardContentDomain.id)) {
        registerContentDomainType(whiteboardContentDomain);
    }
    if (!contentDomainRegistry.has(contentSelectorDomainContent.id)) {
        registerContentDomainType(contentSelectorDomainContent);
    }
}

export function setupToolDomainRegistry() {
    if (!toolDomainRegistry.has(linkToolDomain.id)) {
        registerToolDomainType(linkToolDomain);
    }
    if (!toolDomainRegistry.has(openContentToolDomain.id)) {
        registerToolDomainType(openContentToolDomain);
    }
}

export function setupAllRegistries() {
    setupMarkDomainRegistry();
    setupContentDomainRegistry();
    setupToolDomainRegistry();
}