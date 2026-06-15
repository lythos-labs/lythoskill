#!/usr/bin/env bun
/**
 * lythoskill-project-cortex CLI
 * Thin skill router — delegates to command modules.
 */

import { readdirSync } from 'node:fs';
import { loadConfig } from './config.js';
import { initWorkflow } from './commands/init.js';
import { createTask } from './commands/task.js';
import { createEpic } from './commands/epic.js';
import { createAdr } from './commands/adr.js';
import { listAll } from './commands/list.js';
import { showStats, showNextIds } from './commands/stats.js';
import { probeStatus } from './commands/probe.js';
import { showFlow } from './commands/flow.js';
import { moveTask, moveAdr, moveEpic } from './commands/move.js';
import { generateIndex, generateWikiIndex } from './generate-index.js';
import { createWiki } from './commands/wiki.js';
import {
  findLinkedEpic,
  checkEpicAdrCompletion,
} from './lib/coupling.js';

function printHelp(): void {
  console.log(`📋 lythoskill-project-cortex — Project management CLI

Commands:
  init                  Initialize cortex workflow directories
  task "<title>"        Create a new Task
  task create "<title>"  Create a new Task (explicit)
  task <verb> <task-id>  Task state transition (start/review/done/complete/suspend/resume/reject/terminate/archive)
  epic "<title>" --lane main|emergency [--override "<r>"] [--skip-checklist "<r>"]
                        Create a new Epic. --lane is required.
                        --override bypasses the lane-full guard (max 1 per lane).
                        --skip-checklist bypasses the 5-question prompt.
  adr "<title>"         Create a new ADR
  list                  List all tasks and epics
  stats                 Show project statistics
  next-id               Display timestamp ID format example
  index                 Generate INDEX.md and wiki/INDEX.md
  index wiki            Generate wiki/INDEX.md only
  wiki "<title>"        Create a new Wiki entry [--category pattern|faq|lesson]
  probe                 Check status consistency (dir vs Status History)
                        --suspicious   Only report suspicious patterns (empty shells, stale, drift)
                        --include-completed-empty-shells  Include empty shells in completed/terminal dirs
  flow                  Show kanban CFD — count, avg age, WIP limits
  dispatch-trailers     Parse last commit for trailers and dispatch follow-up (used by post-commit hook)

Task state machine:
  task start <task-id>       Move task to in-progress
  task review <task-id>      Move task to review
  task done <task-id>        Move task to completed (must be in review)
  task complete <task-id>    Move task to completed (any status; trailer-driven close)
  task suspend <task-id>     Move task to suspended
  task resume <task-id>      Move suspended task back to in-progress
  task reject <task-id>      Move reviewed task back to in-progress (re-work)
  task terminate <task-id>   Move task to terminated (any status)
  task archive <task-id>     Move completed task to archived

  (Legacy aliases also work: start, review, done, complete, suspend, resume, reject, terminate, archive)

ADR state machine:
  adr accept <adr-id>                  Move ADR to accepted
  adr reject <adr-id>                  Move ADR to rejected
  adr supersede <adr-id> [--by <new-id>]  Move ADR to superseded

Epic state machine:
  epic done <epic-id>     Move epic to done
  epic suspend <epic-id>  Move epic to suspended
  epic resume <epic-id>   Move suspended epic back to active

Examples:
  lythoskill-project-cortex init
  lythoskill-project-cortex task "Fix login bug"
  lythoskill-project-cortex epic "User auth system"
  lythoskill-project-cortex adr accept ADR-20260502234833756
  lythoskill-project-cortex epic done EPIC-20260503010218940`);
}

function parseFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

/** True when a flag is present (regardless of value). Used for `--skip-checklist` with optional reason. */
function hasFlag(args: string[], name: string): boolean {
  return args.indexOf(name) !== -1;
}

/**
 * Validate a required TASK / EPIC / ADR id arg. If missing, emit a HATEOAS-style
 * error (problem + Usage + concrete Example + pointer to `cortex list`) and exit.
 *
 * Optional `hint` is appended for cases where two transition verbs share an ID
 * shape but differ in semantics (e.g. `done` requires review while `complete`
 * accepts any status).
 */
function requireDocId(
  arg: string | undefined,
  command: string,
  kind: 'TASK' | 'EPIC' | 'ADR',
  hint?: string,
): string {
  if (arg) return arg;
  const idLabel = `${kind}-ID`;
  const exampleId = `${kind}-20260509121724330`;
  console.error(`❌ ${idLabel} required for "${command}".

   Usage:    bunx @lythos/project-cortex ${command} <${idLabel}>
   Example:  bunx @lythos/project-cortex ${command} ${exampleId}

   To list existing items:  bunx @lythos/project-cortex list${hint ? `\n\n   Note: ${hint}` : ''}`);
  process.exit(1);
}

function handleTaskTransition(
  verb: string,
  taskId: string,
  config: WorkflowConfig,
): void {
  switch (verb) {
    case 'start':
      moveTask(taskId, 'in-progress', config, { note: 'Started' });
      break;
    case 'review':
      moveTask(taskId, 'review', config, { note: 'Deliverables committed' });
      break;
    case 'done':
      moveTask(
        taskId,
        'completed', config,
        { note: 'Done' },
      );
      break;
    case 'complete':
      moveTask(
        taskId,
        'completed', config,
        { allowAny: true, note: 'Closed via trailer' },
      );
      break;
    case 'suspend':
      moveTask(taskId, 'suspended', config, { note: 'Blocked' });
      break;
    case 'resume':
      moveTask(taskId, 'in-progress', config, { note: 'Resumed' });
      break;
    case 'reject':
      moveTask(taskId, 'in-progress', config, { note: 'Re-work required' });
      break;
    case 'terminate':
      moveTask(taskId, 'terminated', config, { allowAny: true, note: 'Terminated' });
      break;
    case 'archive':
      moveTask(taskId, 'archived', config, { allowAny: true, note: 'Archived' });
      break;
    default:
      console.error(`❌ Unknown task verb: ${verb}

   Supported verbs: start, review, done, complete, suspend, resume, reject, terminate, archive
   Example: bunx @lythos/project-cortex task review TASK-20260509121724330`);
      process.exit(1);
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const command = process.argv[2];
  const arg = process.argv[3];
  const restArgs = process.argv.slice(4);
  const allFlags = process.argv.slice(3);

  // --help anywhere in the arg list triggers help (not treated as a positional arg)
  if (allFlags.includes('--help') || allFlags.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'init':
      initWorkflow(config);
      break;

    case 'task': {
      const TASK_VERBS = ['start', 'review', 'done', 'complete', 'suspend', 'resume', 'reject', 'terminate', 'archive', 'create'];
      // Subcommand form: `task <verb> <TASK-ID>` (state transition)
      if (arg && TASK_VERBS.includes(arg) && arg !== 'create') {
        const taskId = requireDocId(restArgs[0], `task ${arg}`, 'TASK',
          arg === 'done' ? "'done' enforces review → completed. For trailer-driven any-status close, use 'complete'." :
          arg === 'complete' ? "'complete' allows any current status (trailer-driven). Use 'done' for strict review → completed." :
          undefined
        );
        handleTaskTransition(arg, taskId, config);
        break;
      }
      // Create form: `task create "<title>"` or `task "<title>"` (legacy)
      let title: string;
      if (arg === 'create' && restArgs[0]) {
        title = restArgs[0];
      } else if (arg) {
        title = arg;
      } else {
        console.error(`❌ Task title or subcommand required.

   Create:    bunx @lythos/project-cortex task "<title>"
             bunx @lythos/project-cortex task create "<title>"
   Transition: bunx @lythos/project-cortex task <verb> <TASK-ID>
               (verbs: start, review, done, complete, suspend, resume, reject, terminate, archive)
   Example:    bunx @lythos/project-cortex task "Fix login redirect bug"

   The title becomes the kebab-cased filename suffix; the new task lands
   in cortex/tasks/01-backlog/. To list existing tasks:
     bunx @lythos/project-cortex list`);
        process.exit(1);
      }
      createTask(title, config);
      break;
    }

    case 'epic': {
      if (!arg) {
        console.error(`❌ Epic title or subcommand required.

   Create:    bunx @lythos/project-cortex epic "<title>" --lane main|emergency
   Example:   bunx @lythos/project-cortex epic "User auth system" --lane main

   Subcommands (state machine):
     epic done <EPIC-ID>     Move epic to done
     epic suspend <EPIC-ID>  Move epic to suspended
     epic resume <EPIC-ID>   Move suspended epic back to active

   To list existing epics:    bunx @lythos/project-cortex list`);
        process.exit(1);
      }
      // Subcommand form: `epic <verb> <EPIC-ID>`
      if (arg === 'done' || arg === 'suspend' || arg === 'resume') {
        const epicId = requireDocId(restArgs[0], `epic ${arg}`, 'EPIC');
        if (arg === 'done') {
          moveEpic(epicId, 'done', config, { note: 'Done' });
        } else if (arg === 'suspend') {
          moveEpic(epicId, 'suspended', config, { note: 'Suspended' });
        } else {
          moveEpic(epicId, 'active', config, { note: 'Resumed' });
        }
        break;
      }
      // Title form: create new epic.
      // allFlags == process.argv.slice(3); arg (the title) is allFlags[0],
      // so we look for flags starting at index 1.
      const flagArgs = allFlags.slice(1);
      const lane = parseFlag(flagArgs, '--lane');
      const override = parseFlag(flagArgs, '--override');
      const skipChecklistPresent = hasFlag(flagArgs, '--skip-checklist');
      const skipChecklistReason = parseFlag(flagArgs, '--skip-checklist');
      // If --skip-checklist is followed by another --flag (or nothing), treat reason as ''.
      const skipChecklist = skipChecklistPresent
        ? (skipChecklistReason && !skipChecklistReason.startsWith('--') ? skipChecklistReason : '')
        : undefined;

      // Fire-and-await the async create flow; map any rejection to a non-zero exit.
      createEpic(arg, config, { lane, override, skipChecklist }).catch(err => {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Epic creation failed: ${errMsg}

   Common causes & fixes:
     • Missing --lane: pass --lane main or --lane emergency
     • Lane full (max 1 active per lane): close active epic first
       (bunx @lythos/project-cortex epic done <EPIC-ID>) or pass
       --override "<reason>" to bypass the guard
     • Checklist required (interactive TTY): answer the 5 questions, or
       pass --skip-checklist "<reason>" in non-interactive contexts

   To see existing epics:    bunx @lythos/project-cortex list`);
        process.exit(1);
      });
      break;
    }

    case 'adr': {
      if (!arg) {
        console.error(`❌ ADR title or subcommand required.

   Create:    bunx @lythos/project-cortex adr "<title>"
   Example:   bunx @lythos/project-cortex adr "Lock-step versioning across packages"

   Subcommands (state machine):
     adr accept <ADR-ID>                       Move ADR to accepted
     adr reject <ADR-ID>                       Move ADR to rejected
     adr supersede <ADR-ID> [--by <new-id>]    Move ADR to superseded

   To list existing ADRs:  bunx @lythos/project-cortex list`);
        process.exit(1);
      }
      if (arg === 'accept' || arg === 'reject' || arg === 'supersede') {
        const adrId = requireDocId(restArgs[0], `adr ${arg}`, 'ADR');
        if (arg === 'accept') {
          moveAdr(adrId, 'accepted', config, { note: 'Accepted' });

          // Reverse coupling: check if linked epic's ADRs are all accepted
          const acceptedDir = `${config.adrDir}/${config.adrSubdirs.accepted}`;
          const allAcceptedAdrs = readdirSync(acceptedDir).filter(f => f.startsWith(adrId));
          if (allAcceptedAdrs.length > 0) {
            const adrPath = `${acceptedDir}/${allAcceptedAdrs[0]}`;
            const epicId = findLinkedEpic(adrPath);
            if (epicId) {
              const status = checkEpicAdrCompletion(epicId, {
                proposedAdrDir: `${config.adrDir}/${config.adrSubdirs.proposed}`,
                acceptedAdrDir: acceptedDir,
              });
              if (status.allAccepted) {
                console.log(`🔗 All ${status.total} ADR(s) linked to ${epicId} are now accepted.`);
                console.log(`   Run: bunx @lythos/project-cortex epic done ${epicId}`);
              } else if (status.proposedIds.length > 0) {
                console.log(`🔗 Linked to ${epicId}: ${status.acceptedIds.length}/${status.total} ADRs accepted (${status.proposedIds.length} remaining: ${status.proposedIds.join(', ')})`);
              }
            }
          }
        } else if (arg === 'reject') {
          moveAdr(adrId, 'rejected', config, { note: 'Rejected' });
        } else {
          const by = parseFlag(restArgs.slice(1), '--by');
          const note = by ? `Superseded by ${by}` : 'Superseded';
          moveAdr(adrId, 'superseded', config, { note });
        }
        break;
      }
      createAdr(arg, config);
      break;
    }

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

    case 'wiki':
      if (!arg) {
        console.error(`❌ Wiki title required.

   Usage:     bunx @lythos/project-cortex wiki "<title>" [--category pattern|faq|lesson]
   Example:   bunx @lythos/project-cortex wiki "Dormancy property test" --category pattern

   Categories (default: pattern):
     pattern   Reusable solutions and conventions
     faq       Common questions
     lesson    Retrospectives and post-mortems

   Index: cortex/wiki/INDEX.md is auto-regenerated. To rebuild manually:
     bunx @lythos/project-cortex index wiki`);
        process.exit(1);
      }
      {
        const category = parseFlag(restArgs, '--category') || 'pattern';
        createWiki(arg, config, category);
      }
      break;

    case 'probe':
      probeStatus(config, {
        activeOnly: allFlags.includes('--active-only') || allFlags.includes('--suspicious'),
        includeCompletedEmptyShells: allFlags.includes('--include-completed-empty-shells'),
        suspicious: allFlags.includes('--suspicious'),
      });
      break;

    case 'flow':
      showFlow(config);
      break;

    case 'start':
      handleTaskTransition('start', requireDocId(arg, 'start', 'TASK'), config);
      break;

    case 'review':
      handleTaskTransition('review', requireDocId(arg, 'review', 'TASK'), config);
      break;

    case 'done':
      handleTaskTransition('done', requireDocId(arg, 'done', 'TASK', "'done' enforces review → completed. For trailer-driven any-status close, use 'complete'."), config);
      break;

    case 'complete':
      handleTaskTransition('complete', requireDocId(arg, 'complete', 'TASK', "'complete' allows any current status (trailer-driven). Use 'done' for strict review → completed."), config);
      break;

    case 'suspend':
      handleTaskTransition('suspend', requireDocId(arg, 'suspend', 'TASK'), config);
      break;

    case 'resume':
      handleTaskTransition('resume', requireDocId(arg, 'resume', 'TASK'), config);
      break;

    case 'reject':
      handleTaskTransition('reject', requireDocId(arg, 'reject', 'TASK'), config);
      break;

    case 'terminate':
      handleTaskTransition('terminate', requireDocId(arg, 'terminate', 'TASK'), config);
      break;

    case 'archive':
      handleTaskTransition('archive', requireDocId(arg, 'archive', 'TASK'), config);
      break;

    case 'dispatch-trailers':
      {
        const { dispatchTrailers } = await import('./hooks/dispatch.js')
        const { spawnSync } = await import('node:child_process')
        const msg = spawnSync('git', ['log', '-1', '--format=%B', 'HEAD'], { encoding: 'utf-8' }).stdout || ''
        const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() || ''
        dispatchTrailers(msg, sha, {
          cortexCli: ['bunx', '@lythos/project-cortex'],
        })
      }
      break

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
