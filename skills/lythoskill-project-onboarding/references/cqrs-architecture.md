# CQRS: Onboarding (Read) + Scribe (Write)
## Why Separate Read and Write
Scribe knows what happened (session context). Onboarding knows how to
efficiently restore context (layered loading, cache optimization, degradation).
Neither can do the other's job well.
## Independence
- **Onboarding only** (no scribe): degrades to file exploration. Works, but
  burns more tokens and misses session-specific pitfalls.
- **Scribe only** (no onboarding): daily files are human-readable. Any agent
  can `cat` them manually.
- **Both**: optimal — handoff includes verification commands, onboarding
  uses layered loading with freshness checks.

## Orthogonal Separation
| Document | Layer | Content | Change frequency | Priority |
|----------|-------|---------|-----------------|----------|
| CLAUDE.md | 1 | How to work | Very low | Must read |
| daily/YYYY-MM-DD.md | 2 | Session state (handoff section) | Per session | Highest |
| git status | 3 | Real-time truth | Real-time | Must verify |
| cortex/INDEX.md | Degraded | Project governance | Medium | When no handoff |
| skill-deck.toml | Degraded | Active skills | Low | When no handoff |

## KV Cache Optimization Rationale
Layer 1 (CLAUDE.md) changes rarely → cached across sessions.
Layer 2 (daily handoff) changes per session → new content, but small.
Layer 3 (git) is real-time → always fresh, never cached.

Loading stable content first maximizes KV cache hit rate in long-running
sessions where compaction preserves earlier context.
