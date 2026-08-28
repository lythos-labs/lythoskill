# ADR-20260828004129143: host-agent handoff as default execution mode when arena runs inside an agent

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-08-27 | Created |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

Today `arena single` hard-defaults to `player = 'kimi'` (packages/lythoskill-arena/src/cli.ts:276) and `vs` requires an explicit player per side in arena.toml. Meanwhile the documented reality is that ~95% of arena runs are **agent-orchestrated**: the hosting agent spawns subagents via its native Agent tool with different decks, and the CLI runner is only needed for cross-player comparison (architecture.md: "Agent-orchestrated by default").

User framing (2026-08-28): for a user with a primary agent, the natural comparison is **"my agent, my model — which deck performs better?"** The player is fixed (the host agent the user is already talking to); the deck is the variable. Spawning a *different* external CLI player is the special case, not the default.

Churn pressure compounds this: the kimi default binds arena's out-of-box UX to one vendor binary that is itself mid-migration (kimi-cli → kimi-code, see ADR-20260828004129233).

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->
- UX naturalness: the host agent is already authenticated, has quota, and is sitting in the project. Requiring a second CLI install+auth to test decks is friction with no payoff in the 95% case.
- Deck-comparison-on-fixed-player is the common case; cross-player comparison is the specialist case.
- Upstream CLI churn makes any hardcoded default player a fragility (precedent: claude-cli deprecated, ADR-20260518145235543).
- Host detection is heuristic (env markers: `CLAUDECODE`, kimi session vars, etc.) — conventions, not contracts.

## Options

### Option A — Status quo: CLI defaults to spawning kimi
**Pros**:
- Deterministic; one code path; no detection magic.

**Cons**:
- Forces install+auth of a specific external CLI even when the user is inside a capable agent already.
- Breaks as kimi-cli winds down; default UX hostage to one vendor's release cycle.
- Mismatches the natural mental model (compare decks on MY agent).

### Option B — Host-aware default: hand off to the host agent
When the arena CLI detects it is running inside an agent session, default to **host-handoff mode**: emit HATEOAS-style guidance for the host agent to orchestrate the run itself (spawn subagents with each deck, judge outputs — the reproduce.sh / IoC pattern that already dominates real usage). Explicit `--player` still forces an external spawn; with no host detected and no `--player`, fail loudly with the player setup instructions.

**Pros**:
- Matches the natural UX: my agent × N decks, nothing new to install or authenticate.
- Immune to any single vendor's CLI churn — the host agent IS the player.
- Formalizes the already-dominant usage pattern instead of fighting it.

**Cons**:
- Detection can misfire; behavior differs by environment, so docs and error messages must be explicit about which mode is active.
- Cross-player fairness claims still need the CLI runner path — it must be preserved, not deleted.

### Option C — No default player: always require `--player`
**Pros**:
- Explicit; no magic.

**Cons**:
- Hostile UX for the common case; still pushes users to install a second agent CLI; does nothing for churn.

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->
**Choice**: Option B (accepted by user 2026-08-28)

**Rationale**: The CLI's default role changes from "executor" to "cross-player specialist". Inside an agent host, the host is the natural player — fixed player, variable deck is the comparison users actually want. The CLI runner remains for the cross-player case where a neutral harness matters.

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->
- Positive: zero-install default path inside any supported host; docs get simpler ("run arena from inside your agent"); default UX decoupled from vendor churn.
- Negative: two execution modes to document and test; host-detection edge cases need fixtures.
- Follow-up: implement host detection + handoff guidance in arena CLI (task on accept); audit skills/docs for `arena single` examples that assume external kimi; update player-abstraction wiki.

## Related
- Related ADR: ADR-20260828004129233 (adapter lifecycle policy — the churn side), ADR-20260518145235543 (claude-cli deprecation — prior binding break)
- Related Epic:
