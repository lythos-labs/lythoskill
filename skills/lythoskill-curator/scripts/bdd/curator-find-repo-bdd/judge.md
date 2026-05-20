# Judge Criteria — curator find repo URL exploration

> Task agent never sees this file. Only judge reads it.

## Task Context

Agent was given a repo URL `github.com/lijigang/ljg-skills` and asked to discover
what skills are inside without cloning.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `gh_api_peek` | Agent used gh api to peek at repo contents | 1 | gh api repos/lijigang/ljg-skills/contents was invoked |
| `skills_dir_found` | Agent found the skills/ directory | 1 | Output shows skills/ listing |
| `skill_list` | Agent listed individual skill names | 1 | Output contains skill names (ljg-think, ljg-book, etc.) |
| `total_count` | Agent reported total skill count (21) | 1 | Output mentions 21 skills |
| `frontmatter_sample` | Agent peeked at frontmatter for 2+ skills | 1 | gh api .../SKILL.md with base64 decode was invoked |
| `curator_add_cmd` | Agent output curator add command | 1 | Output contains curator add github.com/lijigang/ljg-skills |
| `decision_log` | decision-log.jsonl has valid entries | 1 | >=3 lines with step/decision/reason/ts |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 5+ criteria met
- **FAIL**: <5 criteria met
