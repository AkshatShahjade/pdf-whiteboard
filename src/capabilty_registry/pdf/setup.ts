import { lassoMark } from "../../implementations/pdf/marks/lasso_mark";
import { rectangleMark } from "../../implementations/pdf/marks/rectangle_mark";
import { sectionMark } from "../../implementations/pdf/marks/section_mark";
import { markRegistry, registerMarkType } from "./mark_registry";

export function setupMarkRegistry(){
    if (!markRegistry.has(lassoMark.id)) {
        registerMarkType(lassoMark);
    }
    if (!markRegistry.has(rectangleMark.id)) {
        registerMarkType(rectangleMark);
    }
    if(!markRegistry.has(sectionMark.id)){
        registerMarkType(sectionMark);
    }
}
