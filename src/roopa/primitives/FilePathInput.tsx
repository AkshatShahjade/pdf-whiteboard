import React, { useState, useEffect } from 'react';
import { UIElement } from '../../ui/mode_system';
import { UIStateStore } from '../../ui/ui_state_store';
import { pickFiles, pickFolder, basename } from '../../atma/platform_adapter/switch';
import { MarqueeTextButton } from './MarqueeTextButton';

export interface FilePathInputProps {
    value: string;
    onChange: (val: string) => void;
    returnJSON?: boolean;
    placeholder?: string;
    mode?: 'file' | 'directory';
    extensions?: string[];
    permissionId?: UIElement;
    uiStore?: UIStateStore;
}

export function FilePathInput({
    value,
    onChange,
    returnJSON = false,
    placeholder = 'No path selected',
    mode = 'directory',
    extensions,
    permissionId,
    uiStore
}: FilePathInputProps) {
    const [displayName, setDisplayName] = useState('');
    
    const path = (() => {
        if (!value) return '';
        if (returnJSON) {
            try {
                const parsed = JSON.parse(value);
                return typeof parsed === 'string' ? parsed : '';
            } catch (e) {
                return value;
            }
        }
        return value;
    })();

    useEffect(() => {
        let active = true;
        async function resolveName() {
            if (!path) {
                setDisplayName('');
                return;
            }
            try {
                const name = await basename(path);
                if (active) setDisplayName(name);
            } catch (e) {
                const parts = path.split(/[\\/]/);
                if (active) setDisplayName(parts[parts.length - 1] || path);
            }
        }
        resolveName();
        return () => { active = false; };
    }, [path]);

    const handleBrowse = async () => {
        try {
            let selected: string | string[] | null = null;
            if (mode === 'directory') {
                selected = await pickFolder(true);
            } else {
                selected = await pickFiles('Select File', extensions || ['*'], true);
            }

            if (selected) {
                const filePath = Array.isArray(selected) ? selected[0] : selected;
                const resultVal = returnJSON ? JSON.stringify(filePath) : filePath;
                onChange(resultVal);
            }
        } catch (err) {
            console.error('Failed to pick path:', err);
        }
    };

    return (
        <MarqueeTextButton
            value={displayName}
            placeholder={placeholder}
            onClick={handleBrowse}
            permissionId={permissionId}
            uiStore={uiStore}
            title={path}
        />
    );
}
