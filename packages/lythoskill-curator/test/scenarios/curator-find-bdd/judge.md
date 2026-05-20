# Judge Criteria — curator find bare name → full path lookup

> Task agent never sees this file. Only judge reads it.
> Per ADR-20260518024500631 (judge separation) + ADR-20260514050300.

## Task Context

Agent was asked to look up two skill names via `curator find`:
- **test-skill**: should HIT (in cold pool, indexed)
- **fullstack-dev**: should MISS (not in cold pool) → WebSearch fallback

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `hit_name` | curator find test-skill outputs correct name | 1 | stdout contains "name: test-skill" |
| `hit_path` | Outputs correct path for cold-pool skill | 1 | stdout contains "localhost/me/test-skill" |
| `hit_deck_add` | Outputs deck add command for HIT skill | 1 | stdout contains "deck add" for test-skill |
| `miss_detected` | curator find fullstack-dev reports not found | 1 | stdout contains "not found" |
| `miss_websearch` | MISS output includes WebSearch guidance | 1 | stdout contains "WebSearch" |
| `websearch_done` | Agent performed WebSearch for fullstack-dev | 1 | WebSearch tool was invoked |
| `real_path_found` | Agent found the real fullstack-dev path | 1 | Output contains "MiniMax-AI" or equivalent real repo |
| `curator_add_command` | Agent output curator add command for MISS skill | 1 | Output contains "curator add" with repo path |
| `deck_add_command` | Agent output deck add command for web-found skill | 1 | Output contains "deck add fullstack-dev" |
| `decision_log` | decision-log.jsonl has valid entries | 1 | >=4 lines with step/decision/reason/ts |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 7+ criteria met
- **FAIL**: <7 criteria met
