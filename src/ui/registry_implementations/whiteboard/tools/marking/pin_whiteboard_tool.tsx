import React from 'react';
import { 
    ShapeUtil, 
    StateNode, 
    createShapeId,
    HTMLContainer,
    Rectangle2d
} from 'tldraw';
import { WhiteboardToolRendererType } from '../../../../renderer_registry/whiteboard/tool_renderer_registry.js';


// 1. Define the Pin Shape Utility
export class PinShapeUtil extends ShapeUtil<any> {
    static type = 'pin';
    static props = {};

    getDefaultProps() {
        return {};
    }

    getGeometry(shape: any) {
        return new Rectangle2d({ width: 32, height: 32, isFilled: true });
    }

    component(shape: any) {
        return (
            <HTMLContainer style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '32px', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}>
                    📌
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape: any) {
        return <rect width="32" height="32" fill="none" stroke="blue" />;
    }
}

// 2. Define the Pin Tool State Node
export class PinTool extends StateNode {
    static id = 'pin';
    static initial = 'idle';

    onEnter() {
        this.editor.setCursor({ type: 'cross', rotation: 0 });
    }

    onPointerDown(info: any) {
        const origin = this.editor.inputs.getOriginPagePoint();
        const shapeId = createShapeId();

        this.editor.createShape({
            id: shapeId,
            type: 'pin',
            x: origin.x - 16, // Center the 32x32 pin
            y: origin.y - 16,
            meta: {
                isLemmamapMark: true // Flag to tell WhiteboardSyncManager to register this as a mark
            }
        });

        // Automatically switch back to select tool after dropping a pin
        this.editor.setCurrentTool('select');
    }

    onCancel() {
        this.editor.setCurrentTool('select');
    }
}

// 3. Define the UI Overrides for Tldraw
export const pinToolUiOverrides = {
    tools(editor: any, tools: any) {
        return {
            ...tools,
            pin: {
                id: 'pin',
                label: 'tool.pin',
                icon: 'tool-pin', // We can use a custom icon if we want, or map it in assetUrls
                kbd: 'p',
                onSelect() {
                    editor.setCurrentTool('pin');
                },
            },
        };
    },
    toolbar(editor: any, toolbarItems: any, helpers: any) {
        const pinToolItem = helpers.tools.pin;
        if (pinToolItem) {
            // Insert it at the end of the toolbar
            toolbarItems.push(helpers.toolItem(pinToolItem));
        }
        return toolbarItems;
    },
    translations: {
        en: {
            'tool.pin': 'Pin Mark',
        },
    },
};

// 4. Export as a WhiteboardToolRendererType for our Registry
export const pinWhiteboardTool: WhiteboardToolRendererType = {
    id: {
        id: "pin",
        scope: "whiteboard",
        category: "mark-spatial"
    },
    isDrawable: true,
    createsSelections: false,
    
    // Tldraw specifics
    tldrawTool: PinTool,
    tldrawShapeUtil: PinShapeUtil,
    tldrawUiOverrides: pinToolUiOverrides
};
