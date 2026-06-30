import { ScreenToolRendererType } from "../../../../renderer_registry/screen_level/tool_renderer_registry"
import { openContentToolDomain } from "../../../../atma/registry_implementations/screen_level/tools/open_content_tool_domain"

export const openContentToolRenderer: ScreenToolRendererType = {
    id: openContentToolDomain,
    label: 'Open Content',
    icon: '🔍',
    onActivate(ctx: any) {
        ctx.uiController.setContentSelectorOpen(true);
    }
}
