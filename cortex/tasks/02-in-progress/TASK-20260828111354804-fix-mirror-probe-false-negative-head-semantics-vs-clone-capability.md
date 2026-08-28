# TASK-20260828111354804: fix mirror probe false negative HEAD semantics vs clone capability

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-28 | Created |
| in-progress | 2026-08-28 | Started |

## Background & Goals
<!-- ⚠️ REQUIRED: Why is this task needed? What problem does it solve? Empty = shell, blocked by probe. -->

Source: external Kimi K3 agent bug report (2026-08-27, via user), from a network-restricted sandbox where GitHub direct is blocked but the `ghfast.top` mirror works. Severity: **functional blocker** — `skill-deck add` exits(1) at probe stage although the mirror clones fine.

**Verified against code and reproduced live (2026-08-28, this repo + live network):**

| Request to `https://ghfast.top/https://github.com/mattpocock/skills.git` | Result |
|---|---|
| `HEAD` bare URL (what probeConnectivity sends) | **403** |
| `HEAD …/info/refs?service=git-upload-pack` | **405** |
| `GET …/info/refs?service=git-upload-pack` | **200** |
| `git ls-remote` | **works** |

Root causes (all confirmed in source):
1. **Probe predicate too narrow** — `packages/lythoskill-cold-pool/src/mirror.ts:118-127`: Bun `fetch` with `method: 'HEAD'`, success = `res.ok || status === 404`. git smart-HTTP endpoints (nginx reverse proxies like ghfast.top) only allow the real git paths; HEAD is neither allowed nor something git clients send. And treating 404 as reachable but 403/405 as unreachable is semantically inverted — any 4xx proves the host is reachable.
2. **Probe and execution use different network stacks** — probe = Bun fetch (ignores `http.proxy`, `url.insteadOf`, `http.sslVerify`, and `LYTHOS_SOCKS_PROXY` only works on the direct path via curl — `mirror.ts:94-116`); execution = `execFileSync('git', …)` (inherits all git config). Probe has no predictive power but has veto power.
3. **False negative is a hard gate** — `packages/lythoskill-deck/src/add.ts:283-291`: probe failure → `process.exit(1)`, clone never attempted. Same pattern in `refresh.ts:132` (check whether it hard-fails too).

Goal: probe matches what clone actually does (or defers to clone's own verdict); mirrors that serve git smart-HTTP stop being rejected.

## Requirements
<!-- ⚠️ REQUIRED: List specific requirements. Keeping placeholders = shell. -->
- [x] Tier 1: probe via `git ls-remote --heads <url>` (same network stack as clone — inherits proxy/insteadOf/credentials; git is already a hard dependency of clone)
- [x] Tier 2 (fallback when git exec fails to spawn, e.g. missing binary): HTTP probe against `GET <url>/info/refs?service=git-upload-pack`; any HTTP response = host reachable; 401/403 classified as auth-required, not "blocked" (`authRequired` flag)
- [x] `add.ts` (and `refresh.ts` if it hard-gates): probe becomes advisory — add warns and clones anyway, printing probe `failures` detail if clone then fails; refresh already continued (now also surfaces authRequired)
- [x] Keep the injected `ProbeDeps` test pattern (fetch + execFileSync injectable)
- [x] `LYTHOS_SOCKS_PROXY` behaves consistently on direct and mirror paths (or documented why not) → tier 1 passes `socksProxyArgs()` to git (inherits insteadOf/credentials too); tier 2 routes fetch via curl when SOCKS is set

## Technical Approach
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe. -->

- The external report is preserved verbatim at `playground/2026-08-28-external-k3-mirror-probe-report.md` — it contains a full proposed implementation (tiered probe + ProbeResult.confidence + authRequired + advisory caller). Use it as the design starting point; it matches this repo's Intent/Plan/Execute + IO-injection conventions.
- Keep the direct/mirror race structure; extend ProbeResult with `confidence: 'git-verified' | 'http-signal'` and `authRequired?: boolean`.
- Minimal-alternative documented in the report (broaden predicate + `LYTHOS_PROBE=off` escape hatch) — rejected as treating the symptom; the two-stack split remains.
- Update mirror.test.ts: fake execFileSync succeeding/failing per URL; fake fetch covering 403-on-HEAD vs 200-on-GET-info/refs; negative test proving a HEAD-blocking mirror is no longer rejected.

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [x] Unit tests: HEAD-blocked-but-cloneable mirror yields a successful probe (git-verified) → `bun --filter='./packages/lythoskill-cold-pool' run test` green (canonical gate EXIT=0, 2026-08-28)
- [x] Negative test: probe failure no longer hard-exits before clone attempt when git ls-remote succeeds → add.ts probe is advisory now (warn + clone anyway); mirror.test.ts covers HEAD-403/GET-200 mirror via injected deps
- [x] Live check: `git ls-remote --heads https://ghfast.top/https://github.com/mattpocock/skills.git` → EXIT=0, refs returned (2026-08-28, maintainer network) — tier-1 premise confirmed live; full `deck add` not run to avoid mutating the real cold pool/skill-deck.toml
- [x] `bun --filter='*' run test` green overall → EXIT=0 (2026-08-28)

## Progress Log
<!-- Update during execution, with timestamps -->

- 2026-08-28: Registered from external K3 agent report. Code claims verified (mirror.ts:118-127, add.ts:283-291, SOCKS direct-only path). Four-way probe table reproduced live from maintainer network — report is accurate in every checkable detail. Epic: EPIC-20260828111425886 (theme B).
- 2026-08-28: Implemented per the report's tiered design. mirror.ts: tier 1 `git ls-remote --heads` (with `socksProxyArgs()` so the probe rides git's own proxy config) → `confidence: 'git-verified'`; tier 2 HTTP `GET info/refs?service=git-upload-pack` fallback → `'http-signal'`, 401/403 → `authRequired`. add.ts: probe advisory (warn + clone anyway; on clone failure prints probe `failures` detail). refresh.ts: same advisory posture + authRequired surfaced. `ProbeDeps` injection kept; mirror.test.ts rewritten around fake exec/fetch incl. HEAD-403-but-cloneable negative test. SKILL.md (deck) documents probe-is-advisory. Live: `git ls-remote` via ghfast.top EXIT=0. Canonical gate EXIT=0.

## Related Files
- Modified: packages/lythoskill-cold-pool/src/mirror.ts, packages/lythoskill-cold-pool/src/mirror.test.ts, packages/lythoskill-cold-pool/src/git-io.ts (export socksProxyArgs), packages/lythoskill-deck/src/add.ts, packages/lythoskill-deck/src/refresh.ts, packages/lythoskill-deck/skill/SKILL.md, skills/lythoskill-deck/SKILL.md (built)
- Added: (none)

## Git Commit Message
```
fix(deck,cold-pool): advisory tiered probe — git ls-remote ground truth, clone self-proves (TASK-20260828111354804)

- mirror.ts: tier 1 `git ls-remote --heads` (git-verified) → tier 2 HTTP GET info/refs (http-signal, 401/403 → authRequired)
- add.ts/refresh.ts: probe failure no longer hard-exits; clone's own error is authoritative, probe failures printed as detail
- SOCKS proxy now consistent: tier 1 rides git config via socksProxyArgs, tier 2 via curl
- Fixes false negative on git smart-HTTP mirrors (ghfast.top rejects HEAD, serves clones fine)
```

## Notes
