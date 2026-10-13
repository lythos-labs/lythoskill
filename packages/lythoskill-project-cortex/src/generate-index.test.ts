import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateIndex } from './generate-index.js';
import { initWorkflow } from './commands/init.js';
import type { WorkflowConfig } from './types.js';

let root: string;
const originalCwd = process.cwd();

function makeConfig(base: string): WorkflowConfig {
  return {
    tasksDir: join(base, 'cortex/tasks'),
    epicsDir: join(base, 'cortex/epics'),
    adrDir: join(base, 'cortex/adr'),
    wikiDir: join(base, 'cortex/wiki'),
    taskSubdirs: {
      backlog: '01-backlog',
      inProgress: '02-in-progress',
      review: '03-review',
      completed: '04-completed',
      suspended: '05-suspended',
      terminated: '06-terminated',
      archived: '07-archived',
    },
    epicSubdirs: { active: '01-active', done: '99-done', suspended: '03-suspended', archived: '04-archived' },
    adrSubdirs: { proposed: '01-proposed', accepted: '02-accepted', rejected: '03-rejected', superseded: '04-superseded' },
    wikiSubdirs: { patterns: '01-patterns', research: '02-research', lessons: '03-lessons', ssot: '04-ssot', archived: '05-archived' },
  };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'cortex-index-test-'));
  process.chdir(root);
});

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(root, { recursive: true, force: true });
});

describe('generateIndex', () => {
  test('writes INDEX.md under the cortex root, not the CWD root', () => {
    const config = makeConfig(root);
    mkdirSync(join(config.tasksDir, config.taskSubdirs.backlog), { recursive: true });
    writeFileSync(
      join(config.tasksDir, config.taskSubdirs.backlog, 'TASK-20261013120000000-test-task.md'),
      '# TASK-20261013120000000: Test Task\n',
    );

    generateIndex(config);

    const expected = join(root, 'cortex/INDEX.md');
    expect(existsSync(expected)).toBe(true);
    expect(readFileSync(expected, 'utf-8')).toContain('Test Task');
    // The pre-fix bug wrote INDEX.md to the CWD root — keep the mutation pinned
    expect(existsSync(join(root, 'INDEX.md'))).toBe(false);
  });

  test('derives cortex root from tasksDir even with a custom layout', () => {
    const customRoot = join(root, 'custom-layout');
    const config = makeConfig(customRoot);
    generateIndex(config);

    expect(existsSync(join(customRoot, 'cortex/INDEX.md'))).toBe(true);
    expect(existsSync(join(customRoot, 'INDEX.md'))).toBe(false);
  });
});

describe('initWorkflow', () => {
  test('creates the initial INDEX.md in the cortex root', () => {
    const initRoot = join(root, 'fresh-project');
    mkdirSync(initRoot, { recursive: true });
    process.chdir(initRoot);
    try {
      initWorkflow(makeConfig(initRoot));
      expect(existsSync(join(initRoot, 'cortex/INDEX.md'))).toBe(true);
      expect(existsSync(join(initRoot, 'INDEX.md'))).toBe(false);
    } finally {
      process.chdir(root);
    }
  });
});
