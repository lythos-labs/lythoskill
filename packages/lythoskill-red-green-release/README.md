# Red-Green Release

> User-acceptance-driven release workflow using heredoc patch files. No tag without explicit user LGTM.

## Status: Not Activated in This Project

This skill is **built but not linked** in the current `lythoskill` project. It exists in `skills/lythoskill-red-green-release/` as build output, but has been removed from `skill-deck.toml` and the active working set (`.claude/skills/`).

### Why (In This Project)

Two reasons:

1. **Drift with agent plan mode**. This skill assumes the agent writes and executes `pr-*.sh` patches autonomously after a brief plan confirmation. In practice, the project's plan mode requires detailed implementation plans to be written to a plan file and explicitly approved by the user before any code changes — a stricter gate than the skill's "Phase 1 → go ahead → Phase 2" flow.

2. **Covered by cortex governance**. The project's `lythoskill-project-cortex` already provides equivalent capabilities through its Task FSM + Epic + trailer-driven commit workflow:
   - Iteration unit → **Task** (1–3 days, self-contained)
   - State machine → **Task FSM** (backlog → in-progress → review → completed)
   - User acceptance → **review → done** transition
   - Commit + tag → **Git trailers** (`Closes: TASK-xxx`)
   - Version planning → **Epic** with lane management
   - History + rollback → Git log + `git revert`

Cortex's state machine runs natively on git. Red-Green Release's `archived-patches/` + `.bak` files recreate a second state machine outside git — redundant once cortex is in use.

### Where This Skill Still Makes Sense

This skill is **not deprecated** — it is simply superseded by cortex *within this monorepo*. It remains useful in scenarios where:

- **Distributed / async collaboration**: Patches can be emailed, posted in issues, or shared via web UI for a human to review and apply manually. The heredoc format is self-contained and human-readable.
- **Web-based agent interactions**: When the agent runs in a chat/web interface without direct git access, `pr-*.sh` files serve as portable "diffs" that the user copies and runs locally.
- **Repomix-style workflows**: Feed a codebase dump (e.g., via Repomix) into a web chat, let the agent propose changes as heredoc patches, and apply them locally — no direct repo access required.
- **No cortex available**: Projects without `lythoskill-project-cortex` can use this as a lightweight stand-in for iteration governance.
- **Rollback without git**: Environments where `git revert` is not an option (e.g., deployed configs on bare-metal servers) benefit from the `.bak` backup mechanism.

## Overview

This is a pure **Skill** layer package — no Starter (npm package), no CLI, no dependencies. It consists of a single `SKILL.md` and optional reference files that agent platforms read directly.

## Usage (If You Want It)

Add to your `skill-deck.toml`:

```toml
[tool]
skills = ["lythoskill-red-green-release"]
```

Then run `bunx @lythos/skill-deck@0.9.15 link` to activate.

## Skill Documentation

[packages/lythoskill-red-green-release/skill/SKILL.md](../../packages/lythoskill-red-green-release/skill/SKILL.md)

## Architecture

Part of the [lythoskill](https://github.com/lythos-labs/lythoskill) ecosystem. This package has no npm publish step — the Skill layer is the entire package.

## License

MIT
