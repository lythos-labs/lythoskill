#!/usr/bin/env bash
# quick-init.sh — one command to set up lythoskill governance for a project.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/quick-init.sh | bash
#   curl -fsSL https://... | bash -s -- --skill github.com/anthropics/skills/skills/frontend-design
#   curl -fsSL https://... | bash -s -- --skill github.com/anthropics/skills/skills/frontend-design --skill github.com/mattpocock/skills/skills/engineering/tdd
#
# What it does:
#   1. Checks/installs Bun
#   2. Creates skill-deck.toml with declared skills
#   3. Runs deck link (download → cold pool → symlink → working set)
#   4. Self-checks: ls working_set (default .claude/skills/) to verify

set -euo pipefail

SKILLS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill) SKILLS+=("$2"); shift 2 ;;
    --help|-h)
      echo "Usage: quick-init.sh [--skill <github.com/owner/repo/path>]..."
      echo "  No --skill args: uses frontend-design (Anthropic) as default."
      exit 0 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

if [ ${#SKILLS[@]} -eq 0 ]; then
  SKILLS=("github.com/anthropics/skills/skills/frontend-design")
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "lythoskill quick-init"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Bun
if command -v bun &>/dev/null; then
  echo "✅ Bun $(bun --version)"
else
  echo "📥 Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  echo "✅ Bun $(bun --version)"
fi

# 2. Create skill-deck.toml
echo ""
echo "📋 Creating skill-deck.toml..."
cat > skill-deck.toml << 'TOML'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
TOML

for skill_path in "${SKILLS[@]}"; do
  skill_name=$(basename "$skill_path")
  echo "" >> skill-deck.toml
  echo "[tool.skills.$skill_name]" >> skill-deck.toml
  echo "path = \"$skill_path\"" >> skill-deck.toml
done

echo "   Declared ${#SKILLS[@]} skill(s):"
for s in "${SKILLS[@]}"; do echo "   - $s"; done

# 3. Deck link
echo ""
echo "🔗 Running deck link..."
bunx @lythos/skill-deck@latest link

# 4. Self-check (sober pattern: verify what you just did)
echo ""
echo "🔍 Self-check: what does the agent see in the working set?"
echo "   (default: .claude/skills/; configure working_set in skill-deck.toml for other agents)"
if [ -d ".claude/skills" ]; then
  SKILL_COUNT=$(find .claude/skills -maxdepth 1 -not -name '.claude' -not -name '.' | wc -l | tr -d ' ')
  echo "   .claude/skills/ contains $SKILL_COUNT item(s):"
  ls -1 .claude/skills/ 2>/dev/null | while read name; do
    if [ -L ".claude/skills/$name" ]; then
      target=$(readlink ".claude/skills/$name")
      echo "   └─ $name → $target"
    else
      echo "   └─ $name (not a symlink — unexpected)"
    fi
  done
else
  echo "   ⚠️  .claude/skills/ not found. Check working_set in skill-deck.toml."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done. Your agent sees exactly ${#SKILLS[@]} declared skill(s)."
echo "   To add more: edit skill-deck.toml and run 'bunx @lythos/skill-deck@latest link'"
echo "   To see what's installed: cat skill-deck.lock"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
