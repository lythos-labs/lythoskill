# Template Variables

The `build` command substitutes these variables from `packages/<name>/package.json` into all files under `packages/<name>/skill/` before copying to `skills/<name>/`.

| Variable | Source | Example |
|----------|--------|---------|
| `@lythos/skill-creator` | `name` field | `@lythos/skill-creator` |
| `0.7.2` | `version` field | `0.7.0` |
| `lythoskill scaffolding tool — init and build thin-skill packages` | `description` field | `Scaffold and build projects...` |
| `lythoskill-creator` | First key in `bin` | `lythoskill-creator` |
| `src/cli.ts` | First value in `bin` | `./src/cli.ts` |

## Usage

Use these in `SKILL.md` frontmatter, script comments, or any skill-layer file:

```yaml
---
name: lythoskill-example
version: 0.7.2
---
```

## Unified Version

If a package has `package.json`, its version must match the root `package.json` version. Drift triggers a warning at build time.
