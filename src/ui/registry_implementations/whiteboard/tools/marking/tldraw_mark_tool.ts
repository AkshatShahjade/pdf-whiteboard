import { StateNode } from 'tldraw';
import { WhiteboardToolRendererType } from '../../../../renderer_registry/whiteboard/tool_renderer_registry.js';

export class TldrawMarkTool extends StateNode {
    static id = 'lemmamap_mark';
    static initial = 'idle';

    onEnter() {
        this.editor.setCursor({ type: 'pointer', rotation: 0 });
    }

    onPointerDown(info: any) {
        // Find the shape that was clicked
        const point = this.editor.inputs.currentPagePoint;
        const shapesAtPoint = this.editor.getShapesAtPoint(point);
        const shape = shapesAtPoint[0];

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
                icon: 'tool-pointer', // Standard Tldraw icon
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
