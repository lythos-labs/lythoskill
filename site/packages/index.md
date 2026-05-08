# Packages

> Each package solves one governance problem. Install what you need.

## Core

### `@lythos/skill-deck`

**Declarative skill governance.** `skill-deck.toml` declares which skills your project uses. `deck link` syncs the working set. Undeclared skills are physically absent — deny-by-default. Supports symlink and snapshot modes, cross-platform working sets, k8s-style `reconcile`.

[README](/packages/lythoskill-deck/README.md) · `bunx @lythos/skill-deck@latest link`

### `@lythos/skill-arena`

**Scientific skill comparison.** Same task, different decks, subagent scoring. Arena spawns isolated agent environments, scores outputs against criteria, and computes Pareto frontiers. Know which skill *actually* works — not which has more stars.

[README](/packages/lythoskill-arena/README.md) · `bunx @lythos/skill-arena@latest agent-run`

### `@lythos/skill-curator`

**Read-only skill discovery.** Scans cold pools, extracts SKILL.md frontmatter, generates `REGISTRY.json` + `catalog.db` for structured querying. Three-layer trust model: author desc → community index → arena results. Never modifies skills — librarian, not gardener.

[README](/packages/lythoskill-curator/README.md) · `bunx @lythos/skill-curator@latest scan`

### `@lythos/project-cortex`

**Agent-native project governance.** Create tasks, epics, ADRs with timestamp IDs. GTD workflow (backlog → in-progress → review → done). Husky hooks auto-close tasks from git commit trailers. `probe` catches status drift.

[README](/packages/lythoskill-project-cortex/README.md) · `bunx @lythos/project-cortex@latest task "..."`

## Platform

### `@lythos/cold-pool`

**Skill repository resource holder.** Single owner of git side-effects (clone, fetch). Metadata DB tracks HEAD refs, skill content hashes, cross-deck references. Intent/plan/execute primitives for safe side-effect management.

[README](/packages/lythoskill-cold-pool/README.md)

### `@lythos/infra`

**Runtime infrastructure base.** `SqliteDb` base class (lazy-open, schema versioning, `exec`/`queryOne`/`queryAll`) and `fetchConfigFromUrl` (URL fetch + GitHub raw conversion + 24h TTL cache). Shared by cold-pool, curator, and future packages.

[README](/packages/lythoskill-infra/README.md)

### `@lythos/agent-adapter`

**Swappable agent backend.** `AgentAdapter` interface + `useAgent('name')` registry. Arena and BDD runner don't know which CLI is executing. DeepSeek serve, Claude SDK, Kimi CLI — same `spawn()` interface.

[README](/packages/lythoskill-agent-adapter/README.md)

## Experience

### `@lythos/skill-creator`

**Skill scaffolding and build.** `init` creates a new skill package. `build` renders `packages/<name>/skill/SKILL.md` → `skills/<name>/`. `bump` performs lock-step versioning across all packages. Align checks consistency.

[README](/packages/lythoskill-creator/README.md) · `bunx @lythos/skill-creator@latest init my-skill`

### `@lythos/project-scribe`, `@lythos/project-onboarding`, `@lythos/project-scribe-weekly`

**Session memory CQRS.** Scribe writes daily handoffs. Onboarding reads them. Scribe-weekly synthesizes 7 days into a 4-quadrant retrospective. cross-agent, cross-platform session continuity.

### `@lythos/test-utils`

**BDD harness for agent + skill + CLI testing.** `AgentAdapter` test harness, structured judge verdicts (Zod schemas), agent BDD scenario runner. Used by deck, arena, and curator's integration tests.
