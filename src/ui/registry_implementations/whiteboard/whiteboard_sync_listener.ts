import { Editor } from 'tldraw';
import { generateMarkId } from '../../../shared_doman_models_and_dtos/factories.js';
import { TldrawMarkDTO } from '../../../shared_doman_models_and_dtos/dtos.js';
import type { UIController } from '../../ui_controller.js';

export function setupWhiteboardSync(editor: Editor, slotId: string, parentContentId: string, uiController: UIController) {
    const unsub = editor.store.listen((update) => {
        // Handle Added Shapes
        for (const record of Object.values(update.changes.added)) {
            if (record.typeName === 'shape') {
                const shape = record as any;
                if (shape.meta?.isLemmamapMark && !shape.meta?.markId) {
                    // It's a new mark shape that needs to be registered with Atma!
                    const markId = generateMarkId();
                    
                    // Update the shape in Tldraw immediately so it has the markId
                    // and we don't double-register it.
                    editor.updateShape({
                        id: shape.id,
                        meta: { ...shape.meta, markId }
                    });

                    // Register it with Kram / uiController
                    const newMark: TldrawMarkDTO = {
                        id: markId,
                        type: 'tldraw',
                        shapeId: shape.id
                    };
                    
                    uiController.addMark(slotId, newMark);

                    // Open the new whiteboard in the other slot immediately
                    const otherSlot = slotId === 'left' ? 'right' : 'left';
                    uiController.onContentChange(otherSlot, markId, 'whiteboard');
                }
            }
        }

        // Handle Updated Shapes (e.g. existing shape clicked by TldrawMarkTool)
        for (const [id, records] of Object.entries(update.changes.updated)) {
            const before = records[0] as any;
            const after = records[1] as any;
            if (after.typeName === 'shape') {
                if (!before.meta?.isLemmamapMark && after.meta?.isLemmamapMark && !after.meta?.markId) {
                    const markId = generateMarkId();
                    
                    editor.updateShape({
                        id: after.id,
                        meta: { ...after.meta, markId }
                    });

                    const newMark: TldrawMarkDTO = {
                        id: markId,
                        type: 'tldraw',
                        shapeId: after.id
                    };
                    
                    uiController.addMark(slotId, newMark);

                    // Open the new whiteboard in the other slot immediately
                    const otherSlot = slotId === 'left' ? 'right' : 'left';
                    uiController.onContentChange(otherSlot, markId, 'whiteboard');
                }
            }
        }

        // Handle Deleted Shapes
        for (const record of Object.values(update.changes.removed)) {
            if (record.typeName === 'shape') {
                const shape = record as any;
                if (shape.meta?.isLemmamapMark && shape.meta?.markId) {
                    uiController.deleteMark(slotId, shape.meta.markId);
                }
            }
        }
    }, { source: 'user', scope: 'document' });

    return unsub;
}
