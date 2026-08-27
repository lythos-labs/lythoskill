---
created: 2026-08-28
category: agent-ux-feedback
domain: cli-design
created_by: kimi-session (site UX alignment + ADR drafting session)
sources:
  - "user 2026-08-28: 'lythoskill的第一用户是你们agent，所以用户体验也来自你们'"
status: raw-session-feedback
---

# Agent-UX Feedback from a Fresh Model Session (Kimi, 2026-08-28)

> Premise (user, 2026-08-28): lythoskill's first users are agents, so UX evidence comes from agent sessions. Cortex CLI's step-by-step guidance exists because of past agent pitfalls. This doc is one fresh model's usage record — kept raw, for dreaming to consolidate.

## What worked (keep doing)

1. **Three-step creation protocol** (`cortex task`/`adr` printing `Step 1/3 → YOUR TURN → Step 3/3`). I followed it mechanically with zero ambiguity. The explicit "YOUR TURN — edit the file" transfer-of-control line is the key: there is never a moment of "is the CLI done or am I supposed to act?"
2. **HATEOAS rejection on non-ASCII title.** `cortex task "站点 UX…"` → error naming the rule (ASCII-only slugs, cross-agent portability) + the fix. One retry, ~zero cost. The error carried the *reason*, so I could comply intelligently instead of pattern-matching.
3. **⚠️ PLACEHOLDER markers + probe enforcement.** A task card I didn't finish filling is caught by `cortex probe`, not by a human reviewer weeks later. Hollow artifacts are structurally impossible to forget.
4. **Onboarding freshness anchor.** The daily handoff's "git_commit vs HEAD" check turned "can I trust this handoff?" into a 5-second mechanical decision. It was effectively-fresh (anchor behind by two docs-only commits), which the decision table covered.
5. **probe as the single "am I consistent?" button.** End of session: one command, 495 docs, 0 issues. No checklist to improvise.

## Friction observed (candidates for improvement)

1. **Template language primes the wrong title language.** `cortex task` rejects non-ASCII titles, but the generated card's section headers are Chinese (背景与目标 / 需求详情…). A fresh agent sees Chinese scaffolding and reasonably writes a Chinese title — I did exactly this and got rejected. Either the title rule or the template language creates the trap; consider a one-line hint in the creation output ("title must be ASCII") *before* the file exists, not only as a rejection after.
2. **Handoff anchor vs content drift.** The 2026-08-27 nightly handoff's `git_commit` anchor (47b0286f) was two docs-commits behind HEAD while its body already described v0.17.11 — i.e. the anchor is written *before* the daily's own closing commits land. Harmless here, but a freshness protocol could note: "anchor behind by ≤N docs-only commits = effectively fresh" (the onboarding skill's decision table already approximates this; worth making explicit).
3. **Local `site/version.json` is stale by design** (committed 0.17.3, CI injects real values at build). Correct architecture, but a fresh agent reading the file without reading `inject-version.ts` could report it as a bug. A one-line comment inside version.json ("regenerated at build; do not trust committed values") would close that misread.

## Meta-observation

The feedback channel itself is the interesting part: agent-UX evidence is *free* — every agent session is a usability test of the CLI and the docs — but it evaporates unless the session records it. This file exists because the user asked; the durable version is a line in the scribe/daily flow: "any CLI friction this session?" — one prompt, appended when non-empty.
