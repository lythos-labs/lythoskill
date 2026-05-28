---
name: lythoskill-dreaming
version: 0.15.4
type: standard
description: |
  Project memory consolidation — scan scattered wiki/ADR/daily content,
  extract the currently-true state into SSOT, then ZK-validate readability.
  Lythoskill's innovation over OpenClaw/Hermes dreaming: adds a verification
  layer (zero-knowledge subagent reads the output → self-reports understanding).
when_to_use: |
  After major documentation changes, weekly cleanup, pre-onboarding prep,
  context pressure is high, wiki/ADR has grown stale, user says "做梦",
  "整理文档", "consolidate", "SSOT", "sleep on it", "memory consolidation".
---

# Dreaming — Project Memory Consolidation

> Scan → Consolidate → ZK Validate. Extract the "currently true" from scattered docs.
> Differs from OpenClaw/Hermes: adds a zero-knowledge verification layer after output.

## Why Dreaming Exists

1000+ commits produce documentation rot:

1. Agent reads old wiki → builds outdated assumption
2. Agent writes new content carrying old assumption → creates drift
3. Next agent reads new + old → context explosion, noise > signal
4. Context pressure forces "scan" not "read" → "scan → learn poorly → fabricate"

**OpenClaw/Hermes dreaming** does memory consolidation (deterministic transition + LLM review) but has a blind spot: **no verification layer after output**. A dreaming output can be self-consistent to its author but unreadable to a fresh agent.

**Lythoskill's innovation**: Dream → ZK Validate → Revise loop. A zero-knowledge subagent reads the SSOT output → self-reports understanding → misunderstood sections get revised.

## Three-Phase Flow

### Phase 1: Scan

```bash
bun packages/lythoskill-project-cortex/src/cli.ts probe   # Stale tasks, epic drift
bun packages/lythoskill-project-cortex/src/cli.ts stats   # Task/ADR/wiki counts
ls -lt cortex/adr/02-accepted/ | head -20                  # Recent decisions
ls -lt cortex/wiki/01-patterns/ | head -20                 # Recent patterns
ls -lt cortex/wiki/03-lessons/ | head -10                  # Recent lessons
git log --since="30 days ago" --oneline -- cortex/wiki/ cortex/adr/  # What changed
```

Agent reads the probe output + file listings → identifies:
- **Stale**: files referencing deprecated commands/paths/concepts
- **Duplicate**: same insight in multiple wiki entries
- **Contradictory**: ADR says X, wiki pattern says Y
- **Orphaned**: references to tasks/epics that no longer exist

### Phase 2: Consolidate

Write to `cortex/wiki/04-ssot/`. One file per major topic area. Each SSOT file is:

- **Short** (< 500 lines) — a fresh agent can read it in one pass
- **Self-contained** — links to source ADRs/wiki for detail, but doesn't require reading them
- **Current** — reflects what's TRUE NOW, not what was true at some point in history
- **Dated** — frontmatter `last_consolidated: 2026-05-28` so reader knows freshness

Example SSOT topics:
- `architecture.md` — current system architecture (not design history)
- `conventions.md` — active code/doc conventions (not deprecated ones)
- `active-quests.md` — what we're building now (from active epic + in-progress tasks)
- `key-decisions.md` — ADRs that still hold (superseded ones noted but not replayed)
- `pitfalls.md` — recurring failure modes and their fixes

### Phase 3: ZK Validate

After writing SSOT, spawn a **zero-knowledge subagent**:

```
ZK subagent prompt:
  "You have NO prior context about this project. Read these SSOT files:
   - cortex/wiki/04-ssot/architecture.md
   - cortex/wiki/04-ssot/conventions.md
   Self-report: what do you understand? What is unclear? What seems contradictory?"

Agent evaluates the ZK subagent's self-report:
  - Misunderstood sections → SSOT needs revision (writing assumed context that doesn't exist)
  - "Where is X?" questions → SSOT is missing a topic
  - Contradictions flagged → SSOT inherited stale info from source docs
```

**For critical SSOT documents**, escalate to cross-model validation:

```
arena single --player kimi --brief "Read cortex/wiki/04-ssot/architecture.md and self-report your understanding"
```

If kimi also understands → document is broadly usable, not Claude-specific.

## Relationship with Other Tools

| Tool | Role in Dreaming |
|------|-----------------|
| `cortex probe` | Input: detects stale tasks, epic drift, empty shells |
| `deck validate` | Input: checks if referenced skill paths still exist |
| `curator scan` | Input: cold pool freshness — are our skill references valid? |
| `arena single` | ZK validation L2: cross-model readability check |
| `scribe daily` | Records dreaming session output |

## When NOT to Dream

- Mid-task, mid-refactor — dreaming is a between-sessions activity
- When the working tree is dirty — commit first
- When there's an active emergency epic — firefighting takes priority

## Dreaming Output Contract

Every SSOT file must have:

```yaml
---
last_consolidated: 2026-05-28
sources: ["cortex/adr/02-accepted/ADR-xxx.md", "cortex/wiki/01-patterns/xxx.md"]
zk_validated: true
zk_issues: 0
---
```

## Supporting References

| When you need to… | Read |
|--------------------|------|
| Understand the OpenClaw/Hermes baseline | [`references/hermes-dreaming-baseline.md`](./references/hermes-dreaming-baseline.md) |
| See the ZK validation pattern in action | AGENTS.md § ZK Validation Pattern |
| Full dreaming workflow example | [`references/dreaming-workflow-example.md`](./references/dreaming-workflow-example.md) |
