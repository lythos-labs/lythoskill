# Judge Criteria — deck remove

> Task agent never sees this file.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| toml_removed | skill-deck.toml does NOT contain skill-a | 1 | grep/cat toml → no [tool.skills.skill-a] |
| toml_preserved | skill-deck.toml still contains skill-b | 1 | grep/cat toml → [tool.skills.skill-b] present |
| symlink_removed | .claude/skills/skill-a does NOT exist | 1 | ls/lstat → ENOENT |
| symlink_preserved | .claude/skills/skill-b is a symlink | 1 | lstat → isSymbolicLink() = true |
| cold_pool_intact | cold-pool/localhost/me/skill-a/SKILL.md exists | 1 | SKILL.md content = "# skill-a" |
| relink_stable | deck link after remove does not restore skill-a | 1 | Run link → skill-a still absent from toml+symlink |
| decision_log | decision-log.jsonl has valid entries | 1 | ≥6 lines with step/decision/reason/ts |

## Verdict

- PASS: all criteria met
- FAIL: any criterion missing
