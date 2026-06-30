import { MarkDTO, PointDTO } from './dtos';

/**
 * Generates a collision-resistant unique identifier for marks.
 */
export function generateMarkId(): string {
  return `mark_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

/**
 * Generates a generic UUID.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

import { getMarkDomainType as getPdfMarkDomainType } from '../atma/capabilities_registry/pdf/mark_domain_registry.js';
import { getMarkDomainType as getWhiteboardMarkDomainType } from '../atma/capabilities_registry/whiteboard/mark_domain_registry.js';

/**
 * Pure parsing factory function that sanitizes and converts raw objects to sanitized MarkDTO instances.
 */
export function parseRawMark(raw: any): MarkDTO {
  const type = raw.type || 'rect';

  try {
    const markDomain = getPdfMarkDomainType(type);
    return markDomain.parseRaw(raw) as MarkDTO;
  } catch (e) {
    try {
      const markDomain = getWhiteboardMarkDomainType(type);
      return markDomain.parseRaw(raw) as MarkDTO;
    } catch (e2) {
      throw new Error(`[Factories] Unable to parse unsupported mark type: ${type}`);
    }
  }
}
