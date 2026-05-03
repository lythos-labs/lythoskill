import { existsSync, readFileSync, renameSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir } from '../lib/fs.js';
import { generateIndex, generateWikiIndex } from '../generate-index.js';

// ---------------------------------------------------------------------------
// Status / directory mapping per doc kind
// ---------------------------------------------------------------------------

const TASK_STATUS_DIRS: Record<string, keyof WorkflowConfig['taskSubdirs']> = {
  backlog: 'backlog',
  'in-progress': 'inProgress',
  review: 'review',
  completed: 'completed',
  suspended: 'suspended',
  terminated: 'terminated',
  archived: 'archived',
};

const TASK_VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ['in-progress'],
  'in-progress': ['review', 'suspended'],
  review: ['completed', 'in-progress'],
  suspended: ['in-progress'],
  completed: ['archived'],
};

const ADR_STATUS_DIRS: Record<string, keyof WorkflowConfig['adrSubdirs']> = {
  proposed: 'proposed',
  accepted: 'accepted',
  rejected: 'rejected',
  superseded: 'superseded',
};

// ADR is a one-way commit from proposed; once decided we don't auto-revert.
const ADR_VALID_TRANSITIONS: Record<string, string[]> = {
  proposed: ['accepted', 'rejected', 'superseded'],
  accepted: ['superseded'],
  rejected: [],
  superseded: [],
};

const EPIC_STATUS_DIRS: Record<string, keyof WorkflowConfig['epicSubdirs']> = {
  active: 'active',
  done: 'done',
  suspended: 'suspended',
  archived: 'archived',
};

const EPIC_VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['done', 'suspended'],
  suspended: ['active'],
  done: ['archived'],
  archived: [],
};

interface DocKindConfig {
  prefix: string;
  baseDir: (config: WorkflowConfig) => string;
  subdirs: (config: WorkflowConfig) => Record<string, string>;
  statusDirs: Record<string, string>;
  validTransitions: Record<string, string[]>;
  label: string;
}

const TASK_KIND: DocKindConfig = {
  prefix: 'TASK-',
  baseDir: c => c.tasksDir,
  subdirs: c => c.taskSubdirs,
  statusDirs: TASK_STATUS_DIRS,
  validTransitions: TASK_VALID_TRANSITIONS,
  label: 'Task',
};

const ADR_KIND: DocKindConfig = {
  prefix: 'ADR-',
  baseDir: c => c.adrDir,
  subdirs: c => c.adrSubdirs,
  statusDirs: ADR_STATUS_DIRS,
  validTransitions: ADR_VALID_TRANSITIONS,
  label: 'ADR',
};

const EPIC_KIND: DocKindConfig = {
  prefix: 'EPIC-',
  baseDir: c => c.epicsDir,
  subdirs: c => c.epicSubdirs,
  statusDirs: EPIC_STATUS_DIRS,
  validTransitions: EPIC_VALID_TRANSITIONS,
  label: 'Epic',
};

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function findDocFile(
  docId: string,
  config: WorkflowConfig,
  kind: DocKindConfig
): { path: string; status: string } | null {
  const searchId = docId.startsWith(kind.prefix) ? docId : `${kind.prefix}${docId}`;
  const subdirs = kind.subdirs(config);
  const baseDir = kind.baseDir(config);

  for (const [status, subdirKey] of Object.entries(kind.statusDirs)) {
    const subdirName = subdirs[subdirKey as keyof typeof subdirs];
    if (!subdirName) continue;
    const dir = join(baseDir, subdirName);
    if (!existsSync(dir)) continue;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.endsWith('.md') && entry.name.includes(searchId)) {
        return { path: join(dir, entry.name), status };
      }
    }
  }
  return null;
}

function appendStatusHistory(content: string, status: string, note: string): string {
  const today = new Date().toISOString().split('T')[0];
  const newLine = `| ${status} | ${today} | ${note} |`;

  const sectionMatch = content.match(/(##\s+Status\s+History\s*\n[\s\S]*?)(\n##\s+|\n#{1,2}\s|$)/i);
  if (!sectionMatch) {
    return content + `\n\n| ${status} | ${today} | ${note} |\n`;
  }

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

  if (lastTableRow === -1) {
    return content.replace(section, section + '\n' + newLine);
  }

  lines.splice(lastTableRow + 1, 0, newLine);
  const newSection = lines.join('\n');
  return content.replace(section, newSection);
}

interface MoveOptions {
  note?: string;
  allowAny?: boolean;
}

function moveDoc(
  docId: string,
  targetStatus: string,
  config: WorkflowConfig,
  kind: DocKindConfig,
  options: MoveOptions = {}
): void {
  const found = findDocFile(docId, config, kind);

  if (!found) {
    console.error(`❌ ${kind.label} not found: ${docId}`);
    process.exit(1);
  }

  const currentStatus = found.status;

  if (currentStatus === targetStatus) {
    console.log(`ℹ️  ${kind.label} ${docId} is already in "${currentStatus}" — no-op.`);
    return;
  }

  const allowedTargets = kind.validTransitions[currentStatus] || [];

  if (!options.allowAny && !allowedTargets.includes(targetStatus)) {
    console.error(`❌ Invalid transition: ${currentStatus} → ${targetStatus}`);
    console.error(`   Allowed from ${currentStatus}: ${allowedTargets.join(', ') || 'none'}`);
    console.error(`   Use --force to override (not recommended).`);
    process.exit(1);
  }

  const subdirKey = kind.statusDirs[targetStatus];
  if (!subdirKey) {
    console.error(`❌ Unknown ${kind.label.toLowerCase()} status: ${targetStatus}`);
    process.exit(1);
  }

  const subdirs = kind.subdirs(config) as Record<string, string>;
  const subdirName = subdirs[subdirKey];
  if (!subdirName) {
    console.error(`❌ Config missing subdir for ${kind.label.toLowerCase()} status: ${targetStatus}`);
    process.exit(1);
  }

  const destDir = join(kind.baseDir(config), subdirName);
  const destPath = join(destDir, basename(found.path));

  const content = readFileSync(found.path, 'utf-8');
  const note = options.note || targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1);
  const updatedContent = appendStatusHistory(content, targetStatus, note);

  ensureDir(destDir);
  writeFileSync(found.path, updatedContent);
  renameSync(found.path, destPath);

  console.log(`✅ Moved: ${currentStatus} → ${targetStatus}`);
  console.log(`   ${destPath}`);

  generateIndex(config);
  generateWikiIndex(config);
  console.log('📝 Regenerated INDEX.md and wiki/INDEX.md');
}

// ---------------------------------------------------------------------------
// Public per-kind helpers
// ---------------------------------------------------------------------------

export function moveTask(
  taskId: string,
  targetStatus: string,
  config: WorkflowConfig,
  options: MoveOptions = {}
): void {
  moveDoc(taskId, targetStatus, config, TASK_KIND, options);
}

export function moveAdr(
  adrId: string,
  targetStatus: string,
  config: WorkflowConfig,
  options: MoveOptions = {}
): void {
  moveDoc(adrId, targetStatus, config, ADR_KIND, options);
}

export function moveEpic(
  epicId: string,
  targetStatus: string,
  config: WorkflowConfig,
  options: MoveOptions = {}
): void {
  moveDoc(epicId, targetStatus, config, EPIC_KIND, options);
}
