---
last_consolidated: 2026-06-01
sources: ["daily/2026-05-28.md", "daily/2026-06-01.md", "weekly/2026-W23.md", "cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md", "AGENTS.md"]
zk_validated: true
zk_issues: 0
zk_validator: "ZK subagent ae891a5 — 2026-05-28 — 'mostly clear, structure clean, concrete examples ground each pattern'"
---

# Pitfalls — Recurring Failure Modes

> SSOT of systemic failure patterns. Each entry: symptom → root cause → fix.
> Updated when a new pattern repeats across ≥2 sessions.

## 1. Agent Scan → Learn Poorly → Fabricate

**Symptom**: Agent writes documentation that looks plausible but contains factual errors — non-existent skill paths, bare command names in code blocks, wrong platform names.

**Root cause**: Agent scans repo surface-level, forms incomplete mental model, fills gaps by guessing. Most common when generating site/docs from a "scan this project and write about it" prompt.

**Real examples**:
- `mermaid` skill referenced in site-builder.toml but doesn't exist in cold pool
- `deck link` written as a code block command (not runnable — needs `bunx @lythos/skill-deck link`)
- `.agents/skills/` described as "Codex-specific" (actually community standard, 14+ agents)

**Fix**: Three-layer guardrail:
1. SKILL.md `description` pushy trigger → forces agent to consult guide before writing
2. Reference guide (`deck-building-guide.md`) as trusted source of truth
3. CLI guardrail (`deck validate`) catches fabrication in output

**Prevention**: When asking any agent to produce documentation, run ZK validation — spawn a zero-knowledge subagent to read the output and self-report understanding.

## 2. Context Pressure → Stale Docs → More Pressure

**Symptom**: 81 ADRs + 54 wiki patterns + 25 dailies. Agent can't read everything → skims → builds wrong assumptions → writes wrong docs. Cycle accelerates.

**Root cause**: Documents accumulate without garbage collection. Old ADRs reference deprecated commands, old wiki patterns describe removed features.

**Fix**:
1. Dreaming skill (see `packages/lythoskill-dreaming/skill/SKILL.md`) periodically consolidates → SSOT
2. AGENTS.md onboarding order: SSOT first, then wiki/adr on demand
3. ZK validation catches when stale content confuses fresh agents

## 3. Bare Command Shorthand in User-Facing Docs

**Symptom**: Site code blocks contain `deck link` or `arena single` — not runnable.

**Root cause**: Agent reads AGENTS.md internal convention (where shorthand is OK), copies it to site docs without translating to user-facing form.

**Fix**: AGENTS.md "Command Shorthand Convention" section + site rule: code blocks must use `bunx @lythos/...` form.

**Prevention**: `grep -rn '`\(deck\|arena\|curator\) ' site/` in code blocks should return 0 after any site edit.

## 4. Cold Pool Staleness

**Symptom**: `deck validate` reports skill not found, but the skill exists on GitHub — just not cloned locally.

**Root cause**: `deck validate` treated "not in cold pool" as hard error. Now (v0.15.4+) it's a warning with HATEOAS next-step suggestions.

**Fix**: `bunx @lythos/curator add <locator>` or `git clone` into cold pool.

## 5. Post-Compaction Amnesia

**Symptom**: Agent loses context after conversation compaction, re-derives facts from scratch (sometimes wrongly), makes decisions on stale assumptions.

**Root cause**: Claude Code compaction drops session context silently. Agent doesn't know what it forgot.

**Fix**: CLAUDE.md top banner + AGENTS.md Release & Auth warning at top. Before any release/auth/version command, re-read the workflow section. Daily handoff captures session state that compaction can't erase.

## 6. Audit False Positive: Absent != Defective

**Symptom**: Audit rules (coach, probe, ZK sweep) flag "missing field X" as an error when the field is optional by design. SKILL.md without `version` frontmatter, combo without `cards`, wiki without `updated` timestamp.

**Root cause**: Audit logic treats schema fields as required unless explicitly marked optional. The absence of a field is interpreted as a defect, not a legitimate choice.

**Fix**: Every audit rule must distinguish "field is missing" (structural concern, may be fine) from "field is needed" (functional concern, actual defect). Document optional vs required explicitly in schema references.
**Real example**: Combo `cards` field — code doesn't parse it, ADR says it's visual annotation. Audit agents flagged "missing `cards`" as an error in 3 deck tomls.

## 7. Excessive Self-Questioning

**Symptom**: Agent enters anxiety loop — "should I do X? but what about Y? wait let me check Z first..." — burning tokens without progress.

**Root cause**: Agent's uncertainty threshold is too low. It treats every ambiguity as requiring investigation, even when the cost of being wrong is near zero.

**Fix**: 90% confidence threshold for autonomous smart-task execution (see auto-memory). If the action is low-impact + reversible, act without asking. Only pause for high-impact or irreversible decisions.
**Real example**: Agent spent 12 messages debating whether to use `cards` or `skills` in a combo example — both are valid per ADR-20260528153455764, and either choice is trivially fixable.

## 8. Arena as Rule Validator (ZK subagent)

**Symptom**: New SKILL.md description rules or AGENTS.md conventions are written but never empirically tested. Author assumes they work for external readers.

**Root cause**: "It reads clearly to me" = curse of knowledge. The author already has the mental model the doc is trying to build.

**Fix**: Use arena single with ZK subagent to validate rules: spawn a zero-knowledge agent that reads only the doc under test → asks it to self-report understanding → compare against intended understanding. This is Level 1 of dreaming's ZK validation — same principle, applied to individual docs rather than full SSOT sweeps.
**Real example**: coach rules about desc style were written, reviewed, and committed — but a ZK subagent later found 2 of 5 rules were ambiguous to a fresh reader. Arena single caught what human review missed.

## 9. Cross-Package Convention Change Without Consumer Sync

**Symptom**: A convention or schema is deprecated/removed (e.g., `type` frontmatter in SKILL.md). CI passes locally because pre-commit only tests changed packages. But CI fails later because other packages still expect the old convention.

**Root cause**: TDD/task planning treats convention change as a single-file edit. The "consumers" of that convention — tests, parsers, validators, other packages — are not identified and updated in the same task.

**Real example**: ADR-20260506103209293 removed `type: standard|flow` from SKILL.md. Guard script (`adr-check.sh`) was updated in one commit, but `curator-core.test.ts` still expected `type: 'standard'` as default. Pre-commit skipped curator tests (only scripts/ changed). CI caught it — but only after the broken commit was pushed.

**Fix**: When deprecating a convention, task must include:
1. **Consumer audit**: `grep -rn "type.*standard\|type.*flow" packages/` to find all consumers
2. **Synchronized update**: all consumers updated in the same commit or same PR
3. **Full test run**: `bun --filter='*' run test` before claiming done — pre-commit's per-package filter is not enough for cross-cutting changes

**Prevention**: Task template should have a "Cross-package impact" checkbox. Any change to schema, convention, or shared interface must explicitly list consumers and verify they're updated.

## 10. External Evaluator Scans Surface, Judges Depth

**Symptom**: An external agent (ZK evaluator, auditor, benchmark) scans the repo, produces a report with surface-level metrics and generic recommendations. The report contains factual errors: misreading test architecture as "mock abuse," counting terminated tasks as "failed epics," or calling agent memory infrastructure "document bloat."

**Root cause**: The evaluator has no project context. It applies human-project heuristics to an agent-native codebase. It counts `spyOn` without distinguishing console capture from system call interception. It sees 39 terminated tasks and assumes "low completion rate" without reading the task bodies. It sees 7 SSOT files + 83 ADRs + 51 wiki patterns and calls it "inflation" without understanding that **agents have no memory — documentation IS the memory**.

**Real example**: An independent agent audit of lythoskill (2026-05-28) gave the project 6.8/10. It claimed:
- "14/46 test files use mock/spy" — actually 0 violations of IO injection architecture at the Plan/Execute layer; all `spyOn` on `execSync`/`child_process` was IO interface injection (compliant). However, the CLI entry layer (`runAdd`, `runFind`) does lack IO injection interfaces and uses `spyOn(console)` — a real architectural gap, not "mock abuse" but "missing IO interface"
- "39 terminated tasks + 2 suspended epic = start-many-finish-few" — confused task with epic; actual epic completion rate is 36 done / 2 suspended = 94.7%
- "Document-to-code ratio 1.5:1 = inflation" — failed to recognize that cortex (ADR + wiki + daily + weekly + SSOT) is a distributed memory system for zero-knowledge agents, not "extra documentation"

**Fix**: When commissioning external evaluation:
1. **Provide context upfront**: Give the evaluator AGENTS.md + architecture.md + conventions.md BEFORE it scans code. Do not let it form hypotheses from grep alone.
2. **Require structured evidence**: Every claim must cite specific files + lines. "Mock abuse" must name which `spyOn` calls violate which architecture rule.
3. **ZK validate the evaluation**: Spawn a second agent to read the evaluation report and cross-check its claims against the actual codebase. The evaluator is itself a source that needs verification.
4. **Weight domain expertise**: An evaluator that has not read `intent-plan-execute-fractal-architecture-pattern.md` should not score "test architecture health." An evaluator that has not understood "agent memory = documentation" should not score "document debt."
5. **Assume the critic found a real signal**: Before dismissing any criticism as "misreading," verify whether the signal is real even if the diagnosis is wrong. The evaluator's "mock abuse" may actually be "CLI layer lacks IO injection interface."

**Prevention**: SSOT documents must include "evaluator guidance" sections — explicit warnings about common misreadings. See conventions.md §5 "Testing Layers" for the test architecture guidance that prevents the "mock abuse" misreading.

### Critical: Evaluators Confuse Defense Layers with Debt

A specific and dangerous variant of surface-scan evaluation: the evaluator sees pre-commit guards, ADR records, daily handoffs, ZK validation loops, and high test coverage — then judges these as "overhead," "bloat," or "governance complexity."

**This is backwards.**

lythoskill is a **pure agent-driven project**. Every session starts with a zero-knowledge agent. The "complexity" the evaluator sees is not organic growth — it is **deliberate defense architecture**:

| Defense Layer | Why It Exists | What Happens Without It |
|--------------|---------------|------------------------|
| 83 ADRs | Agent forgets decisions → repeats rejected alternatives | Same debates every session |
| 25 dailies | Agent loses context → contradicts yesterday's work | Drift, rework, conflicting commits |
| 7 SSOTs | Agent reads stale wiki → acts on outdated info | Decisions based on false assumptions |
| ZK validation | Agent hallucinates → writes plausible wrong docs | Fabricated skill paths, wrong commands |
| Pre-commit guards | Agent commits errors → breaks CI/npm | `workspace:*` shipped to npm, broken releases |
| High coverage | Agent breaks logic → no fast feedback | Bugs discovered in production |

**The evaluator's "ideal" (simpler, fewer guards, less documentation) would be fatal for this project.**

Analogy: Judging a hospital's infection control as "excessive bureaucracy" because you have never seen an ICU. The gloves, gowns, and sterile protocols are not overhead — they are the reason the patient survives.

**First principle of evaluating agent projects**: Before calling any structure "debt," verify whether it is a defense layer. If the project is agent-driven, the default assumption should be "this complexity exists because agents are fragile," not "this complexity should be removed."

### Also Critical: Project Agents Confuse "Respect Current Code" with "Current Code Is Correct"

The mirror image of evaluator surface-scan: **project agents defending existing code against legitimate criticism**.

**Symptom**: An external evaluator points out `spyOn(console)` in tests. The project agent reads the code, reads the architecture docs, and concludes "the evaluator misread — our `spyOn` is compliant L1 testing." The agent never asks: "Does `runAdd` actually have an IO injection interface?"

**Root cause**: "Respect current code" bias. Agent assumes existing code conforms to documented architecture, then retroactively interprets the code as compliant. The architecture docs say "IO injection is correct" → the code uses `spyOn` → therefore `spyOn` must be IO injection. The possibility that the code **doesn't follow** the architecture is never considered.

**Real example** (2026-05-28): Agent A defended `runAdd`'s `spyOn(console, 'error')` as "L1 integration testing." But `runAdd` has no IO injection interface — it directly calls `console.error`. The `spyOn` exists precisely because `runAdd` **does not follow** the IO injection pattern at the CLI layer. The evaluator's signal was real; the agent's defense was wrong.

**Correction** (updated 2026-06-01): `runAdd`'s lack of IO injection at the time (2026-05-28) was a real gap. The "L1 Escape Hatch" exemption (ADR-20260529002942317) was proposed as a temporary patch but later **superseded** — the project chose unified style over exemption complexity. As of v0.15.7, all CLI entry points across curator, deck, and arena now use IO injection (`CuratorIO`, `DeckIO`, `ArenaCliIO`/`ArenaIO`). The agent's original error was "defending without knowing the exemption existed"; the updated takeaway is that **temporary exemptions should be closed, not documented as permanent** — they rot into contradictions between SSOT files (this entry itself was such a rot until this edit). See conventions.md §5 historical note for the current state.

**Why this is dangerous in agent-driven projects**: Agent writes code → Agent reviews code → Agent defends code. No human in the loop to break the cycle. External evaluation is the only source of genuine criticism, and the project's first reflex is to dismiss it.

**Fix**: When receiving external criticism:
1. **Assume the signal is real**: "What if they're right about the symptom, even if wrong about the cause?"
2. **Verify the code, not the docs**: Does the actual implementation match the documented architecture? Docs can be aspirational; code is ground truth.
3. **Distinguish layer**: Is the criticism about Plan/Execute layer (core architecture) or CLI entry layer (glue code)? The former is more serious.
4. **Record genuine gaps**: If the CLI layer lacks IO injection, record it as known debt — don't hide it behind "the evaluator misread."

**Prevention**: Internal audits should use the same skepticism as external audits. "If an external evaluator said this, would I believe them?" If the answer is "no because I wrote this code," that's the bias talking.

## 11. SSOT Amplifier Effect — Wrong Fact → Cascading Errors

**Symptom**: An SSOT file documents a wrong fact. Multiple downstream consumers (BDD归档、site content、agent onboarding) act on that wrong fact. Fix requires multiple commits across multiple subsystems.

**Root cause**: SSOT is designed to be an amplifier — write once, consume everywhere. But amplification is symmetric: correct facts amplify benefit, incorrect facts amplify damage. Unlike code bugs (which CI catches), documentation bugs have no automated guard.

**Real example** (2026-05-29→06-01): SSOT conventions wrote `showcase/` as a valid BDD save location (because both showcase and BDD use `reproduce.sh`). Result: 8 BDD scenes archived to `showcase/` instead of `packages/<name>/test/scenarios/`. Fix required two commits: migration (441ebe0) + cleanup (2d721dd) + conventions.md correction.

**Fix**:
1. SSOT modifications should have a review step — ZK subagent or arena cross-model — not single-agent direct write
2. When an SSOT fact is corrected, audit all downstream consumers: `grep -rn "old-fact" packages/ site/ cortex/`
3. Distinguish "SSOT is the authority" from "SSOT is infallible" — the former is architecture, the latter is hubris

**Prevention**: When another agent creates or bulk-updates SSOT, run a ZK subagent pass specifically checking factual claims against ground truth (git log, file system, actual CLI behavior). The agent that wrote the SSOT cannot be the one that validates it.
