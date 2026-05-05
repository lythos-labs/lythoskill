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

// ── LobeHub Adapter ─────────────────────────────────────────────────────

/**
 * Fetches trending skills from LobeHub's agent skills marketplace.
 * LobeHub is agent-first and already indexes lythoskill v0.6.x.
 *
 * API endpoint documented at: https://lobehub.com/api/plugins (TBC)
 * Current implementation uses the public plugin discovery endpoint.
 */
export function createLobeHubAdapter(): FeedAdapter {
  return {
    feed: { type: 'lobehub', locator: 'https://lobehub.com/', label: 'LobeHub Trending' },
    async discover(): Promise<FeedItem[]> {
      try {
        // LobeHub's public plugin API — returns agent skills marketplace listings
        const res = await fetch('https://lobehub.com/api/plugins', {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return []
        const data = (await res.json()) as { plugins?: Array<{ identifier: string; meta?: { title?: string; description?: string }; author?: string }> }
        return (data.plugins || []).map(p => ({
          locator: `github.com/${p.author || 'unknown'}/${p.identifier}`,
          name: p.identifier,
          description: p.meta?.description || p.meta?.title || '',
          source: 'lobehub',
        }))
      } catch {
        return []
      }
    },
  }
}

// ── AgentSkill.sh Adapter ───────────────────────────────────────────────

/**
 * Fetches skill listings from agentskill.sh — a community skill directory.
 *
 * API endpoint: TBC. The site lists skills with metadata.
 * Current implementation is a placeholder; actual endpoint to be confirmed.
 */
export function createAgentSkillShAdapter(): FeedAdapter {
  return {
    feed: { type: 'marketplace', locator: 'https://agentskill.sh', label: 'agentskill.sh' },
    async discover(): Promise<FeedItem[]> {
      // Placeholder — agentskill.sh API endpoint not yet confirmed.
      // When available, this adapter will fetch and parse skill listings.
      return []
    },
  }
}
