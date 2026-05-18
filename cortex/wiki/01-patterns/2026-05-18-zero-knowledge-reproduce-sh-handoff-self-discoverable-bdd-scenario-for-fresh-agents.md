---
created: 2026-05-18
updated: 2026-05-18
category: pattern
---

# Zero-Knowledge reproduce.sh Handoff

> "看这个 md 剩下的你自己能找到做完" — 和 skill 最佳实践同构

**Discovered**: 2026-05-18, verified by 2 independent zero-knowledge subagents.
**Confidence**: High — both completed full BDD roundtrip with no prior context.

## Pattern

A fresh agent reads the daily handoff → finds the reproduce.sh path → runs it → reads IoC instructions from stdout → self-assigns role → completes BDD scenario → writes verdict.

The handoff is the entry point. The reproduce.sh is the executable. The judge.md is the acceptance criteria. The agent needs nothing else — no schema, no training, no prior context.

## The Self-Discovery Loop

```
Agent reads handoff
→ finds reproduce.sh path
→ bash reproduce.sh
→ reads stdout: "<spawn subagent>"
→ self-assigns role
→ executes task (creates files, runs tests)
→ writes decision-log.jsonl
→ reads judge.md
→ writes judge-verdict.json
→ reports PASS/FAIL
```

## Why It Works

| Property | Mechanism |
|----------|-----------|
| Handoff has the path | `packages/lythoskill-deck/test/scenarios/to-symlink-snapshot-bdd/reproduce.sh` |
| reproduce.sh is executable | Shell = agent native language |
| IoC handoff is self-discoverable | `<spawn subagent>` in stdout triggers role-taking |
| judge.md is separate | Task agent never sees scoring criteria |
| Coverage snapshots co-located | `test/scenarios/coverage-snapshot-*.md` |

## Related

- wiki `shell-stdout-as-agent-prompt-injection.md` — underlying IoC mechanism
- wiki `control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md`
- ADR-20260518024500631 — BDD evolution to reproduce.sh
- EPIC-20260518024809887 — tracking implementation
