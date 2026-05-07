# Graduation Exam: Cookie Recipe with Radar Chart

> Send this to any AI agent and ask it to complete the task.
> The agent should be able to figure out the setup from context.

## Prerequisites

```bash
# 1. Install Bun (runtime)
curl -fsSL https://bun.sh/install | bash

# 2. Install kimi CLI (agent player)
uv tool install kimi-cli && kimi login

# 3. Clone skill repos to cold pool (one-time setup)
mkdir -p ~/.agents/skill-repos/github.com/anthropics
git clone https://github.com/anthropics/skills.git ~/.agents/skill-repos/github.com/anthropics/skills

mkdir -p ~/.agents/skill-repos/github.com/SpillwaveSolutions
git clone https://github.com/SpillwaveSolutions/design-doc-mermaid.git ~/.agents/skill-repos/github.com/SpillwaveSolutions/design-doc-mermaid

mkdir -p ~/.agents/skill-repos/github.com/Weizhena
git clone https://github.com/Weizhena/Deep-Research-skills.git ~/.agents/skill-repos/github.com/Weizhena/Deep-Research-skills
```

## Task

Run this exact command:

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- \
  https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/recipe-report.toml \
  "Create a professional cookie recipe report as a .docx file. The document MUST include:
1. A title page with 'The Science of Perfect Chocolate Chip Cookies'
2. Ingredient ratios as a formatted table with Baker Percentages
3. Scientific explanation for each ingredient
4. A 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost) embedded in the document
5. Professional formatting with headings and page numbers"
```

If GitHub raw is blocked, use the ghproxy:

```bash
curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/quick-agent.sh | bash -s -- \
  https://ghfast.top/https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/recipe-report.toml \
  "Create a professional cookie recipe report as a .docx file..."
```

## Success Criteria

- [ ] No errors during execution
- [ ] `cookie_recipe_report.docx` exists and is non-empty (should be 100KB+ with embedded image)
- [ ] File contains a 5-dimensional radar/polar chart
- [ ] Self-check reports 6 skills visible as symlinks
- [ ] Judge verdict: PASS
