# In Action Guide

> A 6-level tour: you already have skills. Here is how to organize them, test them, and share them.

This guide is self-contained — start here with nothing installed and follow each level in order.

## Level 0: Quick Start

Copy, paste, run. This single script sets up bun, creates the cold pool, and activates your first two skills.

```bash
# 1. Install bun (macOS / Linux / WSL)
curl -fsSL https://bun.sh/install | bash

# If you are in China, uncomment this line for the npm mirror:
# export BUN_CONFIG_REGISTRY=https://registry.npmmirror.com

# 2. Create the cold pool — where skill repos live
mkdir -p ~/.agents/skill-repos

# 3. Create your first deck
cat > skill-deck.toml << 'TOML'
[deck]
# Safety limit + forcing function. Skills work best in small numbers —
# default 10–15. If you hit the cap, ask: do I really need all of these right now?
max_cards = 10
# Cold pool: a shared directory of git-cloned skill repos. link auto-clones
# repos from github.com paths — no manual setup.
cold_pool = "~/.agents/skill-repos"
# Where your agent looks for skills. Change per agent:
working_set = ".claude/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnosing-bugs]
path = "github.com/mattpocock/skills/skills/engineering/diagnosing-bugs"
TOML

# 4. Link: reconciles working set to match your deck
#    Clones repos from github.com paths into cold_pool automatically.
bunx @lythos/skill-deck@latest link
```

Your agent now sees exactly 2 skills. Everything else that was in your working set is gone — because it was not in the deck.

**Prerequisite**: [bun](https://bun.sh) is the only runtime. If you prefer npm: `npx @lythos/skill-deck@latest link` works too, but `bunx` is faster.

## Level 1: Understand Your Deck

## Level 1: Understand Your Deck

Each field in `skill-deck.toml`:

| Field | What it does |
|-------|-------------|
| `max_cards` | Safety limit + forcing function. `link` warns if your deck exceeds this number. Default 10–15. If you hit the cap, the right question is not "raise the limit" — it is "do I really need all of these at once?" |
| `cold_pool` | Where skill repos are git-cloned. `link` auto-clones `github.com/...` paths here. |
| `working_set` | Where your agent looks for skills. `.claude/skills/` for Claude Code, `.agents/skills/` for Codex and others. |
| `[tool.skills.<alias>]` | Declare a skill. `path` can be any FQ locator — `github.com/owner/repo`, `localhost/me/my-fork`. |

**What changed**: Your agent now sees exactly 2 skills. Behavior is reproducible. One file declares what is active — share it, version it, switch it.

## Level 2: Discover More Skills

You want more skills, but you do not want to browse GitHub manually.

::: tip Where do skills live?
Your deck declares which skills are active (the **working set**). But where do the skills themselves live? This is the **cold pool** — a directory where you `git clone` skill repos. You store everything in the cold pool; your deck selects what enters the working set for each project. Storage and selection are separate concerns.
:::

```bash
bunx @lythos/curator scan                     # Index your cold pool
bunx @lythos/curator find "fact-check"        # Find skills by name or keyword
```

Curator returns locator paths. Add to deck, run `bunx @lythos/skill-deck link`. Discovery → selection → reconciliation in one loop.

## Level 3: Test Before You Trust

A skill's README says it is great. Is it?

```bash
bunx @lythos/skill-arena single --deck skill-deck.toml --brief "refactor this auth module"
```

Arena spawns a zero-knowledge subagent with your task and your deck. You see the output — not the marketing copy.

For A/B comparison:

```bash
bunx @lythos/skill-arena vs --deck-a skill-deck.toml --deck-b skill-deck-alt.toml --brief "write API docs"
```

**What changed**: Skill adoption is empirical, not faith-based.

## Level 4: Compose Pipelines

Some tasks need multiple skills in sequence:

```toml
[combo.release]
prompt = """
1. Run tests with tdd skill
2. Bump version
3. Generate changelog
4. Create GitHub release
"""
```

`[combo.<name>]` is a prompt, not code. The agent reads it and orchestrates. No CLI state machine needed — the agent is the orchestrator.

## Level 5: Govern at Scale

With 15+ skills across multiple projects, you need:

- **Phase decks**: `phase-dev.toml` (engineering), `phase-writing.toml` (docs), `phase-release.toml` (publishing)
- **Cold pool hygiene**: Curator audit catches broken SKILL.md files, missing frontmatter, stale repos
- **Ecosystem awareness**: Curator query across pools reveals overlap, gaps, and opportunities

```bash
bunx @lythos/skill-deck link --deck phase-dev.toml    # Switch to dev toolkit
bunx @lythos/skill-deck link --deck phase-writing.toml # Switch to writing toolkit
```

Each phase change reconciles the working set. No manual cleanup. No leftovers.

## Level 6: Contribute Back

Your localhost skills, your arena results, your combo discoveries — these are ecosystem contributions.

- Fork skills to localhost, iterate, arena-test, push upstream
- Publish arena verdicts as evidence
- Share decks as starting points for others

The lythoskill ecosystem grows through use, not through central planning.
