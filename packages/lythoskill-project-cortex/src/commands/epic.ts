import { join, dirname } from 'node:path';
import { writeFileSync } from 'node:fs';
import type { WorkflowConfig } from '../types.js';
import { ensureDir, generateFileName } from '../lib/fs.js';
import { generateTimestampId } from '../lib/id.js';
import { createEpicTemplate, type EpicTemplateOptions } from '../lib/template.js';
import { listActiveEpics, countByLane, type Lane } from '../lib/lane.js';
import { runChecklist, isTTY } from '../lib/checklist.js';

export interface CreateEpicOptions {
  lane?: string;            // raw, validated below
  override?: string;        // reason for bypassing lane-full guard
  skipChecklist?: string;   // reason for skipping checklist
}

export async function createEpic(
  title: string,
  config: WorkflowConfig,
  options: CreateEpicOptions = {}
): Promise<void> {
  // 1. Validate lane (required).
  const lane = options.lane;
  if (lane !== 'main' && lane !== 'emergency') {
    console.error('❌ Missing or invalid --lane. Required: --lane main | emergency');
    console.error('   main      = current iteration focus (max 1 active)');
    console.error('   emergency = unavoidable urgent insert (max 1 active)');
    process.exit(1);
  }

  // 2. Lane-full check (hard gate, --override bypasses).
  const active = listActiveEpics(config);
  const counts = countByLane(active);
  const occupancy = lane === 'main' ? counts.main : counts.emergency;
  if (occupancy >= 1 && !options.override) {
    console.error(`❌ Lane "${lane}" is full (${occupancy} active epic(s)). Cannot create another.`);
    console.error('   Choose one of:');
    console.error('     1. Mark the existing epic done:    cortex epic done <EPIC-ID>');
    console.error('     2. Suspend the existing epic:      cortex epic suspend <EPIC-ID>');
    console.error('     3. Archive the existing epic:      git mv ... cortex/epics/04-archived/');
    console.error('     4. Reclassify as a task on the existing epic (no new epic).');
    console.error('   Or, if this is unavoidable, retry with:');
    console.error('     --override "<reason>"');
    console.error('\n   Active epics in this lane:');
    for (const e of active) {
      if (e.lane === lane) console.error(`     - ${e.file}`);
    }
    process.exit(1);
  }

  // 3. Checklist (soft gate). --skip-checklist bypasses with reason.
  let checklistCompleted = false;
  let checklistSkippedReason: string | undefined;

  if (options.skipChecklist !== undefined) {
    checklistSkippedReason = options.skipChecklist || '(no reason given)';
    console.log(`⚠️  Skipping checklist: ${checklistSkippedReason}`);
  } else if (!isTTY()) {
    console.error('❌ Checklist requires an interactive TTY.');
    console.error('   In non-interactive contexts, pass: --skip-checklist "<reason>"');
    process.exit(1);
  } else {
    const result = await runChecklist();
    if (result.completed) {
      checklistCompleted = true;
      console.log('✅ Checklist passed.');
    } else {
      console.error(`❌ Checklist not passed (${result.failedQuestion}).`);
      console.error('   Reconsider whether this is an epic, a task, or an ADR.');
      console.error('   To bypass anyway, retry with --skip-checklist "<reason>".');
      process.exit(1);
    }
  }

  // 4. Render and write.
  const id = generateTimestampId('EPIC');
  const filename = generateFileName('EPIC', id, title);
  const filepath = join(config.epicsDir, config.epicSubdirs.active, filename);

  ensureDir(dirname(filepath));

  const templateOptions: EpicTemplateOptions = {
    lane: lane as Lane,
    checklistCompleted,
    checklistSkippedReason,
    laneOverrideReason: options.override,
  };
  const content = createEpicTemplate(id, title, templateOptions);
  writeFileSync(filepath, content);

  console.log(`✅ Created: ${filepath}`);
  console.log(`📋 Epic ID: ${id}`);
  console.log(`   Lane:    ${lane}`);
  if (options.override) console.log(`   Override: ${options.override}`);
  if (checklistSkippedReason) console.log(`   Checklist: skipped — ${checklistSkippedReason}`);
}
