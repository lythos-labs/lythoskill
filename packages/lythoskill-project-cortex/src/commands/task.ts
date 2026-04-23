import { join, dirname } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir, generateFileName } from '../lib/fs.js';
import { generateTimestampId } from '../lib/id.js';
import { createTaskTemplate } from '../lib/template.js';
import { writeFileSync } from 'node:fs';

export function createTask(title: string, config: WorkflowConfig): void {
  const id = generateTimestampId('TASK');
  const filename = generateFileName('TASK', id, title);
  const filepath = join(config.tasksDir, config.taskSubdirs.backlog, filename);

  ensureDir(dirname(filepath));

  const template = createTaskTemplate(id, title);
  writeFileSync(filepath, template);

  console.log(`✅ Created: ${filepath}`);
  console.log(`📝 Task ID: ${id}`);
}
