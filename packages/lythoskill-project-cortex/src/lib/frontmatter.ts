/**
 * YAML frontmatter parser for cortex epic files.
 *
 * Minimal: handles top-of-file `---\n...\n---\n` blocks with
 * key: value pairs (scalars only — no nested structures, no lists).
 * Quoted strings (`"..."`) are unquoted with simple `\\` / `\"` escapes.
 * Booleans are returned as boolean primitives.
 */

export interface Frontmatter {
  raw: string;            // original YAML block text without delimiters; '' if missing
  body: string;           // the rest of the file after the closing delimiter
  data: Record<string, string | boolean>;
  hasFrontmatter: boolean;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { raw: '', body: content, data: {}, hasFrontmatter: false };
  }
  const raw = match[1];
  const body = content.slice(match[0].length);
  const data: Record<string, string | boolean> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf(':');
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if (!key) continue;
    if (value === 'true') {
      data[key] = true;
      continue;
    }
    if (value === 'false') {
      data[key] = false;
      continue;
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }
    data[key] = value;
  }
  return { raw, body, data, hasFrontmatter: true };
}
