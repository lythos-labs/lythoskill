---
status: accepted
deciders: agent-session-2026-05-28
date: 2026-05-29
---

# CLI Entry Point IO Injection Exemption

## Context

The project's core architecture follows the Intent/Plan/Execute fractal pattern (ADR-20260504113917838). At the Plan and Execute layers, IO injection is mandatory — `executeRefreshPlan` accepts a `RefreshIO` interface, and tests inject mocks through this interface.

However, CLI entry points (`runAdd`, `runFind`, `runCurator`, etc.) in `packages/lythoskill-curator/src/cli.ts` do not follow this pattern. They directly call `console.error`, `console.log`, and `process.exit`. Their tests use `spyOn(console, ...)` to capture output.

An external evaluator (2026-05-28) flagged this as "mock abuse." The project's first reflex was to defend the code — "our `spyOn` is compliant L1 testing" — without recognizing that the CLI layer genuinely lacks IO injection interfaces. This triggered a deeper analysis.

## Decision

**CLI entry points are exempt from IO injection when all three conditions hold:**

1. **Thin glue only**: The function does nothing but parse argv → call Plan/Execute → print results. No business logic.
2. **No branching worth testing**: Error paths are trivial ("missing required arg", "not found"). `spyOn(console)` coverage is sufficient.
3. **Adding IO injection would increase complexity without proportional benefit**: The function would need `io: { log, error, exit }`, every call site would pass it, and the only test benefit is cosmetic (`spyOn(console)` → `io.log`).

## Consequences

### Positive

- **Honest documentation**: The exemption is explicit. Future agents reading conventions.md §5 know that `runAdd`'s `spyOn(console)` is legitimate, not a violation.
- **Prevents false defenses**: Agents no longer need to retroactively justify existing code as "compliant." The code is compliant because the exemption says so.
- **Preserves simplicity**: CLI glue stays thin. No boilerplate `io` parameter on every `runX` function.

### Negative

- **Known debt**: If `runAdd` grows complex branching (interactive prompts, conditional output), the exemption is revoked and IO injection becomes required.
- **Audit burden**: Every `spyOn(console)` must be verified against the three conditions. Agents must check the function before assuming the exemption applies.

## When Exemption Is Revoked

The exemption is **automatically revoked** if any of these occur:

- The function acquires business logic beyond argv parsing and dispatch
- The function needs testing of internal state that `spyOn(console)` cannot capture
- The function is refactored to support programmatic use (called from other code, not just CLI)

## Examples

| Function | Exemption? | Why |
|----------|-----------|-----|
| `runAdd` (curator) | ✅ Yes | Thin glue: parse argv → `buildAddPlan` → `git clone` → print status. No internal state worth injecting. |
| `runFind` (curator) | ✅ Yes | Thin glue: parse `--db` → query catalog → print formatted output. |
| `executeRefreshPlan` (deck) | ❌ No | Business logic: git pull orchestration, status aggregation, linkDeck trigger. Must accept `RefreshIO`. |
| `buildRefreshPlan` (deck) | N/A | Pure function, no IO. If it ever did IO, injection would be required. |

## Related

- Intent/Plan/Execute fractal architecture: `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`
- Testing Layers: `cortex/wiki/04-ssot/conventions.md` §5
- Pitfall #10 (evaluator surface-scan): `cortex/wiki/04-ssot/pitfalls.md` §10
- Pitfall #10b (respect current code bias): `cortex/wiki/04-ssot/pitfalls.md` §10 "Also Critical"
