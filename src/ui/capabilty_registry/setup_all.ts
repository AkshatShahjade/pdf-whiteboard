import { setupMarkRegistry, setupToolRegistry } from "./pdf/setup";

export function setupAllRendererRegistries(){
    setupMarkRegistry()
    setupToolRegistry()
}