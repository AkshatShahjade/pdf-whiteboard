import React from 'react'
import { UIState, UIStateStore } from '../../ui/ui_state_store'
import { UIController } from '../../ui/ui_controller'
import { screenToolRendererRegistry } from '../../ui/renderer_registry/screen_level/tool_renderer_registry'
import { ButtonSquare } from './ButtonSquare'

export interface ScreenToolbarProps {
    uiState: UIState
    uiController: UIController
    uiStore: UIStateStore
}

export function ScreenToolbar({ uiState, uiController, uiStore }: ScreenToolbarProps) {
    const [activeToolId, setActiveToolId] = React.useState<string | null>(null)

    const tools = Array.from(screenToolRendererRegistry.values())

    const handleToolClick = (tool: any) => {
        setActiveToolId(tool.id.id)
        if (tool.onActivate) {
            tool.onActivate({ uiState, uiController })
        }
        if (tool.id.id === 'link') {
            uiController?.showToast(`${tool.label} activated! (Dummy)`, 'success')
        }
        setTimeout(() => {
            setActiveToolId(null)
        }, 1200)
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 0',
            width: '48px',
            background: 'rgba(38, 42, 51, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px 12px 0 0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: 'none',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        }}>
            {tools.map(tool => {
                const permissionId = tool.id.id === 'link' ? 'SCREENTOOLBAR_LINK_TOOL' : 'SCREENTOOLBAR_OPEN_CONTENT';
                
                return (
                    <ButtonSquare
                        key={tool.id.id}
                        icon={tool.icon}
                        tooltip={tool.label}
                        isActive={activeToolId === tool.id.id}
                        permissionId={permissionId as any}
                        uiStore={uiStore}
                        onClick={() => handleToolClick(tool)}
                    />
                );
            })}
            
            {/* Temporary UI Mode Switcher */}
            <ButtonSquare
                icon="🔄"
                tooltip={`Mode: ${uiState.uiMode?.type || 'REGULAR'}`}
                isActive={uiState.uiMode?.type === 'MARK_SELECTION'}
                uiStore={uiStore}
                onClick={() => {
                    const currentType = uiState.uiMode?.type || 'REGULAR';
                    if (currentType === 'REGULAR') {
                        uiStore.setState({ 
                            uiMode: { type: 'MARK_SELECTION' } 
                        });
                        uiController?.showToast(`Mode switched to MARK_SELECTION`, 'success');
                    } else {
                        uiStore.setState({ 
                            uiMode: { type: 'REGULAR' } 
                        });
                        uiController?.showToast('Mode switched to REGULAR', 'success');
                    }
                }}
            />
        </div>
    )
}
