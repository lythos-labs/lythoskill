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

  console.log(`✅ Step 1/3: ADR file created → ${filepath}`);
  console.log(`🏛️  ADR ID: ${id}`);
  console.log(`🔄 Step 2/3 NOW: Edit the file to fill ALL sections`);
  console.log(`   Required: 背景 / 决策驱动 / 选项(≥2) / 决策 / 影响`);
  console.log(`   Empty placeholders will be REJECTED by pre-commit probe.`);
  console.log(`⏳ Step 3/3 LATER: Run 'cortex probe' before commit to verify`);
}
