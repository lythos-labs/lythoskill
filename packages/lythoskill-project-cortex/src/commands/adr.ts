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

  console.log(`✅ Step 1/3: CLI created → ${filepath}`);
  console.log(`🏛️  ADR ID: ${id}`);
  console.log(`🔄 Step 2/3: YOUR TURN — edit the file, fill these sections:`);
  console.log(`   背景 / 决策驱动 / 选项(≥2) / 决策 / 影响`);
  console.log(`   After you complete Step 2, continue to:`);
  console.log(`⏳ Step 3/3: Verify with 'cortex probe' before commit`);
}
