# In Action Guide

> A 6-level tour: you already have skills. Here is how to organize them, test them, and share them.

This guide is self-contained — start here with nothing installed and follow each level in order.

## Level 0: You Already Have Skills

You have been collecting skills. GitHub repos, Superpowers, a colleague's gist — skills accumulate. You probably have more than you realize.

The problem is not that you have too many. The problem is that every skill you have ever installed is visible to every agent session. Context window fills. Triggers conflict. Behavior becomes inconsistent — the same prompt produces different results because different skills fire.

**Symptom**: Agent behavior is unpredictable. You cannot reproduce results across sessions.

**Root cause**: Your working set is accumulation, not selection. You need governance.

## Level 1: Your First Deck

**Prerequisite**: [install bun](https://bun.sh) — the only runtime you need.

Create `skill-deck.toml`:

::: code-group

```toml [Claude Code]
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

```toml [Codex]
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".agents/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

```toml [Cursor]
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".cursor/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

:::

Run `bunx @lythos/skill-deck link`. Only `tdd` and `diagnose` are in your working set. Everything else is gone.

**How it works**: `link` reads `github.com/...` paths from your deck and automatically clones repos into `cold_pool` — no manual setup needed. `max_cards` is a safety limit: if your deck exceeds it, `link` warns before making changes.

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
