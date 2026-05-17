# Zero-Knowledge Arena Agent-Orchestrated E2E

> **Status**: Milestone — protocol works end-to-end with honest caveats.
> **Date**: 2026-05-17
> **Arena version**: 0.14.0

## What This Proves

A subagent with **zero prior knowledge** of arena successfully executed the full agent-orchestrated protocol:

```
Read arena SKILL.md → prepare-workdir → preflight → task → self-judge → archive
```

| Dimension | Evidence |
|-----------|----------|
| SKILL.md comprehension | Subagent read arena SKILL.md, understood Decision Tree, chose correct mode (single) |
| CLI invocation | `bunx @lythos/skill-arena@0.14.0 prepare-workdir` + `archive` used correctly |
| Sandbox discipline | Workdir in `/tmp`, archive output in committed dir |
| Decision logging | 13-entry decision-log.jsonl with timestamps, phases, and reasoning |
| Self-judgment | Subagent scored its own output (8.7/10) with honest weaknesses |
| reproduce.sh | Auto-generated replay script (see caveats below) |
| No parent pollution | Parent working set unchanged after run |

## Test Configuration

| Item | Value |
|------|-------|
| Skill under test | frontend-design (Anthropic) |
| Deck | Single skill, no brand-guidelines |
| Task | "Generate a 'Subscribe' button HTML component" |
| Model | DeepSeek4Pro (user-configured) |

## Reproduce.sh Replay (Verified)

The `reproduce.sh` was independently replayed by a different subagent.

| Origin | Agent | Decision Log |
|--------|-------|-------------|
| First run | DeepSeek4Pro (zero-knowledge) | 13 entries — `decision-log.jsonl` |
| Replay | DeepSeek4Pro | 11 entries — `replay-decision-log.jsonl` |

SHA-256 checksums match between workdir and archive. Both agents produced the same structure: `subscribe-button.html` + `decision-log.jsonl`.

### Why reproduce.sh Is Agent-Only

`bash reproduce.sh` prints Step 3 as an echo line. A human sees text. An agent reads stdout, recognizes `<spawn subagent>` as its role, and takes over. This IoC pattern **emerged from the first subagent** — it wrote echo as a prompt channel without being told. The replay subagent understood without a schema.

→ Wiki: [Shell stdout as Agent Prompt Injection](../../cortex/wiki/01-patterns/2026-05-17-shell-stdout-as-agent-prompt-injection.md)

## Output Structure

```
2026-05-17-zero-knowledge-arena-e2e/
├── README.md                          ← You are here
├── report.md                          ← Subagent's self-judge report
├── reproduce.sh                       ← Auto-generated replay script
└── side-a/
    ├── decision-log.jsonl             ← 13 decisions, full reasoning chain
    └── artifacts/
        └── subscribe-button.html      ← 9KB self-contained HTML
```

## Honest Assessment

### What Worked
- Protocol execution: all 4 steps (setup, preflight, dispatch, archive) completed
- CLI commands: `prepare-workdir` and `archive` resolved from npm (0.14.0)
- Decision log: 13 entries covering design-thinking through accessibility
- archive skipped system files (`.claude`, `skill-deck.toml`, `AGENTS.md`) correctly
- Parent deck unchanged after run (15 skills, no pollution)

### Caveats
1. **reproduce.sh has known limitations**:
   - `--to ./playground/...` hardcodes a relative path — fails if CWD is not project root
   - Step 3 is marked "manual" — agent spawn is not a CLI command, so full automation is not achievable without an orchestrator
   - `--report "$WORKDIR/report.md"` assumes report.md exists before archive (timing issue)
2. **Single-deck only**: No cross-deck comparison, no Pareto analysis.
3. **Simple task**: One HTML button. A real arena run tests more complex artifacts.
4. **No cold-pool isolation test**: Used the project's own cold pool.

### Why This Is Still Valuable
This is the first end-to-end validation that a **zero-knowledge subagent can read arena SKILL.md and independently execute the agent-orchestrated protocol using CLI subcommands**. The reproduce.sh demonstrates the *intent* of one-command replay. The decision-log.jsonl proves the agent's reasoning chain is observable. These are the foundations arena needs for reliable cross-deck and cross-player comparison.

## Reproduce

```bash
# reproduce.sh has known limitations — read it first
bash reproduce.sh
# Step 3 (agent task execution) must be done manually
```

## Related
- ADR-20260517140421425: CLI vs Agent-Orchestrated Behavioral Parity
- ADR-20260517142840955: Agent-Adapter Independent Spawn Architecture
- Previous showcase: 2026-05-15-agent-orchestrated-arena (graduation exam, dual-deck vs)
