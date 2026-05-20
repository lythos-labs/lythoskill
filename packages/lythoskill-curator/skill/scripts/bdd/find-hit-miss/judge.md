# judge.md — curator find HIT + MISS BDD

## Criteria

| # | Criterion | Pass condition |
|---|-----------|---------------|
| 1 | HIT finds real skill | Output shows `name: ljg-think` |
| 2 | HIT shows path | Output contains path with `ljg-think` |
| 3 | HIT shows deck add | Output contains `deck add` or `skill-deck.toml` |
| 4 | MISS shows not-found | Output contains "not found" or equivalent |
| 5 | MISS shows search guidance | Output references `gh search code` or `WebSearch` |
| 6 | MISS discovery via WebSearch | Agent identifies the real repo (MiniMax-AI/skills) |
| 7 | Discovery reports curator add | Agent provides `curator add` or equivalent command |
| 8 | Agent writes decision-log.jsonl | ≥5 JSON entries covering full workflow |
| 9 | No commands fail | All CLI commands exit 0 |

## Verdict

- **PASS**: ≥7 of 9 criteria met, including all of #1-5 (core CLI behavior)
- **FAIL**: any of #1-5 fails, or agent cannot complete the discovery workflow

## Notes

- The cold pool subset intentionally excludes `fullstack-dev` to test the discovery path
- `fullstack-dev` is a real skill at `github.com/MiniMax-AI/skills/skills/fullstack-dev`
- The agent may use WebSearch or any search tool to discover it
