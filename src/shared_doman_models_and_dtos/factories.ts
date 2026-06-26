import { MarkDTO, PointDTO } from './dtos';

/**
 * Generates a collision-resistant unique identifier for marks.
 */
export function generateMarkId(): string {
  return `mark_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

import { getMarkDomainType } from '../atma/capabilities_registry/pdf/mark_domain_registry';

/**
 * Pure parsing factory function that sanitizes and converts raw objects to sanitized MarkDTO instances.
 */
export function parseRawMark(raw: any): MarkDTO {
  const type = raw.type || 'rect';

  try {
    const markDomain = getMarkDomainType(type);
    return markDomain.parseRaw(raw) as MarkDTO;
  } catch (e) {
    throw new Error(`[Factories] Unable to parse unsupported mark type: ${type}`);
  }
}
