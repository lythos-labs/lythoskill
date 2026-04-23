import { join } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { scanFiles } from '../lib/fs.js';

export function listAll(config: WorkflowConfig): void {
  const taskDirs = [
    config.taskSubdirs.backlog,
    config.taskSubdirs.inProgress,
    config.taskSubdirs.review,
    config.taskSubdirs.completed,
    config.taskSubdirs.suspended,
    config.taskSubdirs.terminated,
    config.taskSubdirs.archived,
  ].map(d => join(config.tasksDir, d));

  const tasks = scanFiles(taskDirs, 'TASK');
  console.log('\n📋 Tasks:\n');
  if (tasks.files.length === 0) {
    console.log('  (none)');
  } else {
    tasks.files.sort().forEach(f => {
      const relativePath = f.replace(process.cwd() + '/', '');
      console.log(`  ${relativePath}`);
    });
  }

  const epicDirs = [
    config.epicSubdirs.active,
    config.epicSubdirs.archived,
  ].map(d => join(config.epicsDir, d));

  const epics = scanFiles(epicDirs, 'EPIC');
  console.log('\n📋 Epics:\n');
  if (epics.files.length === 0) {
    console.log('  (none)');
  } else {
    epics.files.sort().forEach(f => {
      const relativePath = f.replace(process.cwd() + '/', '');
      console.log(`  ${relativePath}`);
    });
  }
}
