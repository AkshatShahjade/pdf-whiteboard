export type CascadePath = 
    | 'content_tree' // content > contentType > screen > global
    | 'slot_tree';   // slot > slotType > screen > global

export interface StateVariableSchema {
    key: string;
    classification: 'volatile' | 'defaulted' | 'personalizable';
    cascade_path: CascadePath;
    seed_default_value: any;
    userModifyable: boolean;
    inputType?: 'text' | 'dropdown' | 'filepath'| 'number' | 'email' | 'tel' | 'name';
    dropdownOptions?: { label: string; value: string }[];
    rules?: any;
    returnJSON?: boolean;
}

// We will import the partial schemas here.
// In a highly modular architecture, these could be dynamically imported or injected.
import { globalSchema } from './state_schema/global_schema';
import { contentSchema } from './state_schema/content_schema';
import { layoutSchema } from './state_schema/layout_schema';

export const stateSchemaRegistry: Record<string, StateVariableSchema> = {};

function registerSchemas(schemas: StateVariableSchema[]) {
    for (const schema of schemas) {
        if (stateSchemaRegistry[schema.key]) {
            console.warn(`[StateSchemaRegistry] Overwriting duplicate schema for key: ${schema.key}`);
        }
        stateSchemaRegistry[schema.key] = schema;
    }
}

// Stitching them together
registerSchemas(globalSchema);
registerSchemas(contentSchema);
registerSchemas(layoutSchema);

export function getSchema(key: string): StateVariableSchema | undefined {
    return stateSchemaRegistry[key];
}
