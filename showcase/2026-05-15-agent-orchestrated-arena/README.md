# Agent-Orchestrated Arena — Graduation Exam (Basic vs Design-Enhanced)

> First end-to-end validation of the agent-orchestrated arena protocol.
> Zero CLI invocations. ReAct loop = arena runner.

## What this proves

| Dimension | Evidence |
|-----------|----------|
| Agent-orchestrated dispatch | 2 cells spawned in parallel via `sessions_spawn`, background=true |
| CWD isolation | Each cell had independent workDir, deck, and `.claude/skills/` |
| Preflight reliability | Both cells passed self-check (skills visible, CWD writable) |
| Design delta measurable | Design-enhanced cell produced Golden Hour palette + Arial/Georgia vs default styling |
| Artifact observability | Agent directly observed output content — no 0-byte agent-stdout.txt |

## Configuration

| Cell | Skills | Output |
|------|--------|--------|
| graduation-exam | 4 (docx, research, research-report, deck) | 170KB .docx |
| graduation-exam-design | 7 (+frontend-design, theme-factory, brand-guidelines) | 181KB .docx |

See [`report.md`](./report.md) for full comparative analysis.

## Protocol

Follows arena SKILL.md mermaid flowchart:

```
Cross-player? No (same Claude agent)
  → Agent reads config
  → PREFLIGHT: per-side workDir + deck link + self-check
  → SPAWN: parallel subagents, background=true
  → Collect artifacts → Comparative judge → Report
```

## Reproduce

```bash
# Re-run with the agent-orchestrated protocol
# (No arena CLI needed — this is the default mode)
```
