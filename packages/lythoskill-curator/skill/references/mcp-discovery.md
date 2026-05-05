# MCP-Based Skill Discovery

Curator delegates remote skill discovery to MCP (Model Context Protocol) tools when available. This is the agent-native pattern: the agent calls MCP tools directly, reviews results, then uses `curator add` to persist selections to cold pool.

## agentskill.sh (agentskill-mcp)

The `agentskill-mcp` server exposes 8 tools for skill discovery and management:

| Tool | Purpose |
|------|---------|
| `search_skills` | Search skills by keyword, platform, category, security score |
| `get_trending` | Hot (24h), trending (7d), top (all time), or latest skills |
| `get_skill` | Full details: SKILL.md, security analysis, quality review |
| `browse_skillsets` | Curated collections bundled by workflow or role |
| `install_skill` | Install to local skills directory with security checks |
| `install_skillset` | Install all skills from a skillset |
| `rate_skill` | Rate a skill 1–5 |
| `check_updates` | Check if installed skills have newer versions |

## Agent Workflow

When the user asks "find me a skill for X":

```
1. AGENT: call MCP tool `search_skills(keyword="web scraping", platform="claude")`
   → returns: [{ name, description, security_score, installs, ... }]

2. AGENT: for top candidates, call `get_skill(identifier)` to read SKILL.md
   → returns: full SKILL.md content + security audit + quality review

3. AGENT: review candidates with user. For each selected:
   curator add <locator> --pool ~/.agents/skill-repos --reason "<why>"
   → cold pool + additions.jsonl decision record

4. AGENT (optional): arena test-play to verify claims (L3 buyer's review)
   → writes arenaResult back to additions.jsonl

5. AGENT: deck link → activate in working set
```

## Why MCP Over CLI Adapter

- **Zero curator code**: MCP tools are invoked by the agent, not by curator
- **Rich metadata**: security scores, quality reviews, install counts come pre-parsed
- **Agent-native**: MCP is the protocol for agent-tool communication
- **Composable**: agent can combine MCP search with web search, GitHub API, etc.

Curator provides the persistence layer (cold pool + decision history). MCP provides the discovery layer.
