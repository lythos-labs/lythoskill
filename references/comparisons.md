# Comparisons: How lythoskill Relates to Familiar Systems
> For agents: these analogies help activate relevant knowledge domains.
> For humans: "it's like X but not X" triangulation. Each comparison notes
> what IS shared and what is deliberately NOT.

## npm / package registries

**Shared**: Declarative manifest (`skill-deck.toml` ≈ `package.json`). Install command fetches from source. Lockfile pins resolved state.

**Not shared**: No central registry. No auth server. No transitive dependency resolution. The cold pool is a local git cache — `~/.agents/skill-repos/`, organized by host/owner/repo. Skills are git repositories, not tarballs behind a CDN. There is no `npm publish` equivalent for skills — the skill's source repo IS the registry entry.

**Why the difference matters**: A central registry creates a gatekeeping bottleneck and a single point of failure. The cold pool model means anyone's git repo is a valid skill source — no approval, no account, no infrastructure beyond git hosting.

---

## Maven / ~/.m2

**Shared**: Local artifact cache. `github.com/owner/repo` path convention mirrors Maven's `groupId/artifactId`. Downloaded once, linked into multiple projects.

**Not shared**: No artifact repository (Maven Central, Nexus). No version range resolution. No transitive dependencies. No build lifecycle. Skills are source files, not compiled JARs.

**Why the difference matters**: Maven took 10+ years to accumulate its complexity. Lythoskill deliberately avoids version resolution, transitive deps, and repository servers — each of those is a future complexity trap that the agent-skill ecosystem doesn't need yet.

---

## Kubernetes RBAC / Admission Control

**Shared**: Declarative specification of what is allowed. Deny-by-default posture. The system reconciles actual state (working set) to desired state (skill-deck.toml). RBAC-like: only declared subjects (skills) have access (visibility).

**Not shared**: No scheduler. No pods. No etcd. No networking layer. No service discovery. No resource quotas. No namespaces. No controllers watching for drift.

**Why the difference matters**: The k8s comparison is structurally correct (declarative + reconcile + deny-by-default) but proportionally misleading — k8s is a distributed operating system; lythoskill is a symlink manager. The shared principle is the governance pattern, not the scale.

---

## Go modules

**Shared**: Module path convention (`github.com/owner/repo`). Local module cache. `go.mod` ≈ `skill-deck.toml`. `go.sum` ≈ `skill-deck.lock`.

**Not shared**: No proxy (proxy.golang.org). No semantic versioning. No `replace` directives. No minimum version selection. The cold pool has no checksum database — trust is git-based, not sumdb-based.

**Why the difference matters**: Go's module system solved problems at Google scale. Lythoskill's cold pool is simpler because the problem is simpler — skills don't have the diamond dependency problem that Go modules solve.

---

## Makefile

**Shared**: Declares targets. Coordinates tools. A single file controls what gets executed.

**Not shared**: No build rules. No file timestamps. No implicit rules. `skill-deck.toml` declares what skills are *visible*; it doesn't define a build pipeline.

---

## Cargo.toml / Rust

**Shared**: Declarative dependency manifest. `[dependencies]` ≈ `[tool.skills]`. Lockfile for reproducibility.

**Not shared**: No build system. No feature flags. No optional dependencies. No workspace inheritance.

---

## What lythoskill Actually Is (Bottom Line)

A **declarative coordination layer for agent skills** — closer to a symlink manager with a manifest than to a package manager or an orchestrator. The cold pool is a git cache. The lockfile is a resolved path map. The deny-by-default policy is filesystem-level enforcement.

If a comparison helps you understand it but also suggests capabilities that aren't there, the comparison is doing both its job (orientation) and its disservice (overpromise). Read each analogy above as "where the shared principle ends, lythoskill stops."

---

## Landscape: How lythoskill Compares to Other Skill Management Approaches

Different approaches to managing agent skills, and how they feel at different scales.

### `npx skills add` (Vercel)

The de facto standard. `npx skills add <repo>` downloads a skill into `.claude/skills/`. Skills stay there until `remove`. A `skills-lock.json` pins versions for teammates. Discovery via `npx skills find` or [skills.sh](https://skills.sh). Supports Claude Code, Cursor, Codex, Copilot (`-a` flag per install). The flow: find → add → use → remove.

- 3 skills, 1 project: Perfect. Simple, fast, just works.
- 10 skills across 3 projects: Each project has its own `.claude/skills/`. Adding a skill to one doesn't affect others — but unused skills accumulate. No deny-by-default.
- 50 skills across 10 projects: You're managing skills per-project with no shared cold pool. Each project re-downloads. Comparing skill quality requires external tools.

### `git clone` (Manual)

Clone a skill repo directly into `.claude/skills/` or symlink from a local checkout. No tooling. No lockfile. No discovery. The flow: find repo URL → clone → it's there.

- 3 skills: Fine. You know where everything is.
- 10+ skills: No version tracking. No teammate reproducibility. Did you clone `main` or a specific tag? Unknown.

### `.skill` / tar dist (Release Artifact)

Some skills are distributed as `.skill` files (tarballs with SKILL.md + scripts). Designed for registry-style distribution — download, extract, use. Similar to npm packages but for skills.

- Advantage: Pre-built, versioned, no git dependency.
- Disadvantage: Another artifact format. Author needs a build step. Consumer needs extraction tooling. Ecosystem is fragmented.

### Skill Hubs (skills.sh, agentskills.io, mcp.so, etc.)

Discovery platforms — search, browse, find skills. Each hub has its own indexing, its own quality criteria, its own curation. Some are community-driven, some are vendor-curated.

- 3 skills: Search → find → install. Hub adds value as discovery.
- 50 skills: Which hub has the best data? Are reviews real or astroturfed? Is the hub's ranking aligned with YOUR needs?
- lythoskill's curator: Scans YOUR cold pool (what you actually have), not an external registry. Agent-driven discovery — WebSearch + curator query + arena verify — rather than hub ranking alone.

### lythoskill

Declare → reconcile. Skills live in a shared cold pool. Only declared skills appear in the working set. One TOML coordinates across platforms. The flow: declare → link → agent sees only what's declared.

- 3 skills, 1 project: Overhead you don't need. Use `npx skills add`.
- 10 skills across 3 projects: Cold pool means download once. Each project declares its own subset. Switch between decks per task phase.
- 50 skills across 10 projects: Deny-by-default prevents context pollution. Arena compares skill quality on YOUR tasks. Curator indexes YOUR cold pool. Deck phases isolate different working modes.

### Summary

| | 1 project, 3 skills | 5 projects, 20 skills | 10 projects, 50+ skills |
|---|---|---|---|
| `npx skills add` | ✅ Best fit | ⚠️ Works, accumulates noise | ❌ No deny-by-default, no cross-project sharing |
| `git clone` | ✅ Works | ⚠️ Manual tracking | ❌ No reproducibility |
| `.skill` tar | ✅ Clean install | ⚠️ Author needs build step | ❌ Fragmented format |
| Skill hubs | ✅ Discovery | ⚠️ Hub quality varies | ⚠️ Ranking ≠ your needs |
| lythoskill | ❌ Overhead | ✅ Cold pool + deny-by-default | ✅ Full governance |

The threshold where lythoskill becomes the right choice is when you have enough skills that you need to declare what's IN rather than manage what's OUT.
