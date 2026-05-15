---
created: 2026-05-15
updated: 2026-05-16
category: lesson
---

# Baoyu Skills Dependency Audit — Lythoskill Content Creation Toolchain

> Audit of 21 baoyu skills in cold pool, cataloged by runtime dependency, API key requirement, and readiness for lythoskill project content creation.
> Date: 2026-05-15. Platform: macOS arm64 (Apple Silicon).

## Three-tier readiness

| Tier | Count | Gate |
|------|-------|------|
| 🟢 Works now | 4 skills | Zero deps beyond bun/npx |
| 🟡 After `brew install vips` | +4 skills | SVG→PNG conversion unlocked |
| 🔴 After API key | +10 skills | Image generation backend |

## 🟢 Zero-dependency (works now)

| Skill | Output | What it needs |
|-------|--------|---------------|
| baoyu-diagram | SVG diagrams (9 types), dark theme | Google Fonts CDN |
| baoyu-markdown-to-html | Styled HTML (WeChat-compatible) | bun or npx |
| baoyu-format-markdown | Formatted markdown | None |
| baoyu-compress-image | WebP/PNG compressed images | bun + native tools |

## 🟡 After fixing system deps

**sharp / libvips** (SVG→PNG conversion): missing on this machine.

Fix (macOS arm64):
```bash
brew install vips
# OR
npm install sharp   # bundles its own prebuilt binary for darwin-arm64
```

Unlocks: baoyu-diagram PNG export, slide-deck, image-cards, infographic (SVG→PNG path).

## 🔴 After API key

All image-generation skills delegate to a raster backend. baoyu-imagine supports 10+ providers (OpenAI GPT Image 2, Google, OpenRouter, DashScope, MiniMax, etc.).

Setup:
```bash
mkdir -p ~/.baoyu-skills/baoyu-imagine/
# Create EXTEND.md with provider, API key, model preferences
```

Unlocks: baoyu-cover-image, baoyu-image-cards, baoyu-slide-deck, baoyu-infographic, baoyu-article-illustrator.

## Full Skill Inventory

| Skill | Type | Dependency |
|-------|------|-----------|
| baoyu-article-illustrator | Content planning | 🟡 API for img gen (methodology works without) |
| baoyu-comic | Image gen | 🔴 API key |
| baoyu-compress-image | Utility | 🟢 bun + native tools |
| baoyu-cover-image | Cover image (5-dim framework) | 🔴 API key or raster backend |
| baoyu-danger-gemini-web | Image gen (reverse-engineered) | ⚠️ Unstable |
| baoyu-danger-x-to-markdown | X/Twitter→MD conversion | 🟢 browser-based |
| baoyu-diagram | SVG diagrams (9 types) | 🟢 Zero deps |
| baoyu-format-markdown | MD formatting | 🟢 Zero deps |
| baoyu-image-cards | Social card series (12×8×3) | 🔴 API key or raster backend |
| baoyu-image-gen | Image gen | ⚠️ Deprecated → baoyu-imagine |
| baoyu-imagine | AI image gen (10+ backends) | 🟡 EXTEND.md + API key |
| baoyu-infographic | Infographics (21×22) | 🔴 API key or raster backend |
| baoyu-markdown-to-html | MD→HTML (WeChat themes) | 🟢 bun/npx |
| baoyu-post-to-wechat | WeChat publishing | 🔴 Chrome CDP or API |
| baoyu-post-to-weibo | Weibo publishing | 🔴 Chrome CDP |
| baoyu-post-to-x | X/Twitter publishing | 🔴 API key or Chrome CDP |
| baoyu-slide-deck | Slide image generation | 🔴 API key or raster backend |
| baoyu-translate | Translation (3 modes) | 🟢 bun/npx |
| baoyu-url-to-markdown | URL→MD (Chrome CDP) | 🔴 Chrome CDP |
| baoyu-xhs-images | Xiaohongshu images | ⚠️ Deprecated → baoyu-image-cards |
| baoyu-youtube-transcript | YT transcripts | 🟡 YouTube access |

## Key Insight (from arena vs)

baoyu-standardized side proved: **even with 3/4 skills failing at execution layer, methodology (心法) transfers.** Agent read SKILL.md, internalized Type×Style×Palette framework, hand-rolled Python/PIL to produce equivalent output.

## Lythoskill Content Plan

### Phase 1: Today (zero new deps)
- Architecture diagram of lythoskill system (baoyu-diagram)
- Concept map / data flow (baoyu-diagram)
- Styled project intro article (markdown-to-html)
- Cortex wiki formatting (format-markdown)

### Phase 2: After `brew install vips`
- SVG diagrams → PNG for social sharing
- Slide deck images (methodology + Python/PIL)

### Phase 3: After API key (1 provider)
- Article cover images (5-dim framework)
- Social media card series
- Full infographics
- Complete styled slide deck
- Article illustrations (Type×Style×Palette)

## Related
- `showcase/2026-05-15-arena-vs-seed-bootstrap-free-form-vs-baoyu-standardized/`
- `cortex/wiki/01-patterns/2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior.md`
