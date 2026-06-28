import { ScreenToolRendererType } from "../../../../renderer_registry/screen_level/tool_renderer_registry"
import { linkToolDomain } from "../../../../atma/registry_implementations/screen_level/tools/link_tool_domain"

export const linkToolRenderer: ScreenToolRendererType = {
    id: linkToolDomain,
    label: 'Link Tool',
    icon: '🔗',
    onActivate(ctx: any) {
        console.log("Link Tool activated (dummy)");
    }
}
