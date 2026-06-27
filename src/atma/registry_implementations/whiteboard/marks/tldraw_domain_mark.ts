import { Point, Mark, SelectionContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model.js";
import { MarkDomainType } from "../../../capabilities_registry/whiteboard/mark_domain_registry.js";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories.js";

export const tldrawDomainMark: MarkDomainType = {
    id: 'tldraw',

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        if (ctx.zoom === undefined || region.type !== 'tldraw') return false;
        // Simple radius hit-test around the anchor point of the Tldraw shape
        const dx = point.x - region.x;
        const dy = point.y - region.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = 16 / ctx.zoom;
        return distance <= hitRadius;
    },

    validate(mark: any) {
        const { x, y, shapeId } = mark;
        if (typeof x !== 'number' || typeof y !== 'number') {
            return { isValid: false, error: 'Tldraw mark coordinates (x, y) must be numeric.' };
        }
        if (!shapeId || typeof shapeId !== 'string') {
            return { isValid: false, error: 'Tldraw mark must have a valid shapeId.' };
        }
        return { isValid: true };
    },

    parseRaw(raw: any) {
        return {
            id: raw.id || createMarkId(),
            type: 'tldraw',
            shapeId: raw.shapeId || '',
            x: typeof raw.x === 'number' ? raw.x : 0,
            y: typeof raw.y === 'number' ? raw.y : 0,
        };
    }
}
