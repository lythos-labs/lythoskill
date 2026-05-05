---
created: 2026-05-05
updated: 2026-05-05
category: pattern
---

# Multi-Agent POSSE Syndication

> Cold pool is your own site. Deck link syndicates skills to every agent platform you use — simultaneously, not by switching.

## Context

Users run multiple agent CLIs (Claude Code, Cursor, Codex, Windsurf) in parallel — sometimes in the same project. The common intuition is "switch context between agents." But that's not how IndieWeb solved the multi-platform problem.

**POSSE** (Publish on your Own Site, Syndicate Elsewhere) is the IndieWeb principle: you own the canonical content on your domain, and it flows out to every platform you're present on. You don't "switch to Twitter" — you publish once, and it appears everywhere.

Skill governance has the same shape.

## Details

```
Cold Pool (your "own site")
~/.agents/skill-repos/
├── github.com/anthropics/skills/pdf/
├── github.com/lythos-labs/lythoskill/skills/deck/
└── localhost/my-writing-style/
         │
         │  deck link --all (syndicate)
         │
    ┌────┼────────┬─────────┐
    ▼    ▼        ▼         ▼
 Claude Cursor  Codex   Windsurf
 .claude .cursor .codex .windsurf
```

**Not switching — syndicating.** You don't "use Claude mode" or "use Cursor mode." Your skills are published to all platforms. Each agent sees the same deck, governed by the same deny-by-default logic. The cold pool doesn't know or care which agents consume it — it's just a directory of git repos.

**Agent registry is a key-value map:**
```
claude   → ~/.claude/skills/
cursor   → ~/.cursor/skills/   (TBD: verify Cursor convention)
codex    → ~/.codex/skills/    (TBD)
windsurf → ~/.windsurf/skills/ (TBD)
```

The symlink infrastructure already handles this — `deck link --workdir` targets any working set directory. `deck link --all` iterates the known agent list. The reconciler logic doesn't change; the target directory is a parameter.

## K8s Analogy (Complementary)

| POSSE | K8s | What |
|-------|-----|------|
| Cold pool | PersistentVolume | Canonical storage, one copy |
| `deck link --all` | `kubectl apply -f` across namespaces | Declarative sync to all targets |
| Agent working set | Namespace | Isolated view per agent |

The K8s analogy captures the infrastructure layer (reconciler, deny-by-default). The POSSE analogy captures the *intent* — own your content, syndicate everywhere, no platform lock-in.

## Why Not "Multi-Agent Switching"

"Switching" implies mutual exclusion — you're in one mode or another. POSSE assumes simultaneous presence. The user runs Claude Code and Cursor in parallel today. The cold pool serves both without coordination overhead. One truth, multiple consumers, no cross-talk.

## When to Apply

- You use multiple agent CLIs and want consistent skill activation across all
- You want agent-agnostic skill governance (not locked to Claude's ecosystem)
- You're building a cold pool that serves a team with heterogeneous tooling

## When Not to Apply

- Single-agent workflow (deck link without --all still works)
- Agent-specific skills that only make sense in one runtime (rare)

## Related

- [Player-Deck Separation and TCG Analogy](2026-05-02-player-deck-separation-and-tcg-player-analogy.md) — cold pool = collection, deck = selection
- [How I Govern 130 Skills](../03-lessons/2026-05-02-how-i-govern-130-skills.md) — global deck pattern (innate: deck + curator)
- ADR-20260424000744041 — curator output is personal environment scan, not project artifact
- [Rosie](https://github.com/matthewp/rosie) — independent validation of lockfile + multi-agent sync direction
