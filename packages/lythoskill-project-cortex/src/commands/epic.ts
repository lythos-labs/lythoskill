import { join, dirname } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir, generateFileName } from '../lib/fs.js';
import { generateTimestampId } from '../lib/id.js';
import { createEpicTemplate } from '../lib/template.js';
import { writeFileSync } from 'node:fs';

export function createEpic(title: string, config: WorkflowConfig): void {
  const id = generateTimestampId('EPIC');
  const filename = generateFileName('EPIC', id, title);
  const filepath = join(config.epicsDir, config.epicSubdirs.active, filename);

  ensureDir(dirname(filepath));

  const template = createEpicTemplate(id, title);
  writeFileSync(filepath, template);

  console.log(`✅ Created: ${filepath}`);
  console.log(`📋 Epic ID: ${id}`);
}
