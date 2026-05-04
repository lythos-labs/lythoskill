# Welcome to Lythos Labs

## How We Use Claude

Based on Caltara's usage over the last 30 days:

Work Type Breakdown:
  Plan Design       ████████████████████  38%
  Improve Quality   ████████████████░░░░  31%
  Debug Fix         ████████████░░░░░░░░  23%
  Build Feature     ████░░░░░░░░░░░░░░░░  8%

Top Skills & Commands:
  /lythoskill-project-onboarding  ████████████████████  6x/month
  /clear                          █████████████░░░░░░░  4x/month
  /context                        ██████████░░░░░░░░░░  3x/month
  /btw                            ███████░░░░░░░░░░░░░  2x/month
  /skills                         ███████░░░░░░░░░░░░░  2x/month
  /tdd                            ███░░░░░░░░░░░░░░░░░  1x/month
  /lythoskill-deck                ███░░░░░░░░░░░░░░░░░  1x/month
  /lythoskill-project-cortex      ███░░░░░░░░░░░░░░░░░  1x/month

Top MCP Servers:
  _None active in this period._

## Your Setup Checklist

### Codebases
- [ ] lythos-labs/lythoskill — https://github.com/lythos-labs/lythoskill (the thin-skill monorepo; build outputs land in `skills/`)

### MCP Servers to Activate
- [ ] _None required._ The team isn't using MCP servers yet — skip this section.

### Skills to Know About
- [ ] `/lythoskill-project-onboarding` — load session context from the latest `daily/YYYY-MM-DD.md` handoff. Run this at the start of every session before doing anything else.
- [ ] `/lythoskill-project-scribe` — write the daily handoff at session end. Pairs with onboarding (CQRS read/write split).
- [ ] `/lythoskill-project-cortex` — GTD-style task/epic/ADR governance. Use when creating tasks, epics, or architecture decisions.
- [ ] `/lythoskill-deck` — sync `.claude/skills/` working set against `skill-deck.toml`. Run when skills feel cluttered or conflicting.
- [ ] `/lythoskill-coach` — review SKILL.md files against best practices. Run before publishing a skill.
- [ ] `/lythoskill-arena` — A/B test skill descriptions with subagents. Use to validate that a skill description actually triggers.
- [ ] `/lythoskill-curator` — read-only indexer for skill cold pools. Run to discover what skills exist locally.
- [ ] `/lythoskill-creator` — scaffold new thin-skill monorepo projects.
- [ ] `/tdd` — red-green-refactor loop for feature work.
- [ ] `/context`, `/clear`, `/skills`, `/btw` — built-in Claude Code commands the team leans on.

## Team Tips

- **Always run `/lythoskill-project-onboarding` first.** It loads the latest `daily/YYYY-MM-DD.md` handoff so you start with real session state instead of guessing from the file tree.
- **Watch `/context` and recycle at ~60%.** When usage crosses 60%, run the cycle: **commit current work** → `/lythoskill-project-scribe` → **commit the daily handoff change** → `git push` → `/clear` → `/lythoskill-project-onboarding` again. Don't fold the daily commit into push — scribe writes a file, that file needs its own commit before it can be pushed. Compaction silently drops skills/memory/ADR anchors, so a clean re-onboard beats riding context to the edge. **Trigger this even more proactively at natural breakpoints** — when a big chunk of work just landed and you're about to wait for the next instruction, that's the cheapest moment to recycle.

## Get Started

Your starter task is to **understand the current state of the project** — no specific ticket. Read in this order:

1. `AGENTS.md` (universal SSOT, especially Release & Auth Workflow)
2. The latest `daily/YYYY-MM-DD.md` (session handoff)
3. `cortex/INDEX.md` (active epics and tasks)
4. `git log --oneline -10` (recent activity)

Once you've got the lay of the land, ask Caltara what to pick up.

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
