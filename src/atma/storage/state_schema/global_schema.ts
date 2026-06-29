import { StateVariableSchema } from '../state_schema_registry';

export const globalSchema: StateVariableSchema[] = [
    {
        key: 'libraryPath',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: null
    },
    {
        key: 'backupPath',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: null
    },
    {
        key: 'recents',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: []
    },
    {
        key: 'defaultSplit',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 50
    },
    {
        key: 'theme',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 'dark'
    },
    {
        key: 'autosaveMs',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 800
    },
    {
        key: 'maxGlobalPdfTools',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 8
    },
    {
        key: 'defaultTool',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 'draw'
    },
    {
        key: 'activeWorkspaceId',
        classification: 'personalizable',
        cascade_path: 'slot_tree',
        seed_default_value: 'default_workspace'
    }
];
