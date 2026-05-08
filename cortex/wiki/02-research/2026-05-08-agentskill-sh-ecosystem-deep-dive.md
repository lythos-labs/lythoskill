---
title: agentskill.sh ecosystem deep dive — first inbound+outbound integration target
date: 2026-05-08
tags: [research, ecosystem, agentskill-sh, curator, integration]
related:
  - 2026-05-07-ai-agent-skills-ecosystem.md
  - 2026-05-08-skill-curation-patterns-research.md
  - 2026-05-08-curator-comparison-hermes-vs-lythoskill.md
---

## 1. Executive Summary

- **Verdict: YES — commit to agentskill.sh as the first end-to-end ecosystem.** It uniquely covers all four needed dimensions: a stable HTTP REST API for inbound discovery, a passive GitHub-crawling submission model (zero-click outbound), an agent-rating feedback channel that maps to lythoskill's L3 trust layer, and a content-SHA versioning model that is structurally identical to curator's own design.
- **Inbound is solved by HTTP, not MCP.** The MCP server is a thin wrapper around `https://agentskill.sh/api/*` (verified: `agent/search`, `skills?section=`, `skills/{slug}`, `skillsets`, `agent/skills/version`, `agent/skills/{owner}/{name}/install`). All tested endpoints return JSON without auth, sub-1s latency, CORS-open. Curator should call HTTP directly — the MCP wrapper adds nothing for a programmatic consumer. ([mcp-server/src/index.ts][src-mcp])
- **Outbound is passive — paste GitHub URL, daily auto-sync.** No PR, no account required to *list* a skill. Submit page accepts a GitHub repo or direct SKILL.md URL; the crawler walks the tree, ingests every SKILL.md, daily re-syncs, optional GitHub webhook (`https://agentskill.sh/api/webhooks/github`) for instant push updates. Account (Google/GitHub OAuth) only required to **claim** ownership for the verified badge and analytics. ([agentskill.sh/submit][submit])
- **Trust fit is exceptional.** L1 = SKILL.md frontmatter (verbatim ingested). L2 = `installCount`, `score`/`ratingCount`, `securityScore` (0–100 across 12 categories), `contentQualityScore` (0–100), `isVerified` flag, `githubStars`. L3 = the `rate_skill` MCP tool / `POST /api/skills/{slug}/agent-feedback` endpoint accepts agent-authored ratings — arena outcomes can flow back as anonymous agent ratings. ([live API][live-api])
- **Caveats worth flagging.** Project is run by a single commercial entity ("by Yuki Capital", footer copyright); MIT-licensed CLI/MCP code but the registry/scanning service is closed. Repo activity is shallow (0 open issues, 0 open PRs across all 5 repos as of 2026-05-08; ags has 17 stars, mcp-server has 2 stars) — adoption is via npm install counts, not GitHub stars. No published rate limits; treat as best-effort. **No agent-driven submission API** — claiming requires human OAuth click; bots can submit URLs but cannot claim ownership.

[src-mcp]: https://github.com/agentskill-sh/mcp-server/blob/main/src/index.ts
[submit]: https://agentskill.sh/submit
[live-api]: https://agentskill.sh/api/agent/search?q=react&limit=2

---

## 2. Inbound API Surface

Four access forms exist; ranked by suitability for curator's adapter:

### 2a. HTTP REST (recommended — strict winner for curator)

Base: `https://agentskill.sh/api`. No auth. `User-Agent` is logged but not validated. CORS: `access-control-allow-origin: *`. Verified live 2026-05-08 — all three primary endpoints returned 200 in <1.2s with no API key. ([live-api][live-api])

Endpoints used by the official MCP server (verbatim from `mcp-server/src/index.ts`):

| Endpoint | Method | Purpose |
|---|---|---|
| `/agent/search?q=&platform=&category=&minSecurityScore=&limit=` | GET | Keyword search with filters; primary discovery surface |
| `/skills?section={hot,trending,top,latest}&platform=&limit=` | GET | Curated rankings; section-keyed |
| `/skills/{slug}` | GET | Full skill record incl. SKILL.md content, security issues array, jobRoles, tags |
| `/skillsets?limit=` | GET | Curated bundles (skillsets ≈ lythoskill decks) |
| `/agent/skills/{owner}/{name}/install` | GET | Returns `{slug,name,owner,description,skillMd,securityScore,contentQualityScore}` |
| `/skills/{slug}/install` | POST | Telemetry; body: `{platform, agentName}` |
| `/skills/{slug}/agent-feedback` | POST | L3 channel; body: `{rating:1-5, comment?, agentName}` |
| `/agent/skills/version?slugs=a,b,c` | GET | Returns `{versions: { slug: { contentSha, updatedAt } } }` — drift detection |
| `/skillsets/{slug}/install` | POST | Skillset install telemetry |

Sample live response shape (search) confirms full schema match with the typed declarations in MCP source: ([live-api][live-api])

```json
{"results":[{"slug":"...","name":"...","owner":"...","description":"...",
  "category":"development","jobCategories":["development","product"],
  "platforms":["claude-code","cursor","windsurf",...],
  "skillTypes":["react","cross-platform"],
  "installCount":0,"githubStars":40,"score":0,"ratingCount":0,
  "securityScore":100,"contentQualityScore":58,
  "contentSha":"1ca83e6","updatedAt":"2026-05-08T13:31:35.575Z"}],
 "total":3,"hasMore":true,"totalExact":false,"platformFallback":false}
```

**Stability assessment.** No formal versioning; URL prefix `/agent/` and `/api/` coexist (mixed). Schema appears stable — same field names across `mcp-server` (last commit 2026-04-24), `ags` CLI (last commit 2026-05-06), and live response. **Risk: undocumented; unverified — no SLA, no public OpenAPI spec; needs probe via direct contact (`hello@agentskill.sh`) for production reliance.** ([marketplace.json][marketplace])

[marketplace]: https://agentskill.sh/marketplace.json

### 2b. MCP server (`agentskill-mcp`)

`claude mcp add agentskill -- npx -y agentskill-mcp`. 8 tools, stdio transport, `@modelcontextprotocol/sdk` v0.2.0. Pure pass-through to the HTTP API — no value-add for a programmatic consumer; useful only when an end user wants in-conversation tool calls. ([mcp-server README][mcp-readme])

[mcp-readme]: https://github.com/agentskill-sh/mcp-server

### 2c. CLI (`@agentskill.sh/cli`, command name `ags`)

`ags search/install/list/update/remove/feedback`, all with `--json` flag for structured output. Source uses the same `https://agentskill.sh/api` base. CI-friendly via `--json`, but spawning a Node subprocess per query is strictly inferior to direct HTTP for a curator adapter. ([ags repo][ags])

[ags]: https://github.com/agentskill-sh/ags

### 2d. Agent web search (baseline)

Asking the agent to search "agentskill.sh react skills" works but is non-deterministic and rate-limited. Useful as fallback when the API is unreachable; not a primary integration path.

**Recommendation: HTTP REST direct, no SDK, mirror the typed Zod schemas from `mcp-server/src/index.ts` into curator's adapter.**

---

## 3. The 8 MCP Tools — Verified Schemas

All schemas extracted verbatim from `agentskill-sh/mcp-server` `src/index.ts` (Zod definitions). ([mcp-server/src/index.ts][src-mcp])

| Tool | Input | Output (typed) | HTTP path |
|---|---|---|---|
| **search_skills** | `query`, `platform?`, `category?`, `minSecurityScore?:0-100`, `limit?:1-20` | `{results:[{name,slug,description,owner,platforms[],installCount,score,ratingCount,securityScore,contentQualityScore}], total, hasMore}` | `GET /agent/search?q=…` |
| **get_skill** | `slug` (owner/name) | `{data:{name,slug,description,owner,repositoryUrl,platforms,installCount,score,ratingCount,skillMd,tags,skillTypes,isVerified,securityScore,securityIssues:[{category,severity,description}],contentQualityScore,originalAuthor,jobRoles,jobCategories,updatedAt,claimed}}` | `GET /skills/{slug}` |
| **install_skill** | `slug`, `targetDir?` | `{slug,name,owner,description,skillMd,securityScore?,contentQualityScore?}`; writes `{baseDir}/{name}/SKILL.md` | `GET /agent/skills/{owner}/{name}/install` + fire-and-forget `POST /skills/{slug}/install` |
| **get_trending** | `period?:hot\|trending\|top\|latest`, `platform?`, `limit?:1-20` | `{data:[{name,slug,description,owner,platforms,installCount,score,ratingCount,securityScore,contentQualityScore}]}` | `GET /skills?section={period}` |
| **browse_skillsets** | `limit?:1-20` | `{data:[{slug,name,description,author:{name,username},skills:[slug],installCount,favoriteCount,skillDetails:[{slug,name,securityScore,qualityReview?:{score}}]}]}` | `GET /skillsets` |
| **install_skillset** | `slug`, `targetDir?` | iterates `skillset.skills`, calls install endpoint per skill; returns `{installed[], failed[]}` | `GET /skillsets` then per-skill install path |
| **rate_skill** | `slug`, `rating:1-5`, `comment?` | ack | `POST /skills/{slug}/agent-feedback` body `{rating,comment,agentName}` |
| **check_updates** | `slugs:[1-50 strings]` | `{versions: {slug:{contentSha,updatedAt}}}` | `GET /agent/skills/version?slugs=a,b,c` |

**Auth:** None for any tool. The User-Agent header is the only identifier sent.

**Rate limits:** Not documented. Anecdotally: 50-slug batch limit on `check_updates` is the only client-side cap. **Unverified — needs probe via load test** before relying on bulk discover loops.

---

## 4. Outbound Submission Flow

### 4a. Passive GitHub crawling — primary path

The submit page (`https://agentskill.sh/submit`) reads:

> **Submit a Skill** — Import from a GitHub repository or paste a direct link to any SKILL.md file. […] We'll scan the repo for all SKILL.md files and import them.
>
> **Keep it in sync** — *Daily sync*: We check for changes every 24 hours. No setup needed. *Instant sync*: Add a GitHub webhook and your skills update on every push. `https://agentskill.sh/api/webhooks/github` — Settings → Webhooks → Add webhook. Content type: application/json. Events: push only.

— [agentskill.sh/submit][submit]

Live verification: a sampled record shows `githubOwner`, `githubRepo`, `githubBranch`, `githubPath`, `githubSha`, `lastCrawledAt`, `lastAnalyzedAt` — confirming the crawler model is real and active. ([live-api][live-api])

**No account required to be listed.** Anyone (including a bot) can paste a GitHub URL into the submit form. Curator/lythoskill repos are theoretically already eligible for crawling once they have a public SKILL.md.

### 4b. Active claim — for verified badge + analytics

> **Is this your skill?** Connect your GitHub account to verify ownership and unlock analytics. (1) Connect GitHub in your account settings. (2) Skills from your repos and orgs are auto-claimed. (3) A verified badge appears on your profile and skill pages.

— [agentskill.sh/submit][submit]

Auth: Google OAuth (`googleClientId: 275322241074-…`) or GitHub OAuth (`githubClientId: Ov23liad2jePb0620tFf`) — both visible in page-embedded Nuxt config. **No email/password.** Free.

### 4c. Account model

- **Free tier only**, no paid tier visible. Run by "Yuki Capital" (footer); contact `hello@agentskill.sh`, security `security@yukicapital.com` (inferred from contributing.md error — note: the `agentskill-sh/skills` repo's contributing.md still points to `security@openai.com` because it's a fork of `openai/skills`, not authoritative).
- **Skillsets** = curated bundles, created via `https://agentskill.sh/skillsets/new` after sign-in. 2–30 skills per bundle, versioned with changelogs. (Source: HTML strip of `/readme` page.)
- **Multi-skill bundling**: skillsets are the bundling primitive — directly maps to lythoskill's deck concept.

### 4d. Bot-friendliness

| Action | Bot? |
|---|---|
| Submit a GitHub URL | YES (form likely accepts unauthenticated POST, **unverified — needs probe**) |
| Add GitHub webhook for instant sync | YES (handled on GitHub side; agent can `gh api repos/{owner}/{repo}/hooks --method POST -f config[url]=...`) |
| Claim ownership / get verified badge | NO — requires interactive OAuth |
| Create a skillset | NO — requires sign-in (Google or GitHub OAuth) |
| Rate a skill (`rate_skill`) | YES — `POST /api/skills/{slug}/agent-feedback`, no auth |
| Update a skill | YES (passive, via GitHub push to crawled repo) |

**Time to listing:** Daily crawl = up to 24h. Webhook = seconds. Direct URL submit = "Analyze & Import" returns synchronously per page copy.

**Editorial review:** None visible. Quality gating happens via the security/quality scores (server-side static analysis, 12 threat categories), not human review. Skills under score 30 require explicit user confirmation at install time, but they ARE listed.

---

## 5. Community Surface

| Surface | Status |
|---|---|
| GitHub Discussions | Not enabled on any of 5 repos |
| Discord | None linked from README, marketplace.json, or `/readme` page |
| Slack / forum | None visible |
| Issue activity | `ags`: 5 issues all closed (last 2026-03-31). `mcp-server`: 1 closed issue. `skills`, `openclaw`, `agentroulette`: 0 issues. **0 open issues across the entire org as of 2026-05-08.** |
| PR activity | 0 open PRs across all 5 repos |
| Maintainer | "Yuki Capital" (commercial entity); contact `hello@agentskill.sh`. Members of the GitHub org are private. |
| Audience signal | "100,000+ skills" badge on README; live API reports `92.5 average security score, 107,672 skills scanned` (Security Dashboard, 2026-05-08); ags has 17 GitHub stars, mcp-server has 2 |

**Read:** This is a top-down operated commercial directory, not a community project. Maintainer responsiveness is unmeasurable from public signals (no issues to respond to, but also no community asking). Sustainability is tied to whoever Yuki Capital is — flag as **single-vendor risk**. Community feedback channels are deliberately routed *through* the product (`rate_skill`, agent feedback) rather than out-of-band.

---

## 6. Trust Fit (L1/L2/L3)

Direct mapping to lythoskill-curator's three-layer trust model: ([curator three-layer trust][trust-mem])

[trust-mem]: ../../../../.claude/memory/project_curator_three_layer_trust.md

### L1 — Author claim (卖家秀)

agentskill.sh ingests SKILL.md frontmatter verbatim into `skillMd`, exposing per-skill: `name`, `description`, `tags[]`, `skillTypes[]`, `platforms[]`, `jobRoles[]`, `jobCategories[]`. The full SKILL.md body is fetched via `get_skill`. **L1 → curator: 1:1 mapping, no transformation needed.**

### L2 — Third-party signals (Big V)

Every record carries: `installCount`, `githubStars`, `score` (1-5 star rating), `ratingCount`, `securityScore` (0-100, 12 threat-category static analysis), `contentQualityScore` (0-100, undocumented rubric), `isVerified` (claimed-by-owner badge), `isFeatured`, `isOfficial` (skillsets only), `isActive`. Compound trending sections (`hot`, `trending`, `top`, `latest`) provide editorial momentum signals. **L2 → curator: rich; can be ingested as decorations on cold-pool entries.**

### L3 — Personal arena (买家秀)

`POST /api/skills/{slug}/agent-feedback` accepts `{rating:1-5, comment?, agentName}` — **agents are first-class raters by design**. The README explicitly says "Agents auto-rate skills after use (1-5 scale with comments), so the best ones surface and broken ones get flagged by the community." This means:

- **Inbound L3:** lythoskill arena outcomes can be **published back** as agent feedback, contributing to the L2 of every other consumer.
- **Outbound L3:** agentskill.sh's `score`/`ratingCount` is partly composed of agent ratings already — readers should treat it as crowdsourced agent opinion, not a curated editorial score.

This is the strongest L3-channel of any directory surveyed. Skills.sh / gh skill / anthropics/skills have no analog.

### Security signal

12 threat categories (command injection, data exfiltration, credential harvesting, prompt injection, obfuscation, sensitive file access, persistence mechanisms, external calls, reverse shells, destructive commands, social engineering, supply chain attacks). Per-skill issues exposed as `securityIssues:[{category, severity, description}]`. Two-layer model: server-side scan + `/learn` client-side scan before file write. ([Security Dashboard][sec-dashboard]) **Closed-source scanner — cannot be audited; trust is brand-only.**

[sec-dashboard]: https://agentskill.sh/security

---

## 7. Ecosystem Health

| Dimension | Value | Source |
|---|---|---|
| Skill count | 107,672 (live, 2026-05-08) | Security Dashboard scrape |
| Coverage | 100% scanned | Security Dashboard |
| Avg security score | 92.5 | Security Dashboard |
| Total flagged issues | 336,355 | Security Dashboard |
| Vendor neutrality | 20+ platforms in `PLATFORM_SKILL_DIRS` map: claude-code, cursor, copilot, windsurf, codex, gemini-cli, hermes, chatgpt, cline, vscode, opencode, aider, amp, goose, roo-code, trae, openclaw, antigravity, vibe, manus | `mcp-server/src/index.ts` |
| Content scope | **Skills only** — no MCP servers, no prompts, no agents listed as separate categories. Pure SKILL.md focus. | site browse |
| Spec compliance | Anthropic SKILL.md format; YAML frontmatter required; agnostic about body conventions | live samples |
| Governance | Single commercial entity (Yuki Capital); MIT-licensed client tools, closed registry/scanner | footer + repo licenses |
| Sustainability indicators | Active dev (commits within last 14 days on ags + mcp-server); commercial backer named; no public funding info — **unverified — needs probe via Yuki Capital website / Crunchbase** |
| Risk signals | OpenClaw (`agentskill-sh/openclaw`) is a sibling repo — they explicitly invoke the OpenClaw "ClawHavoc" supply-chain incident as their motivation for the security model; no incidents on agentskill.sh itself reported | README, Security page |
| Abandonment risk | Low-medium — single vendor but actively shipping; no transparent revenue model so commercial half-life unclear | inferred |

---

## 8. Comparison vs Alternatives

### vs **skills.sh** (Vercel-Labs official directory)

- **Inbound:** skills.sh has the simpler `GET /api/search?q=&limit=10` endpoint per find-skills SKILL.md; ranks by install telemetry only — fewer signals, but the only directory tracking *real* anonymous install counts across 19 agents. ([find-skills source][find-skills-src])
- **Outbound:** Submission is via GitHub topic `agent-skills` + their crawler (similar passive model). Vercel-backed → stronger sustainability signal. But fewer L2 signals (no security score, no quality score).
- **Trust:** Telemetry-only L2; no L3 agent-rating channel.
- **Tradeoff:** skills.sh wins on sustainability (Vercel) and install-count fidelity. agentskill.sh wins on richer schema, security scoring, and the L3 rating loop. **For an early integration where lythoskill needs to test arena→ratings→outbound, agentskill.sh is strictly better.** Add skills.sh second.

[find-skills-src]: https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md

### vs **`gh skill`** (GitHub CLI 2.90+, public preview)

- **Inbound:** Uses GitHub Code Search API for `SKILL.md` — no central registry, no rankings, no scores. Native auth via `gh`. Deterministic — provenance written into SKILL.md frontmatter (repo + ref + tree SHA). ([gh skill changelog][gh-skill])
- **Outbound:** `gh skill publish` validates against agentskills.io spec + checks repo settings — but "publishing" just means making sure your skill repo is well-formed; there's no central listing to push to.
- **Trust:** L1 only. No L2 signals beyond GitHub stars. No L3.
- **Tradeoff:** `gh skill` is the **substrate** (canonical SKILL.md provenance), not a discovery engine. lythoskill should adopt its provenance frontmatter convention regardless. But it can't be a curator's primary feed because it has no ranking layer.

[gh-skill]: https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/

### vs **anthropics/skills** (official Anthropic repo)

- **Inbound:** Single GitHub repo; manual PR review; no API. Discoverable via `gh api repos/anthropics/skills/contents/...`.
- **Outbound:** PR + manual editorial review by Anthropic team. Slow, exclusive, high-trust.
- **Trust:** L1 + Anthropic editorial seal of approval (very high). No L2 or L3.
- **Tradeoff:** This is a **trust anchor**, not a directory. Agentskill.sh actually surfaces anthropics/skills entries as `@anthropics/...` slugs (e.g., the live search returned `@anthropics/react-best-practices` from the ags README). lythoskill should treat anthropics/skills as a *trust signal source* (boost ranking when ingesting via agentskill.sh), not as a primary feed.

### Why agentskill.sh first — combined picture

| | inbound discovery | outbound submission | trust signals | bot-friendly |
|---|---|---|---|---|
| **agentskill.sh** | HTTP API + MCP + CLI | passive crawl + webhook | L1+L2+L3 | high |
| skills.sh | HTTP API only | passive crawl | L1+install count only | medium |
| gh skill | gh CLI only | n/a (substrate) | L1+stars | high (gh-native) |
| anthropics/skills | gh api scrape | manual PR | L1+editorial | low |

**agentskill.sh is the only one where curator can implement a clean inbound adapter AND publish outcomes back through the same surface.** That round-trip is the unique architectural fit.

---

## 9. Verdict & Action Plan

**Verdict: Adopt agentskill.sh as lythoskill's first end-to-end ecosystem integration.** Add skills.sh as a fast follower. Treat `gh skill` as a provenance convention to mirror, not a feed. Treat anthropics/skills as a trust boost source, not a feed.

### 9a. Inbound adapter — concrete plan

**Replace the placeholder `createAgentSkillShAdapter()` in `packages/lythoskill-curator/src/feed-adapters.ts` with an HTTP-direct implementation:**

- Drop the `mcp:agentskill-mcp` locator; switch to `https:agentskill.sh` style locator.
- New code path: `discover(query?)` → `GET https://agentskill.sh/api/agent/search?q={query||'*'}&limit=20` → map results to `FeedItem[]` using `{locator: 'agentskill.sh/' + slug, name, description, source: 'agentskill-sh'}` and stash L2 signals (`installCount`, `securityScore`, `contentQualityScore`, `score`, `ratingCount`) on FeedItem for downstream curator-add to persist.
- For "browse trending" mode: `GET /skills?section=trending&limit=20`.
- For per-skill detail (when curator wants the actual SKILL.md to ingest): `GET /skills/{slug}` and use the `skillMd` field directly — no need to clone the GitHub repo.
- For drift detection: `GET /agent/skills/version?slugs=...` returns `contentSha` array; map to curator's reconcile loop. **This is the same content-SHA model curator already uses — direct integration, no shim.**
- No auth, no API key. User-Agent: `lythoskill-curator/{version}`.
- Schema source: copy the Zod definitions from `mcp-server/src/index.ts` into a `packages/lythoskill-curator/src/sources/agentskill-sh-schema.ts` (BSD-licensed via MIT, so verbatim copy is fine with attribution).
- Error handling: 404 for unknown slug, 409 for ambiguous slug (use `owner/name` format), 500-class flagged for retry. **Add request timeout (5s) and graceful degradation to `[]` per existing adapter pattern at line 106-108 of feed-adapters.ts.**

**BDD scenario file:** `packages/lythoskill-curator/test/scenarios/curator-discover-agentskill.agent.md`

Following the project's `*.agent.md` convention ([test-utils memory][test-utils-mem]), the scenario should cover:

[test-utils-mem]: ../../../../.claude/memory/project_test_utils_bdd_control_loop.md

```markdown
# Curator discover from agentskill.sh

## Scenario: search by keyword
GIVEN curator is configured with the agentskill-sh adapter
WHEN the agent runs `curator discover --source agentskill-sh --query react`
THEN the agent observes ≥1 result with slug containing 'react'
AND each result has installCount, securityScore, contentQualityScore fields populated
AND the call completes within 5 seconds

## Scenario: trending fallback
GIVEN curator is configured with the agentskill-sh adapter
WHEN the agent runs `curator discover --source agentskill-sh --trending`
THEN the agent observes ≥10 results sorted by trending rank

## Scenario: drift detection
GIVEN curator has 3 skills imported from agentskill.sh with cached contentSha
WHEN the agent runs `curator refresh --source agentskill-sh`
THEN the agent invokes /agent/skills/version with the 3 slugs
AND skills with mismatched contentSha are flagged for update
AND skills with matching contentSha are skipped

## Scenario: graceful API failure
GIVEN agentskill.sh is unreachable (mock 503)
WHEN the agent runs `curator discover --source agentskill-sh --query react`
THEN the discover call returns [] (no exception)
AND a warning is emitted to stderr
```

**Fixtures:** Capture three real responses today (search/trending/version) and store under `packages/lythoskill-curator/test/fixtures/agentskill-sh/`. Live calls in CI optional; mock-by-default to avoid network flakiness.

### 9b. Outbound submission — concrete plan

**Phase 1 (manual, this week — user does):**
1. User signs in to agentskill.sh via GitHub OAuth (one click; required for verified badge).
2. User confirms which lythoskill packages have public SKILL.md files. Per package identification memo ([skill product memo][skill-pkg]), these are `packages/<x>/skill/SKILL.md` files.
3. For each public lythoskill skill repo, paste the GitHub URL into `https://agentskill.sh/submit` → "Analyze & Import". Crawler picks up all SKILL.md files in the tree.
4. User adds a GitHub webhook (`https://agentskill.sh/api/webhooks/github`, push events, application/json) on the lythoskill org or per-repo so updates land instantly.
5. Verified badge appears once GitHub OAuth recognizes user as repo owner.

[skill-pkg]: ../../../../.claude/memory/project_skill_package_identification.md

**Phase 2 (semi-automated — agent does, gated):**
1. Agent uses `gh api repos/{owner}/{repo}/hooks` to list/add webhooks programmatically once user has OAuth'd once. (Note: webhook write requires `admin:repo_hook` scope on the `gh` token — verify scope before scripting.)
2. Agent monitors `lastCrawledAt` per skill via `GET /skills/{slug}` and alerts user if a skill hasn't synced in >48h.
3. Agent publishes arena outcomes back as agent ratings: `POST /api/skills/{slug}/agent-feedback` with `{rating: arena_score, comment: arena_summary, agentName: 'lythoskill-arena'}`. **This is the L3 outbound channel.** Wire to arena's judge step. Cap rate (e.g., one rating per slug per week) to avoid gaming.

**Phase 3 (automated bulk submission — needs probe first):**
- **Unverified — needs probe:** test whether the submit form's backend POST endpoint accepts unauthenticated requests, and discover its URL via browser devtools. If yes, agent can register every new lythoskill skill repo on first publish.
- If no, document the manual one-time step in CONTRIBUTING.md.

**What user does vs what agent automates:**

| Step | Actor |
|---|---|
| OAuth into agentskill.sh once | User (browser) |
| Paste repo URL into /submit | User (one-time per repo) OR agent (if endpoint is bot-accepting) |
| Add GitHub webhook | Agent (`gh api` after user OAuth's webhook scope) |
| Claim verified ownership | Auto (OAuth → GitHub repo match) |
| Update skill content | Agent (push to GitHub → webhook → instant sync) |
| Rate other skills (L3 outbound) | Agent (via arena pipeline) |
| Create skillset (deck publishing) | User (UI only, /skillsets/new, requires sign-in) |

### 9c. Open questions to resolve before implementation

1. **Rate limit reality** — load-test `/agent/search` at 20 req/s; document soft/hard limits.
2. **Submit endpoint discoverability** — open browser devtools on `/submit` and capture the POST URL/body shape; determine if anonymous bot submission is possible.
3. **Webhook secret** — the form copy doesn't mention an HMAC secret; verify with a test webhook whether agentskill.sh validates webhook authenticity. If not, our skills could in theory be force-resync'd by anyone — flag as low-risk minor concern.
4. **Skillset → deck mapping** — confirm via testing that creating a skillset with 30 lythoskill skills is the right outbound primitive for "publishing a lythoskill deck."
5. **Yuki Capital due diligence** — search Crunchbase / LinkedIn for the operator entity before committing arena rating telemetry to flow there.

---

## Sources cited inline

- [agentskill-sh/mcp-server src/index.ts](https://github.com/agentskill-sh/mcp-server/blob/main/src/index.ts) — verified Zod schemas, HTTP paths
- [agentskill-sh/ags](https://github.com/agentskill-sh/ags) — CLI source, README, marketplace.json
- [agentskill.sh/submit](https://agentskill.sh/submit) — submission flow copy (verbatim)
- [agentskill.sh/security](https://agentskill.sh/security) — security dashboard live numbers
- [agentskill.sh/marketplace.json](https://agentskill.sh/marketplace.json) — Claude plugin marketplace manifest
- Live API probes 2026-05-08: `/api/agent/search?q=react`, `/api/skills?section=trending`, `/api/skillsets`
- [vercel-labs/skills find-skills SKILL.md](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md) — skills.sh comparison
- [GitHub Changelog: gh skill 2.90](https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/) — gh skill comparison
- [GitHub CLI manual: gh skill](https://cli.github.com/manual/gh_skill)
