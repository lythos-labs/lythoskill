# Seed Deck Bootstrap Report

## What I Learned from `lythoskill-deck`

The deck governance skill teaches a **deny-by-default** model:

- **`skill-deck.toml`** declares the desired working set using alias-as-key dicts:
  - `[innate.skills.xxx]` — eager-load skills (read first after compaction)
  - `[tool.skills.xxx]` — lazy-load skills (read on trigger)
- **`deck link`** is a reconciler: it makes `.claude/skills/` match the declaration by creating symlinks from the cold pool and removing anything undeclared.
- **Fully-qualified locators** are required for reliability: `github.com/owner/repo/path/to/skill`.
- `deck add <locator>` downloads a skill to the cold pool and registers it in the deck. If the skill is already present locally, it should reference it directly (fast path).
- `max_cards` enforces a budget; exceeding it causes `link` to refuse.

## Skills Discovered and Selection Rationale

I ran three catalog queries against the local cold pool (`catalog.db`):

### 1. docx / Word document skills
| Skill | Path | Selected? | Reason |
|-------|------|-----------|--------|
| `doc-to-markdown` | `github.com/daymade/claude-code-skills/suites/daymade-docs/doc-to-markdown` | ❌ | Converts DOCX **to** Markdown — wrong direction. |
| `docx` | `github.com/anthropics/skills/skills/docx` | ✅ | Creates, reads, edits, and manipulates Word documents. Explicitly covers reports, memos, letters, and inserting images. Perfect for the cookie recipe `.docx` deliverable. |

### 2. chart / diagram skills
| Skill | Path | Selected? | Reason |
|-------|------|-----------|--------|
| `critique` | `github.com/nexu-io/open-design/skills/critique` | ❌ | Generates an HTML radar chart for design reviews, not a Word-embeddable chart. |
| `dashboard` | `github.com/nexu-io/open-design/skills/dashboard` | ❌ | HTML dashboard with KPI cards and charts — not applicable to `.docx`. |
| `mermaid-tools` | `github.com/daymade/claude-code-skills/suites/daymade-docs/mermaid-tools` | ❌ | Converts Mermaid diagrams to PNG; Mermaid does not natively support radar charts well. |
| *(none matched "radar" directly)* | — | — | No dedicated radar-chart-for-docx skill exists in the cold pool. |

### 3. research skills
| Skill | Path | Selected? | Reason |
|-------|------|-----------|--------|
| `deep-research` | `github.com/daymade/claude-code-skills/deep-research` | ✅ | Generates format-controlled research reports with evidence tracking and citations. Ideal for producing structured, professional cookie recipe content (ingredients, instructions, nutrition notes). |
| `last30days` | `github.com/BrianRWagner/ai-marketing-skills/last30days` | ❌ | Focused on Reddit/X trend research, not recipe/content generation. |

## Final Deck Composition

```toml
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[tool.skills.docx]
path = "github.com/anthropics/skills/skills/docx"

[tool.skills.deep-research]
path = "github.com/daymade/claude-code-skills/deep-research"
```

**Working set verification:**
- `lythoskill-deck` ✅ (original)
- `docx` ✅
- `deep-research` ✅

**Cards used: 3 / 8**

## Gaps and Workarounds

1. **No radar-chart skill for `.docx`**: The cold pool lacks a skill that generates radar charts and embeds them directly into Word documents. The closest (`critique`) outputs HTML. **Workaround**: Generate the radar chart using Python `matplotlib` (or another plotting library) as a PNG, then embed the image into the `.docx` using the `docx` skill's image-insertion capabilities.

2. **Network probe on `deck add`**: Even though both `docx` and `deep-research` were already present in the local cold pool, `bunx @lythos/skill-deck@latest add` attempted a network probe to `github.com` and failed because the seed environment blocks outbound network access. **Workaround**: Manually appended the skill entries to `skill-deck.toml` and ran `deck link`, which correctly resolved the local cold pool paths without network access.
