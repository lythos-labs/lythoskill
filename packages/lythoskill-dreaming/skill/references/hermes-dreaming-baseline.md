# Hermes/OpenClaw Dreaming Baseline

> What we're building on — and what we're adding.

## Hermes Curator (OpenClaw)

Two-phase dreaming mechanism documented in `cortex/wiki/03-lessons/2026-05-03-hermes-self-evolving-skill-field-notes.md`:

### Phase 1 — Deterministic Transition (no LLM)
- unused 30 days → `stale`
- unused 90 days → archive to `~/.hermes/skills/.archive/`
- Pinned skills exempt

### Phase 2 — LLM Review (auxiliary model fork)
- `max_iterations=8`
- Forked agent can `skill_view` any agent-created skill
- Decides: keep / patch / consolidate / archive
- `--dry-run` mode for preview

### Blind Spot
Dreaming output is **self-consistency checked only**. The same agent (or same model family) reviews its own output. If the dreaming agent writes something only it understands, there's no external reader to catch it.

## What Lythoskill Adds: ZK Validation Layer

| | Hermes/OpenClaw | Lythoskill Dreaming |
|---|---|---|
| Consolidation | ✅ Deterministic + LLM review | ✅ Same (agent orchestrated) |
| Self-consistency | ✅ Same agent reviews own output | ✅ Same |
| External readability | ❌ No verification layer | ✅ ZK subagent reads SSOT → self-reports |
| Cross-model validation | ❌ Not designed for | ✅ `arena single --player kimi` for critical docs |
| HATEOAS output | Partial (dry-run report) | ✅ Full — every step tells agent "what next" |

## Why This Matters

Today's session proved the ZK validation pattern works:
- ZK agent correctly understood path convention (`.agents/skills/` = community standard)
- ZK agent correctly understood thin-skill pattern (agent is wizard, CLI is guardrail)
- ZK agent honestly reported "bank teller analogy not found in docs" — caught a documentation gap

Without ZK validation, that gap would have persisted silently.
