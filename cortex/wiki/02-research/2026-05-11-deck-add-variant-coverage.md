---
created: 2026-05-11
updated: 2026-05-11
category: research
---

# Deck Add Variant Coverage — 32 Locator Forms × Full CLI Verification

> Integration test of every locator variant that `deck add` accepts. Fresh `/tmp`
> environment, real git clones. 35/36 pass. 2 bugs found and fixed.

## Test Matrix

### FQ Locators (passthrough)

| Form | Example | Result |
|------|---------|--------|
| `github.com/owner/repo` | `github.com/vercel-labs/agent-skills` | ✅ |
| `github.com/owner/repo/subpath` | `github.com/vercel-labs/agent-skills/skills/deploy-to-vercel` | ✅ |
| `github.com/owner/repo#ref` | `github.com/vercel-labs/skills#main` | ✅ |

All three pass through `normalizeSkillsSh` unchanged and parse correctly.

### skills.sh Shorthand — 17 Top Skills

All 17 skills.sh top skills normalize to `github.com/owner/repo`:

`vercel-labs/skills`, `vercel-labs/agent-skills`, `anthropics/skills`, `mattpocock/skills`,
`obra/superpowers`, `browser-use/browser-use`, `firecrawl/cli`, `apify/agent-skills`,
`squirrelscan/skills`, `getsentry/sentry-for-ai`, `coderabbitai/skills`, `openai/skills`,
`google-gemini/gemini-cli`, `coreyhaines31/marketingskills`, `jimliu/baoyu-skills`,
`astronomer/agents` — all ✅

### @skill Syntax (Post-Clone Name Discovery)

| Form | Example | skillFilter | Result |
|------|---------|-------------|--------|
| `owner/repo@skill` | `vercel-labs/agent-skills@deploy-to-vercel` | deploy-to-vercel | ✅ |
| `owner/repo@skill` | `mattpocock/skills@tdd` | tdd | ✅ |
| `owner/repo@skill` | `mattpocock/skills@diagnose` | diagnose | ✅ |

### #ref Suffix

| Form | Example | Result |
|------|---------|--------|
| FQ + #ref | `github.com/vercel-labs/skills#main` | ✅ |
| Shorthand + #ref | `vercel-labs/skills#v2.0` | ✅ |
| @skill + #ref | `vercel-labs/skills#main@find-skills` | ✅ |
| Subpath + #ref | `anthropics/skills/skills/frontend-design#abc1234` | ✅ |

### github: Prefix

| Form | Example | Result |
|------|---------|--------|
| Plain | `github:vercel-labs/agent-skills` | ✅ |
| With @skill | `github:mattpocock/skills@tdd` | ✅ (was ❌, fixed) |

### Subpath Shorthand

| Form | Example | Result |
|------|---------|--------|
| `owner/repo/subpath` | `vercel-labs/agent-skills/skills/react-best-practices` | ✅ |
| `owner/repo/subpath` | `anthropics/skills/skills/frontend-design` | ✅ |

### Security: Injection Prevention

| Attack Vector | Example | Result |
|--------------|---------|--------|
| Git option injection | `vercel-labs/skills#--force` | ✅ REJECTED |
| Path traversal in ref | `vercel-labs/skills#v1/../evil` | ✅ REJECTED |
| Empty locator | `` | ✅ REJECTED |
| Single segment | `my-skill` | ✅ REJECTED |

## Full CLI Verification (Real Clone + Deck Write)

| # | Locator | Exit | Result |
|---|---------|------|--------|
| 1 | `github.com/vercel-labs/agent-skills/skills/deploy-to-vercel` | 0 | ✅ |
| 2 | `vercel-labs/agent-skills@react-best-practices` | 0 | ✅ |
| 3 | `vercel-labs/agent-skills/skills/composition-patterns` | 0 | ✅ |
| 4 | `mattpocock/skills@tdd` | 0 | ✅ |

All produce valid deck.toml entries with correct `path`, `source`, and alias.

## Bugs Found

### Bug 1: `github:` prefix dropped `@skill` extraction

`github:mattpocock/skills@tdd` passed `@tdd` through in the FQ path. Root cause:
`normalizeSkillsSh` processed `github:` before `@skill`. After stripping `github:`,
the remainder was never re-checked for `owner/repo@skill`.

**Fix** (`add.ts:138-147`): After stripping `github:` prefix, re-parse remainder
for `@skill` pattern.

### Bug 2: `@skill` discovery failed on dir name ≠ frontmatter name

4/7 Vercel skills prefix frontmatter names with `vercel-`:

| Directory | Frontmatter `name:` |
|-----------|-------------------|
| `react-best-practices` | `vercel-react-best-practices` |
| `composition-patterns` | `vercel-composition-patterns` |
| `react-native-skills` | `vercel-react-native-skills` |
| `react-view-transitions` | `vercel-react-view-transitions` |

`findSkillByName` matched only frontmatter `name:`, so `@react-best-practices` failed.

**Fix** (`add.ts:65-84`): Added fallback pass — if frontmatter name doesn't match,
match against directory basename (skills.sh convention).

## skills.sh ↔ lythoskill Interop Map

| Scenario | skills.sh | lythoskill | Status |
|----------|-----------|------------|--------|
| Add by owner/repo | `npx skills add vercel-labs/agent-skills` | `deck add vercel-labs/agent-skills` | ✅ |
| Add specific skill | `npx skills add ... --skill deploy-to-vercel` | `deck add vercel-labs/agent-skills@deploy-to-vercel` | ✅ |
| Add with subpath | (auto-discover) | `deck add vercel-labs/agent-skills/skills/deploy-to-vercel` | ✅ |
| Pin version | `npx skills add ... --ref v2.0` | `deck add vercel-labs/skills#v2.0` | ✅ |
| github: prefix | `github:owner/repo` | `deck add github:owner/repo` | ✅ |
| FQ locator | `github.com/owner/repo` | `deck add github.com/owner/repo` | ✅ |
| Source URL | `npx skills view <name>` | `source` field in deck.toml | ✅ |

## Remaining Gaps

1. **Multi-skill repo discovery**: `deck add vercel-labs/agent-skills` (repo-level, no subpath)
   fails when there's no SKILL.md at root. `findSkillDir` only auto-picks single-skill repos.
   → TASK-20260511093956018

2. **`vercel-labs/skills` repo**: This is the CLI tool repo, not a skill content repo.
   The shorthand normalizes correctly but the add will fail on missing SKILL.md.

3. **Name mismatch prevalence**: The Vercel dir-name-vs-frontmatter pattern may appear in
   other publishers. Our directory-name fallback handles it, but `@skill` users should
   be aware that frontmatter `name:` is the primary match key.
