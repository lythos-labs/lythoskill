# lythoskill-writer

> Human-first documentation writer and reviewer.

## Overview

Pure **Skill** layer — no Starter (npm package), no CLI, no dependencies.

Reviews README, wiki, ADR, daily handoff, showcase, and reference docs for
information density, structural rhythm, and anti-template patterns.

Not for SKILL.md — that belongs to `lythoskill-coach`.

## Usage

Add to your `skill-deck.toml`:

```toml
[tool.skills.lythoskill-writer]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-writer"
```

Then run `bunx @lythos/skill-deck@latest link`.

## What It Checks

- **First principles over analogies** — opening paragraph states what it is, not what it's like
- **Information density** — every sentence carries new, actionable information
- **Banned vocabulary** — no buzzwords with zero operational meaning
- **Sentence pattern quotas** — "不是…而是…", tricolons, rhetorical questions capped
- **Structural rhythm** — paragraph length varies, docs can end without summary
- **Tone calibration** — friendly expert, not academic or marketing

## Scope

| In scope | Out of scope |
|----------|-------------|
| README / README.zh.md | SKILL.md (→ coach) |
| wiki pages | |
| ADRs | |
| Daily handoffs | |
| Showcase writeups | |
| references/*.md | |
| AGENTS.md | |
