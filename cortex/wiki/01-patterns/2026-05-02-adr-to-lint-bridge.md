# ADR-to-Lint Bridge: Making Architecture Decisions Enforceable

> Architecture Decision Records (ADRs) are write-only unless something stops you from violating them.

## The Problem

You write an ADR declaring "ESM-only, no require()". Three months later, a new contributor (or a rushed agent) copies a StackOverflow snippet with `const fs = require('fs')`. The PR reviewer doesn't catch it. The ADR is violated, silently.

This happens because:

1. **ADRs are reference documents** — nobody re-reads them before every commit
2. **Code review is human** — reviewers miss things, especially in large diffs
3. **Agents don't know your ADRs** — unless you tell them, they have no way to discover rules

## The Bridge Pattern

Map each lintable ADR to an automated check that runs at commit time. The check **cites the ADR** so the violation message becomes a pointer to the full decision record.

```
ADR (decision record) ──→ Check script (automation) ──→ Husky (enforcement at commit)
     ↑_______________________________________________________│
              (violation message links back to ADR)
```

### Example: ESM-only ADR

**ADR-20260423101950000** declares ESM-only. The check:

```bash
# scripts/adr-check.sh
 echo "[ADR-20260423101950000] ESM-only: no require() in packages/**/*.ts"
 VIOLATIONS=$(grep -rn "require(" packages/*/src/*.ts)
 if [ -n "$VIOLATIONS" ]; then
   echo "  ❌ Found require() in TypeScript source"
   exit 1
 fi
```

When a developer commits code with `require()`, they see:

```
[ADR-20260423101950000] ESM-only: no require() in packages/**/*.ts
  ❌ Found require() in TypeScript source:
     packages/foo/src/bar.ts:5:  const fs = require('node:fs')
```

The error message **contains the ADR number**. The developer can read `cortex/adr/02-accepted/ADR-20260423101950000-esm-import-fix.md` to understand *why* this rule exists and what the alternative is.

## Why Cite the Source

Without ADR attribution, lint rules become cargo-culted constraints:

| Without citation | With citation |
|---|---|
| "No require() allowed" | "ADR-20260423101950000: ESM-only — use `import ... with { type: 'json' }` instead" |
| Developer guesses or ignores | Developer reads the ADR, understands the trade-off |
| Agent hallucinates workarounds | Agent reads the ADR, learns the correct pattern |

> **The check is not the rule. The ADR is the rule. The check is just the bridge.**

## What Makes a Good ADR Check

### 1. Fast

Checks must complete in under 1 second. If slow, developers bypass with `--no-verify`.

```bash
# Good: grep (milliseconds)
grep -rn "require(" packages/*/src/*.ts

# Bad: TypeScript compiler (seconds)
npx tsc --noEmit
```

### 2. Fail-fast in pre-commit

Run checks **before** expensive operations like skill rebuilds:

```bash
#!/bin/sh
# .husky/pre-commit

# 1. ADR checks (fast, exit on failure)
bash scripts/adr-check.sh || exit 1

# 2. Expensive operations (only if checks pass)
bun packages/lythoskill-creator/src/cli.ts build --all
```

### 3. Distinguish errors from warnings

- **Errors** = violations of accepted ADRs → block commit
- **Warnings** = best practices without ADR backing → inform but don't block

```bash
# Error: ESM violation (ADR accepted, must block)
error "Found require() in TypeScript source"

# Warning: missing type frontmatter (defaults to standard, non-blocking)
warn "SKILL.md missing type frontmatter (defaults to standard)"
```

### 4. One script, many checks

Use a single `scripts/adr-check.sh` instead of many small hooks. Easier to maintain, easier to discover:

```bash
scripts/
  adr-check.sh      # All ADR checks in one place
  publish.sh        # npm publish orchestration
```

### 5. Check what can't be caught by generic linters

Don't duplicate ESLint/Prettier. Check ADR-specific rules that generic tools don't know about:

| Generic linter | ADR check |
|---|---|
| ESLint: `no-var` | ADR: `node:` prefix for built-in modules |
| Prettier: formatting | ADR: template variables resolved in build output |
| TypeScript: type errors | ADR: package names must use `@lythos/` scope |

## Real-World Checks in lythoskill

```bash
# Run all checks manually
bash scripts/adr-check.sh

# Checks enforced:
# - ESM-only (no require())          → ADR-20260423101950000
# - node: prefix for built-ins       → ADR-20260423101950000
# - Template vars resolved           → ADR-20260423182606313
# - packages/<name>/skill/ ↔ skills/<name>/ sync  → ADR-20260423124812645
# - Package naming (@lythos/*)       → ADR-20260423191001406
# - No stale HANDOFF.md              → ADR-20260424125637347
```

## The Incubation Lifecycle: From Crisis to Self-Governance

An ADR does not start as self-governance. It evolves through stages:

```
Crisis
  │  Something breaks (e.g., require() throws in production)
  ▼
Decision
  │  Team writes ADR: "ESM-only, no require()"
  ▼
Manual Enforcement
  │  Code reviewers catch violations in PRs
  │  → Fragile: reviewers miss things, context is lost
  ▼
Automated Enforcement
  │  scripts/adr-check.sh blocks commits with require()
  │  → Reliable: every commit is checked, no exceptions
  ▼
Self-Governance
  │  New contributor writes require(), sees error, fixes it
  │  → They never read the ADR. They don't need to.
  │  → The rule has become "how things work," not "a document."
```

### Stage 1: Crisis

A real failure motivates the ADR. Without a crisis, the ADR is premature abstraction:

- `require()` causes `ReferenceError` in production → ADR: ESM-only
- `skills/` build output lags source by 3 commits → ADR: commit build output + auto-sync
- Package names conflict with internal tools → ADR: `@lythos/` scope

### Stage 2: Decision

The ADR captures the trade-off. It answers: "Why this rule and not the alternative?"

```markdown
## Decision
Adopt Option C (ESM-only).

Rationale: Bun runtime is ESM-native; require() fails at runtime.
Alternative (createRequire) adds indirection without benefit.
```

### Stage 3: Manual Enforcement

Between "ADR written" and "check implemented," the rule is enforced by humans:

- PR reviewers scan for violations
- Onboarding docs mention the rule
- Senior developers correct juniors

**This stage is leaky.** Humans forget, agents hallucinate, reviewers miss things.

### Stage 4: Automated Enforcement

The bridge: `scripts/adr-check.sh`. Now the rule is enforced by machine:

- Zero false negatives (every commit checked)
- Consistent (no reviewer mood swings)
- Fast feedback (seconds, not days until PR review)

### Stage 5: Self-Governance

The final stage is invisible. Contributors don't think "I must avoid require() because of ADR-2026..." They think:

> "Oh, require() doesn't work here. I should use import."

The ADR has become **infrastructure** — like syntax highlighting or type checking. It's just how the system works.

**This is self-governance**: the rules are so reliably enforced that they fade into the background. The project governs itself without anyone actively governing it.

### The Reverse Is Also True

If you remove the check, self-governance decays:

```
Remove check
  │  → Violations creep in
  ▼
"It's just one require()"
  │  → More violations accumulate
  ▼
"This codebase is inconsistent"
  │  → New contributors ignore the ADR entirely
  ▼
Governance rot
```

> **An accepted ADR without an automated check is a suggestion, not a rule.**

## When NOT to Add a Check

- **The ADR is not yet accepted** — only enforce `accepted` ADRs
- **The rule is too expensive to check** — e.g. "no N+1 queries" needs runtime profiling
- **The rule is subjective** — e.g. "good variable names" needs human judgment
- **A generic linter already handles it** — don't duplicate ESLint/Prettier/TSLint

## Extending the Bridge

To add a check for a new ADR:

1. Write the ADR and get it accepted
2. Add a check to `scripts/adr-check.sh` citing the ADR number
3. Test the check: `bash scripts/adr-check.sh`
4. Commit — the husky hook will enforce it for all future commits

## Related

- [thin-skill-pattern](./thin-skill-pattern.md) — Thin-skill pattern (ADR-20260423101938000)
- [self-contained-task-writing](./self-contained-task-writing.md) — Task format for agent delegation
- `cortex/adr/02-accepted/` — All accepted ADRs
