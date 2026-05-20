# In Action Guide

> A 6-level tour from "I have too many skills" to "I govern my skill ecosystem."

## Level 0: The Problem

You have 50+ skills in `~/.claude/skills/`. Some are symlinks from old tooling, some are manual installs, some are broken. Your agent sees everything — including conflicts. You don't know which skills are *supposed* to be active.

**Symptom**: Agent behavior is inconsistent. Sometimes skill A fires, sometimes skill B fires on the same trigger. You can't reproduce results.

**Root cause**: No governance. Working set = accumulation, not selection.

## Level 1: Your First Deck

Create `skill-deck.toml`:

```toml
[deck]
max_cards = 10

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

Run `deck link`. Only `tdd` and `diagnose` are in your working set. Everything else is gone.

**What changed**: Your agent now sees exactly 2 skills. Behavior is reproducible.

## Level 2: Discover More Skills

You want more skills, but you don't want to browse GitHub manually.

```bash
curator scan                    # Index your cold pool
curator find "fact-check"      # Find skills by name or keyword
```

Curator returns locator paths. Add to deck, run `deck link`. Discovery → selection → reconciliation in one loop.

## Level 3: Test Before You Trust

A skill's README says it's great. Is it?

```bash
arena single --deck skill-deck.toml --task "refactor this auth module"
```

Arena spawns a zero-knowledge subagent with your task and your deck. You see the output — not the marketing copy.

For A/B comparison:

```bash
arena vs --deck-a skill-deck.toml --deck-b skill-deck-alt.toml --task "write API docs"
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
deck link --deck phase-dev.toml    # Switch to dev toolkit
deck link --deck phase-writing.toml # Switch to writing toolkit
```

Each phase change reconciles the working set. No manual cleanup. No leftovers.

## Level 6: Contribute Back

Your localhost skills, your arena results, your combo discoveries — these are ecosystem contributions.

- Fork skills to localhost, iterate, arena-test, push upstream
- Publish arena verdicts as evidence
- Share decks as starting points for others

The lythoskill ecosystem grows through use, not through central planning.
