import { MarkImplementation, Point, Region } from "../core/registry/mark_type_registry";
import { isInRectBorder } from "./spatial_marking_logic";

export const rectangleMark: MarkImplementation = {
    id : 'rect',
    
    hasSelectedBorder(point: Point, region: Region, width: number) {
        return isInRectBorder(point, region, width)
    }
}