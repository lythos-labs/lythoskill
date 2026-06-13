/**
 * Markdown templates for Task, Epic, and ADR.
 * Task / ADR remain hardcoded strings; Epic is rendered from
 * `packages/lythoskill-project-cortex/templates/epic.md` so it can carry
 * frontmatter (lane / checklist) + the workflowy callout out of band.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface EpicTemplateOptions {
  lane: 'main' | 'emergency';
  checklistCompleted: boolean;
  checklistSkippedReason?: string;
  laneOverrideReason?: string;
}

/** Locate the epic template file packaged alongside this CLI. */
function findEpicTemplatePath(): string {
  // src/lib/template.ts -> .../lythoskill-project-cortex/templates/epic.md
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '..', '..', 'templates', 'epic.md'),
    resolve(here, '..', 'templates', 'epic.md'),
    // Fallback: when run from monorepo root, project layout
    resolve(process.cwd(), 'packages', 'lythoskill-project-cortex', 'templates', 'epic.md'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `Epic template not found. Looked in: ${candidates.join(', ')}`
  );
}

export function createTaskTemplate(id: string, title: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `# ${id}: ${title}

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | ${today} | Created |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [ ] ⚠️ PLACEHOLDER_REQUIREMENT_1
- [ ] ⚠️ PLACEHOLDER_REQUIREMENT_2

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] ⚠️ PLACEHOLDER_CRITERION_1
- [ ] ⚠️ PLACEHOLDER_CRITERION_2

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
\`\`\`
feat(scope): description (${id})

- Detail 1
- Detail 2
\`\`\`

## Notes
`;
}

export function createEpicTemplate(
  id: string,
  title: string,
  options: EpicTemplateOptions
): string {
  const today = new Date().toISOString().split('T')[0];
  const templatePath = findEpicTemplatePath();
  const raw = readFileSync(templatePath, 'utf-8');

  const skipLine = options.checklistSkippedReason
    ? `checklist_skipped_reason: ${escapeYamlScalar(options.checklistSkippedReason)}\n`
    : '';
  const overrideLine = options.laneOverrideReason
    ? `lane_override_reason: ${escapeYamlScalar(options.laneOverrideReason)}\n`
    : '';

  return raw
    .replaceAll('{{LANE}}', options.lane)
    .replaceAll('{{CHECKLIST_COMPLETED}}', options.checklistCompleted ? 'true' : 'false')
    .replaceAll('{{CHECKLIST_SKIPPED_REASON_LINE}}', skipLine)
    .replaceAll('{{LANE_OVERRIDE_REASON_LINE}}', overrideLine)
    .replaceAll('{{ID}}', id)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{DATE}}', today);
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
  const today = new Date().toISOString().split('T')[0];
  return `# ${id}: ${title}

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | ${today} | Created |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->
-

## Options

### Option A
<!-- ⚠️ REQUIRED: Compare at least two options. Keeping placeholders = shell. -->
**Pros**:
-

**Cons**:
-

### Option B
<!-- ⚠️ REQUIRED: -->

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->
**Choice**: ⚠️ PLACEHOLDER_SCHEME

**Rationale**:

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->
- Positive:
- Negative:
- Follow-up:

## Related
- Related ADR:
- Related Epic:
`;
}
