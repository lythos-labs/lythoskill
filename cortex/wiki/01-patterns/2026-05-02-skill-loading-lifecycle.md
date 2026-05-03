# Skill Loading Lifecycle

Claude Code discovers skills at **session startup** by scanning `.claude/skills/` for `SKILL.md` files.

## Key Behaviors

| Phase | What Happens |
|-------|-------------|
| **Session Start** | Claude Code reads all `SKILL.md` files under `.claude/skills/` and incorporates them into system prompt |
| **During Session** | Changes to `.claude/skills/` (new symlinks, updated SKILL.md) **do not** trigger re-scan |
| **Manual Override** | Agent can still read SKILL.md files on demand via tool calls when user asks about them |
| **Next Session** | Restart Claude Code to pick up new or changed skills |

## Implications for Deck Workflow

`lythoskill-deck link` creates symlinks in `.claude/skills/` during a session. **These changes only take full effect on the next session start.** The current session does not auto-reload.

However, this is not a hard blocker:

- **For skill usage**: Agent can manually read SKILL.md via Read tool when user asks "use the deck skill" or references it
- **For skill development**: The skill's implementation (npm package source) is what matters during development, not the SKILL.md description

## Practical Guidance

```
# After running link in current session:
bunx @lythos/deck link

# Skills are now in .claude/skills/ but current session
# won't auto-discover them. Options:
#
# 1. Restart Claude Code (full discovery on next start)
# 2. Ask agent to "read .claude/skills/<name>/SKILL.md"
#    (manual read, not skill activation, but knowledge is available)
```

## Why This Design

Session-scoped skill loading ensures:
- **Determinism**: Same session produces consistent behavior (no mid-session skill switching)
- **Performance**: No file watcher overhead during long sessions
- **Predictability**: Agent capabilities don't change unexpectedly while working
