# Agent Skills Ecosystem Landscape
> Reference for understanding how lythoskill fits into the broader skill ecosystem.
> Based on web research + primary sources, May 2026.

## Origins

- **Oct 2025**: Anthropic introduces Agent Skills in Claude 3.7
- **Dec 18, 2025**: [agentskills.io](https://agentskills.io) open standard v1.0 published — Apache 2.0 + CC-BY-4.0
- **Dec 2025–Jan 2026**: Microsoft (Azure AI Studio, VS Code, Copilot), Cursor, OpenAI Codex CLI, Gemini CLI, JetBrains all adopt the standard
- **Feb 2026**: 85,000+ public skills, 30+ supporting platforms
- **Q1 2026**: 61,776 skills tracked on AgentSkillsHub; Linux Foundation considers for AI & Data Foundation standard

## Format: SKILL.md

The standard skill is a directory containing:
```
my-skill/
  SKILL.md          # Required: YAML frontmatter + Markdown instructions
  scripts/          # Optional: executable code
  references/       # Optional: docs loaded on demand
  assets/           # Optional: templates, images
```

YAML frontmatter: `name` (required, max 64 chars), `description` (required, max 1024 chars, third-person). Progressive disclosure: metadata always loaded (~100 tokens), full instructions loaded on trigger (<5,000 tokens), resources loaded on demand.

## Distribution Methods

| Method | How It Works | Tools |
|--------|-------------|-------|
| **Git repo** | Clone repo, symlink or copy SKILL.md into agent's skills dir | `npx skills add <repo>`, `git clone` |
| **npm package** | Publish SKILL.md as npm package with install/uninstall lifecycle scripts | `agent-skill-npm-boilerplate`, `skillmodule`, `@tanstack/intent` |
| **tar/tgz bundle** | Pack SKILL.md + scripts into archive, distribute via registry | `skills-repo-cli pack --format tgz`, `agent-skills-registry` |
| **Skill hub** | Register on directory, users discover and install | skills.sh, agentskills.io, AgentSkillsHub, skillsmp.com |

## Discovery Hubs

| Hub | Focus | Scale |
|-----|-------|-------|
| [skills.sh](https://skills.sh) | Vercel's leaderboard — All Time, Trending 24h, Hot | Primary `npx skills` backend |
| [agentskills.io](https://agentskills.io) | Official spec site + canonical reference | — |
| AgentSkillsHub | Community hub tracking 61,776 skills | Largest dataset |
| [skillsmp.com](https://skillsmp.com) | Community registry | — |
| [clawhub.com](https://clawhub.com) | Community registry | — |
| [anthropics/skills](https://github.com/anthropics/skills) | Official 16 production-grade skills (~108k stars) | Reference implementation |

## Versioning & Update Mechanisms

| Approach | How It Detects Updates | Update Command | Lockfile |
|----------|----------------------|----------------|----------|
| `npx skills` (Vercel) | GitHub tree SHA comparison (`npx skills check`) | `npx skills update` | `~/.agents/.skill-lock.json` |
| `git clone` (manual) | `git pull` | `git pull` | None |
| npm package | npm semver (`^1.0.0`) | `npm update` | `package-lock.json` |
| `skillmodule` | Semver + content hashing | `skillmodule install` | Content-addressable store |
| `skillp` | Manifest + semver | `skillp install` | `skills-lock.json` |
| **lythoskill** | `git pull` in cold pool | `cd cold_pool/<path> && git pull`, then `deck link` | `skill-deck.lock` |

Key pattern: most tools follow `manifest + lockfile` (like `package.json` + `package-lock.json`). The lockfile pins resolved state for reproducibility.

## Skill Hubs by the Numbers (Q1 2026)

| Metric | Value |
|--------|-------|
| Total skills tracked | 61,776 |
| Independent authors | 33,314 |
| Gini coefficient | 0.983 (App Store: 0.95, npm: 0.93) |
| 0-star skills (never discovered) | 54.1% (33,417) |
| Top 1% controlling stars | 83.2% |
| Monthly new skills (Mar 2026) | 27,720 |

## Security Landscape

- **26%+ of public skills contain vulnerabilities** (arXiv:2601.10338)
- **157 confirmed malicious skills** (arXiv:2602.06547)
- ClawHavoc campaign (Jan 2026): 341 malicious skills in 3 days, single actor = 54%
- No equivalent of `npm audit` for skills
- No mandatory registry security review
- Key attack vectors: credential harvesting, hidden prompt injection (HTML comments, invisible Unicode tags), supply chain compromise

## Platform Support

**30+ tools** implement the Agent Skills standard:
- Editors/IDEs: Cursor, VS Code, GitHub Copilot, JetBrains
- CLIs: Claude Code, OpenAI Codex CLI, Gemini CLI, OpenCode, QwenCode
- Agents: Hermes Agent, Goose, Amp, Factory, Letta
- Enterprise: Microsoft Azure AI Studio

## Community Pain Points

From ecosystem research, May 2026:

**Discovery & Visibility**: Gini coefficient 0.983 — more extreme than App Store (0.95) or npm (0.93). 54.1% of skills have 0 stars — never discovered. Top 1% controls 83.2% of stars. Discovery is winner-take-all.

**Skill Conflicts**: No standard way to detect when two skills give contradictory instructions. When agent output is wrong, users can't tell which skill caused it — manual removal and bisection is the only debugging path.

**Update Friction**: Each tool has its own update mechanism (`npx skills update` via GitHub tree SHA, npm semver, `git pull`). No cross-ecosystem standard for version pinning or changelog review. A skill update can silently change agent behavior.

**Security**: 26%+ of public skills contain vulnerabilities. 157 confirmed malicious skills. No equivalent of `npm audit`. No mandatory registry security review. Prompt injection via HTML comments and invisible Unicode tags.

**Governance Vacuum**: 92% of organizations report serious limits in safely scaling agent deployments. 66% grant agents equal or greater system access than human employees. Only 17% have a designated AI security leader.

**Multi-Agent Conflict**: Real failures — the $2M logistics loop (procurement agent over-ordered, pricing agent slashed prices simultaneously). Cross-agent hallucination compounding (5 agents × 95% accuracy = 77% chain accuracy).

**Hermes-Like Auto-Skill Generation**: Emerging paradigm where agents generate skills autonomously. Shifts pain points from "how do I find a skill" to "how do I validate auto-generated skills" and "how do I prevent skill self-replication from polluting the working set."

---

## Where lythoskill Fits

lythoskill is NOT a skill hub, NOT a distribution format, and NOT a registry. It is a **governance layer** that sits on top of git-based skill distribution. The cold pool is a local cache; curator indexes what you actually have (not a public directory); arena validates skills on your tasks (not on benchmark scores); deck enforces deny-by-default across platforms.

See [`comparisons.md`](./comparisons.md) for how lythoskill compares to npm, Maven, k8s, Go modules, and other familiar systems.
