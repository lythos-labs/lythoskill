#!/bin/bash
# Reproduce: journalist → sober skill validation
# Arena CLI commands are reproducible; agent dispatch is manual.
# Results go to playground/sober-evolution-reproduce/

set -e

PLAYGROUND="playground/sober-evolution-reproduce"
mkdir -p "$PLAYGROUND"

echo "=== Step 1: Prepare test decks ==="
# Minimal deck with journalist as tool (original blind test config)
cat > /tmp/sober-test-deck.toml << 'DECK'
[deck]
max_cards = 5
cold_pool = "~/.agents/skill-repos"
working_set = "skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.lythoskill-journalist]
path = "localhost/me/journalist"
DECK

echo "=== Step 2: Blind test — B3 (RFC data gathering) ==="
bunx @lythos/skill-arena@0.14.2 prepare-workdir \
  --deck /tmp/sober-test-deck.toml \
  --out /tmp/sober-blind-b3 \
  --brief "I'm writing an RFC proposing we switch our monorepo from pnpm to bun as the package manager. We have ~30 packages with interdependencies. I need data to back up the recommendation — what should I include?"

echo ">>> DISPATCH subagent with: Your working directory: /tmp/sober-blind-b3 ..."
echo ">>> DISPATCH kimi: bunx @lythos/skill-arena single --deck /tmp/sober-test-deck.toml --player kimi --out $PLAYGROUND/b3/kimi ..."

echo ""
echo "=== Step 3: A/B comparison — journalist vs sober (innate) ==="

cat > /tmp/sober-ab-journalist.toml << 'DECK'
[deck]
max_cards = 5
cold_pool = "~/.agents/skill-repos"
working_set = "skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[innate.skills.lythoskill-journalist]
path = "localhost/me/journalist"
DECK

cat > /tmp/sober-ab-sober.toml << 'DECK'
[deck]
max_cards = 5
cold_pool = "~/.agents/skill-repos"
working_set = "skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[innate.skills.lythoskill-sober]
path = "localhost/me/sober"
DECK

bunx @lythos/skill-arena@0.14.2 prepare-workdir \
  --deck /tmp/sober-ab-journalist.toml \
  --out /tmp/sober-ab-journalist \
  --brief "I'm writing an RFC proposing we switch our monorepo from pnpm to bun as the package manager. We have ~30 packages with interdependencies. I need data to back up the recommendation — what should I include?"

bunx @lythos/skill-arena@0.14.2 prepare-workdir \
  --deck /tmp/sober-ab-sober.toml \
  --out /tmp/sober-ab-sober \
  --brief "I'm writing an RFC proposing we switch our monorepo from pnpm to bun as the package manager. We have ~30 packages with interdependencies. I need data to back up the recommendation — what should I include?"

echo ">>> DISPATCH subagent A: Your working directory: /tmp/sober-ab-journalist ..."
echo ">>> DISPATCH subagent B: Your working directory: /tmp/sober-ab-sober ..."

echo ""
echo "=== Step 4: Meta-cognitive test (M1 — due diligence pipeline) ==="

cat > /tmp/sober-meta-m1.toml << 'DECK'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = "skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[innate.skills.lythoskill-sober]
path = "localhost/me/sober"

[tool.skills.lythoskill-curator]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-curator"
DECK

bunx @lythos/skill-arena@0.14.2 prepare-workdir \
  --deck /tmp/sober-meta-m1.toml \
  --out /tmp/sober-meta-m1 \
  --brief "We are acquiring a startup. Their tech stack: Bun runtime, Next.js 15, PostgreSQL. Their pitch deck claims 'battle-tested at scale serving 50K RPM.' Our board wants a technical due diligence report in 48 hours. As the lead reviewer, how should I approach verifying their claims and assessing risks? What tools and methods would you recommend I use?"

echo ">>> DISPATCH subagent: Your working directory: /tmp/sober-meta-m1 ..."

echo ""
echo "=== Step 5: Archive results ==="
for dir in /tmp/sober-blind-b3 /tmp/sober-ab-journalist /tmp/sober-ab-sober /tmp/sober-meta-m1; do
  if [ -d "$dir" ]; then
    name=$(basename "$dir")
    mkdir -p "$PLAYGROUND/$name"
    cp -r "$dir"/decision-log.jsonl "$PLAYGROUND/$name/" 2>/dev/null || true
    cp -r "$dir"/findings.md "$PLAYGROUND/$name/" 2>/dev/null || true
    echo "  archived: $name"
  fi
done

echo ""
echo "=== Reproduce complete ==="
echo "Artifacts: $PLAYGROUND"
echo "Agent dispatch is manual — use the '>>> DISPATCH' lines above to spawn subagents."
echo "See README.md for methodology and results."
