---
last_consolidated: 2026-05-29
sources:
  - "cortex/wiki/01-patterns/2026-05-28-agent-evaluation-arena-pattern.md"
  - "cortex/adr/03-superseded/SUPERSEDED-ADR-20260529002942317-cli-entry-io-injection-exemption.md"
  - "Session: 2026-05-29 runAdd IO injection debate (Agent A vs Agent B)"
zk_validated: false
---

# Internal Roundtable Pattern

> Multi-agent debate for architectural decisions inside the project.
> Not about catching external evaluators being wrong — about catching
> ourselves being wrong.

## The Problem

Agent-driven projects have a unique blind spot: **the same agent pool writes, reviews, and defends code.**

- Agent writes `runAdd` with `spyOn(console)`
- Agent reviews the PR, sees conventions.md allows `spyOn(console)`
- Agent concludes "this is compliant L1 testing"
- No one asks: "Does `runAdd` actually have an IO injection interface?"

This is the **"respect current code" bias** (pitfalls.md §10b): agent assumes existing code conforms to documented architecture, then retroactively interprets the code as compliant. The docs say "IO injection is correct" → the code uses `spyOn` → therefore `spyOn` must be IO injection.

**External evaluation breaks this cycle** — but you don't need to wait for an external evaluator. You can simulate the same critical perspective internally.

## The Pattern

```
Agent A (Proponent)
  → reads the file + architecture docs
  → argues "this is correct / this is not debt"
  → does NOT see Agent B's argument

Agent B (Skeptic)
  → reads the SAME file, does NOT see Agent A's argument
  → argues the opposite position
  → must cite specific lines as evidence

Agent C (Moderator)
  → sees both arguments
  → identifies which claims are factual vs interpretive
  → flags "respect current code" bias in either direction
  → produces verdict: [adopt A / adopt B / both partial / need more info]
```

## Why Three Agents, Not Two

| Two-agent | Three-agent (with Moderator) |
|-----------|------------------------------|
| Proponent vs Skeptic → adversarial deadlock | Moderator separates facts from opinions |
| Winner = who argues better, not who's right | Verdict based on evidence, not rhetoric |
| No meta-cognitive layer | Moderator flags bias in both directions |

The Moderator is critical: **it is not a judge picking sides — it is a bias detector.** Its job is to catch when Agent A defends code just because it exists, or when Agent B criticizes code just because it can.

## When to Apply

- A single agent proposes a refactor, and you suspect "respect current code" bias
- Two agents disagree on whether a pattern is debt or defense
- A code review surfaces an ambiguity the author agent cannot see
- Any decision where "the agent who wrote it" and "the agent who reviews it" draw from the same pool

## When NOT to Apply

- Trivial decisions (cost > value)
- Well-established patterns with no ambiguity
- Emergency fixes (speed > deliberation)

## Input Isolation Rules

**This is the most important rule.** Break it and the roundtable becomes an echo chamber.

| Agent | Sees | Does NOT see |
|-------|------|--------------|
| A (Proponent) | Source code + architecture docs | Agent B's argument |
| B (Skeptic) | Source code + architecture docs | Agent A's argument |
| C (Moderator) | Source code + architecture docs + A's argument + B's argument | Nothing hidden |

**Why**: If Agent A sees Agent B's skepticism before forming its own position, it will pre-emptively defend against those specific points rather than forming an independent position. The roundtable becomes scripted.

## Output Format

```
## Roundtable: [Topic]

### Agent A (Proponent)
[Structured argument with file:line evidence]

### Agent B (Skeptic)
[Structured argument with file:line evidence]

### Moderator Verdict

#### Factual Claims (both sides)
| Claim | Source | Status |
|-------|--------|--------|
| [claim] | `file.ts:L123` | ✅ Verified |

#### Interpretive Disputes
| Dispute | A's position | B's position | Assessment |
|---------|-------------|-------------|------------|
| [dispute] | [summary] | [summary] | [who has stronger evidence] |

#### Bias Flags
- Agent A: [any "respect current code" signals?]
- Agent B: [any contrarian-for-the-sake-of-it signals?]

#### Verdict
[adopt A / adopt B / both partial / need more info]

#### Action Items
- [ ] [specific, assignable task]
```

## Comparison: Internal Roundtable vs External Arena

| | Internal Roundtable | External Arena (Agent Evaluation) |
|--|---------------------|-----------------------------------|
| **Trigger** | Internal architectural ambiguity | External evaluation received |
| **Agent A bias** | "Respect current code" — defends existing code | Surface-scan — uses generic heuristics |
| **Agent B bias** | Contrarian — may criticize without cost-benefit | Over-correction — may nitpick to show thoroughness |
| **Moderator role** | Bias detector + evidence separator | Human judgment (Agent A' is forked evaluator) |
| **Cost** | 2-3 subagent spawns, ~5 min | 3 subagent spawns + human review, ~15 min |
| **When to use** | Before committing to a controversial decision | After receiving external criticism |

## Real Example: runAdd IO Injection Debate

> **Status: RESOLVED** (2026-05-29). The project adopted "unified style > exemption
> complexity." All CLI entry points (`runAdd`, `runFind`, `runCurator`, `removeSkill`,
> `toSymlinkSkill`, `toSnapshotSkill`) were refactored to use IO injection. The L1
> Escape Hatch was removed from conventions.md; ADR-20260529002942317 was moved to
> `03-superseded/`. This example is preserved as a historical record of the debate
> that led to the unification decision.

### The Question

Does `runAdd`'s use of `spyOn(console)` indicate:
- **A**: Legitimate L1 integration testing (conventions.md allows it)
- **B**: Real architectural gap (CLI layer lacks IO injection interface)

### Agent A (Proponent)

**Core argument**: `runAdd`'s `spyOn(console)` is explicitly allowed by conventions.md §5's L1 Escape Hatch. The function is thin glue (argv parse → dispatch → print), and adding IO injection would be pure boilerplate.

**Evidence**: `cortex/wiki/04-ssot/conventions.md:L114-L116` (historical — this section no longer exists)
```md
**When this exemption applies**:
- `runAdd` in `packages/lythoskill-curator/src/cli.ts` — parses `--pool`, calls `buildAddPlan` + `git clone`, prints status. IO injection would add ~8 lines of boilerplate for zero new test coverage.
```

**Evidence**: `packages/lythoskill-deck/src/refresh-plan.ts:L180-L184`
```ts
export interface RefreshIO {
  gitPull?: (dir: string) => { status: 'updated' | 'up-to-date' | 'failed'; message: string }
  log?: (msg: string) => void
  linkDeck?: (deckPath?: string, workdir?: string) => void
}
```
Plan/Execute layer has perfect IO injection. CLI layer is different by design.

### Agent B (Skeptic)

**Core argument**: `runAdd` has no IO injection interface — it directly calls `console.error`. The `spyOn` exists because there's no alternative, not because it's "design." Conventions.md's "exemption" is事后合理化, not first-principles derivation.

**Evidence**: `packages/lythoskill-curator/src/cli.ts:L961-L966` (historical line numbers)
```ts
export function runAdd(argv: string[]) {
  const locator = argv.find(a => !a.startsWith('-'))
  if (!locator) {
    console.error('Usage: lythoskill-curator add <github.com/owner/repo> --pool <dir> [...]')
    process.exit(1)
  }
```

**Evidence**: `packages/lythoskill-curator/src/cli.test.ts:L246-L252` (historical line numbers)
```ts
beforeEach(() => {
  exitCode = undefined
  exitErrors = []
  spyOn(console, 'error').mockImplementation((msg: string) => {
    exitErrors.push(String(msg))
  })
})
```
If `runAdd` had `io: { error }`, this `spyOn` would be unnecessary.

### Moderator Verdict

#### Factual Claims

| Claim | Source | Status |
|-------|--------|--------|
| `runAdd` has no IO injection parameter | `cli.ts:L961` | ✅ Verified by both |
| `executeRefreshPlan` has `RefreshIO` | `refresh-plan.ts:L180` | ✅ Verified by both |
| conventions.md has L1 Escape Hatch | `conventions.md:L104` | ✅ Verified by both (historical) |
| `runAdd` tests use `spyOn(console)` | `cli.test.ts:L249` | ✅ Verified by both |

#### Interpretive Disputes

| Dispute | A's position | B's position | Assessment |
|---------|-------------|-------------|------------|
| Is L1 Escape Hatch legitimate? | Yes — documented exemption for thin glue | No —事后合理化 of existing code | **Both partial**. The exemption was written for this specific case (circular), but the reasoning (cost > benefit) is sound. |
| Is `spyOn(console)` a symptom of debt? | No — L1 testing by design | Yes — compensating for missing IO interface | **Both partial**. The gap is real, but the fix is unnecessary. |
| Should `runAdd` be refactored to IO injection? | No — zero new test coverage | Yes — consistency with Plan/Execute layer | **A wins on pragmatism, B wins on principle**. The correct answer is "document the gap, don't fix it yet." |

#### Bias Flags

- **Agent A**: "conventions.md allows it → so it's correct" — this is circular. The exemption was written because `runAdd` exists, not derived from first principles. Agent A did not ask "would I design this way from scratch?"
- **Agent B**: "inconsistency = must fix" — did not quantify the cost of fixing. "Consistency" is not a free good; 8 lines of boilerplate × every CLI entry point = real complexity.

#### Verdict (Original)

**Both partial. The gap is real but the fix is unnecessary. Document as known exemption, do not hide behind "evaluator misread."**

#### Resolution (2026-05-29)

**User overrode the verdict**: "统一风格 > 豁免复杂度" — the cognitive tax of
remembering when an exemption applies exceeds the cost of 60 lines of boilerplate.
All CLI entry points were refactored to IO injection. Zero `spyOn(console)` remains.

The original verdict was wrong not because the reasoning was flawed, but because it
underestimated the **hidden cost of exemptions**: every agent reading the codebase
must read the exemption docs, judge applicability, and risk misjudgment. Unification
eliminates this tax entirely.

#### Action Items

- [x] Document exemption in conventions.md §5 "L1 Escape Hatch" (historical — later removed)
- [x] Write ADR-20260529002942317 recording the decision (later superseded)
- [x] Update pitfalls.md §10b to reference the exemption (historical reference)
- [x] **Refactor all CLI entry points to IO injection** (`CuratorIO`, `DeckIO`, `SymlinkSnapshotIO`)
- [x] **Remove L1 Escape Hatch from conventions.md**
- [x] **Move ADR-20260529002942317 to `03-superseded/`**

## Key Insight

The roundtable is not about "who wins." It is about **making the reasoning explicit**:

- Agent A's circular argument ("docs allow it") is now visible
- Agent B's unquantified principle ("must be consistent") is now visible
- The Moderator's job is not to pick a winner but to **surface the biases both sides brought**

**The real output is not the verdict — it is the record of how we reasoned.** Next time an agent reads this file, it sees not just "what we decided" but "what traps we fell into while deciding."

## Related

- `cortex/wiki/01-patterns/2026-05-28-agent-evaluation-arena-pattern.md` — External evaluation variant
- `cortex/wiki/04-ssot/pitfalls.md` §10b — "Respect Current Code" bias
- `cortex/wiki/04-ssot/conventions.md` §5 — Testing Layers + L1 Escape Hatch
- `cortex/adr/03-superseded/SUPERSEDED-ADR-20260529002942317-cli-entry-io-injection-exemption.md` — Example ADR output from roundtable (superseded)
