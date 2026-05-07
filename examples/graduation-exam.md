# Graduation Exam: Build a Deck, Run a Task

> **To the agent reading this:** Your job is to figure out which skills you need,
> find them, install them, and produce the output. No one will tell you which
> skills to pick. Use the lythoskill toolchain.

## Goal

Produce a professional `.docx` cookie recipe report with an embedded 5-dimension
radar chart (Taste, Nutrition, Difficulty, Time, Cost). The document should include
ingredient ratios with Baker's Percentages and scientific explanations.

## Prerequisites

```bash
curl -fsSL https://bun.sh/install | bash          # Bun runtime
uv tool install kimi-cli && kimi login             # Agent player
```

## Your Job

1. **Discover** — search the web for skills that can help with: Word document
   creation, charting/diagrams, research. Look at GitHub, skills.sh, agent-skill
   directories, community collections.

2. **Install** — use `bunx @lythos/skill-deck@latest add <locator>` for each
   skill you select. This clones to cold pool, builds skill-deck.toml, and links
   to `.claude/skills/` — all in one command.

3. **Run** — use arena to execute the task with your deck:
   ```bash
   LYTHOS_PLAYER=kimi bunx @lythos/skill-arena@latest agent-run \
     --brief "<your task prompt>" \
     --deck ./skill-deck.toml \
     --out ./output
   ```

4. **Verify** — check that the output .docx contains a radar chart and meets
   the success criteria below.

## Success Criteria

- [ ] Skills were discovered and selected autonomously (not pre-chosen)
- [ ] All `deck add` commands succeeded
- [ ] `.claude/skills/` contains symlinks for each selected skill
- [ ] Output .docx exists, is 100KB+ with embedded radar chart
- [ ] Judge verdict: PASS

## Hints

- The lythoskill ecosystem has tools beyond `deck` — explore `curator` for
  skill discovery and `arena` for comparing deck configurations.
- If GitHub raw is blocked, use `https://ghfast.top/` as a proxy prefix.
- You can install `@lythos/skill-curator` and `@lythos/skill-arena` the same
  way as other packages: `bunx @lythos/skill-curator@latest` and
  `bunx @lythos/skill-arena@latest`.
