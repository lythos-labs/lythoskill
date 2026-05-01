# External Skill Governance Bridge

> How to bring externally-installed skills (Vercel skills.sh, Claude marketplace, etc.) under lythoskill-deck governance.

## The Conflict

External skill installers and lythoskill-deck have opposing philosophies:

| Tool | Philosophy | Install Target |
|------|-----------|----------------|
| Vercel `npx skills add` | "Put skills where the agent scans" | `.claude/skills/` (real directories) |
| Claude marketplace | "Install directly into working set" | `.claude/skills/` (real directories) |
| lythoskill-deck | "Working set is pure symlinks, deny-by-default" | `.claude/skills/` (symlinks only) |

**The crash**: `deck link` sees a real directory in `.claude/skills/` that is not declared in `skill-deck.toml`. Its reconciler deletes it as a "ghost skill."

**The waste**: You install a skill via Vercel, run `deck link`, and it's gone. You install again, run `link` again, gone again.

## Three Bridges

Choose based on how long you plan to keep the skill:

| Bridge | Best For | Effort | Deck Knows About It? |
|--------|----------|--------|---------------------|
| **Cold Pool Adoption** | Permanent addition to your collection | One-time move | Yes |
| **Transient Mode** | Evaluation / short-term trial | Minimal | Yes (with expiry) |
| **Side-by-Side** | One-off project, no deck governance | Zero | No |

---

## Bridge 1: Cold Pool Adoption (Recommended)

Move the externally-installed skill into the cold pool at the correct path, then declare it in `skill-deck.toml`. This is the cleanest long-term solution.

### Vercel skills.sh — One-Command Adoption

`lythoskill-deck add` with `--via skills.sh` handles the entire pipeline: install → detect → move to cold pool → declare → link.

```bash
# One command does it all
bunx @lythos/skill-deck add gstack/gstack --via skills.sh
```

What happens under the hood:
1. Runs `npx skills add gstack/gstack -g`
2. Scans `~/.claude/skills/` to detect the newly installed directory
3. Moves it to `~/.agents/skill-repos/github.com/gstack/gstack/skills/gstack`
4. Appends `gstack` to `skill-deck.toml [tool].skills`
5. Runs `deck link` to create the working-set symlink

### Manual Fallback

If you prefer to control each step, or if `deck add` fails:

```bash
# Step 1: Vercel installs to default location
npx skills add gstack/gstack -g --skill gstack
# → Installed to ~/.claude/skills/gstack

# Step 2: Move to cold pool at correct Go-module-style path
mkdir -p ~/.agents/skill-repos/github.com/gstack/gstack/skills
mv ~/.claude/skills/gstack ~/.agents/skill-repos/github.com/gstack/gstack/skills/gstack

# Step 3: Declare in skill-deck.toml
cat >> skill-deck.toml << 'EOF'
[tool]
skills = [
  "github.com/gstack/gstack/skills/gstack",
]
EOF

# Step 4: Sync
bunx @lythos/skill-deck link
# → Creates symlink: .claude/skills/gstack → ~/.agents/skill-repos/.../gstack
```

### Claude Marketplace Example

Claude marketplace installs directly to `.claude/skills/`. The skill directory name is usually the skill's identifier.

```bash
# Step 1: Marketplace installs to .claude/skills/<skill-name>/
# (Done via marketplace UI or CLI)

# Step 2: Move to cold pool
mkdir -p ~/.agents/skill-repos/claude-marketplace
cp -r ~/.claude/skills/<skill-name> ~/.agents/skill-repos/claude-marketplace/<skill-name>

# Step 3: Declare
cat >> skill-deck.toml << 'EOF'
[tool]
skills = [
  "claude-marketplace/<skill-name>",
]
EOF

# Step 4: Sync
bunx @lythos/skill-deck link
```

### Why This Works

- The skill's files live in the cold pool (permanent storage)
- `deck link` creates a symlink in `.claude/skills/`
- The agent sees the skill and can use it
- `deck link` will never delete it because it's a managed symlink
- Future updates: replace the cold pool directory, re-run `link`

---

## Bridge 2: Transient Mode (For Evaluation)

Use this when you want to try a skill for a few days without committing to permanent adoption.

```toml
# skill-deck.toml
[transient.gstack-evaluation]
path = ".claude/skills/_gstack"
expires = "2026-06-01"
```

```bash
# Install via Vercel to the transient path
npx skills add gstack/gstack -g --skill gstack
# Then move it to the transient location
mv ~/.claude/skills/gstack ~/.claude/skills/_gstack
```

**Rules of transient:**
- Directory name must start with `_` (underscore)
- `deck link` ignores `_`-prefixed directories entirely
- Must have an `expires` date in `skill-deck.toml`
- `link` warns when transients are past due
- **Design goal**: shrink to zero — if still needed after expiry, adopt via Bridge 1

---

## Bridge 3: Side-by-Side (No Deck Governance)

Simply don't use `lythoskill-deck` for projects where you rely on externally-managed skills. This is valid for:

- One-off experiments
- Projects with only 2-3 skills, no risk of silent blend
- When the external tool's management is sufficient for your needs

```toml
# No skill-deck.toml at all
# Vercel manages .claude/skills/ directly
# You manually add/remove skills via Vercel CLI
```

Tradeoff: You lose deck's deny-by-default protection, silent-blend detection, and version locking.

---

## Decision Matrix

```
Is this a skill I want to keep long-term?
    │
    ├── Yes → Bridge 1: Cold Pool Adoption
    │         (move to cold pool, declare in deck)
    │
    └── No → Is this a short-term trial?
              │
              ├── Yes → Bridge 2: Transient Mode
              │         (_prefix + expiry date)
              │
              └── No → Bridge 3: Side-by-Side
                        (skip deck, use Vercel directly)
```

## Quick Reference

```bash
# One-command adoption via skills.sh
bunx @lythos/skill-deck add gstack/gstack --via skills.sh

# Or via git clone (default backend)
bunx @lythos/skill-deck add github.com/gstack/gstack/skills/gstack

# Manual fallback
SKILL_NAME="gstack"
EXTERNAL_PATH="~/.claude/skills/$SKILL_NAME"
COLD_POOL_PATH="~/.agents/skill-repos/github.com/gstack/gstack/skills/$SKILL_NAME"

mkdir -p "$(dirname "$COLD_POOL_PATH")"
mv "$EXTERNAL_PATH" "$COLD_POOL_PATH"

# Add to skill-deck.toml, then:
bunx @lythos/skill-deck link
```

## Constraints

- **Never** run `deck link` after manually copying skills into `.claude/skills/` — they will be deleted
- Transient skills with expired dates are **warnings, not errors** — `link` will still succeed
- If a skill auto-updates via its installer (Vercel CLI), you must manually sync the update to the cold pool
