import { StateVariableSchema } from '../state_schema_registry';

export const contentSchema: StateVariableSchema[] = [
    {
        key: 'zoom',
        classification: 'personalizable',
        cascade_path: 'content_tree',
        seed_default_value: 1
    },
    {
        key: 'scrollTop',
        classification: 'personalizable',
        cascade_path: 'content_tree',
        seed_default_value: 0
    },
    {
        key: 'selectedMarkId',
        classification: 'defaulted',
        cascade_path: 'content_tree',
        seed_default_value: null
    }
];
