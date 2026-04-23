import { join, dirname } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir, generateFileName } from '../lib/fs.js';
import { generateTimestampId } from '../lib/id.js';
import { createAdrTemplate } from '../lib/template.js';
import { writeFileSync } from 'node:fs';

export function createAdr(title: string, config: WorkflowConfig): void {
  const id = generateTimestampId('ADR');
  const filename = generateFileName('ADR', id, title);
  const filepath = join(config.adrDir, config.adrSubdirs.proposed, filename);

  ensureDir(dirname(filepath));

  const template = createAdrTemplate(id, title);
  writeFileSync(filepath, template);

  console.log(`✅ Created: ${filepath}`);
  console.log(`🏛️  ADR ID: ${id}`);
}
