# ADR-20260517140421425: CLI vs Agent-Orchestrated Behavioral Parity

**Status**: Accepted
**Date**: 2026-05-17

## Status History

| Status | Date | Note |
|--------|------|------|
| accepted | 2026-05-17 | Accepted via ADR state transition |

## Context

Arena has two execution modes:
- **CLI** (`single`, `vs`): spawns agent via `Bun.spawn`, doing workdir creation, AGENTS.md, deck link, skill check, copy plan, stdout/stderr archiving automatically.
- **Agent-orchestrated** (no CLI): agent reads SKILL.md, manually creates workdirs, spawns subagents, collects outputs.

Before this ADR, agent-orchestrated mode required agents to write manual bash commands for every step. This was error-prone (forgot `--workdir`, polluted project deck, ran experiments in committed directories).

## Decision

Extract CLI's **mechanical execution** behaviors into reusable subcommands, so agent-orchestrated delegates to the same code:

- `prepare-workdir --deck <path> --out <dir> [--brief <text>]`: creates isolated /tmp workdir, copies deck, writes AGENTS.md, runs deck link, checks skill existence.
- `archive --from <workdir> --to <outdir> --sides side-a,side-b [--report <path>]`: copies outputs with the same skipSet as CLI single mode.

## Thin Skill Pattern Layering

| Layer | What | Where |
|-------|------|-------|
| Intent | What to test (single/vs, which decks) | Agent understands user request |
| Plan | How to organize (which sides, what task) | Agent reads SKILL.md, builds plan. `vs --dry-run` makes plan auditable. |
| Execute | Mechanical steps (workdir, link, copy) | CLI (`prepare-workdir`, `archive`, `single`, `vs`) |

Plan is NOT hardcoded in CLI — it's agent-intelligent. Execute IS hardcoded — it's deterministic and reusable.

## Black-Box Parity Standard

A CLI single run and agent-orchestrated + `prepare-workdir` + `archive` produce **indistinguishable** outputs from the agent's perspective:

| Artifact | CLI single | Agent-orchestrated |
|----------|-----------|-------------------|
| workdir in /tmp | ✅ | ✅ (via prepare-workdir) |
| AGENTS.md | ✅ | ✅ (same template) |
| deck link | ✅ | ✅ |
| skill existence check | ✅ | ✅ |
| agent output files | ✅ (via copy plan) | ✅ (via archive, same skipSet) |
| decision-log.jsonl | ✅ | ✅ |

CLI has agent-stdout.txt (server-side log). Agent-orchestrated has subagent .output file (system-managed). This is the only non-shared difference — it's an implementation detail, not a behavioral gap.

## Consequences

- Agent-orchestrated SKILL.md protocol now calls CLI commands instead of manual bash steps
- `prepare-workdir` and `archive` are the same code path regardless of mode
- New subcommands are documented in SKILL.md CLI Quick Reference
- No plan logic was moved into CLI — only mechanical execution