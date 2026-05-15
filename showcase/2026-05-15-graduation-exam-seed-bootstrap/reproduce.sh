#!/usr/bin/env bash
set -euo pipefail

# Graduation Exam v7 — Seed Bootstrap Reproduction Guide
# Run: 2026-05-15
# This script prepares the seed environment. The actual bootstrap + execution
# requires agent orchestration (native Agent tool or arena agent-run).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/run-$(date +%Y%m%d-%H%M%S)"

SEED_DIR="/tmp/arena-seed-$(date +%Y%m%d-%H%M%S)"

echo "🎓 Graduation Exam v7 — Seed Bootstrap"
echo "   Seed: ONLY lythoskill-deck"
echo "   Workdir: $SEED_DIR"
echo "   Output: $OUTPUT_DIR"
echo ""

# ── Stage 0: Prepare Seed ────────────────────────────────────────────────
mkdir -p "$SEED_DIR"

cat > "$SEED_DIR/skill-deck.toml" << 'EOF'
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

cat > "$SEED_DIR/AGENTS.md" << 'EOF'
# Arena Seed Environment
This is a graduation exam seed workspace.
The deck contains ONLY lythoskill-deck as an innate skill.
Your job: read the deck skill, discover what other skills you need,
and use deck add / deck link to expand the working set autonomously.
EOF

cd "$SEED_DIR"
echo "🔗 Linking seed deck..."
bunx @lythos/skill-deck@latest link

echo ""
echo "✅ Seed environment ready: $SEED_DIR"
echo ""
echo "   .claude/skills/ contains:"
ls -1 "$SEED_DIR/.claude/skills/" | sed 's/^/      - /'
echo ""

# ── Stage 1 & 2: Agent Orchestration ─────────────────────────────────────
echo "📋 Next steps (agent-executed):"
echo ""
echo "   Stage 1 — Bootstrap:"
echo "     Agent reads lythoskill-deck/SKILL.md"
echo "     → Queries catalog.db for docx/chart/research skills"
echo "     → Selects and adds skills to deck"
echo "     → Runs deck link"
echo "     → Writes seed-bootstrap-report.md"
echo ""
echo "   Stage 2 — Execution:"
echo "     Agent reads docx + deep-research SKILL.md"
echo "     → Generates radar chart (matplotlib PNG)"
echo "     → Generates Cookie_Recipe_Report.docx (docx-js)"
echo "     → Writes decision-log.jsonl"
echo ""
echo "   To run with arena CLI:"
echo "     bunx @lythos/skill-arena@latest single \\"
echo "       --deck $SEED_DIR/skill-deck.toml \\"
echo "       --brief 'Produce a professional .docx cookie recipe report...' \\"
echo "       --out $OUTPUT_DIR"
echo ""
echo "   To run with native Agent tool:"
echo "     Dispatch a subagent with cwd=$SEED_DIR and the Stage 1 prompt."
echo "     After Stage 1 completes, dispatch a second subagent with"
echo "     cwd=$SEED_DIR and the Stage 2 (execution) prompt."
echo ""
echo "📁 Seed workspace: $SEED_DIR"
echo "📁 Output target:  $OUTPUT_DIR"
