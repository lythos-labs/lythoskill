---
category: architecture
domain: skill-design
since: 2024-04
status: accepted
summary: |
  Three-layer separation: Starter (npm package) → Skill (SKILL.md source) → Output (committed skills/). Intelligence in SKILL.md, stable integration in npm, mechanical glue in CLI.
---

# Thin Skill Pattern

## Three-Layer Separation

```
Starter (packages/<name>/)       → npm publish → implementation + CLI
Skill   (packages/<name>/skill/) → build → SKILL.md + thin scripts
Output  (skills/<name>/)         → committed → agent-visible skill
```

1. **Starter**: The npm package (`@lythos/skill-creator`, `@lythos/skill-deck`, etc.). Contains all implementation logic, dependencies, and CLI entry points. Agents do not read this code directly.
2. **Skill**: Lives in `packages/<name>/skill/`. Contains only `SKILL.md` (intent description) and `scripts/` (thin routers that call `bunx <starter> <command>`). `SKILL.md` has no knowledge of dependencies.
3. **Output**: The `skills/` directory contains the built output. **`skills/` is build output that must be committed to Git** so agent users can clone and use skills without building. This mirrors how Vercel skills.sh and other agent ecosystems distribute skills — a consumer looking only at `skills/` sees a self-contained skill collection; `packages/`, `cortex/`, and `daily/` are implementation details they can ignore.

## Principle

**Intelligence in SKILL.md, stable integration in npm, mechanical glue in CLI.**

- Skill ≈ Spring Controller (routing layer, interface contract)
- npm package ≈ Spring Service (implementation layer, free to evolve)
- Starter ≈ Spring Boot Starter (BOM + CLI entry)

## Build Pipeline

The `build` command (`packages/lythoskill-creator/src/build.ts`):
1. Copies from `packages/<name>/skill/` to `skills/<name>/`
2. Filters out dev files (`__tests__`, `node_modules`, `.test.ts`, `.spec.ts`)
3. Validates that `SKILL.md` starts with YAML frontmatter (`---`)
4. Substitutes template variables (`@lythos/skill-creator`, `lythoskill-creator`, etc.) from the package's `package.json`

## Skill Product Identification

A package is a "skill product" iff `packages/<name>/skill/` exists. This filter applies to **build** (which packages render to `skills/<name>/`) but **NOT** to **version sync** (which is universal). `lythoskill-test-utils` is not a skill product despite the prefix.

## SKILL.md as Template

`packages/*/skill/SKILL.md` contains placeholders (`0.19.0`, `@lythos/skill-creator`, `lythoskill-creator`, `src/cli.ts`). They are re-rendered on every build. **Never replace them with literal values in source** — that breaks future renders.
