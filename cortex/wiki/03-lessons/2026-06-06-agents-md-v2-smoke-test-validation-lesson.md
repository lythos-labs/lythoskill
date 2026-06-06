# AGENTS.md v2 Smoke Test Validation

**Date**: 2026-06-06  
**Branch**: `smoke/agents-md-v2-20260606` (disposable)  
**Validated by**: Zero-knowledge Claude Sonnet subagents × 2  
**Tags**: `agents-md`, `bios-layer`, `zk-review`, `cortex-governance`, `smoke-test`

## Hypothesis

AGENTS.md v2 changes (Boot First lift, grouped gotchas with "when you'll forget", source-path clarity, full-command Daily Rhythm) should enable a zero-knowledge agent to:

1. Self-boot without asking questions.
2. Discover active anomalies — both injected and natural.
3. Close a stale task using cortex CLI governance rather than manual `mv`.

## Methodology

### Anomalies Injected

| # | Anomaly | Location | Expected Detection Mechanism |
|---|---|---|---|
| A1 | Stale task left in `02-in-progress` with all requirements checked | `cortex/tasks/02-in-progress/TASK-20260606120000000-...` | `cortex probe` + visual inspection of Status History |
| A2 | README typo | `packages/lythoskill-deck/README.md` line 5: "Declrative" | Reading + "see a bug, fix a bug" |
| A3 | Bare-name locator violating FQ-only policy | `examples/decks/smoke-invalid-bare-name.toml` | AGENTS.md §6 Deck Governance |

### Agent Dispatch

**Subagent 1 — Discovery only**
- Prompt: follow Boot First exactly, then explore for anomalies. Do not fix.
- Model: Claude Sonnet 4.6

**Subagent 2 — Fix + governance**
- Prompt: read AGENTS.md, fix the discovered issues, close the stale task via cortex CLI, follow Full Submit Pipeline.
- Model: Claude Sonnet 4.6

## Results

### Subagent 1: Discovery

Executed Boot First commands in order:

```
bun install
bun packages/lythoskill-deck/src/cli.ts link
cat daily/2026-06-06.md
git status && git log --oneline -5
bun packages/lythoskill-project-cortex/src/cli.ts probe
```

All commands succeeded. `.claude/skills/` populated with 14 skills. Tests passed (0 failures).

**Findings:**

| # | Finding | Type | Injected? |
|---|---|---|---|
| 1 | Stale in-progress task with completed requirements | Task governance | ✅ A1 |
| 2 | "Declrative" typo in published README | Doc quality | ✅ A2 |
| 3 | `smoke-invalid-bare-name.toml` uses bare-name locator | Deck policy | ✅ A3 |
| 4 | `skill-deck.lock` drift after `deck link` | Derived-state hygiene | — natural |
| 5 | `drafts/AGENTS-v2-draft.md` + `AGENTS.md.bak.20260606-220608` still present | Temp artifact debt | — natural |
| 6 | `daily/2026-06-06.md` Ground Truth stale vs current branch/HEAD | Handoff freshness | — natural |

**Discipline observed**: agent did not fix without approval, quoted AGENTS.md rules, and cited specific file paths + evidence.

### Subagent 2: Closing + Governance

Actions taken:

1. `bun packages/lythoskill-project-cortex/src/cli.ts review TASK-20260606120000000` → moved task from `02-in-progress/` to `04-completed/`.
2. Edited `packages/lythoskill-deck/README.md` → restored "Declarative".
3. `rm examples/decks/smoke-invalid-bare-name.toml` → removed smoke fixture.
4. `git rm drafts/AGENTS-v2-draft.md AGENTS.md.bak.20260606-220608` → cleaned temp artifacts.
5. `git checkout HEAD -- skill-deck.lock` → reverted derived drift (no declarative change).
6. `bun --filter='*' run test` → all pass.
7. Commit with trailer:
   ```
   chore(smoke): close stale task, fix README typo, clean temp artifacts
   
   Closes: TASK-20260606120000000
   ```
8. Push to `origin/smoke/agents-md-v2-20260606`.
9. Final `cortex probe --suspicious` → clean.

**Discipline observed**:
- Used cortex CLI for task state change; no manual `mv`.
- Applied "see a bug, fix a bug" to temp artifacts.
- Used `Closes:` trailer correctly.
- Left 3 pre-existing historical data-quality issues alone because they were out of scope.

## Key Findings

### What worked

1. **Boot First at the top of Z1 eliminates the "what do I do first?" ambiguity.** Subagent executed the five steps mechanically without questions.
2. **"When you'll forget" framing in Critical Gotchas surfaces the trigger condition, not just the rule.** Subagent identified reconciler drift because the `[RECONCILE]` gotcha explicitly names the failure moment: "After you `git checkout HEAD --` a declarative file and think you're done."
3. **FQ-only policy in §6 is discoverable.** Subagent flagged the bare-name locator immediately.
4. **Full commands in Boot phase prevent alias failures.** Earlier iteration used `deck link` / `cortex probe` shorthand; subagent feedback showed this breaks on fresh environments. Switching to `bun packages/<name>/src/cli.ts <cmd>` made the sequence executable.

### What surfaced as real debt

- `skill-deck.lock` is a derived artifact that refreshes silently on `deck link`. The current daily handoff does not account for this drift.
- Temp artifacts from the AGENTS.md v2 refactor were still present after the task was moved to completed.
- Three historical completed tasks have inconsistent Status History (last record is `backlog` despite being in `04-completed/`). These pre-date the smoke test and were correctly left alone.

## Follow-ups

1. **Update daily/ Ground Truth after smoke branch work.** The 2026-06-06 daily currently claims HEAD = `1170d99` / branch = main / clean tree. This was true when written but is now stale.
2. **Document smoke-test fixture pattern.** The injected-anomaly approach (stale task + doc typo + policy violation) is reusable for future BIOS-layer changes. Consider formalizing as a reference deck or reproducible script under `showcase/`.
3. **Historical task status audit.** The 3 pre-existing tasks with mismatched Status History should be triaged in a separate task; do not mix with AGENTS.md v2 work.

## Conclusion

AGENTS.md v2 passes the smoke test. A zero-knowledge agent can boot from the doc, discover anomalies, and close a task using cortex governance without manual filesystem manipulation. The BIOS-layer redesign is operationally valid.
