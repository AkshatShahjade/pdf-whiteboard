import { Point, Mark, SelectionContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { MarkDomainType } from "../../../capabilities_registry/whiteboard/mark_domain_registry";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";

export const pinDomainMark: MarkDomainType = {
    id: 'pin',

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        if (ctx.zoom === undefined || region.type !== 'pin') return false;
        const dx = point.x - region.x;
        const dy = point.y - region.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = 16 / ctx.zoom;
        return distance <= hitRadius;
    },

    validate(mark: any) {
        const { x, y } = mark;
        if (typeof x !== 'number' || typeof y !== 'number') {
            return { isValid: false, error: 'Pin coordinates (x, y) must be numeric.' };
        }
        if (x < 0 || y < 0) {
            return { isValid: false, error: 'Pin coordinates must be positive.' };
        }
        return { isValid: true };
    },

    parseRaw(raw: any) {
        return {
            id: raw.id || createMarkId(),
            type: 'pin',
            x: typeof raw.x === 'number' ? raw.x : 0,
            y: typeof raw.y === 'number' ? raw.y : 0,
        };
    }
}
