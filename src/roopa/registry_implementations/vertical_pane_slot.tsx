import React from 'react'
import { getContentRendererType } from '../../ui/renderer_registry/content_renderer_registry'
import { SlotRendererType, SlotProps } from '../renderer_registry/slot_renderer_registry'
import { FilePathViewer } from '../elements/FilePathViewer'

/**
 * VerticalPaneSlot — a single-content slot that renders its content full-height.
 *
 * It is deliberately content-agnostic: it reads contentType from uiState.slots[slotId]
 * and dispatches to the correct ContentRenderer via the content registry.
 * No PDF, whiteboard, or any other domain-specific logic lives here.
 */
function VerticalPaneSlotComponent({ slotId, uiState, uiController, settings, onHome }: SlotProps) {
    const slotState = uiState.slots?.[slotId]

    if (!slotState?.contentType) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <FilePathViewer slotId={slotId} uiState={uiState} uiController={uiController} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1f26', color: '#9ca3af', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace" }}>
                    No content loaded
                </div>
            </div>
        )
    }

    const ContentRenderer = getContentRendererType(slotState.contentType).Component

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <FilePathViewer slotId={slotId} uiState={uiState} uiController={uiController} />
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                    <ContentRenderer
                        slotId={slotId}
                        contentId={slotState.contentId}
                        path={slotState.contentId}
                        settings={settings}
                        uiState={uiState}
                        uiController={uiController}
                        onHome={onHome}
                    />
                </div>
            </div>
        </div>
    )
}

export const verticalPaneSlot: SlotRendererType = {
    id: 'verticalPane',
    contentCapacity: 1,
    Component: VerticalPaneSlotComponent,
}
