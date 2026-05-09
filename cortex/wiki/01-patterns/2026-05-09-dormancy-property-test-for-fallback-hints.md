---
created: 2026-05-09
updated: 2026-05-09
category: pattern
---

# Dormancy property test for fallback hints

> Any "failure fallback hint" (mirror, proxy, retry, degraded mode) needs a paired test that asserts the hint **does NOT appear** on the healthy path. Implement via stderr keyword grep with 0 matches required.

## Context

When code emits a hint to help users recover from a failure — "try the proxy mirror", "retrying with degraded mode", "falling back to local file" — the hint is correct **only when the failure actually happened**. If the hint also fires on the success path, it becomes noise: users learn to ignore it, and the day a real failure occurs the user dismisses the hint as background chatter.

The risk is asymmetric:
- Tests typically check that the hint appears **when triggered** (positive coverage). Easy to write, easy to remember.
- Tests rarely check that the hint **stays silent when not needed** (dormancy). The absence of a string is intuitive but rarely codified.
- Without dormancy testing, hints drift toward over-eager firing (e.g., a `try/catch` swallows a benign condition and emits the failure hint anyway), and nobody notices because positive tests still pass.

This was concretized in T9 (URL-first HATEOAS regression playbook) for the arena CLI: v0.9.43 added `ghfast.top` mirror-fallback hint for users on restricted networks. v0.9.44's regression run added a dormancy check — on healthy network, `grep ghfast|mirror|proxy|fallback` against stderr from a happy-path command must return 0 matches.

## Details

### Pattern

Pair every fallback / degraded-mode / mirror / retry / proxy hint with a dormancy test:

1. **Identify the trigger keyword(s)** that uniquely appear in the hint text — typically the URL of the mirror, the word "fallback" / "retry" / "degraded", a known-distinct phrase. The keyword should NOT appear on any non-failure code path.
2. **Run the happy path** that does NOT trigger the failure condition.
3. **Capture combined stdout + stderr** (e.g., `cmd 2>&1`).
4. **Grep for the keyword(s)** with extended/alternation pattern. Assert `wc -l` == 0 or `grep -c` returns 0 (no matches).
5. **Make this an explicit scenario in the regression playbook**, not buried in implementation. The whole point is that future developers see "S6 includes a dormancy check" before they refactor the hint code.

### Concrete example (arena S6, T9 playbook)

```bash
# Run happy path: deck URL is reachable
bunx @lythos/skill-arena@0.9.44 single \
  --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml \
  --brief "hi" --timeout 60000 \
  > /tmp/single.out 2> /tmp/single.err

# Assert: end-to-end completed (positive)
grep -q "🏆 Verdict:" /tmp/single.out

# Assert: NO mirror/proxy/fallback hint fired (dormancy)
grep -c -E 'ghfast|mirror|proxy|fallback' /tmp/single.err   # must be 0
```

If the second assertion fails, the fallback hint code is over-eager — investigate before merging.

### What counts as "the hint"?

A hint is any user-visible message that:
- Suggests an alternative path (mirror URL, retry command, degraded option).
- Is conditional on a failure or unhealthy state.
- Is meant to guide recovery, not describe normal behavior.

Counter-example: the line `📥 Fetching arena deck: <url>` is a status line, not a fallback hint — it ALWAYS prints when fetching a URL. It does not need a dormancy test.

### Where to put the test

- **CLI / runtime**: in the regression playbook (e.g., T9 task card scenario S6). Subagent runs the command in a real shell, captures stderr, greps. Documented per release.
- **Unit tests**: harder, because mocking the failure path defeats the purpose. The dormancy test is intrinsically an integration / E2E concern — it tests "the failure code path stays inert when the success path is hit". This requires a real success path.
- **Avoid**: relying on "if no test triggers it, it's dormant by definition" — the failure path code may still leak the hint via shared logging, eager string interpolation, or a `try` block that runs on success.

## When to Apply / When Not to Apply

**Apply when:**
- A new fallback / mirror / proxy / retry / degraded-mode hint is added to user-facing output.
- A code path emits a "next step" message gated on a failure condition.
- A regression playbook is being written for a CLI release that introduced any of the above.

**Do not apply when:**
- The message is purely a status line that always fires (e.g., `Fetching ...`, `Compiling ...`).
- The message is a hard-required prompt (e.g., `❌ X is required`) — these belong to HATEOAS/error coverage tests, not dormancy.
- The "alternative" is the only path (no paired success path to grep against).

## Related

- `cortex/tasks/01-backlog/TASK-20260509121724330` — T9 URL-first HATEOAS regression playbook (S6 carries the canonical dormancy implementation)
- `packages/lythoskill-arena/src/cli.ts` — `ghfast.top` proxy hint emission (lines around the URL fetch failure path)
- AGENTS.md → CLI errors section — links here for any new CLI introducing fallbacks
- Memory: `feedback_dormancy_property_test_for_fallbacks.md` — agent-side reminder
