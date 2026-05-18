# Why Curator Is This Shape

Curator's form (local cache + agent-enriched metadata, not discovery engine or ranking recommender) is not an engineering preference. It's structurally determined by three ecosystem constraints. Full steel-man analysis at [`cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md`](../../../cortex/wiki/01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md).

## 1. Multi-Author Ecosystem → Cannot Require Custom Fields

Skills come from different GitHub repos, different authors. No shared memory model. The ecosystem converges on only 2 required frontmatter fields (`name` + `description`). All other fields are platform-side runtime enrichment — **none** are filled by skill authors. Requiring `deck_niche` or any custom field from authors goes against the grain of the ecosystem. 100% of mainstream skills would trigger audit violations.

## 2. Description = Attention Currency + Self-Reported → SEO Arms Race

SKILL.md `description` is prompt-real-estate — it determines whether an agent activates the skill. Self-reported, no third-party audit. Hub ranking creates a perfect SEO/advertising arms race formula. Google's 20-year ad monetization playbook, app store ASO, and short-video SEO have all run this script before.

Curator deliberately does NOT rank or recommend — not for engineering reasons, but for economic ones. Once ranking exists, pay-to-rank, fake reviews, keyword stuffing, and astroturfing inevitably follow. Agent-as-consumer slightly mitigates this (agents dislike pushy descriptions) but pushy descriptions still trigger activation — the "trigger-but-not-like" dynamic that SEO always exploits.

## 3. Explore Slot Already Occupied by Agent+Search

Agent + WebSearch/WebFetch/gh CLI is already the dominant discovery mechanism. Agent's semantic understanding + real-time web search far outperforms any local index for discovery. Curator trying to be a discovery engine competes in a slot already won. Curator's irreplaceable value is **local cache** — agent cannot efficiently grep 200 local repos' SKILL.md files, but curator scanning once into SQLite enables millisecond queries.

## Result: Curator = Local Cache + Agent-Enriched Metadata

The only viable form: scan cold pool into SQLite (mechanical, fast), let agent handle discovery (intelligent, semantic), let agent write annotations back (L3 买家秀, not L1 卖家秀). Not discovery engine. Not ranking recommender. Local cache + curatorial annotation layer.
