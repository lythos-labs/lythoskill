# ADR-20260517152850372: Deck `also_link_to` — Multi-CLI Working Set via POSSE Pattern

**Status**: Accepted
**Date**: 2026-05-17

## Context

Deck currently supports one `working_set` per deck:

```toml
[deck]
working_set = ".claude/skills"
```

This is sufficient for single-CLI workflows. But agent-switching workflows need the same skill set available in multiple locations simultaneously:

- `.claude/skills/` (Claude Code)
- `.codex/skills/` (Codex CLI)
- `.kimi/skills/` (Kimi CLI)
- `.cursor/skills/` (Cursor)

Manually running `deck link` for each is error-prone. The deck should declare "I want these skills linked here AND here AND here" in one operation.

### Codex Symlink Root Cause

Codex has a known issue: top-level `.agents/skills/` as a symlink breaks skill discovery ([openai/codex#11314](https://github.com/openai/codex/issues/11314)). Individual skill symlinks inside the directory work fine — only the directory-level symlink is problematic. Multi-CLI support must produce real directories with symlink children, not symlinked directories.

## Decision

Add optional `also_link_to` field to `[deck]`:

```toml
[deck]
working_set = ".claude/skills"
also_link_to = [".codex/skills", ".kimi/skills"]   # TOML array
```

### Design Rationale

| Decision | Why |
|----------|-----|
| TOML array, not comma-separated string | Arrays are idiomatic TOML, support per-line comments, and extend naturally to array-of-tables if per-target options are needed later. Comma-separated was a fatigue-period decision. |
| Named `also_link_to` not `extra_working_sets` | "Also" implies symmetry — same behavior, just more places. "Extra" implies secondary priority. |
| Same reconciler logic | `also_link_to` paths use the exact same `deck link` reconciler. No new code path. |
| Per-skill `mode` (symlink/snapshot) respected | Each target gets the mode declared in `skill-deck.lock`. Codex can use `snapshot` mode to avoid its symlink bug. |

### Behavior

```
deck link
  → reconcile working_set = ".claude/skills"
  → reconcile also_link_to = ".codex/skills"
  → reconcile also_link_to = ".kimi/skills"
```

All three get identical skills. Order: `working_set` first (canonical), then each `also_link_to` in declaration order.

## POSSE Analogy

This follows the indieweb [POSSE](https://indieweb.org/POSSE) principle: **Publish (on your) Own Site, Syndicate Elsewhere**. The cold pool is the "own site" (source of truth). Working sets are syndication targets. `also_link_to` declares additional syndication endpoints.

```
Cold Pool (source of truth)
    │
    ├──→ working_set (canonical, primary CLI)
    ├──→ also_link_to[0] (secondary CLI)
    └──→ also_link_to[1] (tertiary CLI)
```

## Consequences

- `deck link` gains `also_link_to` support (same reconciler, loop)
- `deck refresh` already works per cold-pool repo — no change
- `skill-deck.lock` remains a single file in the primary `working_set`
- Per-skill `mode` allows Codex to use `snapshot` (avoids directory-level symlink bug)
- Backward compat: comma-separated string still parses (with deprecation warning)

### Future

- `deck link --also` flag to sync only `also_link_to` targets (skip primary)
- Per-target `mode` override via array-of-tables: `[[deck.also_link_to]] path = ".codex/skills" mode = "snapshot"`