import { Mark, Point, Selection, SectionSel, SelectionContext, RenderMarkContext } from "../../../../shared_doman_models_and_dtos/mark_domain_model";
import { MarkDomainType } from "../../../capabilities_registry/pdf/mark_domain_registry";
import { generateMarkId as createMarkId } from "../../../../shared_doman_models_and_dtos/factories";

export const sectionMark: MarkDomainType = {
    id: 'section',

    hasSelectedBorder(point: Point, region: Mark, ctx: SelectionContext) {
        return isInSectionBorder(point, region, ctx)
    },

    validate(mark: any) {
        const { y, h, w } = mark;
        if (typeof y !== 'number' || typeof h !== 'number' || typeof w !== 'number') {
            return { isValid: false, error: 'Section dimensions must be numeric.' };
        }
        if (y < 0 || h <= 0 || w <= 0) {
            return { isValid: false, error: 'Section y-position must be non-negative, and height/width must be positive.' };
        }
        return { isValid: true };
    },

    parseRaw(raw: any) {
        return {
            id: raw.id || createMarkId(),
            type: 'section',
            y: typeof raw.y === 'number' ? raw.y : 0,
            h: typeof raw.h === 'number' ? raw.h : 5,
            w: typeof raw.w === 'number' ? raw.w : 24, // SECTION_BASE_WIDTH + SECTION_WIDTH_STEP
        };
    }
}

const isInSectionBorder = (coords: Point, r: Mark, ctx: SelectionContext) => {
    if(r.type !== 'section'){
        throw new Error(" must pass Section into isInSectionBorder ")
    }
    if(ctx.PDFWIDTH === undefined) return false
    
    const inY = coords.y >= r.y && coords.y <= r.y + r.h;
    const inLeft = coords.x >= 0 && coords.x <= r.w;
    const inRight = coords.x >= (ctx.PDFWIDTH - r.w) && coords.x <= ctx.PDFWIDTH;
    return inY && (inLeft || inRight);

}
