import { existsSync, readFileSync, renameSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir } from '../lib/fs.js';
import { generateIndex, generateWikiIndex } from '../generate-index.js';

function findTaskFile(taskId: string, config: WorkflowConfig): string | null {
  const dirs = [
    join(config.tasksDir, config.taskSubdirs.backlog),
    join(config.tasksDir, config.taskSubdirs.inProgress),
    join(config.tasksDir, config.taskSubdirs.review),
    join(config.tasksDir, config.taskSubdirs.completed),
    join(config.tasksDir, config.taskSubdirs.suspended),
    join(config.tasksDir, config.taskSubdirs.terminated),
    join(config.tasksDir, config.taskSubdirs.archived),
  ];

  const pattern = new RegExp(`TASK-\\d{17}`);
  const searchId = taskId.startsWith('TASK-') ? taskId : `TASK-${taskId}`;

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && entry.name.endsWith('.md') && pattern.test(entry.name)) {
        if (entry.name.includes(searchId)) {
          return join(dir, entry.name);
        }
      }
    }
  }
  return null;
}

function appendStatusHistory(content: string, status: string, note: string): string {
  const today = new Date().toISOString().split('T')[0];
  const newLine = `| ${status} | ${today} | ${note} |`;

  // Find the Status History table and append to the last data row
  const sectionMatch = content.match(/(##\s+Status\s+History\s*\n[\s\S]*?)(\n##\s+|\n#{1,2}\s|$)/i);
  if (!sectionMatch) {
    // Fallback: append at end if no Status History section found
    return content + `\n\n| ${status} | ${today} | ${note} |\n`;
  }

  const section = sectionMatch[1];
  const rest = sectionMatch[2] || '';

  // Find the last table row that starts with | and is not a separator
  const lines = section.split('\n');
  let lastTableRow = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      if (/^\|[-\s|]+\|$/.test(line)) continue; // skip separator
      lastTableRow = i;
      break;
    }
  }

  if (lastTableRow === -1) {
    // No data rows found, append after header
    return content.replace(section, section + '\n' + newLine);
  }

  lines.splice(lastTableRow + 1, 0, newLine);
  const newSection = lines.join('\n');
  return content.replace(section, newSection);
}

export function markTaskDone(taskId: string, config: WorkflowConfig): void {
  const filePath = findTaskFile(taskId, config);

  if (!filePath) {
    console.error(`❌ Task not found: ${taskId}`);
    console.error('   Searched in all task status directories.');
    process.exit(1);
  }

  const reviewDir = join(config.tasksDir, config.taskSubdirs.review);
  if (!filePath.includes(reviewDir)) {
    console.error(`❌ Task is not in review status: ${taskId}`);
    console.error(`   Current path: ${filePath}`);
    console.error('   done can only be used for tasks in 03-review/.\n');
    console.error('   Normal flow: backlog → in-progress → review → done → completed');
    console.error('   Use mv + Status History update to move between other states.');
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const updatedContent = appendStatusHistory(content, 'completed', 'Done');

  const destDir = join(config.tasksDir, config.taskSubdirs.completed);
  const destPath = join(destDir, basename(filePath));

  ensureDir(destDir);
  writeFileSync(filePath, updatedContent);
  renameSync(filePath, destPath);

  console.log(`✅ Marked as completed: ${destPath}`);

  // Regenerate indexes
  generateIndex(config);
  generateWikiIndex(config);
  console.log('📝 Regenerated INDEX.md and wiki/INDEX.md');
}
