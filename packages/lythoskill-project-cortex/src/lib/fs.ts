import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FileScanResult } from '../types.js';

/** Ensure directory exists (recursive). */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Generate filename from prefix, id, and title. Slug must be ASCII-only. */
export function generateFileName(prefix: string, id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${id}-${slug}.md`;
}

/** Check whether a title would produce a valid ASCII-only slug. */
export function hasNonAsciiSlug(title: string): boolean {
  return /[^\x00-\x7F]/.test(title);
}

/** Scan directories for files matching prefix with 17-digit timestamp ID. */
export function scanFiles(dirs: string[], prefix: string): FileScanResult {
  const files: string[] = [];
  const pattern = new RegExp(`${prefix}-\\d{17}`);

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          const subResult = scanFiles([fullPath], prefix);
          files.push(...subResult.files);
          continue;
        }

        if (!entry.name.endsWith('.md')) continue;
        if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // unreadable dir, skip
    }
  }

  return { files };
}
