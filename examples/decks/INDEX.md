# Pre-Built Deck Index

> All decks validated with `deck validate --remote`. Every locator resolves to a real GitHub repo.
> Pick one → `curl` it → `deck link --deck ./deck.toml` → ready.

## By Use Case

### Software Engineering
| Deck | Skills | Use |
|------|--------|-----|
| [engineering.toml](./engineering.toml) | tdd, to-prd, mermaid | TDD + PRD + architecture diagrams |
| [full-stack.toml](./full-stack.toml) | react, composition, tdd, pdf, mermaid | React + component patterns + TDD |
| [scout.toml](./scout.toml) | lythoskill-deck (innate only) | Minimal baseline — measure deck impact |

### Documents & Research
| Deck | Skills | Use |
|------|--------|-----|
| [documents.toml](./documents.toml) | pdf, docx | Read/write office formats |
| [research-documents.toml](./research-documents.toml) | research ×3, pdf, docx | Deep research → formatted report |
| [deep-research.toml](./deep-research.toml) | research, research-deep, research-report | Pure research pipeline (no format output) |
| [recipe-report.toml](./recipe-report.toml) | docx, research, research-report | Docx + radar chart report |

### Design & Visualization
| Deck | Skills | Use |
|------|--------|-----|
| [design-studio.toml](./design-studio.toml) | frontend-design, theme-factory, brand-guidelines | Design taste + theme systems |
| [visual-explainer.toml](./visual-explainer.toml) | mermaid, theme-factory | Mermaid diagrams + polished output |
| [architecture-explainer.toml](./architecture-explainer.toml) | mermaid, frontend-design, theme-factory, brand-guidelines, docx, pdf | Project architecture docs (DeepWiki-like) |

### Project Governance
| Deck | Skills | Use |
|------|--------|-----|
| [governance.toml](./governance.toml) | cortex, scribe, onboarding, lythoskill-deck | ADR + Epic + Task + handoff |

## Codex Variants

Codex variants use `working_set = ".agents/skills"` and recommend `--mode snapshot` (Codex #11314 symlink workaround is resolved in 0.9.32):

| Deck | Based on |
|------|----------|
| [codex/documents.toml](./codex/documents.toml) | documents.toml |
| [codex/engineering.toml](./codex/engineering.toml) | engineering.toml |

## Quick Start

```bash
# Pick a deck, fetch it, link it — one command:
bunx @lythos/skill-deck@latest link --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/engineering.toml

# Or validate before adopting:
bunx @lythos/skill-deck@latest validate --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/engineering.toml --remote
```

All raw URLs follow the pattern:
`https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/<name>.toml`
