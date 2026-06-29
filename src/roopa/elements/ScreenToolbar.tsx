import React, { useState } from 'react'
import { UIState } from '../../ui/ui_state_store'
import { UIController } from '../../ui/ui_controller'
import { screenToolRendererRegistry } from '../../ui/renderer_registry/screen_level/tool_renderer_registry'

export interface ScreenToolbarProps {
    uiState: UIState
    uiController: UIController
}

export function ScreenToolbar({ uiState, uiController }: ScreenToolbarProps) {
    const [visible, setVisible] = useState(false)
    const [activeToolId, setActiveToolId] = useState<string | null>(null)

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
        <div
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60px',
                height: visible ? '120px' : '16px',
                zIndex: 10000,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
            }}
        >
            {/* Highlighted Triggering Zone */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'auto',
                background: 'linear-gradient(to top, rgba(59, 130, 246, 0.08), transparent)',
                borderTop: '1.5px dashed rgba(59, 130, 246, 0.35)',
                borderRadius: '8px 8px 0 0',
                opacity: visible ? 0 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                cursor: 'pointer',
            }}>
                <div style={{
                    width: '36px',
                    height: '4px',
                    background: 'rgba(59, 130, 246, 0.5)',
                    borderRadius: '2px',
                    marginTop: '3px',
                    boxShadow: '0 0 6px rgba(59, 130, 246, 0.4)'
                }} />
            </div>

            {/* Toolbar Panel */}
            <div style={{
                position: 'relative',
                zIndex: 10001,
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
                pointerEvents: 'auto',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
            }}>
                {tools.map(tool => (
                    <button
                        key={tool.id.id}
                        onClick={() => handleToolClick(tool)}
                        title={tool.label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            border: `1px solid ${activeToolId === tool.id.id ? '#3B82F6' : 'transparent'}`,
                            background: activeToolId === tool.id.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                            color: activeToolId === tool.id.id ? '#93C5FD' : '#d1d5db',
                            cursor: 'pointer',
                            fontSize: '18px',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            if (activeToolId !== tool.id.id) {
                                e.currentTarget.style.color = '#fff'
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                            }
                        }}
                        onMouseLeave={e => {
                            if (activeToolId !== tool.id.id) {
                                e.currentTarget.style.color = '#d1d5db'
                                e.currentTarget.style.background = 'transparent'
                            }
                        }}
                    >
                        {tool.icon}
                    </button>
                ))}
            </div>
        </div>
    )
}
