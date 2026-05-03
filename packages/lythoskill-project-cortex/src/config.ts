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
    done: '02-done',
    suspended: '03-suspended',
    archived: '04-archived',
  },
  adrSubdirs: {
    proposed: '01-proposed',
    accepted: '02-accepted',
    rejected: '03-rejected',
    superseded: '04-superseded',
  },
  wikiSubdirs: {
    patterns: '01-patterns',
    faq: '02-faq',
    lessons: '03-lessons',
  },
};

export function loadConfig(): WorkflowConfig {
  if (existsSync(CONFIG_FILE)) {
    try {
      const userConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...userConfig };
    } catch {
      console.warn(`⚠️  Config parse failed, using defaults: ${CONFIG_FILE}`);
    }
  }
  return DEFAULT_CONFIG;
}
