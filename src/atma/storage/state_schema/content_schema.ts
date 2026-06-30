import { StateVariableSchema } from '../state_schema_registry';

export const contentSchema: StateVariableSchema[] = [
    {
        key: 'zoom',
        classification: 'personalizable',
        cascade_path: 'content_tree',
        seed_default_value: 1,
        userModifyable: true,
        inputType: 'number',
        rules: { min: 0.1, max: 10 },
        returnJSON: true
    },
    {
        key: 'scrollTop',
        classification: 'personalizable',
        cascade_path: 'content_tree',
        seed_default_value: 0,
        userModifyable: false
    },
    {
        key: 'selectedMarkId',
        classification: 'defaulted',
        cascade_path: 'content_tree',
        seed_default_value: null,
        userModifyable: false
    }
];
