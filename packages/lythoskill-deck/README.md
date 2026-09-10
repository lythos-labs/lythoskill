# @lythos/skill-deck

![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen) ![CI](https://img.shields.io/badge/CI-199%20unit%20%2B%2021%20CLI%20BDD-brightgreen) ![Agent BDD](https://img.shields.io/badge/Agent%20BDD-5%20local-blue) ![Intent/Plan](https://img.shields.io/badge/arch-intent%2Fplan%2Fexecute-8A2BE2)

> Declarative skill deck governance. Declare which skills a project needs in `skill-deck.toml`, run `deck link`, and the working set becomes an exact mirror. Undeclared skills are physically removed — deny-by-default.

## Quick Start

```bash
# Add a skill from skills.sh syntax (owner/repo, no conversion needed)
bunx @lythos/skill-deck@0.19.1 add vercel-labs/agent-skills

# Or with @skill filter:
bunx @lythos/skill-deck@0.19.1 add mattpocock/skills@tdd

# Or full-qualified locator:
bunx @lythos/skill-deck@0.19.1 add github.com/anthropics/skills/skills/frontend-design

# Sync working set (creates symlinks, removes undeclared skills):
bunx @lythos/skill-deck@0.19.1 link
```

## Commands

| Command | Args | Description |
|---------|------|-------------|
| `link` | `[--deck <path>] [--workdir <dir>]` | Sync working set. Removes undeclared skills. |
| `add` | `<locator> [--alias] [--type] [--deck]` | Add skill to cold pool + deck.toml. Accepts skills.sh syntax and FQ locators. |
| `refresh` | `[<alias>] [--deck] [--exec]` | Scan declared skills for upstream updates. Plan-only by default; add `--exec` to pull. |
| `validate` | `[--deck <path>] [--workdir] [--remote]` | Validate deck config. Cold-pool-missing skills warn (not error) with HATEOAS next-step suggestions. Use `--remote` to verify paths on GitHub. |
| `remove` | `<alias> [--deck]` | Remove skill from deck.toml and working set. Cold pool untouched. |
| `to-symlink` | `<alias> [--deck] [--workdir]` | Switch a skill to symlink mode (live link, follows cold pool). |
| `to-snapshot` | `<alias> [--deck] [--workdir]` | Switch a skill to snapshot mode (pinned copy of current HEAD). |
| `per-run` | `<cli> [--deck] [--workdir]` | Render a per-run CLI invocation from deck state — skills visible for this run only, zero projection (nothing linked or written). Verified renderers: `kimi` (`--skills-dir` / `extra_skill_dirs`), `crush` (`option skill-path`). |
| `migrate-schema` | `[--dry-run]` | Convert legacy string-array deck.toml to alias-as-key dict. |

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--deck <path>` | Path to skill-deck.toml | Find upward from cwd |
| `--workdir <dir>` | Working directory | cwd |
| `--alias <name>` | Explicit alias (default: basename of path) | — |
| `--type <type>` | Target section for `add`: `innate`, `tool`, `transient` | `tool` |
| `--mode <mode>` | Link mode: `symlink` (default) or `snapshot` | `symlink` |
| `--dry-run` | Show plan without executing | — |
| `--exec` | For `refresh`: execute git pull instead of plan-only | — |

## Safety guards

`link` refuses to operate if `working_set` resolves to your home directory or root (`/`).

**Snapshot mode** (`--mode snapshot`): copies the source directory into the working set instead of symlinking. Snapshots are pinned to the cold pool version at link time. Use `deck to-symlink <alias>` to switch back.

**CLI-layout policy layer** (`src/cli-layout.ts`): per-CLI data from the 2026-09-09 16-CLI skill-dir survey — symlink guarantee tier (docs/issue/hazard), fan-out targets, per-run switching mechanisms, hazard flags with source URLs. `deck link` consults it:

- Symlink removal never recurses into link targets (Goose #11600 recursive-delete class) — cold-pool content is unlink-proof by construction, with dormancy tests.
- Fan-out to `.goose/skills` prints a data-loss warning (removing deck skills via the Goose UI can delete cold-pool content); the shared `.agents/skills` dir stays quiet.
- Fanning the same deck into two dirs scanned by one CLI warns about duplicate-name discovery (opencode #46327).
- A skill source inside the fan-out dir is refused (symlink-cycle ENAMETOOLONG class, opencode #45961).
- `.clinerules` fans out as snapshot copies — Cline does not follow symlinks there.
- A fan-out target **no surveyed CLI scans** prints an **info** line (`<dir>: no layout data — hazards unknown`). Silence would read as "checked, and safe"; it is not — it means deck has no data for that directory. See *Unlisted targets* below.
- A fan-out target that is **not a skills dir but a CLI's config root** (or a container of config roots) prints a **warning**. See *Wrong-level targets* below.

> **"Silence is earned" constrains *noise*, not *volume*.** It says deck must not print a line that
> carries no information ("checked, and fine" when nothing was checked). It does **not** say output
> should be short. Wherever deck *acts*, the output owes a HATEOAS-style message: what happened,
> why, and what to do next. Reading the rule as "print less" inverts it.

**Unlisted targets — silence is earned, not default.** The survey covers 16 CLIs; a target outside
it gets no hazard analysis, and the two checks above both no-op on it. Printing nothing there would
make `also_link_to = [".some-new-cli/skills"]` indistinguishable from a target that was checked and
came back clean — a missing rule read as a passed rule. So the info line is the default. To silence
it for a directory you *know* is out of scope, declare that knowledge:

```toml
[deck]
also_link_to = [".agents/skills", ".some-new-cli/skills"]
# gitignore-style acknowledgement: listed = silent. Suffix-matched, so one
# pattern covers both relative and absolute spellings of the same dir.
acknowledged_unlisted = [".some-new-cli/skills"]
```

The declaration is the source of the silence, and `skill-deck.toml` is git-tracked and reviewed —
which is the whole point. Two properties worth knowing: the acknowledgement suppresses **only** the
"no layout data" line, never a data-loss hazard (it is not a mute switch), and it is not checked for
staleness — a pattern that matches nothing stays quietly inert. Rationale: **ADR-20260910120047122**.

**Wrong-level targets — a config root is not a skills dir.** The primary scenario of a fan-out
target is *the directory a CLI scans for skills*. `~/.claude` and `~/.config` are more famous paths
than `~/.claude/skills` and `~/.config/goose/skills`, so they are what people reach for; fan-out then
creates skill entries directly inside them, mixing skills into `settings.json`'s directory. When a
target is not a skills dir but **contains one the survey knows** (at any depth), `deck link` warns:

```
⚠️  [warning] /Users/u/.claude: not a skills dir — it contains .claude/skills / ~/.claude/skills.
   Fan-out creates skill entries directly inside the dir named here; name the skills dir instead.
```

The message names the dirs to use, because the survey already knows them. Three properties:

- **No mute switch.** `acknowledged_unlisted` covers "we have no data for this dir"; this is the
  opposite — the table has the answer and says the config is wrong. There is no legitimate deck that
  fans skills into a CLI's config root, so no declaration silences it.
- **One verdict per target.** A wrong-level target does not *also* get the "no layout data" info line
  — two lines would contradict each other, and the info line's advice (acknowledge it) would not work.
- **Derived, not heuristic.** The check is the reverse of `layoutsScanning`: it fires only when a
  known `fanOutTargets` entry sits underneath the given dir. It does not try to classify arbitrary
  directories. Home and root themselves (`also_link_to = ["~"]`) are *not* covered here — that shape
  takes deliberate construction, and `working_set` is already refused outright for it
  (see *Safety guards*, first line). Known boundary, not an oversight.

The evidence is our own usage, which anyone can re-measure:
`grep -rh '^\s*working_set\s*=' examples/ showcase/ skill-deck.toml` → 67 of 68 declared targets are
a `skills` dir (`.claude/skills` ×60, `.agents/skills` ×4, `~/.claude/skills`, `.cursor/skills`); the
68th is `"skills"`, the build-output collision already forbidden by ADR-20260519144445916. **Zero**
config roots. The normal shape is measured, not assumed — which is what makes a single cheap signal
enough here. Rationale: **ADR-20260910120047122 § 名单外 vs 层级错位**.

**Ownership guard.** deck only removes an entry it can prove it created — a symlink resolving into
this deck's cold pool, or a path recorded in `skill-deck.state` (working set + every fan-out target
it wrote). Anything else is reported and left alone. Directory containment is deliberately *not*
the safety boundary: a fan-out target can be another project's `.claude/skills`, or a CLI's global
config, and "it is inside a directory I write to" does not make it deck's. The same predicate gates
`remove`, `to-symlink`, `to-snapshot`, and the reconciler.

There is no backup path: nothing needs backing up once deletion is ownership-scoped, and the old
tar archive was never restorable anyway (its members carried `../` prefixes). `--no-backup` is
accepted but inert, and says so when used.

Default decks (`.claude/skills` + `.agents/skills`) emit zero layout warnings and behave exactly as before.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation failed, deck not found, or budget exceeded |

## Why

When an AI agent has access to 50+ skills, context window pollution and silent conflicts become real problems. Two skills claiming the same niche, redundant descriptions, incompatible assumptions — all invisible until the agent hallucinates.

`skill-deck.toml` solves this by declaring *exactly* which skills the agent should see. `deck link` creates symlinks from the cold pool to the working set and **removes everything else**. Deny-by-default means undeclared skills physically do not exist in the agent's view.

## Key Concepts

| Concept | One-liner |
|---------|-----------|
| **Cold Pool** | All downloaded skills (`~/.agents/skill-repos/`). Agent cannot see here. |
| **skill-deck.toml** | Declares desired state: "this project uses these skills." |
| **`deck link`** | Reconciler. Makes the working set match the declaration. |
| **Working Set** | Where symlinks are created. Default: `.claude/skills/`. |
| **deny-by-default** | Undeclared skills are physically absent from the working set. |

## Platform Quick Reference

Different agents scan different directories. Set `working_set` in `skill-deck.toml` to match your agent:

| Agent | Default path | Notes |
|-------|-------------|-------|
| Claude Code | `.claude/skills/` | Default. No config needed. |
| Cursor | `.cursor/skills/` | Set `working_set` before `link`. |
| OpenClaw | `.agents/skills/` | Project-level deck recommended. See [POSSE syndication](https://github.com/lythos-labs/lythoskill/blob/main/cortex/wiki/01-patterns/2026-05-05-multi-agent-posse-syndication.md). |
| Hermes | `.hermes/skills/` | Use `external_dirs` in `~/.hermes/config.yaml` to point to project path. |

> **If you are an agent**: verify where your platform scans for skills, then set `working_set` before running `deck link`.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `❌ Skill not found: <name>` | Skill declared but not in cold pool | `deck add github.com/owner/repo/skill` or clone manually |
| `link` skips entries with warnings | Real files/directories exist in working set | Delete real directories in `working_set` and re-run `link` |
| `refresh` reports "Not a git repository" | Skill was copied (not cloned) into cold pool | Re-clone or use `deck add` |
| `link` refuses with "budget exceeded" | Declared skills > `max_cards` | Increase `max_cards` or remove unused skills |
| `link` refuses with "unsafe working_set" | `working_set` resolves to `~` or `/` | Use a relative path (e.g. `.claude/skills/`) |
| Agent doesn't see skills after `link` | `working_set` path doesn't match agent's scan location | Verify platform docs and set `working_set` correctly |
| Broken symlinks in working set | Skill moved or deleted from cold pool | Re-run `link` — recreates symlinks automatically |
| `deck add` fails with 404 | Locator format wrong or repo doesn't exist | Format: `github.com/owner/repo/skill-name` |
| `skill-deck.toml not found` | Running `link` outside project tree | Run from project root, or use `--deck ./path/to/skill-deck.toml` |

## Architecture

Deck separates pure logic from IO:

```
deck.toml  → RefreshPlan (deck, pure)          → execute with injectable IO
cold pool  → PrunePlan   (@lythos/cold-pool, pure) → execute with injectable IO
```

- **Refresh** (this package): `buildRefreshPlan()` / `executeRefreshPlan(plan, io)` in `src/refresh-plan.ts` — IO injected (`gitPull`, `delete`, `log`).
- **Prune** (`@lythos/cold-pool`): `buildPrunePlan(coldPoolPath)` / `executePrunePlan(plan, io)` in its `src/prune-plan.ts`. Prune plans from the **cold pool**, not from `deck.toml` — deck declares what to keep, the cold pool is what accumulates — so the functions live there, not here.

Full pattern: [Intent / Plan / Execute](https://github.com/lythos-labs/lythoskill/blob/main/cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md).

## Test Coverage

| Layer | Count | CI |
|-------|-------|----|
| Unit tests | 199 | ✅ |
| CLI BDD | 21 | ✅ |
| Agent BDD | 5 | local only |

## More Documentation

- **Skill layer** (agent-facing): [SKILL.md](https://github.com/lythos-labs/lythoskill/blob/main/packages/lythoskill-deck/skill/SKILL.md)
- **Project README** (ecosystem overview): [README.md](https://github.com/lythos-labs/lythoskill#readme)
- **Architecture**: [AGENTS.md](https://github.com/lythos-labs/lythoskill/blob/main/AGENTS.md)

## License

MIT
