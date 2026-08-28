# ADR-20260828004129233: player adapter lifecycle policy aliases renames and version support ranges

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-08-27 | Created |
| accepted | 2026-08-28 | Accepted |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

Upstream agent CLIs churn fast, and our adapters are glue over them:

- **Kimi**: Moonshot's `kimi-cli` (Python) is being wound down in favor of `kimi-code` (Node.js rewrite, first released 2026-05, designated successor; upstream README announces the wind-down and the rebrand is half-finished, leaving downstream references inconsistent). Our `kimi` player shells out to the `kimi` binary.
- **DeepSeek**: the community `deepseek-tui` moment gave way to the official DeepSeek Harness (`dsh`, plugin kernel, 2026-08) with a constellation of third-party TUIs and no single canonical terminal agent. Our `deepseek` player targets `deepseek serve --http`.
- **Precedent in-repo**: the `claude-cli` player was already deprecated once (ADR-20260518145235543) — bindings break, and today each break is handled ad-hoc.

External feedback (via user, 2026-08-28): arena feels fragile when the underlying CLI has moved on — no version expectations, no alias handling, silent drift.

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->
- Renames and ground-up rewrites are the norm for agent CLIs in 2026, not the exception.
- Silent breakage is the worst failure mode; loud, dated, actionable failure is acceptable.
- Users' decks and arena.toml files name players — renames must not invalidate existing configs without warning.
- Adapter maintenance effort is bounded; eager chasing is not sustainable.

## Options

### Option A — Chase upstream eagerly
Update adapters on every upstream rename/release.

**Pros**:
- Always current.

**Cons**:
- Maintenance treadmill; breaks users pinned to older CLIs; renames land unannounced, so we lag by definition.

### Option B — Version-range support policy + alias table
Each adapter declares its supported upstream (binary name + version range). At spawn, probe `--version` (or equivalent); unknown/out-of-range → loud HATEOAS error with fix instructions. An alias table maps renamed upstreams (e.g. `kimi` → `kimi-code`) — old names keep resolving for one minor cycle with a deprecation warning, then become loud errors. A support matrix (player × upstream × supported versions × status) lives in the adapter README as SSOT.

**Pros**:
- Fail-closed: fragility becomes visible and actionable instead of silent.
- Renames become config (alias row), not code surgery; existing decks get a migration window.
- The matrix makes "what do we support" reviewable and gives new players (deepseek-harness) a clear entry path.

**Cons**:
- Per-adapter probe + version parsing cost; version formats differ per upstream.
- Matrix doc needs upkeep (can be mechanized later via an `arena doctor`-style command).

### Option C — Freeze and document
Pin "works with upstream version X" in docs, don't touch adapters.

**Pros**:
- Zero maintenance.

**Cons**:
- Silently stale; pushes users onto dead CLIs; contradicts the project's empirical-validation ethos.

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->
**Choice**: Option B (accepted by user 2026-08-28)

**Rationale**: Adapters are the project's boundary with the fastest-moving layer of the ecosystem. The only sustainable posture is fail-closed with explicit support ranges plus aliases that absorb renames — the same deny-by-default instinct as deck governance, applied to upstream versions.

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->
- Positive: breakage is loud and dated; renames stop invalidating user configs overnight; support surface becomes explicit.
- Negative: adapters grow probe logic; one more SSOT doc to keep honest.
- Follow-up: add `kimi-code` player + alias (task on accept); evaluate a `deepseek-harness` adapter (feeds TASK-20260828004417068); publish the support matrix; consider mechanized `arena doctor`.

## Related
- Related ADR: ADR-20260828004129143 (host-agent handoff — reduces exposure to this churn), ADR-20260518145235543 (claude-cli deprecation precedent)
- Related Epic:
