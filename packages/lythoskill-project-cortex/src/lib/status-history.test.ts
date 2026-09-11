import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { append, locate, parse, read, type DocKind } from './status-history.js';
import { createAdrTemplate, createEpicTemplate, createTaskTemplate } from './template.js';

// ---------------------------------------------------------------------------
// Shape fixtures (inline, small). Real-corpus fixtures live further down.
// ---------------------------------------------------------------------------

const CANONICAL = [
  '| Status | Date | Note |',
  '|--------|------|------|',
  '| backlog | 2026-01-01 | Created |',
  '| in-progress | 2026-01-02 | Started |',
].join('\n');

const DATE = '2026-09-11';

describe('locate — the ONLY heading finder', () => {
  it('finds `## Status History` and reports its line number', () => {
    const content = '# T\n\n## Status History\n\n' + CANONICAL + '\n';
    const found = locate(content);
    expect(found.length).toBe(1);
    expect(found[0].line).toBe(2);
  });

  it('is anchored on trim(), like the reader it replaced', () => {
    expect(locate('##   Status   History  \n').length).toBe(1);
    expect(locate('   ## Status History\n').length).toBe(1);
  });

  it('does not see a heading inside a fenced code block', () => {
    const content = '```\n## Status History\n```\n';
    expect(locate(content).length).toBe(0);
  });

  it('does not fire on the legacy `## Status` single-line heading', () => {
    expect(locate('## Status\n\nbacklog\n').length).toBe(0);
  });
});

describe('read — the canonical table only', () => {
  it('returns structured rows', () => {
    expect(read('## Status History\n\n' + CANONICAL + '\n')).toEqual([
      { status: 'backlog', date: '2026-01-01', note: 'Created' },
      { status: 'in-progress', date: '2026-01-02', note: 'Started' },
    ]);
  });

  it('keeps a note that itself contains a pipe (cells.slice(2).join, not cells[2])', () => {
    // Real shape: TASK-20260503152001333 carries a trailing HTML comment glued to the row.
    const content = '| Status | Date | Note |\n|---|---|---|\n| backlog | 2026-01-01 | a | b |\n';
    expect(read(content)[0].note).toBe('a | b');
  });

  it('ignores vocabulary rows that are not part of the canonical table', () => {
    const content = '| terminated | 2026-05-03 | stray |\n\n' + CANONICAL + '\n';
    expect(read(content).map(r => r.status)).toEqual(['backlog', 'in-progress']);
  });

  it('returns nothing for a document with no header-bearing table', () => {
    expect(read('# T\n\n| in-progress | 2026-01-01 | Started |\n')).toEqual([]);
  });
});

describe('parse — the { lines, hasSection, singleStatus } triple', () => {
  it('parses the table format', () => {
    const result = parse('## Status History\n\n' + CANONICAL + '\n');
    expect(result.lines).toEqual(['backlog', 'in-progress']);
    expect(result.hasSection).toBe(true);
    expect(result.singleStatus).toBeNull();
  });

  it('parses the legacy `## Status` form through blank lines (probe.test.ts:194)', () => {
    // The `\s*` in the preserved regex is load-bearing: `## Status\n\nbacklog\n`.
    const result = parse('## Status\n\nbacklog\n');
    expect(result.lines).toEqual(['backlog']);
    expect(result.singleStatus).toBe('backlog');
    expect(result.hasSection).toBe(true);
  });

  it('returns empty when there is no Status History at all', () => {
    const result = parse('# Task\n\nNo status here.\n');
    expect(result.lines).toEqual([]);
    expect(result.hasSection).toBe(false);
    expect(result.singleStatus).toBeNull();
  });
});

describe('append — never refuses, never fabricates', () => {
  it('AC1 — a card with no section gets the verbatim block, not a bare row', () => {
    const content = '# TASK-1: t\n\n## Background\n\nReal content.\n';
    const out = append(content, 'task', 'in-progress', DATE, 'Started');
    const block = [
      '## Status History',
      '<!-- machine-parseable table: directory = current status, last row = latest record -->',
      '',
      '| Status | Date | Note |',
      '|--------|------|------|',
      '| backlog | 2026-09-11 | Created (reconstructed; no card ID) |',
      '| in-progress | 2026-09-11 | Started |',
    ].join('\n');
    expect(out).toBe(content.trimEnd() + '\n\n' + block + '\n');
    // "a heading + a bare row" must not satisfy AC1
    expect(out).not.toBe(content + '\n\n| in-progress | 2026-09-11 | Started |\n');
  });

  it('the written block is byte-identical to what the templates ship (one shape, no drift)', () => {
    const t = createTaskTemplate('TASK-1', 't');
    const today = new Date().toISOString().split('T')[0];
    // A fresh task with no history at all: append must reproduce the template's block.
    const fresh = append('# TASK-1: t\n', 'task', 'backlog', today, 'Created');
    expect(fresh).toContain(t.slice(t.indexOf('## Status History'), t.indexOf('\n## Background')));

    const a = createAdrTemplate('ADR-1', 't');
    const freshAdr = append('# ADR-1: t\n', 'adr', 'proposed', today, 'Created');
    expect(freshAdr).toContain(a.slice(a.indexOf('## Status History'), a.indexOf('\n## Background')));

    // …and the epic template, which is rendered from templates/epic.md on disk — without
    // this leg the block could drift for a third of the card types with the suite green.
    const e = createEpicTemplate('EPIC-1', 't', { lane: 'main', checklistCompleted: true });
    const freshEpic = append('# EPIC-1: t\n', 'epic', 'active', today, 'Created');
    const epicBlockStart = e.indexOf('## Status History');
    expect(freshEpic).toContain(e.slice(epicBlockStart, e.indexOf('\n## ', epicBlockStart)));
  });

  it('a section without a table gets the header and separator', () => {
    const content = '## Status History\n\n## Next\n';
    const out = append(content, 'task', 'in-progress', DATE, 'Started');
    expect(out).toContain('| Status | Date | Note |\n|--------|------|------|');
    expect(read(out).map(r => r.status)).toEqual(['backlog', 'in-progress']);
  });

  it('a canonical table is appended to, and nothing else in the file moves', () => {
    const content = '# T\n\n## Status History\n\n' + CANONICAL + '\n\n## Next\n\nbody\n';
    const out = append(content, 'task', 'review', DATE, 'Deliverables committed');
    expect(out).toBe(content.replace(
      '| in-progress | 2026-01-02 | Started |\n',
      '| in-progress | 2026-01-02 | Started |\n| review | 2026-09-11 | Deliverables committed |\n',
    ));
  });

  it('folds orphan rows to the END of the canonical table, in order, before appending', () => {
    const content = [
      '# T', '', '## Status History',
      '| terminated | 2026-05-03 | stray one |',
      '',
      '| Status | Date | Note |',
      '|--------|------|------|',
      '| backlog | 2026-05-03 | Created |',
      '', '## Next', '', 'body', '',
    ].join('\n');
    const out = append(content, 'task', 'terminated', DATE, 'Terminated');
    expect(read(out).map(r => r.status)).toEqual(['backlog', 'terminated', 'terminated']);
    // the orphan row left its old position
    expect(out.indexOf('| terminated | 2026-05-03 | stray one |')).toBeGreaterThan(out.indexOf('| backlog | 2026-05-03 | Created |'));
    expect(out).toContain('| terminated | 2026-05-03 | stray one |\n| terminated | 2026-09-11 | Terminated |');
  });

  it('does not duplicate the origin row when the folded rows already carry it', () => {
    const content = [
      '# T', '', '| backlog | 2026-05-03 | Created |', '', '## Next',
    ].join('\n');
    const out = append(content, 'task', 'in-progress', DATE, 'Started');
    expect(read(out).map(r => r.status)).toEqual(['backlog', 'in-progress']);
  });

  it('never fabricates an origin row into a canonical table that never had one', () => {
    // 20 of this repo's cards (10 task + 9 ADR + 1 epic) have a canonical table that does
    // not START at the kind's initial status; prepending one would invent history on their
    // next transition.
    const content = '## Status History\n\n| Status | Date | Note |\n|---|---|---|\n| accepted | 2026-01-01 | Accepted |\n';
    const out = append(content, 'adr', 'superseded', DATE, 'Superseded');
    expect(read(out).map(r => r.status)).toEqual(['accepted', 'superseded']);
  });

  it('never refuses — a document with no recognisable shape still gets a readable record', () => {
    const out = append('', 'epic', 'active', DATE, 'Created');
    expect(read(out).map(r => r.status)).toEqual(['active']);
  });

  it('the origin row is the kind-keyed one', () => {
    expect(read(append('', 'task', 'review', DATE, 'x')).map(r => r.status)).toEqual(['backlog', 'review']);
    expect(read(append('', 'adr', 'accepted', DATE, 'x')).map(r => r.status)).toEqual(['proposed', 'accepted']);
    expect(read(append('', 'epic', 'done', DATE, 'x')).map(r => r.status)).toEqual(['active', 'done']);
  });

  it('F4 — the origin date is the ID instant read in UTC, pinned in a FIXED zone', () => {
    // Zone choice: the test sets `process.env.TZ = 'Asia/Shanghai'` in-process and restores
    // it in `finally`, rather than spawning a child with `TZ=…`. Why: a subprocess depends on
    // what the ambient environment exposes, and the expectation is then still computed here;
    // setting TZ in-process needs no subprocess and needs no assumption about the runner's
    // zone. Asia/Shanghai (+08) is deliberately far from UTC.
    //
    // The pin only discriminates in a non-UTC zone: in a UTC runner the ID's local reading IS
    // its UTC reading, so no input can separate "normalised" from "sliced". That is why the
    // zone is set rather than assumed. The IDs are non-degenerate on purpose:
    //  - `TASK-20260101003000000` sits at local 00:30, inside the [00:00, 08:00) window where
    //    the UTC date is the PREVIOUS day — this is what pins the local→UTC normalisation and
    //    `toISOString()` (a slice gives 2026-01-01, local formatting gives 2026-01-01);
    //  - `TASK-20260509120000000` has month ≠ day, so a month/day swap cannot hide (it gives
    //    2026-09-05).
    const prevTz = process.env.TZ;
    process.env.TZ = 'Asia/Shanghai';
    try {
      // Self-check: if the platform ignored the assignment the pin would silently lose its
      // power, so assert the zone actually took effect before relying on it.
      expect(new Date(2026, 0, 1, 0, 30, 0, 0).toISOString()).toBe('2025-12-31T16:30:00.000Z');

      const a = read(append('# T\n', 'task', 'in-progress', '2026-09-11', 'x', 'TASK-20260101003000000'))[0];
      expect(a.date).toBe('2025-12-31');

      const b = read(append('# T\n', 'task', 'in-progress', '2026-09-11', 'x', 'TASK-20260509120000000'))[0];
      expect(b.date).toBe('2026-05-09');
    } finally {
      if (prevTz === undefined) delete process.env.TZ;
      else process.env.TZ = prevTz;
    }
  });

  it('F4 — no timestamped ID to date it from: falls back to the transition date and says so', () => {
    // The one leg that stays zone-independent: with nothing to read, the date is the caller's.
    const out = append('# T\n', 'task', 'in-progress', DATE, 'Started', 'TASK-TEST-001');
    expect(read(out)[0].date).toBe(DATE);
    expect(read(out)[0].note).toContain('no card ID');
  });

  it('F4 — the reconstruction does not postdate the record (when the ID predates it)', () => {
    const content = [
      '# T', '', '| review | 2026-05-03 | Deliverables committed |', '',
    ].join('\n');
    // The ID's instant (2025-12-31 in UTC) precedes the row it reconstructs.
    const out = append(content, 'task', 'completed', DATE, 'Done', 'TASK-20260101003000000');
    const rows = read(out);
    expect(rows[0].status).toBe('backlog');
    expect(rows[0].date <= rows[1].date).toBe(true);
  });

  it('F4 — known inversion: an ID that postdates the record puts the "origin" after it', () => {
    // G5(a), recorded rather than fixed: the origin row takes whatever the ID says, so an ID
    // minted AFTER the earliest recorded row yields an origin that postdates it. The docblock
    // invariant holds only when the ID is the oldest instant in the file (the victim's shape).
    // Pre-F4 was worse (the origin took the transition date, which is always the newest), so
    // this is a net improvement — but it is unpinned by construction, so pin the inversion
    // itself and let the fix delete this case.
    const content = [
      '# T', '', '| review | 2026-05-03 | Deliverables committed |', '',
    ].join('\n');
    const out = append(content, 'task', 'completed', DATE, 'Done', 'TASK-20260509120000000');
    const rows = read(out);
    expect(rows[0].date > rows[1].date).toBe(true);   // inverted, and knowingly so
  });

  it('M10 — the vocabulary is kind-keyed: a task card does not fold an epic row', () => {
    // `active`/`done` are epic words. A task card carrying one (a pasted epic row) must be
    // left alone — folding another kind's vocabulary would move a row this record never owned.
    const content = [
      '# T', '', '## Status History',
      '| active | 2026-05-03 | an epic row inside a task card |',
      '',
      '| Status | Date | Note |',
      '|--------|------|------|',
      '| backlog | 2026-05-03 | Created |',
      '', '## Next', '',
    ].join('\n');

    const asTask = append(content, 'task', 'review', DATE, 'x');
    expect(read(asTask).map(r => r.status)).toEqual(['backlog', 'review']);
    expect(asTask).toContain('| active | 2026-05-03 | an epic row inside a task card |');
    expect(orphanRows(asTask, 'task')).toEqual([]);

    // The same bytes, read as an epic: the row IS this kind's vocabulary, so it folds.
    const asEpic = append(content, 'epic', 'done', DATE, 'x');
    expect(read(asEpic).map(r => r.status)).toEqual(['backlog', 'active', 'done']);
    expect(orphanRows(asEpic, 'epic')).toEqual([]);
  });
});

describe('open-fence shapes — a pinned gap, not a refusal (F3)', () => {
  // `fenceMap` toggles on a delimiter, so a document that leaves a fence open marks the rest
  // of itself as fenced. `append` still never refuses — 永不拒绝 is the card's principle, and
  // a refusal here would be a freeze path, the very class plan-gate round 3's N6 named ("no
  // card shape may be unable to advance its state machine"). But the block it writes can land
  // inside the fence, where `read()` will not see it, so `probe` keeps reporting the card.
  // Measured 2026-09-11: 0 of 542 cards in this repo have any of these shapes. Pinned so the
  // behaviour is visible; a separate card owns the fix.
  const SHAPES: Array<[string, string, string]> = [
    ['unclosed ``` at EOF', '# T\n\n## Notes\n\n```\n', '```'],
    ['unclosed ``` at EOF, no trailing newline', '# T\n\n## Notes\n\n```', '```'],
    ['unclosed ``` mid-document, with text after', '# T\n\n```\n\n## Status History\n\n' + CANONICAL + '\n', '```'],
    ['unclosed ~~~ at EOF', '# T\n\n## Notes\n\n~~~\n', '~~~'],
  ];

  /** How many `## Status History` headings the file carries, fenced or not. */
  const headings = (s: string): number => (s.match(/^## Status History$/gm) ?? []).length;
  /** How many record rows are physically in the file, fenced or not. */
  const rowsInFile = (s: string): number => (s.match(/^\| (backlog|in-progress|review) \|/gm) ?? []).length;

  for (const [name, content, delim] of SHAPES) {
    it(`${name} — append writes, the reader does not see the row`, () => {
      const out = append(content, 'task', 'in-progress', DATE, 'Started');
      expect(out.length).toBeGreaterThan(content.length);
      expect(out).toContain('| in-progress |');
      expect(read(out)).toEqual([]);

      // The row IS in the bytes — the gap is legibility, not loss …
      expect(rowsInFile(out)).toBe(rowsInFile(content) + 2);   // origin row + the new row
      expect(headings(out)).toBe(headings(content) + 1);

      // … and balancing the fence afterwards does NOT recover it: everything after the
      // opening delimiter is inside the fence, including the block just written.
      const balanced = out + delim + '\n';
      expect(rowsInFile(balanced)).toBe(rowsInFile(out));
      expect(read(balanced)).toEqual([]);

      // The next transition sees no section either, so it writes a SECOND complete block:
      // the file grows one block per transition for as long as the fence stays open.
      const next = append(out, 'task', 'review', DATE, 'Delivered');
      expect(headings(next)).toBe(headings(out) + 1);
      expect(read(next)).toEqual([]);
      expect((next.match(/machine-parseable table/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });
  }

  it('a CLOSED fence is not a gap — the record beside it still reads', () => {
    const content = '# T\n\n```\ncode\n```\n\n## Status History\n\n' + CANONICAL + '\n';
    const out = append(content, 'task', 'review', DATE, 'Deliverables committed');
    expect(read(out).map(r => r.status)).toEqual(['backlog', 'in-progress', 'review']);
  });
});

describe('real corpus — the double-headed ADR (M16)', () => {
  // ADR-20260509155630 carries BOTH `## Status` (the legacy single-line form) and
  // `## Status History`. The card forbids converting the legacy form, and this ADR is the
  // stated reason: an ungated conversion would give it two `## Status History` headings and
  // freeze it. Frozen fixture, byte-identical to `git cat-file blob HEAD:<path>` (provenance:
  // HEAD = 4838487b, `cortex/adr/02-accepted/`).
  const FIXTURE = join(PACKAGE_ROOT, 'test', 'fixtures', 'legacy-status-heading-adr.md');

  it('is the real double-headed shape, not an invented one', () => {
    const content = readFileSync(FIXTURE, 'utf-8');
    expect(content).toContain('## Status\naccepted\n');
    expect(content).toContain('| Status | Date | Note |');
    expect(locate(content).length).toBe(1);
  });

  it('parse: the canonical table wins, the legacy value does not', () => {
    const parsed = parse(readFileSync(FIXTURE, 'utf-8'));
    expect(parsed.lines).toEqual(['proposed', 'accepted']);
    expect(parsed.singleStatus).toBeNull();
    expect(parsed.hasSection).toBe(true);
  });

  it('append: no conversion — one heading, the legacy line byte-untouched, reader ends on the new status', () => {
    const content = readFileSync(FIXTURE, 'utf-8');
    const out = append(content, 'adr', 'superseded', DATE, 'Superseded');
    expect(locate(out).length).toBe(1);                    // converting would make it 2 and freeze the ADR
    expect(out).toContain('## Status\naccepted\n');       // verbatim, exactly as it was
    const rows = read(out);
    expect(rows[rows.length - 1].status).toBe('superseded');
    expect(rows[rows.length - 2].status).toBe('accepted');
    expect(rows.length).toBe(read(content).length + 1);    // nothing else moved in
  });
});

describe('parse — precedence between the legacy line and the record (M16)', () => {
  it('a canonical table outranks a legacy `## Status` line, heading or no heading', () => {
    const withHeading = '# T\n\n## Status\naccepted\n\n## Status History\n\n' + CANONICAL + '\n';
    const p1 = parse(withHeading);
    expect(p1.lines).toEqual(['backlog', 'in-progress']);
    expect(p1.singleStatus).toBeNull();

    const withoutHeading = '# T\n\n## Status\nbacklog\n\n' + CANONICAL + '\n';
    const p2 = parse(withoutHeading);
    expect(p2.lines).toEqual(['backlog', 'in-progress']);
    expect(p2.singleStatus).toBeNull();
  });

  it('M11 — a heading-less canonical table still counts as a section', () => {
    const content = '# T\n\n| Status | Date | Note |\n|---|---|---|\n| review | 2026-01-01 | x |\n';
    const parsed = parse(content);
    expect(parsed.hasSection).toBe(true);
    expect(parsed.lines).toEqual(['review']);
    expect(parsed.singleStatus).toBeNull();
  });

  it('M11 — a heading with no table is still a section (present, empty)', () => {
    const parsed = parse('## Status History\n\n## Next\n');
    expect(parsed.hasSection).toBe(true);
    expect(parsed.lines).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Real corpus — the regression set named by the task card
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..', '..');
const PACKAGE_ROOT = resolve(import.meta.dir, '..', '..');

function findCard(prefix: string): string | null {
  for (const dir of ['cortex/tasks', 'cortex/adr', 'cortex/epics']) {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) continue;
    const walk = (d: string): string | null => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) {
          const hit = walk(p);
          if (hit) return hit;
        } else if (e.name.startsWith(prefix)) return p;
      }
      return null;
    };
    const hit = walk(root);
    if (hit) return hit;
  }
  return null;
}

function dirStatus(file: string, kind: DocKind): string {
  const table: Record<DocKind, [string, string][]> = {
    task: [['01-backlog', 'backlog'], ['02-in-progress', 'in-progress'], ['03-review', 'review'],
      ['04-completed', 'completed'], ['05-suspended', 'suspended'], ['06-terminated', 'terminated'],
      ['07-archived', 'archived']],
    adr: [['01-proposed', 'proposed'], ['02-accepted', 'accepted'], ['03-rejected', 'rejected'],
      ['04-superseded', 'superseded']],
    epic: [['01-active', 'active'], ['99-done', 'done'], ['03-suspended', 'suspended'],
      ['04-archived', 'archived']],
  };
  for (const [sub, st] of table[kind]) if (file.includes(`/${sub}/`)) return st;
  throw new Error(`cannot infer status from path: ${file}`);
}

/** Every task file in this repo (the corpus the probe scans). */
function allTaskFiles(): string[] {
  const root = join(REPO_ROOT, 'cortex', 'tasks');
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md') && e.name.startsWith('TASK-')) out.push(p);
    }
  };
  walk(root);
  return out;
}

/** The pre-fix writer, verbatim from move.ts at 1fe85a80 — the reference for
 *  "every card the fix is not about is byte-identical". */
function preFixWriter(content: string, status: string, date: string, note: string): string {
  const newLine = `| ${status} | ${date} | ${note} |`;
  const sectionMatch = content.match(/(##\s+Status\s+History\s*\n[\s\S]*?)(\n##\s+|\n#{1,2}\s|$)/i);
  if (!sectionMatch) return content + `\n\n${newLine}\n`;
  const section = sectionMatch[1];
  const lines = section.split('\n');
  let lastTableRow = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      if (/^\|[-\s|]+\|$/.test(line)) continue;
      lastTableRow = i;
      break;
    }
  }
  if (lastTableRow === -1) return content.replace(section, section + '\n' + newLine);
  lines.splice(lastTableRow + 1, 0, newLine);
  return content.replace(section, lines.join('\n'));
}

/** Independent row-grammar: first cell, first whitespace token, lowercased.
 *  Deliberately NOT `statusToken` from the module under test — a cross-check that borrows
 *  the very rule it is checking cannot go red when that rule is removed (implementation
 *  gate M9: the fold's first-token rule was un-pinned because this helper imported it). */
function firstToken(cell: string): string {
  return cell.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
}

/** The status word of a table row. */
function rowStatus(line: string): string {
  const cells = line.trim().split('|').map(c => c.trim()).filter(c => c.length > 0);
  return firstToken(cells[0] ?? '');
}

/** Vocabulary rows that are NOT inside the canonical table and not inside a fence — must
 *  be empty after an append (the "folding is complete" property). Written independently of
 *  the module's privates so it cross-checks the fold rather than restating it. */
function orphanRows(content: string, kind: DocKind): string[] {
  const lines = content.split('\n');
  const isTable = (l: string): boolean => l.trim().startsWith('|');
  const isSep = (l: string): boolean => /^\|[-\s|]+\|$/.test(l.trim());
  const cells = (l: string): string[] => l.trim().split('|').map(c => c.trim()).filter(c => c.length > 0);

  const fenced: boolean[] = [];
  let inFence = false;
  for (const l of lines) {
    if (/^\s*(```|~~~)/.test(l)) { inFence = !inFence; fenced.push(true); continue; }
    fenced.push(inFence);
  }

  const headerAt = lines.findIndex(l => {
    const c = cells(l);
    return c.length >= 2 && c[0].toLowerCase() === 'status' && c.some(x => /^date$/i.test(x));
  });
  const inCanonical = new Set<number>();
  if (headerAt >= 0) {
    for (let i = headerAt; i < lines.length && isTable(lines[i]); i++) inCanonical.add(i);
  }

  const vocab = { task: ['backlog', 'in-progress', 'review', 'completed', 'suspended', 'terminated', 'archived'],
    adr: ['proposed', 'accepted', 'rejected', 'superseded'],
    epic: ['active', 'done', 'suspended', 'archived'] }[kind];

  const orphans: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i] || inCanonical.has(i) || isSep(lines[i]) || !isTable(lines[i])) continue;
    const c = cells(lines[i]);
    if (c.length >= 2 && vocab.includes(firstToken(c[0]))) orphans.push(lines[i].trim());
  }
  return orphans;
}

const CORPUS = allTaskFiles().length > 0 ? describe : describe.skip;

CORPUS('real corpus — multi-table cards (AC5, content not location)', () => {
  // The three cards whose Status History carried an orphan row ABOVE the header-bearing
  // table.
  //
  // **These tests assert frozen content, not live corpus location.** The fixtures are
  // byte-identical to `git cat-file blob HEAD:<path>` (verified when they were frozen;
  // provenance: HEAD = 4838487b, old paths `06-terminated/` and `04-completed/` — recorded
  // here because those paths no longer resolve, the cards having since been archived). The
  // earlier version of this test read the live file and hardcoded its working directory, so
  // archiving the cards — a legitimate transition — turned the suite red. A test whose
  // result depends on where the corpus happens to sit, or on which tools the ambient
  // environment exposes, is not reproducible; content is what can be pinned.
  // (Freezing also survives the repair: once a card is advanced its live content no longer
  // carries the orphan, and a test that reddens when the mechanism works is not a test.)
  //
  // `thenStatus` = the status the orphan row records, i.e. the card's directory at HEAD.
  const CARDS: Array<[string, string]> = [
    ['TASK-20260503152001333', 'terminated'],
    ['TASK-20260503154401905', 'completed'],
    ['TASK-20260503152002342', 'completed'],
  ];

  for (const [id, thenStatus] of CARDS) {
    it(`${id} — its orphan row folds into the canonical table and the reader ends on the status just written`, () => {
      const fixture = join(PACKAGE_ROOT, 'test', 'fixtures', `multi-table-${id.replace('TASK-', '')}.md`);
      expect(existsSync(fixture)).toBe(true);
      const content = readFileSync(fixture, 'utf-8');

      // Precondition: the orphan is real, and it is NOT the record (the reader's last row
      // is the stale canonical tail — that is the defect AC5 names).
      const orphans = orphanRows(content, 'task');
      expect(orphans.length).toBeGreaterThan(0);
      const before = read(content);
      expect(before[before.length - 1].status).not.toBe(thenStatus);
      expect(orphans.some(o => rowStatus(o) === thenStatus)).toBe(true);

      const out = append(content, 'task', thenStatus, DATE, 'Repaired');
      const rows = read(out);
      // AC5: the reader's last row is the status just written.
      expect(rows[rows.length - 1].status).toBe(thenStatus);
      // The orphan is now inside the canonical table, and nothing was lost.
      expect(orphanRows(out, 'task')).toEqual([]);
      expect(rows.length).toBe(before.length + orphans.length + 1);
      // …including the trailing HTML comment — the reason `note` is `cells.slice(2)`,
      // not `cells[2]`.
      expect(rows.some(r => r.note.includes('machine-parseable table'))).toBe(true);
    });
  }

  it('M-PIN — the fold needs the FIRST-TOKEN rule: `backlog (revised)` must fold', () => {
    // Mutation-pinned: drop the first-token rule (compare the whole first cell instead) and
    // this goes red — the `backlog (revised)` orphan stops folding, so `read()` loses a row
    // silently. Content shape taken from TASK-20260503152001333, which carries exactly such
    // a row inside its canonical table.
    const content = [
      '# T', '', '## Status History',
      '| backlog (revised) | 2026-05-03 | Schema 从 array-of-tables 切到 alias-as-key dict |',
      '',
      '| Status | Date | Note |',
      '|--------|------|------|',
      '| backlog | 2026-05-03 | Created |',
      '', '## Next', '',
    ].join('\n');
    const out = append(content, 'task', 'terminated', DATE, 'Terminated');
    expect(read(out).map(r => r.status)).toEqual(['backlog', 'backlog (revised)', 'terminated']);
    expect(orphanRows(out, 'task')).toEqual([]);
  });
});

describe('real corpus — the damaged card (AC2 victim, frozen fixture)', () => {
  // Frozen bytes of the victim card as the buggy writer left them. A fixture, not the live
  // file: this card is expected to be repaired by its own next transition, and a test that
  // reddens when the mechanism works is not a test (implementation gate F1's lesson).
  const FIXTURE = join(PACKAGE_ROOT, 'test', 'fixtures', 'writer-damaged-task-card.md');
  const thenStatus = 'review';

  it('is the card whose rows the CLI wrote but the CLI cannot read', () => {
    const content = readFileSync(FIXTURE, 'utf-8');
    expect(locate(content).length).toBe(0);
    expect(read(content)).toEqual([]);
    expect(orphanRows(content, 'task').length).toBeGreaterThan(0);
    expect(rowStatus(orphanRows(content, 'task').at(-1)!)).toBe(thenStatus);
  });

  it('is repaired by the writer: block + folded rows + new row, in that order', () => {
    const content = readFileSync(FIXTURE, 'utf-8');
    const orphansBefore = orphanRows(content, 'task');
    const out = append(content, 'task', 'completed', DATE, 'Done');

    expect(locate(out).length).toBe(1);
    expect(orphanRows(out, 'task')).toEqual([]);
    expect(read(out).map(r => r.status)).toEqual(['backlog', ...orphansBefore.map(rowStatus), 'completed']);
    expect(out).toContain([
      '## Status History',
      '<!-- machine-parseable table: directory = current status, last row = latest record -->',
      '',
      '| Status | Date | Note |',
      '|--------|------|------|',
    ].join('\n'));
  });
});

CORPUS('real corpus — the vocabulary negative (AC7)', () => {
  it("TASK-20260503235013705's `## 进度记录` table is not a status record and is not folded", () => {
    const file = findCard('TASK-20260503235013705');
    expect(file).not.toBeNull();
    const content = readFileSync(file!, 'utf-8');

    // `| RED |`, `| GREEN |`, … — not this kind's vocabulary, so never an orphan row.
    expect(content).toContain('| RED | 2026-05-04 |');
    expect(orphanRows(content, 'task')).toEqual([]);

    // And an append leaves the whole table byte-identical.
    const out = append(content, 'task', 'completed', DATE, 'Repaired');
    const progress = (s: string): string => s.slice(s.indexOf('## 进度记录'), s.indexOf('## 关联文件'));
    expect(progress(out)).toBe(progress(content));
  });

  it('a fenced example row is not read as the record', () => {
    // Frozen rule (round 3): only rows that are not part of the canonical table fold.
    // A fenced block is documentation — it never becomes the canonical table, so `read`
    // never reports it as this document's status.
    const content = [
      '# T', '', '## Status History', '',
      '```',
      '| Status | Date | Note |',
      '|--------|------|------|',
      '| review | 2020-01-01 | an example |',
      '```', '',
    ].join('\n');
    expect(read(content)).toEqual([]);
  });

  it('AC7 (second half) — a vocabulary row inside a fence is NOT folded, and the fence is byte-untouched', () => {
    // The frozen rule's 「围栏内外」 reads against AC7's 「围栏内的示例行同样不算」; AC7 governs,
    // and for a reason past the text: hardening one scan while leaving its twin is the
    // failure shape of round 2's N1 (writer reports success, reader sees nothing). One
    // fence map, read by `locate`, by the canonical-table scan and by the fold alike.
    const content = [
      '# T', '', '## Status History', '```',
      '| suspended | 2020-01-01 | an example |',
      '```', '', '## Next', '',
    ].join('\n');
    const out = append(content, 'task', 'review', DATE, 'x');

    // The example row is not a record: the table holds the origin row and the new row only.
    // (Under a fence-unaware fold this would read ['backlog', 'suspended', 'review'].)
    expect(read(out).map(r => r.status)).toEqual(['backlog', 'review']);

    // The fenced block moved not one byte — including its delimiter lines.
    const fenceRegion = (s: string): string => {
      const open = s.indexOf('```');
      return s.slice(open, s.indexOf('```', open + 3) + 3);
    };
    expect(fenceRegion(out)).toBe(fenceRegion(content));
    expect(out).toContain('```\n| suspended | 2020-01-01 | an example |\n```');
  });
});

CORPUS('real corpus — no collateral byte damage (AC2)', () => {
  // Cards whose bytes the fix is ALLOWED to change. They are the two shapes the card
  // names: the 3 multi-table cards (orphan row before the canonical header) and the
  // damaged card (rows the pre-fix writer appended with no section at all). The set is
  // asserted as a subset, so it stays green once those cards are repaired — and goes red
  // if a NEW card ever acquires an orphan row.
  const KNOWN = new Set([
    'TASK-20260503152001333',
    'TASK-20260503154401905',
    'TASK-20260503152002342',
    'TASK-20260909010058114',
  ]);

  it('every card is byte-identical to the pre-fix writer except the known four', () => {
    const differing: string[] = [];
    for (const file of allTaskFiles()) {
      const content = readFileSync(file, 'utf-8');
      const status = dirStatus(file, 'task');
      if (preFixWriter(content, status, DATE, 'X') !== append(content, 'task', status, DATE, 'X')) {
        differing.push(basename(file).slice(0, 22));
      }
    }
    expect(differing.filter(d => !KNOWN.has(d))).toEqual([]);
  });

  it('the property holds for every card: the writer never writes what the reader cannot read', () => {
    const violations: string[] = [];
    for (const file of allTaskFiles()) {
      const content = readFileSync(file, 'utf-8');
      const status = dirStatus(file, 'task');
      const rows = read(append(content, 'task', status, DATE, 'X'));
      const last = rows.length > 0 ? firstToken(rows[rows.length - 1].status) : null;
      if (last !== status) violations.push(`${basename(file).slice(0, 22)}: dir=${status} read=${last}`);
    }
    expect(violations).toEqual([]);
  });
});
