import type { TimestampId } from '../types.js';

/**
 * Generate a timestamp-based ID.
 * Format: PREFIX-yyyyMMddHHmmssSSS (17 digits)
 * Example: TASK-20260422143321029
 */
export function generateTimestampId(prefix: string): TimestampId {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${prefix}-${year}${month}${day}${hour}${minute}${second}${ms}`;
}
