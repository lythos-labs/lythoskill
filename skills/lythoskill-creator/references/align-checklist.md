# Align Checklist

`lythoskill-creator align` audits a monorepo against current conventions.

## Root Checks

| Check | Auto-fix |
|-------|----------|
| `package.json` has `husky` in `devDependencies` | ✅ Yes |
| `package.json` has `"prepare": "husky"` script | ✅ Yes |
| `package.json` has `version` field (unified version source) | ✅ Yes |

## `.gitignore` Checks

| Pattern | Auto-fix |
|---------|----------|
| `.npm-access` | ✅ Yes (appends) |
| `skill-deck.lock` | ✅ Yes (appends) |
| `.private/` | ✅ Yes (appends) |
| `.husky/_` | ✅ Yes (appends) |

## Husky Checks

| Check | Auto-fix |
|-------|----------|
| `.husky/pre-commit` exists | ✅ Yes |
| `.husky/pre-commit` is executable | ✅ Yes |
| `.husky/pre-commit` calls `build --all` | ❌ No |

## Per-Package Checks

| Check | Auto-fix |
|-------|----------|
| `package.json` has `license` | ✅ Yes (sets `MIT`) |
| `package.json` has `publishConfig.access = public` | ✅ Yes |
| `package.json` has `type = module` | ❌ No |
| `package.json` version matches root version | ✅ Yes |
| `skill/SKILL.md` version matches `package.json` version | ✅ Yes |
| Binary files in `bin/` are executable | ✅ Yes |
| Built output `skills/<name>/SKILL.md` exists | ❌ No |

Run `bunx @lythos/skill-creator align --fix` to auto-apply corrections where possible.
