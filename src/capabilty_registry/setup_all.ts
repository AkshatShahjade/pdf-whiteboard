import { setupMarkRegistry, setupToolRegistry } from "./pdf/setup";

export function setupAllRegistries(){
    setupMarkRegistry()
    setupToolRegistry()
}