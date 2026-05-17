# TASK-20260518013753710: Add empty-shell detection to probe — grep for PLACEHOLDER/需求1 markers

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| in-progress | 2026-05-17 | Started |
| review | 2026-05-17 | Deliverables committed |
| completed | 2026-05-17 | Done |

## 背景与目标
TASK-20260517193716031 added ⚠️ REQUIRED / PLACEHOLDER markers to templates and mandatory-fill directive to SKILL.md. But probe.ts never checks for these markers — "Empty templates will be REJECTED by pre-commit probe" in SKILL.md line 83 is a false claim. 5 BDD tasks found in 04-completed/ are 100% template (empty shells) and probe said nothing.

This task adds the actual detection. Same class as the original: structural fix, not one-card fill.

Refs: TASK-20260517193716031 (terminated — partial implementation)

## 需求详情
- [ ] Add `DetectEmptyShells` function to probe.ts: scan task/epic/adr files for PLACEHOLDER_ / `需求1` / `<!-- 填写` markers
- [ ] Integrate into `probeStatus()` output — warn per-file with specific unfilled sections
- [ ] Non-blocking (warn only): probe is read-only by design; this follows the same contract
- [ ] Dormancy: well-filled tasks/epics produce 0 empty-shell warnings

## 技术方案
Add to probe.ts:
1. `EMPTY_SHELL_PATTERNS` regex array: `⚠️ PLACEHOLDER_`, `- \[ \] 需求\d`, `<!-- 填写`
2. `checkEmptyShells(files, label)` → for each file, grep for patterns, collect findings
3. Print in probe output as `📭 Empty shells:` section
4. Non-blocking — matches probe's read-only design

Template markers already exist in template.ts (lines 49-62, 157-183). Nothing to change there.

## 验收标准
- [ ] `cortex probe` flags TASK-20260517193950675 (known empty shell) with warning
- [ ] `cortex probe` says 0 empty shells for well-filled tasks (e.g. TASK-20260517121819470)
- [ ] Non-blocking: exit code 0 even with empty shells detected
- [ ] Dormancy: filled tasks produce 0 PLACEHOLDER_ matches

## 关联文件
- 修改: `packages/lythoskill-project-cortex/src/commands/probe.ts`
- 参考: `packages/lythoskill-project-cortex/src/lib/template.ts` (marker definitions)
- 参考: `cortex/tasks/06-terminated/TASK-20260517193716031-*.md` (parent task)

## 备注
Parent TASK-20260517193716031 terminated because it was falsely marked completed and FSM blocks completed→in-progress.
This task covers the remaining probe implementation work.
