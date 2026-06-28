import { ScreenToolRendererType } from "../../../../renderer_registry/screen_level/tool_renderer_registry"
import { searchToolDomain } from "../../../../../atma/registry_implementations/screen_level/tools/search_tool_domain"

export const searchToolRenderer: ScreenToolRendererType = {
    id: searchToolDomain,
    label: 'Search Tool',
    icon: '🔍',
    onActivate(ctx: any) {
        console.log("Search Tool activated (dummy)");
    }
}
