import { existsSync, readFileSync } from 'node:fs';
import type { WorkflowConfig } from './types.js';

export const CONFIG_FILE = '.project-workflow.json';

export const DEFAULT_CONFIG: WorkflowConfig = {
  tasksDir: 'cortex/tasks',
  epicsDir: 'cortex/epics',
  adrDir: 'cortex/adr',
  wikiDir: 'cortex/wiki',
  taskSubdirs: {
    backlog: '01-backlog',
    inProgress: '02-in-progress',
    review: '03-review',
    completed: '04-completed',
    suspended: '05-suspended',
    terminated: '06-terminated',
    archived: '07-archived',
  },
  epicSubdirs: {
    active: '01-active',
    done: '99-done',
    suspended: '03-suspended',
    archived: '04-archived',
  },
  adrSubdirs: {
    proposed: '01-proposed',
    accepted: '02-accepted',
    rejected: '03-rejected',
    superseded: '04-superseded',
  },
  // 02-faq and 02-research share prefix 02 — historical numbering drift.
  // Config matches disk; renumbering would break references across ADRs/dailies.
  wikiSubdirs: {
    patterns: '01-patterns',
    faq: '02-faq',
    research: '02-research',
    lessons: '03-lessons',
    ssot: '04-ssot',
    archived: '05-archived',
  },
};

export function loadConfig(): WorkflowConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      const userConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...userConfig };
    } catch {
      console.warn(`⚠️  Config parse failed, using defaults: ${CONFIG_FILE}`);
      console.warn(`   Check JSON syntax in ${CONFIG_FILE}, or delete the file to use defaults.`);
    }
  }
  return DEFAULT_CONFIG;
}
