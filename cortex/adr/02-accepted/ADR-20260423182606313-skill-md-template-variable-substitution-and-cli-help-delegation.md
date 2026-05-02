# ADR-20260423182606313: SKILL.md Template Variable Substitution and CLI Help Delegation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-23 | Created |
| accepted | 2026-04-24 | Approved by user — implementation evolved via build pipeline |

## Context

Thin-skill pattern separates **intent** (SKILL.md, static) from **implementation** (npm package, evolving). Two boundary problems emerge at the build step:

### Problem 1: Version Drift

SKILL.md instructs agents to run commands like `bunx @lythos/deck link`. If `package.json` bumps from `0.1.0` to `0.2.0` but SKILL.md still references the old version, agents may execute stale commands, hit version mismatches, or hallucinate flags that existed in 0.1.0 but were renamed in 0.2.0.

### Problem 2: Help Duplication

Complex skills (like `lythoskill-deck`) have subcommands, flags, constraints, and domain schemas. Documenting all of this in SKILL.md creates a maintenance burden and a hallucination surface:

- SKILL.md says `--config` exists → CLI dropped it in v0.2.0 → agent fails
- SKILL.md omits `--dry-run` → agent never discovers it → underutilized feature
- Domain schema (`skill-deck.toml` sections) described in prose → agent writes invalid TOML

## Options Considered

### Option A: Static SKILL.md (Rejected)

Write everything in SKILL.md manually. Version numbers, command references, domain schema — all hardcoded in markdown.

- **Pros**: Simple, no build step complexity
- **Cons**: Guaranteed drift; every package.json change requires manual SKILL.md sync; agent hallucination risk from stale docs

### Option B: Template Variable Substitution + CLI Help Delegation (Selected)

**Build-time**: `lythoskill build` reads `package.json` and substitutes variables into SKILL.md:

| Variable | Source | Example |
|----------|--------|---------|
| `{{PACKAGE_NAME}}` | `package.json` → `name` | `@lythos/deck` |
| `{{PACKAGE_VERSION}}` | `package.json` → `version` | `0.1.0` |
| `{{BIN_NAME}}` | `package.json` → `bin` first key | `lythoskill-deck` |
| `{{BIN_ENTRY}}` | `package.json` → `bin` first value | `./src/cli.ts` |

**Runtime**: Agent help comes from CLI `--help`, not SKILL.md:

```
SKILL.md (intent layer):
  "Use lythoskill-deck to manage skill working sets"
  "Run: bunx @lythos/deck link"

CLI --help (reference layer):
  lythoskill-deck link [--deck <path>]
  lythoskill-deck validate <deck.toml>
```

- **Pros**: Single source of truth (package.json); CLI help is always current; SKILL.md stays thin
- **Cons**: Build step required; agent must know to run `--help` when uncertain

### Option C: Schema-Driven SKILL.md Generation (Deferred)

Generate entire SKILL.md "Reference" appendix from TypeScript/Zod schemas at build time.

- **Pros**: Complete accuracy; no hallucination surface
- **Cons**: Overkill for simple skills; increases build complexity; may bloat SKILL.md context

## Decision

Adopt **Option B**:

1. **Template substitution** at build time for version/package identity variables
2. **CLI `--help` delegation** at runtime for command details and domain schema

SKILL.md contains:
- Intent and usage examples (what the skill does, when to use it)
- High-level command examples (copy-pasteable, but not exhaustive)
- Constraints and philosophy (deny-by-default, max_cards budget)

SKILL.md does **NOT** contain:
- Exhaustive flag documentation (use `bunx @lythos/deck --help`)
- Domain schema details (use `bunx @lythos/deck validate` or read Zod source)
- Version-specific command syntax (substituted at build, but not the full matrix)

## Consequences

### Positive
- `package.json` is the single source of truth for package identity
- CLI help is always current with the deployed binary
- SKILL.md stays focused on intent, not reference
- Agent uncertainty → `bunx @lythos/deck --help` → accurate info

### Negative
- Build step is mandatory (no hand-edited `skills/*/SKILL.md`)
- Agent must be instructed to use `--help` when uncertain (SKILL.md should hint this)
- No offline schema reference in SKILL.md (requires network or local CLI for full docs)

### Follow-up
- Consider adding `validate` subcommand to all lythos tools for domain schema checking
- Consider a `lythoskill build --dry-run` to preview substitutions without writing

## Related
- ADR-20260423101938000: Thin Skill Pattern (foundational split)
- ADR-20260423124812645: Build output committed to Git (skills/ as dist)
- cortex/wiki/01-patterns/skill-loading-lifecycle.md
