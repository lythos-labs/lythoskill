#!/usr/bin/env bash
set -euo pipefail

# Arena vs — Seed Bootstrap: Free Form vs Baoyu Standardized
# Reproduction guide

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="/tmp/arena-vs-reproduce-$(date +%Y%m%d-%H%M%S)"

SEED_FREE="$RUN_DIR/free-form"
SEED_BAoyu="$RUN_DIR/baoyu"

mkdir -p "$SEED_FREE" "$SEED_BAoyu"

echo "🎓 Arena vs Reproduction"
echo "   Free form:  $SEED_FREE"
echo "   Baoyu:      $SEED_BAoyu"
echo ""

# ── Stage 0: Prepare Seed Decks ───────────────────────────────────────────

cat > "$SEED_FREE/skill-deck.toml" << 'EOF'
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

cat > "$SEED_FREE/AGENTS.md" << 'EOF'
# Arena Seed — Free Form
You have only lythoskill-deck as an innate skill.
Your task: complete the assigned content creation task.
You are free to discover and add any skills you need from the cold pool.
Use deck add / deck link to expand your working set autonomously.
EOF

cat > "$SEED_BAoyu/skill-deck.toml" << 'EOF'
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

cat > "$SEED_BAoyu/AGENTS.md" << 'EOF'
# Arena Seed — Baoyu Standardized
You have only lythoskill-deck as an innate skill.

CRITICAL INSTRUCTION: Before starting the content creation task, you MUST:
1. Research the baoyu-skills methodology by reading github.com/JimLiu/baoyu-skills/skills/baoyu-article-illustrator/SKILL.md
2. Study the Type × Style × Palette approach, the 12 styles × 8 layouts methodology
3. Apply baoyu-skills best practices for article illustration, cover image, and diagram generation
4. Use the baoyu-skills workflow: analyze → identify positions → generate with consistency

Then complete the assigned task using the baoyu-skills standardized approach.
EOF

cd "$SEED_FREE" && bunx @lythos/skill-deck@latest link > /dev/null
cd "$SEED_BAoyu" && bunx @lythos/skill-deck@latest link > /dev/null

echo "✅ Seed decks ready"
echo ""

# ── Stage 1: Concurrent Agent Execution ────────────────────────────────────

echo "📋 Next: Dispatch two subagents in parallel"
echo ""
echo "   Agent A (free-form):    cwd=$SEED_FREE"
echo "   Agent B (baoyu):        cwd=$SEED_BAoyu"
echo ""
echo "   Task: Generate content report on 'AI Coding Agents Ecosystem Comparison'"
echo "   — 5 agents × 5 dimensions, article text, radar chart, cover, HTML/docx"
echo ""
echo "   Both agents should:"
echo "     1. Read AGENTS.md for side-specific approach"
echo "     2. Read lythoskill-deck/SKILL.md to learn schema"
echo "     3. Discover/add skills from cold pool"
echo "     4. Execute task and write output to output/"
echo "     5. Write side-report.md documenting skills and fallbacks"
echo ""

# ── Stage 2: Judge ─────────────────────────────────────────────────────────

echo "📋 After both agents complete:"
echo "   Launch judge agent with both output directories"
echo "   Judge reads: HTML, markdown, PNG/SVG, side-reports"
echo "   Scores: D1 Content, D2 Visual, D3 Publish, D4 Method, D5 Efficiency"
echo ""

echo "📁 Run directory: $RUN_DIR"
