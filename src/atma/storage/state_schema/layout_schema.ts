import { StateVariableSchema } from '../state_schema_registry';

export const layoutSchema: StateVariableSchema[] = [
    {
        key: 'workspace_layout',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: { screens: [] },
        userModifyable: false
    },
    {
        key: 'dualSplitPaneLeftPct',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 50,
        userModifyable: true,
        inputType: 'number',
        rules: { min: 0, max: 100 },
        returnJSON: true
    },
    {
        key: 'tool',
        classification: 'defaulted',
        cascade_path: 'slot_tree',
        seed_default_value: 'select',
        userModifyable: true,
        inputType: 'dropdown',
        dropdownOptions: [
            { label: 'Select', value: '"select"' },
            { label: 'Rect', value: '"rect"' },
            { label: 'Lasso', value: '"lasso"' },
            { label: 'Section', value: '"section"' },
            { label: 'Pin', value: '"pin"' },
            { label: 'Remove', value: '"remove"' }
        ]
    },
    {
        key: 'currentDir',
        classification: 'defaulted',
        cascade_path: 'slot_tree',
        seed_default_value: null,
        userModifyable: false
    }
];
