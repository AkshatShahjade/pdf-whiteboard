import React from 'react';
import { BackupSaveIndicator } from './BackupSaveIndicator';
import { ButtonFlat } from '../primitives/ButtonFlat';
import { UIStateStore } from '../../ui/ui_state_store';

export interface WorkspaceHeaderProps {
    title?: string;
    onHome: () => void;
    onBackup?: () => void;
    savedAt?: number | null;
    headerVisible: boolean;
    setHeaderVisible: (val: boolean) => void;
    uiStore: UIStateStore;
}

export function WorkspaceHeader({ 
    title, 
    onHome, 
    onBackup, 
    savedAt, 
    headerVisible, 
    setHeaderVisible,
    uiStore 
}: WorkspaceHeaderProps) {
    return (
        <div
            onMouseEnter={() => setHeaderVisible(true)}
            onMouseLeave={() => setHeaderVisible(false)}
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: '50%', 
                transform: 'translateX(-50%)', 
                width: '280px', 
                height: headerVisible ? '48px' : '16px', 
                zIndex: 10000, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center' 
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.08), transparent)',
                borderBottom: '1.5px dashed rgba(59, 130, 246, 0.35)',
                borderRadius: '0 0 8px 8px',
                opacity: headerVisible ? 0 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                cursor: 'pointer',
            }}>
                <div style={{
                    width: '36px',
                    height: '4px',
                    background: 'rgba(59, 130, 246, 0.5)',
                    borderRadius: '2px',
                    marginBottom: '3px',
                    boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)'
                }} />
            </div>
            <div style={{ 
                position: 'relative', 
                zIndex: 10001, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '16px', 
                padding: '0 20px', 
                width: '100%', 
                height: '48px', 
                background: 'rgba(38,42,51,0.65)', 
                backdropFilter: 'blur(10px)', 
                borderRadius: '0 0 12px 12px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderTop: 'none', 
                transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)', 
                opacity: headerVisible ? 1 : 0, 
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)' 
            }}>
                <ButtonFlat 
                    label="Home"
                    icon="⌂"
                    permissionId="WORKSPACE_HOME_BUTTON"
                    uiStore={uiStore}
                    onClick={onHome}
                />
                
                {/* The backup indicator can also be updated to use Roopa primitives later if it has interactivity */}
                <BackupSaveIndicator onBackup={onBackup || (() => {})} savedAt={savedAt || null} />
            </div>
        </div>
    );
}
