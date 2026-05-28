# Hermes Curator Dreaming — Field Notes

> 受 Hermes Curator 启发。我们是从自己的 weekly 反腐实践长出来的 dreaming，
> 后来田野调研发现同一个 pattern。不同 domain，相同结构。

## Hermes Curator Dreaming Cycle

Documented in `cortex/wiki/03-lessons/2026-05-03-hermes-self-evolving-skill-field-notes.md`.

### Phase 1 — Deterministic Transition (no LLM)
- unused 30 days → `stale`
- unused 90 days → archive to `~/.hermes/skills/.archive/`
- Pinned skills exempt

### Phase 2 — Forked Agent LLM Review
- `max_iterations=8` guardrail
- Forked agent (separate execution context) can `skill_view` any agent-created skill
- Decides: keep / patch / consolidate / archive
- `--dry-run` mode for preview

### Structural Parallels

| Pattern | Hermes Curator | Lythoskill Dreaming |
|---------|---------------|---------------------|
| Periodic cycle, not per-task | 7-day interval | Between sessions |
| Review tiers | Deterministic (30/90 day) + LLM, both in one tool | Weekly anti-corruption + ZK agent, two tools |
| External review | Forked agent (separate instance) | ZK subagent (zero context) |
| Preview before apply | `--dry-run` | Audit heredoc before executing |

External review via separate context is the de facto standard in agent systems — not a distinctive invention, just the right tool for the job.

### Domain Differences (artifact-driven, not design-driven)

| Hermes Curator | Lythoskill Dreaming |
|---|---|
| Domain: agent-created skill files | Domain: wiki/ADR/daily project docs |
| Index: raw file scan | Index: weekly chain (pre-existing anti-corruption layer) |
| Output: keep/patch/consolidate/archive | Output: SSOT — extract "currently true" |
| Cross-model: not designed for | Cross-model: `arena single --player kimi` for critical docs |

The output format difference is not a design choice — it follows from the artifact type. Skills need lifecycle ops; docs need information compression.

## Related Hermes Mechanisms (adjacent, not dreaming)

The hermes field notes also document three other lines:

1. **Real-time skill creation** (`skill_manage`) — agent writes skill files during task execution
2. **Community skill factory** (hermes-skill-factory) — pattern detection + TUI confirmation
3. **Offline evolution** (hermes-agent-self-evolution) — DSPy + GEPA optimization with PR gate

These are Hermes' domain-specific mechanisms for skill creation and optimization. They don't map to lythoskill's problem space — our skill creation path is manual authoring + thin-skill pattern. Only the Curator dreaming cycle addresses the same problem (maintenance of accumulated artifacts).
