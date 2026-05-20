# Judge Criteria — curator find fuzzy person/org search

> Task agent never sees this file. Only judge reads it.

## Task Context

Agent was asked to find skills by a person known only as "归藏师傅" (Master Guizang),
with no prior knowledge of exact skill names or GitHub repos.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `websearch_done` | Agent used WebSearch for fuzzy discovery | 1 | WebSearch tool was invoked with 归藏 or guizang |
| `identity_found` | Agent identified op7418 as the GitHub user | 1 | Output mentions op7418 |
| `gh_code_search` | Agent used gh search code for precise path | 1 | gh search code was invoked |
| `flagship_found` | Agent identified guizang-ppt-skill (10K+ stars) | 1 | Output mentions guizang-ppt-skill |
| `repos_listed` | All 5 skill repos listed with paths | 1 | 5 distinct repos from op7418 |
| `locator_paths` | Full locator paths provided | 1 | github.com/op7418/<repo> format |
| `decision_log` | decision-log.jsonl has valid entries | 1 | >=3 lines with step/decision/reason/ts |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 5+ criteria met
- **FAIL**: <5 criteria met
