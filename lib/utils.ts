import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { MAGIC_COLOURS_SET } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateMetadata(metadata: any): { valid: boolean; error?: string } {
  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, error: 'Metadata must be an object' };
  }

  // Validate colours field if present
  if ('colours' in metadata && metadata.colours !== null && metadata.colours !== undefined) {
    if (typeof metadata.colours !== 'string') {
      return { valid: false, error: 'colours field must be a string' };
    }
    if (!MAGIC_COLOURS_SET.has(metadata.colours)) {
      return { valid: false, error: `Invalid colours value. Must be one of: ${Array.from(MAGIC_COLOURS_SET).join(', ')}` };
    }
  }

  // Validate decklistUrl if present
  if ('decklistUrl' in metadata && metadata.decklistUrl !== null && metadata.decklistUrl !== undefined) {
    if (typeof metadata.decklistUrl !== 'string') {
      return { valid: false, error: 'decklistUrl field must be a string' };
    }
    try {
      new URL(metadata.decklistUrl);
    } catch {
      return { valid: false, error: 'decklistUrl must be a valid URL' };
    }
  }

  return { valid: true };
}
