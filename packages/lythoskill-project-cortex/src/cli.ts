#!/usr/bin/env bun
/**
 * lythoskill-project-cortex CLI
 * Thin skill router — delegates to command modules.
 */

import { loadConfig } from './config.js';
import { initWorkflow } from './commands/init.js';
import { createTask } from './commands/task.js';
import { createEpic } from './commands/epic.js';
import { createAdr } from './commands/adr.js';
import { listAll } from './commands/list.js';
import { showStats, showNextIds } from './commands/stats.js';
import { probeStatus } from './commands/probe.js';
import { generateIndex, generateWikiIndex } from './generate-index.js';

function printHelp(): void {
  console.log(`📋 lythoskill-project-cortex — Project management CLI

Commands:
  init                  Initialize cortex workflow directories
  task "<title>"        Create a new Task
  epic "<title>"        Create a new Epic
  adr "<title>"         Create a new ADR
  list                  List all tasks and epics
  stats                 Show project statistics
  next-id               Display timestamp ID format example
  index                 Generate INDEX.md and wiki/INDEX.md
  index wiki            Generate wiki/INDEX.md only
  probe                 Check status consistency (dir vs Status History)

Examples:
  lythoskill-project-cortex init
  lythoskill-project-cortex task "Fix login bug"
  lythoskill-project-cortex epic "User auth system"`);
}

function main(): void {
  const config = loadConfig();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'init':
      initWorkflow(config);
      break;

    case 'task':
      if (!arg) {
        console.error('❌ Please provide a task title');
        process.exit(1);
      }
      createTask(arg, config);
      break;

    case 'epic':
      if (!arg) {
        console.error('❌ Please provide an epic title');
        process.exit(1);
      }
      createEpic(arg, config);
      break;

    case 'adr':
      if (!arg) {
        console.error('❌ Please provide an ADR title');
        process.exit(1);
      }
      createAdr(arg, config);
      break;

    case 'list':
      listAll(config);
      break;

    case 'stats':
      showStats(config);
      break;

    case 'next-id':
      showNextIds();
      break;

    case 'index':
      if (arg === 'wiki') {
        generateWikiIndex(config);
      } else {
        generateIndex(config);
        generateWikiIndex(config);
      }
      break;

    case 'probe':
      probeStatus(config);
      break;

    case '--help':
    case '-h':
    default:
      printHelp();
      if (command !== '--help' && command !== '-h') process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
