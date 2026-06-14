import { MarkDTO } from './dtos';
import { getMarkType } from '../ui/capabilty_registry/pdf/mark_pdf_registry';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Pure validation delegator that resolves the concrete type validator from the Capability Registry.
 */
export function validateMark(mark: Omit<MarkDTO, 'id'> | MarkDTO): ValidationResult {
  if (!mark.type) {
    return { isValid: false, error: 'Mark type is required.' };
  }

  try {
    const markType = getMarkType(mark.type);
    if (markType.validate) {
      return markType.validate(mark);
    }
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: err.message || `No validator found for mark type: ${mark.type}` };
  }
}
