# What is lythoskill?

**lythoskill is not a skill collection.** It's the governance layer for agent skills — the npm of the agent skill ecosystem.

If addyosmani/agent-skills and mattpocock/skills are the packages, lythoskill is the package manager. It installs, curates, validates, and reconciles skills across projects and platforms.

## The Problem

When you have 50+ skills across 5 projects, running on 3 different agent platforms:

- Two skills claim the same niche — which one wins? The agent doesn't know.
- A skill was updated upstream — are you on the latest version?
- You installed a skill 3 months ago — is it still needed?
- Claude Code sees skill-A, Cursor sees skill-B — inconsistent behavior.

## The Solution

lythoskill provides four tools that form a governance pipeline:

```
curator scan → arena validate → deck declare → deck reconcile
  (discover)     (verify)        (govern)      (maintain)
```

| Tool | Command | Purpose |
|------|---------|---------|
| **Deck** | `deck link` / `deck add` / `deck reconcile` | Declare, install, converge |
| **Curator** | `curator scan` / `curator query` | Discover, index, search |
| **Arena** | `arena run` | Test, compare, validate |
| **Cortex** | `cortex task` / `cortex epic` / `cortex adr` | Plan, track, decide |

## Key Concepts

- **Cold Pool** (`~/.agents/skill-repos/`) — all downloaded skills. Agent cannot see here.
- **Working Set** (`.claude/skills/`) — the subset the agent sees. Deck controls this.
- **Deny-by-default** — undeclared skills do not exist in the working set. Not hidden, not disabled — gone.
