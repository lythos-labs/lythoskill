/**
 * Markdown templates for Task, Epic, ADR, and Handoff.
 *
 * Every card shape has exactly ONE carrier: a file under
 * `packages/lythoskill-project-cortex/templates/`. Nothing is hardcoded here and
 * nothing else ships a copy — `cortex init` copies the same files into the
 * adopter project. ADR-20261023183001417.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/** The complete set of template carriers. Adding one means adding a reader + a test. */
export const TEMPLATE_CARRIERS = {
  task: 'task.md',
  epic: 'epic.md',
  adr: 'adr.md',
  handoff: 'handoff.md',
} as const;

export type TemplateKind = keyof typeof TEMPLATE_CARRIERS;

export interface EpicTemplateOptions {
  lane: 'main' | 'emergency';
  checklistCompleted: boolean;
  checklistSkippedReason?: string;
  laneOverrideReason?: string;
}

/** Locate a template file packaged alongside this CLI. */
export function findTemplatePath(kind: TemplateKind): string {
  const file = TEMPLATE_CARRIERS[kind];
  // src/lib/template.ts -> .../lythoskill-project-cortex/templates/<file>
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '..', '..', 'templates', file),
    resolve(here, '..', 'templates', file),
    // Fallback: when run from monorepo root, project layout
    resolve(process.cwd(), 'packages', 'lythoskill-project-cortex', 'templates', file),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `${kind} template not found. Looked in: ${candidates.join(', ')}`
  );
}

/** Render a template, failing loudly on any placeholder it was not given. */
function render(kind: TemplateKind, vars: Record<string, string>): string {
  let out = readFileSync(findTemplatePath(kind), 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  const left = out.match(/\{\{[A-Z0-9_]+\}\}/);
  if (left) {
    throw new Error(`${kind} template has unresolved placeholder ${left[0]}`);
  }
  return out;
}

const today = (): string => new Date().toISOString().split('T')[0];

export function createTaskTemplate(id: string, title: string): string {
  return render('task', { ID: id, TITLE: title, DATE: today() });
}

export function createEpicTemplate(
  id: string,
  title: string,
  options: EpicTemplateOptions
): string {
  const skipLine = options.checklistSkippedReason
    ? `checklist_skipped_reason: ${escapeYamlScalar(options.checklistSkippedReason)}\n`
    : '';
  const overrideLine = options.laneOverrideReason
    ? `lane_override_reason: ${escapeYamlScalar(options.laneOverrideReason)}\n`
    : '';

  return render('epic', {
    LANE: options.lane,
    CHECKLIST_COMPLETED: options.checklistCompleted ? 'true' : 'false',
    CHECKLIST_SKIPPED_REASON_LINE: skipLine,
    LANE_OVERRIDE_REASON_LINE: overrideLine,
    ID: id,
    TITLE: title,
    DATE: today(),
  });
}

/** Quote a YAML scalar if it contains special characters. */
function escapeYamlScalar(value: string): string {
  // Simple heuristic: if the string is plain ASCII without YAML-significant chars, leave it alone.
  if (/^[\w][\w\s.,;()/+\-]*$/.test(value)) {
    return value;
  }
  // Otherwise, double-quote and escape backslash + double quote.
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function createWikiTemplate(title: string, date: string, category: string): string {
  return `---
created: ${date}
updated: ${date}
category: ${category}
---

# ${title}

> One-line summary of this ${category}.

## Context
<!-- When does this apply? What problem does it solve? -->

## Details
<!-- The core content. Be specific. -->

## When to Apply / When Not to Apply
<!-- Boundaries and exceptions. -->

## Related
<!-- Links to related wiki entries, ADRs, or tasks. -->
`;
}

export function createAdrTemplate(id: string, title: string): string {
  return render('adr', { ID: id, TITLE: title, DATE: today() });
}
