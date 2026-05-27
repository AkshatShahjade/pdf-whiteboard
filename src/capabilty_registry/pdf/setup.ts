import { lassoMark } from "../../implementations/pdf/marks/lasso_mark";
import { rectangleMark } from "../../implementations/pdf/marks/rectangle_mark";
import { markRegistry, registerMarkType } from "./mark_registry";

export function setupMarkRegistry(){
    if (!markRegistry.has(lassoMark.id)) {
        registerMarkType(lassoMark);
    }
    if (!markRegistry.has(rectangleMark.id)) {
        registerMarkType(rectangleMark);
    }
}
