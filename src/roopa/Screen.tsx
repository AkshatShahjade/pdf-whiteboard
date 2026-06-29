import React, { useState, useEffect } from 'react';
import { UIState } from '../ui/ui_state_store';
import { UIController } from '../ui/ui_controller';
import { getSlotRendererType } from './renderer_registry/slot_renderer_registry';
import { DualSplitPane } from './elements/DualSplitPane';

export interface ScreenProps {
    uiState: UIState;
    uiController: UIController;
    settings?: any;
    onHome?: () => void;
    workspaceId?: string;
}

/**
 * Recursive layout renderer that traverses the Roopa config tree
 * and maps layout nodes to structural React components.
 */
function RoopaLayoutRenderer({ node, uiState, uiController, settings, onHome }: any) {
    if (!node) return null;

    if (node.type === 'DualSplitPane') {
        // Resolve split percentage from global UI State
        const splitPct = (uiState as any)[node.splitPctStateKey] ?? 50;
        
        const onSplitPctChange = (pct: number) => {
            // For now, statically bind leftPct. We will extend uiController later for dynamic keys.
            if (node.splitPctStateKey === 'leftPct') {
                uiController.setLeftPct(pct);
            }
        };

        return (
            <DualSplitPane 
                direction={node.direction} 
                splitPct={splitPct} 
                onSplitPctChange={onSplitPctChange}
            >
                {node.children.map((child: any, i: number) => 
                    RoopaLayoutRenderer({ key: i, node: child, uiState, uiController, settings, onHome })
                )}
            </DualSplitPane>
        );
    }
    
    if (node.type === 'Slot') {
        const slotState = (uiState as any).slots?.[node.slotId];
        const hasContent = !!(slotState && slotState.contentId && slotState.contentType);

        if (!hasContent) {
            return null;
        }

        const SlotComponent = getSlotRendererType(node.slotType).Component;
        return (
            <div 
                style={{ width: '100%', height: '100%' }}
                onMouseEnter={() => uiController.setActiveSlot(node.slotId)}
            >
                <SlotComponent
                    slotId={node.slotId}
                    uiState={uiState}
                    uiController={uiController}
                    settings={settings}
                    onHome={onHome}
                />
            </div>
        );
    }

    return null;
}

/**
 * Screen — the top-level workspace layout component.
 *
 * Fetches the active layout config from SQLite and dynamically renders
 * the layout tree. Screen knows nothing about PDF, whiteboards, or marks.
 */
export default function Screen({
    uiState,
    uiController,
    settings,
    onHome,
    workspaceId = 'default_workspace',
}: ScreenProps) {
    const [layoutConfig, setLayoutConfig] = useState<any>(null);

    useEffect(() => {
        let active = true;
        async function fetchLayout() {
            try {
                // Ensure singletons are imported so we can use queryAPI
                const { queryAPI } = await import('../atma/singletons');
                const result = await queryAPI.getWorkspaceLayout(workspaceId);
                
                if (active) {
                    if (result) {
                        setLayoutConfig(result);
                    } else {
                        const { TEMPORARY_ROOPA_LAYOUT } = await import('./temporary_layout');
                        setLayoutConfig(TEMPORARY_ROOPA_LAYOUT);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch layout config:", err);
                if (active) {
                    const { TEMPORARY_ROOPA_LAYOUT } = await import('./temporary_layout');
                    setLayoutConfig(TEMPORARY_ROOPA_LAYOUT);
                }
            }
        }
        fetchLayout();
        return () => { active = false; };
    }, [workspaceId]);

    if (!layoutConfig) return null;

    const activeScreen = layoutConfig.screens.find((s: any) => s.screenId === layoutConfig.activeScreenId) || layoutConfig.screens[0];

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
             <RoopaLayoutRenderer 
                 node={activeScreen.layout} 
                 uiState={uiState} 
                 uiController={uiController} 
                 settings={settings} 
                 onHome={onHome} 
             />
        </div>
    );
}
