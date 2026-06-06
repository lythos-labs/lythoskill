---
category: workflow
domain: release
since: 2026-04-23
status: accepted
summary: |
  Lock-step versioning, auth state boundaries, bump pipeline internals,
  and publish procedure. Auth is pre-configured — never modify.
---

# Release & Auth Workflow

> **Read this before running any `git remote`, `npm publish`, `npm login`, or version-bump command.**
> This contract is the single source of truth for who-writes-what during a release.
> Past agents have damaged this state by improvising — assume the setup is intentional.

Codified by **ADR-20260502233119561** (lock-step bump command and policy) and **ADR-20260502234833756** (skill package identification).

## Authentication State — Pre-configured, Do Not Modify

| File / Resource | Purpose | Rule |
|------|------|------|
| `.git/config` (origin URL) | Git push/fetch | Origin uses SSH alias `git@calt13.github.com:Caltara/lythoskill.git`. **Never run `git remote set-url`** to embed a token, switch protocol, or "fix" anything. If `git push` fails, stop and ask. |
| `~/.ssh/` | SSH keys + alias config | **Off-limits.** Do not read, list, cat, or write inside this directory — even diagnostically. If git/SSH fails, surface the error and ask the user. |
| `.github-token` (project root, gitignored) | `gh` CLI auth only | Use as `gh auth login --with-token < .github-token`. **Never embed in a git URL or `.git/config`.** |
| `.npm-access` (project root, gitignored) | npm publish token | Read by `scripts/publish.sh`. **Never run `npm login`** or prompt the user to log in — fix the token file instead. |

If anything auth-related looks "broken", do not improvise a fix. Ask.

## Lock-step Versioning (One Version, All Packages)

Every `packages/*/package.json` and the root `package.json` carry the **same** version. A bump rolls every package + root together. This includes private infrastructure packages (e.g. `lythoskill-test-utils`) — lock-step is monorepo-wide. Build is filtered separately (see next section).

**Use the dedicated tool. Do not `jq`/`python`/`sed`/hand-edit.**

```bash
# Preview
bunx @lythos/skill-creator@0.16.0 bump patch --dry-run
bunx @lythos/skill-creator@0.16.0 bump 1.0.0 --dry-run

# Real run
bunx @lythos/skill-creator@0.16.0 bump patch       # 0.7.2 → 0.7.3
bunx @lythos/skill-creator@0.16.0 bump minor       # 0.7.2 → 0.8.0
bunx @lythos/skill-creator@0.16.0 bump major       # 0.7.2 → 1.0.0
bunx @lythos/skill-creator@0.16.0 bump 1.2.3       # explicit X.Y.Z
```

The `bump` pipeline (see `packages/lythoskill-creator/src/bump.ts`):
1. Write root `package.json` (only the `version` field changes).
2. Run `align(fix=true)` — syncs every `packages/*/package.json` to the new version. `align` already protects `{{...}}` placeholders in `SKILL.md` source files.
3. Run `build` for each package whose `packages/<name>/skill/` directory exists — re-renders `skills/<name>/SKILL.md` with the new version.

`bump` intentionally does NOT git-commit, tag, or push. It refuses downgrades and same-version targets.

## Skill Product Identification (Build-time Filter)

A package is a "skill product" iff `packages/<name>/skill/` exists. This filter applies to **build** (which packages render to `skills/<name>/`) but **NOT** to **version sync** (which is universal). Do not filter by `name.startsWith('lythoskill-')` — `lythoskill-test-utils` matches the prefix but is not a skill product. See ADR-20260502234833756.

## SKILL.md Source Files Are Templates

`packages/*/skill/SKILL.md` contains placeholders (`{{PACKAGE_VERSION}}`, `{{PACKAGE_NAME}}`, `{{BIN_NAME}}`, `{{BIN_ENTRY}}`). They are re-rendered into `skills/<name>/SKILL.md` on every build. **Never replace them with literal values in source** — that breaks future renders.

## Commit Policy

- `bump` produces an unstaged diff. Commit it with `chore(release): vX.Y.Z`.
- `.husky/pre-commit` runs `build --all` whenever `packages/**/skill/**` files change, then auto-stages `skills/`. This is independent of `bump` and protects against drift in everyday edits.
- Do not `--amend` a published commit. Do not `--no-verify`.

## New Package Publish List (Discipline)

**Every new npm package under `packages/` must be added to `scripts/publish.sh` `PACKAGES` array before its first release.**

The script is the single source of truth for what gets published. Packages not in the list are silently skipped — no error, just missing from npm. This has caused real incidents.

| Check | Command |
|-------|---------|
| After scaffolding a new package | `grep "packages/lythoskill-<new>" scripts/publish.sh` must match |
| After bump | Verify the new package appears in the publish log |

**Skill-only packages** (no `package.json`, no `src/`, pure `SKILL.md` under `skill/`) are exempt — they are build targets, not publish targets.

## Publish to npm

```bash
./scripts/publish.sh
```

The script reads `.npm-access`, configures the npm registry, runs `npm whoami` to verify auth, publishes packages in dependency order, and restores the original npm config on exit. Aborts on auth failure — fix `.npm-access`, never `npm login`.

## CI & Publish Gotchas

| Gotcha | Symptom | Fix |
|--------|---------|-----|
| **New package, stale lockfile** | `bun install --frozen-lockfile` fails in CI | `bun install` then commit `bun.lock` |
| **New package not in publish script** | Package missing from npm after release | Add to `scripts/publish.sh` PACKAGES array |
| **`require()` in TypeScript source** | Pre-commit hook rejects with ESM-only ADR | Use `import` / `await import()` — never `require()` |
| **SKILL.md edited, not rebuilt** | Skills directory stale, agent sees old instructions | `bunx @lythos/skill-creator@latest build` auto-runs in pre-commit when `skill/SKILL.md` changed |
| **Wrong CWD for git commands** | `git add <file>` fails with "did not match" | Always `cd` to repo root first |
| **Skills branch push race** | `[remote rejected] skills → skills (cannot lock ref)` | `git pull --rebase` then `git push` (concurrent agent sessions share the skills branch) |
| **New adapter, wrong package** | Heavy daemon code in base interface package | Lightweight CLI adapters → `@lythos/agent-adapter`. Daemon/SSE/port management → new `@lythos/agent-adapter-<name>` package |
| **Test expects old adapter** | `listAgents()` no longer contains removed adapter | Update test expectations when removing adapters |
