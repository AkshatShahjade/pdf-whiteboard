import { MarkDTO, PointDTO } from './dtos';

/**
 * Generates a collision-resistant unique identifier for marks.
 */
export function generateMarkId(): string {
  return `mark_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

/**
 * Pure parsing factory function that sanitizes and converts raw objects to sanitized MarkDTO instances.
 */
export function parseRawMark(raw: any): MarkDTO {
  const id = raw.id || generateMarkId();
  const type = raw.type || 'rect';

  switch (type) {
    case 'rect':
      return {
        id,
        type: 'rect',
        x: typeof raw.x === 'number' ? raw.x : 0,
        y: typeof raw.y === 'number' ? raw.y : 0,
        w: typeof raw.w === 'number' ? raw.w : 10,
        h: typeof raw.h === 'number' ? raw.h : 10,
      };

    case 'lasso': {
      const rawPoints = Array.isArray(raw.points) ? raw.points : [];
      const points: PointDTO[] = rawPoints.map((pt: any) => ({
        x: typeof pt?.x === 'number' ? pt.x : 0,
        y: typeof pt?.y === 'number' ? pt.y : 0,
      }));
      return {
        id,
        type: 'lasso',
        x: typeof raw.x === 'number' ? raw.x : 0,
        y: typeof raw.y === 'number' ? raw.y : 0,
        w: typeof raw.w === 'number' ? raw.w : 10,
        h: typeof raw.h === 'number' ? raw.h : 10,
        points,
      };
    }

    case 'section':
      return {
        id,
        type: 'section',
        y: typeof raw.y === 'number' ? raw.y : 0,
        h: typeof raw.h === 'number' ? raw.h : 5,
        w: typeof raw.w === 'number' ? raw.w : 24, // SECTION_BASE_WIDTH + SECTION_WIDTH_STEP
      };

    default:
      throw new Error(`[Factories] Unable to parse unsupported mark type: ${type}`);
  }
}
