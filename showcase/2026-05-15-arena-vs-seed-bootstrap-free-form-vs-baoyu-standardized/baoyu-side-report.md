# Side Report — AI Coding Agents Ecosystem Comparison

## Skills Added

| Skill | Path | Why Added |
|-------|------|-----------|
| baoyu-diagram | github.com/JimLiu/baoyu-skills/skills/baoyu-diagram | For generating the radar chart SVG following baoyu dark-themed design system |
| baoyu-markdown-to-html | github.com/JimLiu/baoyu-skills/skills/baoyu-markdown-to-html | For converting article markdown to professionally styled HTML |
| baoyu-cover-image | github.com/JimLiu/baoyu-skills/skills/baoyu-cover-image | For cover image generation methodology (Type x Palette x Rendering x Text x Mood) |
| baoyu-article-illustrator | github.com/JimLiu/baoyu-skills/skills/baoyu-article-illustrator | For article illustration workflow (Type x Style x Palette approach) |

## Deck Link Issues

The `bunx @lythos/skill-deck@latest add` command failed with "Cannot reach https://github.com/JimLiu/baoyu-skills.git" due to network restrictions. The `deck link` command also only linked the innate `lythoskill-deck` skill, ignoring the baoyu skills declared in `skill-deck.toml`.

**Workaround**: Manually created symlinks from the cold pool to the working set:
```bash
ln -sf ~/.agents/skill-repos/github.com/JimLiu/baoyu-skills/skills/baoyu-diagram .claude/skills/
ln -sf ~/.agents/skill-repos/github.com/JimLiu/baoyu-skills/skills/baoyu-markdown-to-html .claude/skills/
ln -sf ~/.agents/skill-repos/github.com/JimLiu/baoyu-skills/skills/baoyu-cover-image .claude/skills/
ln -sf ~/.agents/skill-repos/github.com/JimLiu/baoyu-skills/skills/baoyu-article-illustrator .claude/skills/
```

## What Worked

1. **baoyu-markdown-to-html**: Successfully converted `article.md` to `article.html` with the `modern` theme and `orange` accent color. The output is a self-contained HTML file with inline CSS, professionally styled, and includes the embedded images.

2. **baoyu-diagram methodology**: Applied the dark-themed design system (slate-900 background, semantic color palette, JetBrains Mono typography) to create the radar chart SVG. The SVG was hand-crafted following baoyu's layering order, spacing rules, and component patterns.

3. **baoyu-cover-image methodology**: Applied the 5-dimension approach (Type=conceptual, Palette=dark, Rendering=digital, Text=title-only, Mood=balanced) to guide the cover illustration design, implemented via Python/PIL.

4. **baoyu-article-illustrator methodology**: Applied the Type x Style x Palette framework to plan illustrations: radar chart as `infographic` type with `technical-schematic` style, cover as `conceptual` type with `digital` rendering.

## What Didn't Work

1. **baoyu-diagram SVG-to-PNG conversion**: The baoyu-diagram script depends on `sharp` (Node.js image library), which failed to load on this system due to missing native dependencies (`libvips`).
   - **Fallback**: Used Python/PIL to generate the radar chart PNG directly.

2. **baoyu-imagine image generation**: No image generation backend was available (no API keys configured for OpenAI, Google, etc.). The baoyu-imagine skill requires EXTEND.md setup with provider credentials.
   - **Fallback**: Used Python/PIL to generate the cover illustration as a code-rendered graphic instead of AI-generated raster image.

3. **baoyu-cover-image direct invocation**: Could not invoke the skill directly because no raster image backend was available, and the skill explicitly forbids SVG/HTML/canvas substitution per its SKILL.md.
   - **Fallback**: Applied the baoyu methodology manually (analyzed topic, determined dimensions) and implemented with Python/PIL.

4. **deck link with cold_pool path**: The deck link command did not resolve the baoyu skills even with `--cold-pool` specified. Only the innate skill was linked.
   - **Fallback**: Manual symlinks.

## Output Summary

| File | Description |
|------|-------------|
| `/tmp/arena-vs-baoyu/output/article.md` | Full article in Markdown with executive summary, methodology, per-agent analysis, conclusion |
| `/tmp/arena-vs-baoyu/output/article.html` | Professionally styled HTML (modern theme, orange accent, inline CSS) |
| `/tmp/arena-vs-baoyu/output/diagram/radar-chart.svg` | Radar chart comparing 5 agents on 5 dimensions (SVG, baoyu dark theme) |
| `/tmp/arena-vs-baoyu/output/diagram/radar-chart.png` | Radar chart as 1800x1400 PNG (Python/PIL) |
| `/tmp/arena-vs-baoyu/output/cover/cover.png` | Cover illustration as 1920x1080 PNG (Python/PIL, baoyu-inspired design) |
| `/tmp/arena-vs-baoyu/output/side-report.md` | This report |

## Key Takeaways

- The baoyu-skills methodology (Type x Style x Palette, 5-dimension cover design, dark-themed diagrams) is valuable as a **design framework** even when the full toolchain (image generation backends, sharp conversion) is unavailable.
- The baoyu-markdown-to-html skill is the most immediately useful — it produced publication-ready HTML with zero configuration beyond theme selection.
- When skills depend on external services (image APIs) or native libraries (sharp/libvips), Python/PIL is a reliable fallback for generating raster images programmatically.
- The lythoskill-deck `link` command has a gap: it doesn't seem to link non-innate skills when network validation fails, even if the skills exist in the local cold pool.
