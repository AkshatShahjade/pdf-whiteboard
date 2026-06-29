import { StateVariableSchema } from '../state_schema_registry';

export const layoutSchema: StateVariableSchema[] = [
    {
        key: 'workspace_layout',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: { screens: [] }
    },
    {
        key: 'leftPct',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 50
    },
    {
        key: 'tool',
        classification: 'defaulted',
        cascade_path: 'slot_tree',
        seed_default_value: 'select'
    },
    {
        key: 'currentDir',
        classification: 'defaulted',
        cascade_path: 'slot_tree',
        seed_default_value: null
    }
];
