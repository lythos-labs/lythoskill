# ZK Re-trial — TASK-20260909155425926 (commit c8ebcc76)

Zero-context review. No prior knowledge of how the work was done. Repo: /Users/chariots/Downloads/lythoskill-main (HEAD = c8ebcc76, clean tree).

## Verdict per AC

| AC | Verdict | Evidence |
|---|---|---|
| Registry file exists, covers all 16 surveyed CLIs, each row has source URL + verification date | **MET** | `adapter-registry.ts` has exactly 16 rows (claude-code…qwen-code); `registryProblems()` self-check returns [] and is test-pinned (`adapter-registry.test.ts:21-27`); every row carries `source` (https URL) + `verifiedAt` "2026-09-09". Row-count gap is explicitly reported by `registryProblems()`, not silent. |
| Goose unlink hazard has a test (dormancy: symlinked target survives unlink) | **MET** | `safe-remove.test.ts:48-60` asserts target SKILL.md byte-identical after unlink; `:132-148` removeSkill E2E across 3 fan-out dirs; `:150-163` broken-link case; `:165-174` no stray files in cold pool. TriggerDirs pinned at `adapter-registry.test.ts:44-50`. |
| Kimi/Crush per-run paths render from deck state with a smoke test | **MET** | `per-run.test.ts:26-53` render unit tests; `:89-115` renders from deck state + zero-side-effect smoke (project dir still contains only skill-deck.toml). Claims independently verified against MoonshotAI/kimi-cli docs (`--skills-dir` repeatable ✓, `extra_skill_dirs` ✓) and charmbracelet/crush (`option skill-path` ✓). |
| link.ts behavior unchanged for docs-tier CLIs (no regression) | **MET** | `targetModeOverride` returns undefined for `.claude/skills`/`.agents/skills` (`adapter-registry.test.ts:106-111`); `adapter-smoke.test.ts:65-97` pins end-to-end: every entry absolute/acyclic symlink resolving to SKILL.md, zero adapter warnings on default + docs-tier fan-out. Verified old vs new default-pair warning set: both empty. |

Non-AC requirements from the card's Requirements section: Goose special-case ✓, Cline copy/rsync target ✓ (snapshot override, `.clinerules` triggerDirs), opencode dup-WARN + acyclic guarantee ✓ (cycle guard before clear-site at link.ts:599/671), Codex 5-issue note ✓, pinned-version smoke ✓ (`adapter-smoke.test.ts`).

## Data-loss audit (priority 1)

Every removal site inspected:

- `safe-remove.ts:21-31` (removeSymlinkOnly) — lstat-first, symlink → `rmSync(force)` **without** recursive. Unlink-only by construction. Broken symlinks handled (no existsSync).
- `safe-remove.ts:37-49` (removeEntryForRelink) — lstat branch: symlink → unlink-only; real dir → recursive (historical behavior, backup path lives upstream in reconcileTargetDir).
- `link.ts:579-592` undeclared sweep — lstat confirms symlink before `removeSymlinkOnly`. Non-symlinks skipped here, handled by the backup-guarded real-dir path (`:547-576`), where `rmSync(recursive)` is applied only to lstat-verified non-symlinks; Node rm never follows symlinks, and `calculateDirSize` uses Dirent types (no stat-follow recursion).
- `link.ts:599-606` / `:671-677` — cycle guard **before** clear-site (source inside fan-out dir refused, never removed). Verified in `adapter-smoke.test.ts:118-146` and my ADV-4.
- `remove.ts:24-39` — same lstat discipline; pre-commit code confirmed to use existsSync (broken-symlink leak claim is TRUE — verified against parent commit).
- `to-symlink-snapshot.ts:191-202` — reachable only when lstat says `symlink` (snapshot/missing return early above), so clear-site is unlink-only.
- TOCTOU: lstat→rmSync gap exists, but a swap making the path a real dir makes `rmSync` throw (EISDIR), not recurse — crash, not data loss. Nit-level for a local single-user tool.

**No data-loss path found.** The Goose #11600 invariant (cold pool survives any deck unlink) holds at every site and is dormancy-tested.

## Dormancy (priority 2)

Default deck (`.claude/skills` + `.agents/skills`):
- `collectFanOutWarnings` returns [] — unit-tested with relative + absolute paths (`adapter-policy.test.ts:15-27`), E2E through real `linkDeck` (`adapter-smoke.test.ts:88-97`), and independently re-verified by me (ADV-6, tmp fixture, warnings captured during actual linkDeck run).
- `targetModeOverride` undefined for both dirs; symlink mode preserved (smoke test asserts `isSymbolicLink` + absolute + acyclic).
- Behavioral deltas vs pre-commit on default deck: none except broken symlinks now swept instead of leaked (improvement; the commit's stated bonus fix — confirmed real by diffing parent remove.ts).

## Defects found

1. **[warning] Uncaught EEXIST crash when `.clinerules` is a file** — `link.ts:526` (`mkdirSync(targetDir, {recursive:true})`). This commit's registry advertises `.clinerules` as a cline fanOutTarget and `targetModeOverride` steers it to snapshot, but `.clinerules` as a **file** is the common Cline layout. `also_link_to = [".clinerules"]` then throws uncaught EEXIST mid-run: working set already mutated, lock/state not written. Reproduced (ADV-3: `THREW: EEXIST - mkdir '…/.clinerules'`). Pre-existing mkdir semantics, but the new code actively recommends this path. No data loss; next `deck link` recovers idempotently. Fix direction: existsSync/lstat pre-check + agent-facing message, or drop `.clinerules` from fanOutTargets (it is a rules dir, not a skills dir).
2. **[nit] cline #3092 state mismatch** — registry note (`adapter-registry.ts:220`) says "open bug #3092"; gh API shows **closed** ("Cline doesn't follow symlinks in .clinerules files"). Substance of the claim verified correct; "open" is wrong as of 2026-09-09. Also #3437 cited is closed and only tangentially related.
3. **[nit] Crush "single-path" mischaracterization** — `per-run.ts:71` note says `skill-path` is single-path; crush `options.go` shows `kind: optList` (list-append, README shows multi-arg form). Emitted lines (`option skill-path <dir>` per target) are still valid — the note text is just wrong about the mechanism.
4. **[nit] Weak sourcing on one hazard ref** — opencode `windows-non-discovery-no-dedupe` (`adapter-registry.ts:199-203`) claims "6 open symlink issues" but `ref` is the docs page, not the issues. Below the project's own no-source-no-rule bar (the claim may be true; it just isn't checkable from the ref).
5. **[nit] Dup-scan warning slightly self-contradictory for shared dirs** — with nested duplicate roots, 7 adapters sharing `.agents/skills` each emit a warning advising "Fan to one dir per CLI", which is impossible for the shared-convention dir. Behavior correct; message doesn't distinguish "you duplicated roots" from "you used the shared dir once". (ADV-7: warns once per adapter, root count accurate.)

## URL spot-check results (independent, via gh API — WebFetch blocked)

11 refs checked, **11 resolve and match claims in substance**:

| Ref | State | Claim match |
|---|---|---|
| aaif-goose/goose#11600 | open | ✓ deleting linked project skill recursively removes target (repo move to aaif-goose/goose also confirmed) |
| anomalyco/opencode#46327 | open | ✓ duplicate-name WARN, same skill two roots, no inode dedupe |
| anomalyco/opencode#45961 | open | ✓ symlink cycle → ENAMETOOLONG crash |
| cline/cline#3092 | **closed** | ✓ substance, ✗ "open" label (defect 2) |
| openai/codex#31592 | open | ✓ discovery ignores symlinked SKILL.md |
| openai/codex#34054 | open | ✓ name loss for symlink/alias paths |
| openai/codex#40070 | open | ✓ plugin-namespace inherit |
| openai/codex#43772 | open | ✓ uninstall path rejected |
| google-gemini/gemini-cli#28944 | closed | ✓ duplicate warnings on junction (fix PRs merged — consistent with note) |
| anthropics/claude-code#92129, #14836 | open | ✓ titles match notes |
| QwenLM/qwen-code skills.md | exists | ✓ docs path resolves |

Plus mechanism claims: kimi `--skills-dir` repeatable + `extra_skill_dirs` (official docs, verbatim), crush `option skill-path` (docs + source), Qwen branded dirs docs all verified.

## My own test runs

- Repo suite: `bun test packages/lythoskill-deck/` → **212 pass, 1 skip, 0 fail, 541 expect() calls, 16 files** — claim of 212 reproduced exactly, not trusted blindly.
- My adversarial suite (`/tmp/arena-p2-adapter-retrial/adversarial.test.ts`, 10 cases): 9/10 passed as written; ADV-7 "failure" was my own wrong expectation (one warning **per adapter**, not one total — actual behavior reasonable). Cases: broken declared+undeclared symlinks through real linkDeck (cold pool byte-identical), trailing-slash + home-relative also_link_to dormancy, `.clinerules` file-layout crash (defect 1), `.clinerules` dir-layout snapshot E2E (works — real dir, correct content), snapshot-mode cycle-guard bypass (no infinite recursion, source survives), symlink-chain removal, E2E default-pair zero-warning capture, 3-root dup dedup.

## Score: 8.5 / 10 — PASS

Rubric application from 10:
- All 4 ACs met, dormancy proven 3 ways (unit, E2E smoke, my independent replication), 0 data-loss defects, 11/11 URLs verified: **−0** on the big items.
- −1 (warning): defect 1 — new recommended Cline path crashes uncaught on the common file layout, leaving a mid-run inconsistent state. Real but recoverable, no data loss.
- −0.5 (nit): defect 2 — verifiable factual error ("open bug") in a sourced registry note, the exact thing the card's source discipline exists to prevent.
- −0.5 (nit, aggregate): defects 3+4+5 — wrong mechanism note, uncheckable hazard ref, misleading dup-scan advice for shared dirs.
- Data-loss cap: not triggered (no data-loss path found).

No AC miss. No test dishonesty (212 independently reproduced). PASS vs the ≥7 gate.
