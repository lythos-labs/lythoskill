---
status: proposed
author: agent-swarm
---

# ADR-20260503170000000: Monorepo Toolchain — Bun-only and Root Package.json Conventions

## Context

This project is a single-human + agent-swarm team. Toolchain consistency must be enforceable by automation (pre-commit hooks, `align --fix`) rather than tribal knowledge. Past drift (pnpm artifacts left behind after migrating to Bun, root `package.json` accumulating runtime dependencies) caused confusion for incoming agents.

## Decision

### 1. Bun-only Toolchain

- **Package manager**: Bun (`bun install`, `bun.lock`)
- **Runtime**: Bun (native TypeScript execution, no compilation step)
- **Workspace declaration**: `workspaces` array in root `package.json` (Bun native format)
- **Forbidden artifacts**: `pnpm-lock.yaml`, `pnpm-workspace.yaml` must not exist in repo root

Rationale:
- Bun's workspace format is simpler than pnpm's YAML config
- Single lockfile eliminates "which package manager should I use?" ambiguity
- Team = 1 human + agents; documentation (AGENTS.md) is the SSOT for toolchain decisions

### 2. Root Package.json Must Not Carry Runtime Dependencies

- Root `package.json` may have `devDependencies` for workspace-level tools (husky, linters)
- Root `package.json` must not have `dependencies` (runtime packages used by leaf packages)
- Runtime dependencies must be declared in the leaf `packages/*/package.json` that actually imports them

Rationale:
- Bun monorepo best practice: root is workspace metadata only
- Prevents "it works because root has it" implicit dependency bugs
- Aligns with `creator align --fix` auto-convergence

## Consequences

- ADR compliance check (`scripts/adr-check.sh`) enforces both rules at commit time
- `align --fix` auto-removes pnpm residuals and root runtime deps
- New agents reading AGENTS.md see "Bun workspaces" not "pnpm workspaces"

## Rejected Alternatives

- **pnpm + Bun hybrid**: Rejected. Lockfile fork risk (different install → different dependency trees). Team size = 1 human, no need for pnpm's advanced features (content-addressable store, strict isolation).
- **Keep root deps for "convenience"**: Rejected. Violates package boundary. Deck's `@iarna/toml`/`zod` were already declared in `packages/lythoskill-deck/package.json`; root copy was redundant.
