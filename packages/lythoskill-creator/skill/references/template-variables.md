# Template Variables

The `build` command substitutes these variables from `packages/<name>/package.json` into all files under `packages/<name>/skill/` before copying to `skills/<name>/`.

| Variable | Source | Example |
|----------|--------|---------|
| `{{PACKAGE_NAME}}` | `name` field | `@lythos/skill-creator` |
| `{{PACKAGE_VERSION}}` | `version` field | `0.7.0` |
| `{{PACKAGE_DESCRIPTION}}` | `description` field | `Scaffold and build projects...` |
| `{{BIN_NAME}}` | First key in `bin` | `lythoskill-creator` |
| `{{BIN_ENTRY}}` | First value in `bin` | `./src/cli.ts` |

## Usage

Use these in `SKILL.md` frontmatter, script comments, or any skill-layer file:

```yaml
---
name: lythoskill-example
version: {{PACKAGE_VERSION}}
---
```

## Unified Version

If a package has `package.json`, its version must match the root `package.json` version. Drift triggers a warning at build time.
