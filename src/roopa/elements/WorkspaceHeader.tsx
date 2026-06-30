import React from 'react';
import { BackupSaveIndicator } from '../primitives/BackupSaveIndicator';
import { ButtonFlat } from '../primitives/ButtonFlat';
import { UIStateStore } from '../../ui/ui_state_store';

export interface WorkspaceHeaderProps {
    title?: string;
    onHome: () => void;
    onBackup?: () => void;
    savedAt?: number | null;
    uiStore: UIStateStore;
}

export function WorkspaceHeader({ 
    title, 
    onHome, 
    onBackup, 
    savedAt, 
    uiStore 
}: WorkspaceHeaderProps) {
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '16px', 
            padding: '0 20px', 
            width: '280px', 
            height: '48px', 
            background: 'rgba(38,42,51,0.65)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '0 0 12px 12px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderTop: 'none', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)' 
        }}>
            <ButtonFlat 
                label="Home"
                icon="⌂"
                permissionId="WORKSPACE_HOME_BUTTON"
                uiStore={uiStore}
                onClick={onHome}
            />
            <BackupSaveIndicator onBackup={onBackup || (() => {})} savedAt={savedAt || null} />
        </div>
    );
}
