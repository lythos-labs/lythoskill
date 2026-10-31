# 2026-10-31 — A bump without its tag is a broken promise: skills advertise a version npm does not have

## Context

On 2026-10-23 a lockstep bump to 0.21.0 (`afa7efdf chore(release): v0.21.0`)
was pushed to `main` **without** creating the tag. The releasing session's
daily recorded this as a deliberate choice: "不打 tag——bump 不等于 release".
Eight days later the owner discovered it from the outside: skills/ built
output already told every consumer to run
`bunx @lythos/skill-deck@0.21.0`, and npm had no 0.21.0 — every external
sync broke on a version that did not exist.

The owner's challenge, which this lesson preserves: "这个项目bump流程哪次
允许不publish npm了?" — checked against history, the answer is *never*.
Under the legacy flow (publish, then tag) and the current tag-triggered
flow alike, every one of the last 8+ releases created its annotated tag on
the bump commit the same day. "bump ≠ release" was not a sanctioned
two-step pattern that this instance executed early — it was a pure
deviation that happened to write its own justification into the daily.

## Details

Why the state is dangerous rather than merely incomplete:

- **The failure is silent everywhere it matters.** No tag → `release.yml`
  never fires → no error on push, CI on `main` stays green, npm keeps
  serving the old version. The only alarm is a consumer failing to resolve
  the version — discovered by the owner, 8 days later, from outside.
- **The built skills/ are the trigger.** The bump substitutes the new
  version into every `skills/*/SKILL.md` (`bunx @lythos/...@0.21.0`) at
  build time. From the moment the bump commit lands on `main`, the
  committed output advertises the new version — so a bump commit on
  `main` *without* a published release is not a neutral intermediate
  state, it is a broken contract with every external consumer.
- **"Deliberate" is not a license.** A session may *record* a decision to
  defer, but recording it in a daily does not make it a flow the project
  ever had. Checking precedent (git tag history vs. chore(release)
  commits, 5 seconds via `git log`) would have shown there is no such
  precedent.

Recovery on 2026-10-31: `git tag -a v0.21.0 afa7efdf` + `git push
--follow-tags` → release.yml ran → all 14 `@lythos/*` packages published
at 0.21.0, GitHub Release created, Pages deployed. The fix was two
commands; the detection lag was the real cost.

## Takeaway

**Bump and tag are one atomic operation. A bump commit may not be pushed
to `main` without its annotated tag in the same session.** If a release
must genuinely be held, the correct move is to not bump yet — the bump is
what flips the advertised version, so a pushed bump with no tag is
already a broken promise, not a half-finished one. Enforcement lives in
AGENTS.md §9 trap 2 (hardened 2026-10-31); there is deliberately no
mechanical gate, because "did you mean to release" is semantic — the
check is the agent's, and the question to ask is: *what does the version
string on `main` promise a stranger right now?*
