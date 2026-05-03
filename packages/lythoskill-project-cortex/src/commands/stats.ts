import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type { WorkflowConfig } from '../types.js';
import { generateTimestampId } from '../lib/id.js';

export function showStats(config: WorkflowConfig): void {
  console.log('\n📊 Project Statistics:\n');

  const taskDirs = [
    ['Backlog', join(config.tasksDir, config.taskSubdirs.backlog)],
    ['In Progress', join(config.tasksDir, config.taskSubdirs.inProgress)],
    ['Review', join(config.tasksDir, config.taskSubdirs.review)],
    ['Completed', join(config.tasksDir, config.taskSubdirs.completed)],
    ['Suspended', join(config.tasksDir, config.taskSubdirs.suspended)],
    ['Terminated', join(config.tasksDir, config.taskSubdirs.terminated)],
    ['Archived', join(config.tasksDir, config.taskSubdirs.archived)],
  ];

  console.log('Tasks:');
  for (const [name, dir] of taskDirs) {
    const count = existsSync(dir)
      ? readdirSync(dir).filter(f => f.endsWith('.md') && f.startsWith('TASK-')).length
      : 0;
    console.log(`  ${(name as string).padEnd(15)}: ${count}`);
  }

  const epicDirs = [
    ['Active', join(config.epicsDir, config.epicSubdirs.active)],
    ['Done', join(config.epicsDir, config.epicSubdirs.done)],
    ['Suspended', join(config.epicsDir, config.epicSubdirs.suspended)],
    ['Archived', join(config.epicsDir, config.epicSubdirs.archived)],
  ];

  console.log('\nEpics:');
  for (const [name, dir] of epicDirs) {
    const count = existsSync(dir)
      ? readdirSync(dir).filter(f => f.endsWith('.md') && f.startsWith('EPIC-')).length
      : 0;
    console.log(`  ${(name as string).padEnd(15)}: ${count}`);
  }

  const adrDirs = [
    ['Proposed', join(config.adrDir, config.adrSubdirs.proposed)],
    ['Accepted', join(config.adrDir, config.adrSubdirs.accepted)],
    ['Rejected', join(config.adrDir, config.adrSubdirs.rejected)],
    ['Superseded', join(config.adrDir, config.adrSubdirs.superseded)],
  ];

  console.log('\nADRs:');
  for (const [name, dir] of adrDirs) {
    const count = existsSync(dir)
      ? readdirSync(dir).filter(f => f.endsWith('.md') && f.startsWith('ADR-')).length
      : 0;
    console.log(`  ${(name as string).padEnd(15)}: ${count}`);
  }

  const wikiDirs = [
    ['Patterns', join(config.wikiDir, config.wikiSubdirs.patterns)],
    ['FAQ', join(config.wikiDir, config.wikiSubdirs.faq)],
    ['Lessons', join(config.wikiDir, config.wikiSubdirs.lessons)],
  ];

  console.log('\nWiki:');
  for (const [name, dir] of wikiDirs) {
    const count = existsSync(dir)
      ? readdirSync(dir).filter(f => f.endsWith('.md')).length
      : 0;
    console.log(`  ${(name as string).padEnd(15)}: ${count}`);
  }
}

export function showNextIds(): void {
  console.log('\n📋 Timestamp ID Format:\n');
  console.log(`  Task: ${generateTimestampId('TASK')}`);
  console.log(`  Epic: ${generateTimestampId('EPIC')}`);
  console.log(`  ADR:  ${generateTimestampId('ADR')}`);
  console.log('\n  Format: PREFIX-yyyyMMddHHmmssSSS (17 digits)');
}
