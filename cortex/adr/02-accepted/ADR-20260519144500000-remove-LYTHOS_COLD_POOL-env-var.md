# ADR-20260519144500000: Remove `LYTHOS_COLD_POOL` Environment Variable

**Status**: Accepted
**Date**: 2026-05-19
**Supersedes**: Implicit early-scaffolding convention

## Context

`LYTHOS_COLD_POOL` was introduced as scaffolding during early cold-pool CLI development (before `deck.toml` existed and before the `cold_pool` field was standardized). It allowed users to override the default cold pool path via environment variable:

```bash
export LYTHOS_COLD_POOL="/custom/cold-pool"
bunx @lythos/skill-curator scan
```

## Current State

Today the cold pool path is configured through two primary channels:

1. **`deck.toml` `cold_pool` field** — the canonical source for deck-managed workflows:
   ```toml
   [deck]
   cold_pool = "~/.agents/skill-repos"
   ```

2. **`--pool` CLI flag** — explicit override for standalone curator operations:
   ```bash
   bunx @lythos/skill-curator scan --pool /custom/cold-pool
   ```

`LYTHOS_COLD_POOL` is **not read by `deck link`** — link.ts reads `parsedToml.deck?.cold_pool || "~/.agents/skill-repos"` with no env var fallback. It is only read by the standalone cold-pool CLI as a default when `--pool` is omitted.

## Decision

Remove `LYTHOS_COLD_POOL` from the codebase. The `--pool` CLI flag is more explicit, more discoverable, and aligns with the principle that configuration belongs in declarative files (`deck.toml`) or explicit CLI arguments, not hidden env vars.

## Rationale

| Decision | Why |
|----------|-----|
| Remove, not deprecate | The env var is undocumented, unused in practice (deck.toml covers all real workflows), and creates naming inconsistency with the `LYTHOS_` prefix family. |
| `--pool` replaces standalone usage | For the rare case of running curator without a deck, `--pool <path>` is clearer than an env var. |
| `deck.toml` replaces deck workflows | `cold_pool` in `deck.toml` is the SSOT. No env var should shadow it. |

## Migration

No action required for users:
- Users with `deck.toml` — already using `cold_pool` field, unaffected
- Users with `LYTHOS_COLD_POOL` — switch to `--pool` flag (curator CLI) or add `cold_pool` to deck.toml

## Consequences

- Simpler codebase: one less env var to document, test, and maintain
- Consistent `LYTHOS_` prefix family (no special-case `LYTHOS_COLD_POOL`)
- No hidden configuration paths — everything is either in `deck.toml` or explicit CLI flags

## Implementation

Remove references from:
- `packages/lythoskill-cold-pool/src/cold-pool.ts` (DEFAULT_COLD_POOL_PATH)
- `packages/lythoskill-cold-pool/src/cli.ts` (coldPoolPath fallback)
- `packages/lythoskill-cold-pool/src/mirror.test.ts` (if referenced)
