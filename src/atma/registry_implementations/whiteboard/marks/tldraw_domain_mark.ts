import { Point, Mark, SelectionContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model.js";
import { MarkDomainType } from "../../../capabilities_registry/whiteboard/mark_domain_registry.js";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories.js";

export const tldrawDomainMark: MarkDomainType = {
    id: 'tldraw',

    validate(mark: any) {
        const { shapeId } = mark;
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
        };
    }
}
