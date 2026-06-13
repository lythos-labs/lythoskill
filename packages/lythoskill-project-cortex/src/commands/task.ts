import { join, dirname } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir, generateFileName, hasNonAsciiSlug } from '../lib/fs.js';
import { generateTimestampId } from '../lib/id.js';
import { createTaskTemplate } from '../lib/template.js';
import { writeFileSync } from 'node:fs';

export function createTask(title: string, config: WorkflowConfig): void {
  if (hasNonAsciiSlug(title)) {
    console.error('❌ Task title contains non-ASCII characters.');
    console.error('   cortex task/epic filenames (slugs) must be ASCII-only for cross-agent portability.');
    console.error('   Please provide an English title.');
    process.exit(1);
  }

  const id = generateTimestampId('TASK');
  const filename = generateFileName('TASK', id, title);
  const filepath = join(config.tasksDir, config.taskSubdirs.backlog, filename);

  ensureDir(dirname(filepath));

  const template = createTaskTemplate(id, title);
  writeFileSync(filepath, template);

  console.log(`✅ Step 1/3: CLI created → ${filepath}`);
  console.log(`📝 Task ID: ${id}`);
  console.log(`🔄 Step 2/3: YOUR TURN — edit the file, fill these sections:`);
  console.log(`   背景与目标 / 需求详情 / 技术方案 / 验收标准`);
  console.log(`⏳ Step 3/3: Verify with 'cortex probe' before commit`);
}
