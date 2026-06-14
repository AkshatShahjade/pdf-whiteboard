import { MarkDTO } from './dtos';
import { getMarkDomainType } from '../atma/capabilities_registry/pdf/mark_domain_registry';

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
    const markDomainType = getMarkDomainType(mark.type);
    if (markDomainType.validate) {
      return markDomainType.validate(mark);
    }
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: err.message || `No validator found for mark type: ${mark.type}` };
  }
}
