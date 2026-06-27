import { Editor } from 'tldraw';
import { generateMarkId } from '../../../shared_doman_models_and_dtos/factories.js';
import { PinDomainMark } from '../marks/pin_domain_mark.js';
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
                    const newMark: PinDomainMark = {
                        id: markId,
                        type: 'pin', // For now, we assume all Tldraw marks act as pins for Kram bridging
                        parent_content_id: parentContentId,
                        geometry: { x: shape.x, y: shape.y }
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

                    const newMark: PinDomainMark = {
                        id: markId,
                        type: 'pin',
                        parent_content_id: parentContentId,
                        geometry: { x: after.x, y: after.y }
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
