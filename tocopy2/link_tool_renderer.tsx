import React, { useEffect, useState } from 'react'
import { ScreenToolRendererType } from "../../../../renderer_registry/screen_level/tool_renderer_registry"
import { linkToolDomain } from "../../../../atma/registry_implementations/screen_level/tools/link_tool_domain"
import { UIState } from '../../../../ui/ui_state_store'
import { UIController } from '../../../../ui/ui_controller'

export interface DrawerProps {
    uiState: UIState;
    uiController: UIController;
}

function LinkToolDrawer({ uiState, uiController }: DrawerProps) {
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
        uiController.restoreSlots();
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
            
            // Close the tool and mark selector
            uiController.setLinkMode({
                isActive: false,
                activeTarget: null,
                sourceMarkId: null,
                destinationMarkId: null
            });
            
            // Only close mark_selector slot if it exists. We might not want to restore everything,
            // actually we do want to restore slots! 
            uiController.restoreSlots();
            
        } catch (err: any) {
            console.error(err);
            uiController.showToast?.(err.message || 'Failed to create link.', 'error');
        }
    };

    const renderBox = (target: 'source' | 'destination', markId: string | null) => {
        const isTargetActive = activeTarget === target;
        return (
            <div
                onClick={() => uiController.setLinkMode({ activeTarget: isTargetActive ? null : target })}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1.5px dashed ${isTargetActive ? '#3B82F6' : '#4b5563'}`,
                    background: isTargetActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '120px',
                    height: '60px'
                }}
            >
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {target}
                </div>
                <div style={{ fontSize: '12px', color: markId ? '#10B981' : '#d1d5db', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                    {markId ? 'Selected' : 'Click a mark'}
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
            background: 'rgba(38, 42, 51, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#93C5FD',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            >
                {direction === '1-way' ? '→' : direction === '1-way-reverse' ? '←' : '↔'}
            </button>
            
            {renderBox('destination', destinationMarkId)}

            <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 8px' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                    onClick={handleConfirm}
                    disabled={!sourceMarkId || !destinationMarkId}
                    style={{
                        background: sourceMarkId && destinationMarkId ? '#3B82F6' : 'rgba(59, 130, 246, 0.3)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: sourceMarkId && destinationMarkId ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                    }}
                >
                    Confirm
                </button>
                <button
                    onClick={() => {
                        const activeSlotId = uiState?.activeSlot || 'left';
                        const inactiveSlotId = Object.keys(uiState?.slots || {}).find(id => id !== activeSlotId) || 'right';
                        uiController?.onContentChange(inactiveSlotId, 'mark_selector', 'mark_selector');
                    }}
                    style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid #3B82F6',
                        borderRadius: '6px',
                        color: '#93C5FD',
                        padding: '4px 16px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                >
                    Browse
                </button>
                <button
                    onClick={handleCancel}
                    style={{
                        background: 'transparent',
                        border: '1px solid #F87171',
                        borderRadius: '6px',
                        color: '#F87171',
                        padding: '4px 16px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
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
            ctx.uiController.snapshotSlots();
            ctx.uiController.setLinkMode({
                isActive: true,
                activeTarget: 'source',
                sourceMarkId: null,
                destinationMarkId: null
            });
        }
    },
    DrawerComponent: LinkToolDrawer
}
