/**
 * Concrete FeedAdapter implementations for curator discovery.
 *
 * Each adapter wraps a heterogeneous upstream source (REST API, HTML scrape,
 * filesystem scan) into the uniform FeedAdapter interface. The agent calls
 * `curator discover` → reviews candidates → `curator add --pool --reason`.
 *
 * Design: adapters are pure data fetchers. They don't mutate cold pool,
 * score, rank, or recommend. The agent does that.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { spawnSync } from 'node:child_process'
import type { Feed, FeedItem, FeedAdapter } from './curator-core.js'
import { inferSource, findSkillDirs } from './curator-core.js'

// ── Cold Pool Feed Adapter ──────────────────────────────────────────────

/**
 * Wraps local cold pool scanning as a feed. This is the "what you already have"
 * feed — always available, zero network. The discover command shows cold pool
 * results alongside remote results so the agent can cross-reference.
 */
export function createColdPoolFeedAdapter(poolPath: string): FeedAdapter {
  return {
    feed: { type: 'url', locator: poolPath, label: `Cold Pool (${poolPath})` },
    async discover(): Promise<FeedItem[]> {
      const dirs = findSkillDirs(poolPath)
      return dirs.map(dir => ({
        locator: inferSource(dir) === 'localhost'
          ? `localhost/${basename(dir)}`
          : `${inferSource(dir)}/${basename(dir)}`,
        name: basename(dir),
        description: `Local skill at ${dir}`,
        source: 'cold-pool',
      }))
    },
  }
}

// ── GitHub Search Adapter ───────────────────────────────────────────────

/**
 * Searches GitHub for skill repositories. Uses the public GitHub REST API
 * (no auth needed for public repos, rate-limited to 60 req/hr without token).
 *
 * Query: "skill SKILL.md" in:readme topic:agent-skills
 * This finds repos that have a SKILL.md and are tagged with agent-skills.
 */
export function createGitHubSearchAdapter(query?: string): FeedAdapter {
  const q = query || 'SKILL.md in:readme topic:agent-skills'
  return {
    feed: { type: 'github', locator: `search:${q}`, label: `GitHub: ${q}` },
    async discover(): Promise<FeedItem[]> {
      try {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=20`
        const res = await fetch(url, {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'lythoskill-curator' },
        })
        if (!res.ok) return []
        const data = (await res.json()) as { items?: Array<{ full_name: string; description: string | null; stargazers_count: number }> }
        return (data.items || []).map(repo => ({
          locator: `github.com/${repo.full_name}`,
          name: repo.full_name.split('/')[1],
          description: repo.description || '',
          source: 'github',
        }))
      } catch {
        return []
      }
    },
  }
}

// ── LobeHub Adapter (thin wrapper around @lobehub/market-cli) ──────────

/**
 * Thin wrapper around @lobehub/market-cli. LobeHub is the largest agent
 * skills marketplace (290K+ skills), agent-first, already indexes lythoskill.
 *
 * Requires: npx @lobehub/market-cli (agent installs on first use).
 * Auth: MP token handled by the CLI, not curator.
 *
 * Thin-skill pattern: heavy logic in market-cli, adapter just spawns + normalizes.
 */
export function createLobeHubAdapter(query?: string): FeedAdapter {
  const q = query || 'skill SKILL.md'
  return {
    feed: { type: 'lobehub', locator: `market-cli:${q}`, label: `LobeHub: ${q}` },
    async discover(): Promise<FeedItem[]> {
      try {
        // Thin wrapper: spawn the official CLI, parse its stdout
        const r = spawnSync('npx', [
          '-y', '@lobehub/market-cli', 'skills', 'search',
          '--q', q, '--format', 'json',
        ], { encoding: 'utf-8', timeout: 30_000 })

        if (r.status !== 0 || !r.stdout) return []
        const data = JSON.parse(r.stdout) as { items?: Array<{ identifier: string; meta?: { title?: string; description?: string }; author?: string }> }
        return (data.items || []).map(item => ({
          locator: `github.com/${item.author || 'unknown'}/${item.identifier}`,
          name: item.identifier,
          description: item.meta?.description || item.meta?.title || '',
          source: 'lobehub',
        }))
      } catch {
        return []
      }
    },
  }
}

// ── AgentSkill.sh Adapter (MCP-native) ──────────────────────────────────

/**
 * AgentSkill.sh provides an MCP server (agentskill-mcp) with 8 tools:
 * search_skills, get_trending, get_skill, install_skill, browse_skillsets,
 * install_skillset, rate_skill, check_updates.
 *
 * This is the proper agent-native protocol. Curator's SKILL.md guides the
 * agent to use these MCP tools directly — curator doesn't need to wrap
 * them in a CLI adapter. The agent calls search_skills/get_trending via MCP,
 * reviews results, then uses `curator add` to persist selections.
 *
 * This placeholder documents the integration point. When the MCP server
 * is configured in the agent's environment, discovery is handled entirely
 * by the agent through MCP tool calls — no curator code needed.
 */
export function createAgentSkillShAdapter(): FeedAdapter {
  return {
    feed: { type: 'marketplace', locator: 'mcp:agentskill-mcp', label: 'agentskill.sh (MCP)' },
    async discover(): Promise<FeedItem[]> {
      // Agent-driven: the agent calls agentskill-mcp tools (search_skills,
      // get_trending) directly via MCP. Results flow through the agent's
      // reasoning → curator add pipeline. No curator-side implementation needed.
      return []
    },
  }
}
