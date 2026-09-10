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
  console.log(``);
  console.log(`🎯 This is the decision's home — good. It does NOT belong in a task card.`);
  console.log(`   Two things get skipped here, and each one voids the record:`);
  console.log(`   · OPTIONS — compare at least two, including the one you REJECTED.`);
  console.log(`     "Why not X" is as valuable as "why Y" — an unrecorded rejection`);
  console.log(`     gets re-proposed by the next agent (ADR-20260508230803515).`);
  console.log(`   · CRITERIA — if you cite a score, grade, gate, or severity, define`);
  console.log(`     its criteria in THIS document. An undefined scale cannot be`);
  console.log(`     disagreed with, which is the opposite of what a record is for.`);
  console.log(`   Then reference this ADR from the task card. The card may point here;`);
  console.log(`   the card's Technical Approach must never be the only record.`);
  console.log(``);
  console.log(`   After you complete Step 2, continue to:`);
  console.log(`⏳ Step 3/3: Verify with 'cortex probe' before commit`);
}
