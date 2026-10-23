/**
 * Template drift gate (ADR-20261023183001417).
 *
 * Two things are pinned here and nowhere else:
 * 1. the canonical section set of every card type — editing a carrier is a
 *    deliberate template change, so the spec below has to move with it;
 * 2. the carrier count — a `*-TEMPLATE.md` (or `skill/assets/`) reappearing
 *    anywhere in the package is the fourth-carrier regression this ADR exists
 *    to prevent.
 */

import { describe, it, expect } from 'bun:test';
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  createTaskTemplate,
  createAdrTemplate,
  createEpicTemplate,
  findTemplatePath,
  TEMPLATE_CARRIERS,
  type TemplateKind,
} from './template.js';

const PKG_ROOT = join(import.meta.dir, '..', '..');

const headings = (md: string): string[] =>
  md
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());

const CANONICAL: Record<TemplateKind, string[]> = {
  task: [
    'Status History',
    'Background & Goals',
    'Requirements',
    'Technical Approach',
    'Acceptance Criteria',
    'Progress Log',
    'Related Files',
    'Git Commit Message',
    'Notes',
  ],
  epic: [
    'Status History',
    '背景故事',
    '需求树',
    '技术决策',
    '关联任务',
    '经验沉淀',
    '归档条件',
  ],
  adr: [
    'Status History',
    'Background',
    'Decision Drivers',
    'Options',
    'Decision',
    'Impact',
    'Related',
  ],
  handoff: [], // not rendered by the CLI; `cortex init` ships the file verbatim
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'coverage', '.git'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('template carriers', () => {
  it('renders exactly the canonical section set for each card type', () => {
    const rendered: Record<'task' | 'epic' | 'adr', string> = {
      task: createTaskTemplate('TASK-1', 't'),
      epic: createEpicTemplate('EPIC-1', 't', { lane: 'main', checklistCompleted: true }),
      adr: createAdrTemplate('ADR-1', 't'),
    };
    for (const kind of ['task', 'epic', 'adr'] as const) {
      expect({ kind, sections: headings(rendered[kind]) }).toEqual({
        kind,
        sections: CANONICAL[kind],
      });
    }
  });

  it('every declared carrier exists on disk', () => {
    for (const kind of Object.keys(TEMPLATE_CARRIERS) as TemplateKind[]) {
      expect({ kind, found: findTemplatePath(kind) }).toEqual({
        kind,
        found: expect.stringContaining(TEMPLATE_CARRIERS[kind]),
      });
    }
  });

  it('ships no second copy of any template (no *-TEMPLATE.md outside templates/)', () => {
    const carrierNames = new Set(Object.values(TEMPLATE_CARRIERS));
    const files = walk(PKG_ROOT);
    const templateFiles = files
      .filter((f) => f.includes(`${join('templates', '')}`) && f.endsWith('.md'))
      .map((f) => basename(f));
    expect(new Set(templateFiles)).toEqual(carrierNames);

    // The regression this ADR was raised for: a hand-kept copy the skill told
    // agents to read (`skill/assets/TASK-TEMPLATE.md`) and the init-time copy
    // (`assets/*-TEMPLATE.md`).
    const copies = files.filter(
      (f) => /-TEMPLATE\.md$/.test(f) || /[\\/](skill\/)?assets[\\/][^\\/]+\.md$/.test(f)
    );
    expect(copies).toEqual([]);
  });

  it('fails loudly on an unresolved placeholder instead of shipping {{VAR}}', () => {
    // An unknown placeholder in the rendered output would reach the adopter as
    // literal text (the class ADR-20260423182606313 pins for skills/).
    expect(() => createTaskTemplate('{{NOT_A_VAR}}', 't')).toThrow(/unresolved placeholder/);
  });
});
