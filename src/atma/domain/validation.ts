import { MarkDTO } from '../api/dtos';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Pure, stateless validation for a MarkDTO (either complete or partial without ID).
 */
export function validateMark(mark: Omit<MarkDTO, 'id'> | MarkDTO): ValidationResult {
  if (!mark.type) {
    return { isValid: false, error: 'Mark type is required.' };
  }

  switch (mark.type) {
    case 'rect': {
      const { x, y, w, h } = mark;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
        return { isValid: false, error: 'Rect coordinates (x, y, w, h) must be numeric.' };
      }
      if (x < 0 || x > 100 || y < 0 || y > 100) {
        return { isValid: false, error: 'Rect coordinates must reside within percentage bounds (0-100).' };
      }
      if (w <= 0 || h <= 0) {
        return { isValid: false, error: 'Rect dimensions (w, h) must be positive values.' };
      }
      break;
    }

    case 'lasso': {
      const { x, y, w, h, points } = mark;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
        return { isValid: false, error: 'Lasso bounding coordinates (x, y, w, h) must be numeric.' };
      }
      if (!Array.isArray(points) || points.length === 0) {
        return { isValid: false, error: 'Lasso marks must contain a non-empty points collection.' };
      }
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') {
          return { isValid: false, error: `Lasso point at index ${i} is invalid or non-numeric.` };
        }
      }
      break;
    }

    case 'section': {
      const { y, h, w } = mark;
      if (typeof y !== 'number' || typeof h !== 'number' || typeof w !== 'number') {
        return { isValid: false, error: 'Section values (y, h, w) must be numeric.' };
      }
      if (y < 0 || y > 100) {
        return { isValid: false, error: 'Section y-coordinate must reside within percentage bounds (0-100).' };
      }
      if (h <= 0 || w <= 0) {
        return { isValid: false, error: 'Section dimensions (h, w) must be positive values.' };
      }
      break;
    }

    default: {
      return { isValid: false, error: `Unsupported mark type: ${(mark as any).type}` };
    }
  }

  return { isValid: true };
}
