import { existsSync, readFileSync, renameSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir } from '../lib/fs.js';
import { generateIndex, generateWikiIndex } from '../generate-index.js';

const STATUS_DIRS: Record<string, keyof WorkflowConfig['taskSubdirs']> = {
  backlog: 'backlog',
  'in-progress': 'inProgress',
  review: 'review',
  completed: 'completed',
  suspended: 'suspended',
  terminated: 'terminated',
  archived: 'archived',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ['in-progress'],
  'in-progress': ['review', 'suspended'],
  review: ['completed', 'in-progress'],
  suspended: ['in-progress'],
  completed: ['archived'],
};

function findTaskFile(taskId: string, config: WorkflowConfig): { path: string; status: string } | null {
  const searchId = taskId.startsWith('TASK-') ? taskId : `TASK-${taskId}`;

  for (const [status, subdirKey] of Object.entries(STATUS_DIRS)) {
    const dir = join(config.tasksDir, config.taskSubdirs[subdirKey as keyof WorkflowConfig['taskSubdirs']]);
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

export function moveTask(
  taskId: string,
  targetStatus: string,
  config: WorkflowConfig,
  options: { note?: string; allowAny?: boolean } = {}
): void {
  const found = findTaskFile(taskId, config);

  if (!found) {
    console.error(`❌ Task not found: ${taskId}`);
    process.exit(1);
  }

  const currentStatus = found.status;
  const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];

  if (!options.allowAny && !allowedTargets.includes(targetStatus)) {
    console.error(`❌ Invalid transition: ${currentStatus} → ${targetStatus}`);
    console.error(`   Allowed from ${currentStatus}: ${allowedTargets.join(', ') || 'none'}`);
    console.error(`   Use --force to override (not recommended).`);
    process.exit(1);
  }

  const subdirKey = STATUS_DIRS[targetStatus];
  if (!subdirKey) {
    console.error(`❌ Unknown status: ${targetStatus}`);
    process.exit(1);
  }

  const destDir = join(config.tasksDir, config.taskSubdirs[subdirKey]);
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
