# reproduce.sh BDD Contract

> IoC-driven Agent BDD scenario format. Shell scaffold + agent handoff.

## Contract

### Directory Layout

```
packages/<name>/test/scenarios/<slug>-bdd/
├── reproduce.sh          # executable: shell scaffold + IoC handoff
├── judge.md              # criteria: judge agent only (task agent never sees)
├── decision-log.jsonl    # agent output: {"step","decision","reason","ts"}
└── judge-verdict.json    # verdict: {"verdict","criteria":{...},"judged_at"}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (including no-op / already-in-state) |
| 1 | Failure (agent should diagnose and retry) |
| 2 | SKIP (scenario not applicable to current environment) |

### IoC Markers

Shell echo statements that trigger agent role-taking:

| Marker | Meaning |
|--------|---------|
| `<spawn subagent>` | Agent self-assigns as the subagent |
| `Agent:` or `=== Step N:` | Agent reads as instruction addressed to it |
| `IoContract:` | Declares idempotency/exit code semantics |

### judge.md Schema

```markdown
| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| id | description | 1 or 0.5 | concrete verification method |
```

Verdict: PASS (all 1-weight) / PARTIAL (6+) / FAIL (<6)

### decision-log.jsonl Schema

```json
{"step":"...","decision":"...","reason":"...","ts":"ISO timestamp"}
```

### Idempotency

All commands are idempotent. Exit 0 includes no-op. IoC instructions
MUST state: "Exit 0 = success (including no-op)."

## Zero-Knowledge Verification

A fresh agent with NO prior context can:
1. Read handoff → find reproduce.sh path
2. `bash reproduce.sh` → read IoC instructions from stdout
3. Self-assign role at `<spawn subagent>` marker
4. Complete task, write decision-log.jsonl
5. Verify against judge.md, write judge-verdict.json

Verified: 2 independent zero-knowledge subagents, both PASS (2026-05-18).

## Related

- ADR-20260518024500631: BDD evolution from .agent.md to reproduce.sh
- wiki: shell-stdout-as-agent-prompt-injection.md
- wiki: control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md
