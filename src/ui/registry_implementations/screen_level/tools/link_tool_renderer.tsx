import React from 'react';
import { ScreenToolRendererType } from "../../../../renderer_registry/screen_level/tool_renderer_registry";
import { linkToolDomain } from "../../../../atma/registry_implementations/screen_level/tools/link_tool_domain";
import { UIState, UIStateStore } from '../../../../ui/ui_state_store';
import { UIController } from '../../../../ui/ui_controller';
import { ButtonFlat } from '../../../../roopa/primitives/ButtonFlat';
import { ButtonSquare } from '../../../../roopa/primitives/ButtonSquare';

export interface DrawerProps {
    uiState: UIState;
    uiController: UIController;
    uiStore?: UIStateStore;
}

function LinkToolDrawer({ uiState, uiController, uiStore }: DrawerProps) {
    const linkMode = uiState.linkMode;
    const { isActive, activeTarget, direction, sourceMarkId, destinationMarkId } = linkMode;

    if (!isActive) return null;

    const handleCancel = () => {
        uiController.setLinkMode({
            isActive: false,
            activeTarget: null,
            sourceMarkId: null,
            destinationMarkId: null
        });
        uiController.exitMarkSelectionMode();
    };

    const handleConfirm = async () => {
        if (!sourceMarkId || !destinationMarkId) {
            uiController.showToast?.('Please select both source and destination marks.', 'error');
            return;
        }
        
        try {
            const { LinkRepository } = await import('../../../../atma/storage/repositories/LinkRepository');
            const { generateUUID } = await import('../../../../shared_doman_models_and_dtos/factories');
            const links = [];
            if (direction === '1-way-reverse') {
                links.push({ id: generateUUID(), source_mark_id: destinationMarkId, target_mark_id: sourceMarkId, label: '' });
            } else {
                links.push({ id: generateUUID(), source_mark_id: sourceMarkId, target_mark_id: destinationMarkId, label: '' });
                if (direction === '2-way') {
                    links.push({ id: generateUUID(), source_mark_id: destinationMarkId, target_mark_id: sourceMarkId, label: '' });
                }
            }
            await LinkRepository.insertLinks(links);
            uiController.showToast?.('Link created successfully!', 'success');
            
            uiController.setLinkMode({
                isActive: false,
                activeTarget: null,
                sourceMarkId: null,
                destinationMarkId: null
            });
            
            uiController.exitMarkSelectionMode();
        } catch (err: any) {
            console.error(err);
            uiController.showToast?.(err.message || 'Failed to create link.', 'error');
        }
    };

    const renderBox = (target: 'source' | 'destination', markId: string | null) => {
        const isTargetActive = activeTarget === target;
        const colorBorder = isTargetActive ? '#60A5FA' : (markId ? '#10B981' : '#F87171');
        const colorBg = isTargetActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        
        return (
            <div
                onClick={() => {
                    const newTarget = isTargetActive ? null : target;
                    uiController.setLinkMode({ activeTarget: newTarget });
                    if (newTarget) {
                        uiController.enterMarkSelectionMode(target === 'source' ? sourceMarkId || undefined : destinationMarkId || undefined);
                    } else {
                        uiController.exitMarkSelectionMode();
                    }
                }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1.5px ${markId ? 'solid' : 'dashed'} ${colorBorder}`,
                    background: colorBg,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '120px',
                    height: '60px'
                }}
            >
                <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {target}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: markId ? '#10B981' : '#F87171', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                    {markId ? 'Selected' : 'None'}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(28, 31, 38, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px 24px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            zIndex: 10002,
            pointerEvents: 'auto'
        }}>
            {renderBox('source', sourceMarkId)}
            
            <button
                onClick={() => {
                    const nextDir = direction === '1-way' ? '1-way-reverse' : (direction === '1-way-reverse' ? '2-way' : '1-way');
                    uiController.setLinkMode({ direction: nextDir });
                }}
                title="Toggle Direction"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #4b5563',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#93C5FD',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '16px'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            >
                {direction === '1-way' ? '→' : direction === '1-way-reverse' ? '←' : '↔'}
            </button>
            
            {renderBox('destination', destinationMarkId)}

            <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 8px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ButtonFlat 
                    label="Confirm" 
                    onClick={handleConfirm} 
                    disabled={!sourceMarkId || !destinationMarkId}
                    active={!!(sourceMarkId && destinationMarkId)}
                />
                
                <ButtonFlat 
                    label="Browse" 
                    onClick={() => {
                        uiController.setMarkSelectorOpen(true);
                    }} 
                />
                
                <button
                    onClick={handleCancel}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        borderRadius: '6px',
                        color: '#F87171',
                        padding: '4px 16px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={e => { 
                        e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; 
                        e.currentTarget.style.border = '1px solid rgba(248, 113, 113, 0.8)';
                    }}
                    onMouseLeave={e => { 
                        e.currentTarget.style.background = 'transparent'; 
                        e.currentTarget.style.border = '1px solid rgba(248, 113, 113, 0.3)';
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export const linkToolRenderer: ScreenToolRendererType = {
    id: linkToolDomain,
    label: 'Link Tool',
    icon: '🔗',
    onActivate(ctx: { uiState: UIState, uiController: UIController }) {
        if (!ctx.uiState.linkMode.isActive) {
            ctx.uiController.setLinkMode({
                isActive: true,
                activeTarget: 'source',
                sourceMarkId: null,
                destinationMarkId: null
            });
            ctx.uiController.enterMarkSelectionMode(undefined);
        }
    },
    DrawerComponent: LinkToolDrawer
}
