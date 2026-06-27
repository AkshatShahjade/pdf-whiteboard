import { StateNode } from 'tldraw';
import { WhiteboardToolRendererType } from '../../../../renderer_registry/whiteboard/tool_renderer_registry.js';

export class TldrawMarkTool extends StateNode {
    static id = 'lemmamap_mark';

    onEnter() {
        this.editor.setCursor({ type: 'pointer', rotation: 0 });
    }

    onPointerDown(info: any) {
        // Use the shape provided by Tldraw's hit testing, or fallback to current pointer position
        const shape = info.shape || this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint);

        if (shape) {
            // Register it as a lemmamap mark
            this.editor.updateShape({
                id: shape.id,
                meta: {
                    ...shape.meta,
                    isLemmamapMark: true
                }
            });
            // The WhiteboardSyncManager will detect this update and call uiController.addMark
        }

        // Return to select mode
        this.editor.setCurrentTool('select');
    }

    onCancel() {
        this.editor.setCurrentTool('select');
    }
}

export const tldrawMarkUiOverrides = {
    tools(editor: any, tools: any) {
        return {
            ...tools,
            lemmamap_mark: {
                id: 'lemmamap_mark',
                label: 'tool.lemmamap_mark',
                icon: 'select', // Standard Tldraw select pointer icon
                kbd: 'm',
                onSelect() {
                    editor.setCurrentTool('lemmamap_mark');
                },
            },
        };
    },
    toolbar(editor: any, toolbarItems: any, helpers: any) {
        const markToolItem = helpers.tools.lemmamap_mark;
        if (markToolItem) {
            toolbarItems.push(helpers.toolItem(markToolItem));
        }
        return toolbarItems;
    },
    translations: {
        en: {
            'tool.lemmamap_mark': 'Mark Shape',
        },
    },
};

export const tldrawMarkWhiteboardTool: WhiteboardToolRendererType = {
    id: {
        id: "lemmamap_mark",
        scope: "whiteboard",
        category: "mark-spatial"
    },
    isDrawable: false,
    createsSelections: false,
    
    tldrawTool: TldrawMarkTool,
    tldrawUiOverrides: tldrawMarkUiOverrides
};
