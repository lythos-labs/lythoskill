# Real-World Skill Repo Structure Survey

> Survey of popular skill repositories to validate deck locator assumptions.
> Date: 2026-05-07
> Related: EPIC-20260507012858669

## Method

GitHub API (`/repos/{owner}/{repo}/contents/`) used to inspect root directory structure.
No clone required — lightweight survey via public API.

## Findings

| Repo | Stars | Structure Pattern | Example Path |
|------|-------|-------------------|--------------|
| `anthropics/skills` | 68k+ | `skills/` subdir | `skills/pdf/SKILL.md` |
| `mattpocock/skills` | — | `skills/` + nested | `skills/engineering/tdd/SKILL.md` |
| `vercel-labs/agent-skills` | — | `skills/` subdir | `skills/react-best-practices/SKILL.md` |
| `daymade/claude-code-skills` | 5.2k+ | **Flat** — root level | `skill-creator/SKILL.md` |
| `opensite-ai/opensite-skills` | — | **Flat** — root level | `agent-file-engine/SKILL.md` |
| `alirezarezvani/claude-skills` | 5.2k+ | **Flat** — root level | `engineering/SKILL.md` |
| `SpillwaveSolutions/design-doc-mermaid` | — | Standalone | `SKILL.md` at repo root |
| `garrytan/gstack` | — | Standalone | `SKILL.md` at repo root |
| `Cocoon-AI/architecture-diagram-generator` | — | Arbitrary subdir | `architecture-diagram/SKILL.md` |

## Structure Taxonomy

```
Standalone          repo/SKILL.md
                    └─ garrytan/gstack

Flat (root-level)   repo/skill-a/SKILL.md
                    repo/skill-b/SKILL.md
                    └─ daymade/claude-code-skills
                    └─ opensite-ai/opensite-skills
                    └─ alirezarezvani/claude-skills

Monorepo (skills/)  repo/skills/skill-a/SKILL.md
                    repo/skills/skill-b/SKILL.md
                    └─ anthropics/skills
                    └─ vercel-labs/agent-skills

Nested monorepo     repo/skills/category/skill-a/SKILL.md
                    └─ mattpocock/skills

Arbitrary subdir    repo/any-dir-name/SKILL.md
                    └─ Cocoon-AI/architecture-diagram-generator
```

## Implications for Deck

1. **Flat repos are common** — at least 3 of the surveyed popular repos use flat structure.
2. **Implicit `skills/` insertion fails for flat repos** — `deck add github.com/daymade/claude-code-skills/skill-creator` would try `repo/skills/skill-creator` first (wrong), then `repo/skill-creator` (correct). The fallback saves it, but the first attempt is wasted.
3. **Skill discovery when no subpath given** — For flat repos with multiple skills, `deck add github.com/daymade/claude-code-skills` is ambiguous. The tool must either:
   - Scan and list available skills, prompt user to choose
   - Reject with clear error: "This repo has N skills. Specify one: skill-creator, competitors-analysis, ..."
4. **Arbitrary subdirs exist** — `Cocoon-AI/architecture-diagram-generator` has skill at `architecture-diagram/SKILL.md`, not at repo root and not under `skills/`. No auto-insertion heuristic can cover this.

## Rule

> `path` in skill-deck.toml must always be the **exact relative path from repo root to the SKILL.md directory**. No implicit prefix insertion. No guessing.
