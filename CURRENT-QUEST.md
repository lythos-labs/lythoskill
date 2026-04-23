# Current Quest: lythoskill Onboarding Arena Experiment

## Task
Add a \`[combo]\` section to \`skill-deck.toml\` with a realistic example, and update \`README.md\` to document combos in the Deck Governance area.

## Decisions Made

### Combo Choice: \`meta-governance\`
Chose a combo named \`meta-governance\` that bundles three meta-level skills:
- \`lythoskill-project-cortex\` — for planning and tracking work (ADR/Epic/Task/Wiki)
- \`lythoskill-arena\` — for benchmarking and comparing skill effectiveness
- \`lythoskill-curator\` — for discovering better skill combinations and deck composition

**Why this combo?**
It forms a realistic "continuous improvement loop":
1. Plan and document work with project-cortex.
2. Benchmark the results with arena.
3. Use curator insights to discover better skill combos and refine the deck.

### TOML Structure
Used a table array for combos to allow future expansion.

### README Update
Added a short paragraph under the Deck Governance section explaining what combos are.

## Pitfalls and Surprises
- **TOML syntax for nested tables**: Had to be careful with \`[[combo.meta_governance]]\` vs \`[combo]\`.
- **No schema validation**: No JSON/TOML schema for skill-deck.toml exists yet.

## Current State
- \`skill-deck.toml\` — updated with \`[combo]\` section and \`meta-governance\` combo.
- \`README.md\` — updated with combo documentation.

## Next Steps
1. Run \`bun packages/lythoskill-deck/src/cli.ts link\` to verify TOML parses correctly.
2. Consider adding a JSON schema for skill-deck.toml validation.
