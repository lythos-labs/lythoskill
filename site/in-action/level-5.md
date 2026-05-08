# Level 5: Team-Scale Skill Infrastructure

> **Half day to one day · Prerequisites: Level 4 · ★★★★★**

## What You'll Learn

When 5 teams maintain their own skills, you need discovery, version tracking, decision records, and onboarding. This isn't a "platform" — it's governance infrastructure that grows with your team.

## The Full Toolchain

| Capability | Tool | One-liner |
|-----------|------|-----------|
| **Skill Index** | `lythoskill-curator` | Scan cold pools → `REGISTRY.json` + `catalog.db`. "What skills do we have?" |
| **Project Governance** | `lythoskill-project-cortex` | Tasks, Epics, ADRs. Agent-native GTD. |
| **Knowledge Base** | `lythoskill-project-scribe` | Daily handoffs, pitfalls, session memory. |
| **New Member Onboarding** | `lythoskill-project-onboarding` | Structured context loading from latest handoff. |
| **Migration Patching** | `lythoskill-red-green-release` | Heredoc patches → user approval → git tag. Virtual PR for distributed teams. |

## Example Workflow

```bash
# 1. Generate team skill index
bunx @lythos/skill-curator@latest scan --cold-pool ~/.agents/skill-repos

# 2. Create a task, agent reads relevant skills automatically
bunx @lythos/project-cortex@latest task "Refactor payment module" --epic backend-rewrite

# 3. Record a decision
bunx @lythos/project-cortex@latest adr "Why we switched from skill X to skill Y"

# 4. End-of-session handoff
# Agent: /lythoskill-project-scribe → writes daily/YYYY-MM-DD.md
```

## The Full Picture

```
Cold Pool (canonical storage)
    │
    ├── curator scan → catalog.db       "What do we have?"
    ├── arena run → L3 scores            "Which one works?"
    ├── deck link → working set          "Use these ones."
    ├── deck reconcile → drift report    "Everything in sync?"
    └── cortex task/epic/adr → INDEX     "What are we building?"
```

## What's Next

This is the governance layer that built lythoskill itself. Every ADR in this project, every epic, every task, every handoff — produced by agents using these tools under human direction.

You've reached the end of the guided levels. The [Guide](/guide/) has deep-dive documentation on each tool. The [Patterns](/patterns/) catalog recurring architecture decisions across lythoskill's own development.
