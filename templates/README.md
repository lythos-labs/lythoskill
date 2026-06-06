# lythoskill consumer project templates

Drop-in governance files for projects that want lythoskill's declarative skill deck without becoming skill authors.

## The preferred way: use the bootstrap deck

These templates are source material. The fastest path is to load the consumer bootstrap deck and let its `[combo.bootstrap]` playbook generate everything.

```bash
# 1. Download the bootstrap deck
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/lythoskill-consumer-bootstrap.toml > skill-deck.toml

# 2. Reconcile your agent working set
bunx @lythos/skill-deck@latest link

# 3. Tell your agent to execute the [combo.bootstrap] playbook
#    It will initialize cortex/, create daily/, and use the loaded scribe/writer
#    skills to adapt AGENTS.md and CLAUDE.md for your project.
```

## Manual fallback

If you prefer to copy static files instead of using the deck combo:

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/templates/AGENTS.md > AGENTS.md
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/templates/CLAUDE.md > CLAUDE.md
```

Then replace `{{PROJECT_NAME}}` in `AGENTS.md` and follow the first-time activation steps there.

## What is generated

| Artifact | How | Owner |
|----------|-----|-------|
| `skill-deck.toml` | Heredoc / curl | You, then `deck link` |
| `.claude/skills/` (or your agent's dir) | `bunx @lythos/skill-deck@latest link` | `deck link` |
| `cortex/` | `bunx @lythos/project-cortex@latest init` | `cortex init` |
| `daily/YYYY-MM-DD.md` | Loaded `lythoskill-project-scribe` skill | Agent + scribe skill |
| `AGENTS.md` / `CLAUDE.md` | Loaded `lythoskill-writer` skill, using these templates as input | Agent + writer skill |

## Verified npm packages

The templates and deck reference these real published packages:

| Package | Purpose |
|---------|---------|
| `@lythos/skill-deck` | Skill working-set governance |
| `@lythos/skill-arena` | Skill test-play and subagent dispatch |
| `@lythos/project-cortex` | Task / ADR / epic governance |
| `@lythos/skill-curator` | Cold-pool skill indexer |

There is no `@lythos/skill-cortex`; use `@lythos/project-cortex`.
