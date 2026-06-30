import { StateVariableSchema } from '../state_schema_registry';

export const globalSchema: StateVariableSchema[] = [
    {
        key: 'libraryPath',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: null,
        userModifyable: true,
        inputType: 'filepath',
        returnJSON: true
    },
    {
        key: 'backupPath',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: null,
        userModifyable: true,
        inputType: 'filepath',
        returnJSON: true
    },
    {
        key: 'recents',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: [],
        userModifyable: false
    },
    {
        key: 'theme',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 'dark',
        userModifyable: true,
        inputType: 'dropdown',
        dropdownOptions: [
            { label: 'Dark', value: '"dark"' },
            { label: 'Light', value: '"light"' }
        ]
    },
    {
        key: 'autosaveMs',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 800,
        userModifyable: true,
        inputType: 'number',
        rules: { min: 100, max: 30000 },
        returnJSON: true
    },
    {
        key: 'maxGlobalPdfTools',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 8,
        userModifyable: true,
        inputType: 'number',
        rules: { exclusiveMin: 1, max: 8 },
        returnJSON: true
    },
    {
        key: 'defaultTool',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 'draw',
        userModifyable: true,
        inputType: 'dropdown',
        dropdownOptions: [
            { label: 'Select', value: '"select"' },
            { label: 'Hand', value: '"hand"' },
            { label: 'Draw', value: '"draw"' },
            { label: 'Eraser', value: '"eraser"' },
            { label: 'Arrow', value: '"arrow"' },
            { label: 'Text', value: '"text"' },
            { label: 'Rectangle', value: '"rectangle"' },
            { label: 'Note', value: '"note"' },
            { label: 'Line', value: '"line"' }
        ]
    },
    {
        key: 'activeWorkspaceId',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 'default_workspace',
        userModifyable: false
    }
];
