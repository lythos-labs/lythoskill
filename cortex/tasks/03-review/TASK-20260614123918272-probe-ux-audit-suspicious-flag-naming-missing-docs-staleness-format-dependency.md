# TASK-20260614123918272: probe UX audit: document flags, fix suspicious naming

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-14 | Created from ZK Review feedback on probe intuitiveness |
| in-progress | 2026-06-14 | Started |
| review | 2026-06-14 | Deliverables committed |

## Background & Goals

ZK Review (agent-9) assessed `cortex probe` at **6/10 intuitiveness**. Two real UX issues were identified:

1. **`--suspicious` not documented in SKILL.md**: The probe skill documentation describes `cortex probe` as a "read-only consistency check" but never mentions `--suspicious` or `--include-completed-empty-shells`. Agents discover these flags only by reading source code.

2. **`--suspicious` name is misleading**: The name suggests "stricter/more paranoid checking" but the actual behavior is "filtered view of active items only + skips status consistency entirely." A new agent expects `suspicious` to find *more* problems, not fewer.

Note: ZK Review also flagged "staleness check format dependency" (table-only regex), but this is a false positive — the project template enforces table-format Status History, so list format does not occur in practice. Not fixing.

## Requirements

- [ ] Document all probe flags (`--suspicious`, `--include-completed-empty-shells`) in SKILL.md
- [ ] Evaluate `--suspicious` flag naming: keep, rename, or add alias
- [ ] **Run `cortex probe` and `cortex probe --suspicious` manually, observe output** — verify the behavior matches what SKILL.md describes
- [ ] Verify ZK Review agent would rate probe higher after fixes

## Technical Approach

### Step 0: Run probe before any changes

```bash
bun packages/lythoskill-project-cortex/src/cli.ts probe
bun packages/lythoskill-project-cortex/src/cli.ts probe --suspicious
bun packages/lythoskill-project-cortex/src/cli.ts probe --include-completed-empty-shells
```

Observe:
- What checks run in each mode?
- What is hidden vs shown?
- Does the output match your expectations from the name?

Record observations in Progress Log. This is the baseline.

### Issue 1: `--suspicious` naming

**Current behavior analysis** (read `probe.ts` lines 331, 344, 559, 610-618, 670-673 to confirm):
- `suspicious: true` → `statusConsistency: false` in plan (skips per-file status checks)
- `suspicious: true` → empty-shell filter mode = `'suspicious'` (only backlog/in-progress/proposed)
- `suspicious: true` → output header changes to "🔎 Probing suspicious patterns only..."
- `suspicious: true` → summary message changes to "✅ No suspicious patterns found."

**Options**:
- **Option A**: Rename `--suspicious` to `--active-only` or `--actionable` — clearer intent
- **Option B**: Keep `--suspicious` but add `--status-only` / `--quick` aliases
- **Option C**: Split into two flags: `--skip-status` + `--active-only` (more granular)
- **Option D**: Keep name, improve documentation to explain the filtering behavior

**Recommendation**: Option A (rename to `--active-only`) because:
- The current name is actively misleading
- "active-only" accurately describes the filtering behavior
- Backward compatibility: keep `--suspicious` as deprecated alias for 1 release cycle

### Issue 2: Missing docs

**SKILL.md gaps** (read `packages/lythoskill-project-cortex/skill/SKILL.md` to find exact insertion point):
- No mention of `--suspicious` flag
- No mention of `--include-completed-empty-shells` flag
- No explanation of what checks probe runs (status, lane, coupling, staleness, empty-shell, coverage drift, non-ASCII slugs)
- No explanation of output format (emoji meanings, suggestion text)

**Fix**: Add a "Probe Flags & Modes" section to SKILL.md after the existing "Consistency probe" section.

### Key File Paths

| Role | Path |
|------|------|
| Flag naming | `packages/lythoskill-project-cortex/src/commands/probe.ts` — `buildProbePlan()`, `probeStatus()` signature |
| CLI arg parsing | `packages/lythoskill-project-cortex/src/cli.ts` — probe command switch |
| SKILL.md docs | `packages/lythoskill-project-cortex/skill/SKILL.md` — add flags section |
| AGENTS.md refs | `AGENTS.md` — grep for "probe" to find all references |

### Scope Boundaries

- **必达**: Document flags in SKILL.md, evaluate `--suspicious` naming, run probe manually
- **可选**: Rename `--suspicious` (executor decides after running probe and reading code; default = rename to `--active-only`)
- **不做**: Change probe's core logic (directory = source of truth, read-only, no auto-fix)
- **不做**: Add new probe checks (out of scope)
- **不做**: Change empty-shell detection logic
- **不做**: Fix staleness regex (template enforces table format, false positive)
- **Backward compatibility**: If renaming `--suspicious`, keep old name as alias for at least 1 release
- **Deprecation UX**: `--suspicious` alias prints warning to stderr: "Flag --suspicious is deprecated, use --active-only instead."
- **Internal rename**: If renaming, change internal variable names (`suspicious` → `activeOnly`) throughout probe.ts for consistency, including `filterEmptyShells` mode string `'suspicious'` → `'active-only'`
- **AGENTS.md**: Only update if it references `--suspicious` by name; grep first, update only if found
- **ZK Review verification**: Executor spawns a ZK subagent (same pattern as this task's ZK Review) with the updated SKILL.md, asks it to run probe and rate intuitiveness
- **Tests**: If renaming, add tests for `--active-only` (canonical) and `--suspicious` (deprecated alias); keep existing tests passing

## Acceptance Criteria

- [ ] ZK Review agent can read SKILL.md and understand all probe flags without reading source
- [ ] ZK Review agent runs `cortex probe` and `cortex probe --suspicious` and finds output "符合直觉" (no surprises)
- [ ] `--suspicious` behavior is either renamed or clearly documented
- [ ] All probe tests pass (no regression)
- [ ] Manual probe run confirms output unchanged for default mode

## Progress Log
<!-- Update during execution, with timestamps -->

**2026-06-14 04:50 UTC** — Step 0 baseline probe runs completed:
- `probe` (default): Full status consistency check + all other checks. Output: all tasks/epics/ADRs listed with ✅/❌ icons.
- `probe --suspicious`: Skipped status consistency, only showed lane occupancy (0 main, 0 emergency). Header said "🔎 Probing suspicious patterns only..." — confirming the name is misleading (shows LESS, not more).
- `probe --include-completed-empty-shells`: Same as default but with expanded empty-shell scope.

**2026-06-14 04:52 UTC** — Decision: Rename `--suspicious` to `--active-only` with backward alias. Rationale:
- The name "suspicious" actively misleads — new agents expect MORE problems found, not fewer checks.
- "active-only" accurately describes the filtering behavior (only backlog/in-progress/proposed items).
- Backward compatibility: `--suspicious` kept as alias with stderr deprecation warning.

**2026-06-14 04:55 UTC** — Changes made:
- `probe.ts`: Renamed internal `suspicious` → `activeOnly` in interfaces, `buildProbePlan`, `executeProbePlan`, `printProbeSummary`. `filterEmptyShells` mode string `'suspicious'` → `'active-only'` (with `'suspicious'` kept as deprecated alias). `probeStatus` accepts both `activeOnly` and `suspicious` options, prints deprecation warning for latter.
- `cli.ts`: Added `--active-only` flag parsing, passes `suspicious` through to `probeStatus` for deprecation warning.
- `SKILL.md`: Added "Probe Flags & Modes" section with flag table, check matrix, and backward compatibility note.
- `AGENTS.md`: No changes needed — it does not reference `--suspicious` by name (only generic `cortex probe` references).
- Tests: Updated `probe.test.ts`, `probe-plan.test.ts`, `probe-execute.test.ts` to use `activeOnly` and test deprecated `suspicious` alias.

**2026-06-14 04:58 UTC** — All tests pass (115/115 in project-cortex, full suite green). Manual probe verification confirms output unchanged for default mode, `--active-only` works, `--suspicious` prints deprecation warning and produces identical output to `--active-only`.

## Related Files
- Modified: `packages/lythoskill-project-cortex/src/commands/probe.ts`, `packages/lythoskill-project-cortex/skill/SKILL.md`
- Reference: `AGENTS.md` (may need update)

## Git Commit Message
```
fix(cortex): probe UX — document flags, evaluate suspicious naming (TASK-20260614123918272)

- Document --suspicious and --include-completed-empty-shells in SKILL.md
- [Optional] Rename --suspicious to --active-only with backward alias
```

## Notes
- ZK Review agent (agent-9) rated probe 6/10. Target after fixes: 8/10.
- The `--suspicious` naming issue is the most impactful — it actively misleads new agents.
- SKILL.md is the primary documentation surface for agents; source code should not be required reading.
- Executor should read `probe.ts` and `cli.ts` directly for exact signatures — task card does not duplicate source code.
