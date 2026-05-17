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
| Models | DeepSeek4Pro, Kimi K2.6 |

## Three-Model Cross-Comparison

Same `reproduce.sh`, same `frontend-design` skill, same task brief. Three independent agents. Three radically different designs — all valid.

| | DeepSeek4Pro (origin) | DeepSeek4Pro (replay) | Kimi K2.6 |
|---|---|---|---|
| **Aesthetic** | Luxury Editorial | Luxury Editorial | Neo-Brutalist |
| **Palette** | `#0e0c08` + gold | Dark + gold | `#f4f1ea` + `#ff2a6d` + `#05d9e8` |
| **Typography** | Playfair Display + DM Mono | Playfair Display | Archivo Black + Space Mono |
| **Borders** | Fine gold inner ring | Fine gold | 4px solid black + 8px hard shadow |
| **Copy tone** | "Dispatches from the frontier" | Editorial | "Join the Chaos" / "No fluff. No funnels" |
| **Decisions** | 13 | 11 | 8 |
| **Score** | 8.7 | — | 8.7 |
| **Code** | 9KB | 7.1KB | 3KB |
| **File** | `side-a/decision-log.jsonl` | `replay-decision-log.jsonl` | `kimi-k2.6-decision-log.jsonl` |

### Key Finding

Both extremes — luxury editorial dark and neo-brutalist light — satisfy the `frontend-design` skill's constraints: no AI-slop, no banned fonts, distinctive aesthetic. The protocol is identical; the design is model-dependent. **This is exactly what arena exists to compare.**

The replay subagent (DeepSeek4Pro, same model, different run) converged on the same aesthetic direction as the origin — suggesting intra-model consistency. The Kimi K2.6 diverged to a completely different valid solution — confirming inter-model variance.

## Reproduce.sh Replay (Verified)

The `reproduce.sh` was independently replayed by a different DeepSeek4Pro subagent. SHA-256 checksums match between workdir and archive. Same structure: `subscribe-button.html` + `decision-log.jsonl`.

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
