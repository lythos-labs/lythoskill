# ZK Review — Round 1

**Reviewer stance**: zero prior knowledge of this repo. I did not write the plan. I read the card, then the ADR, then the code, then I attacked the ADR's spec table with fixtures. Nothing in the repo was modified; everything below was run from `/tmp/zk-904/`.

## 1. Object + environment

| | |
|---|---|
| Task card | `cortex/tasks/01-backlog/TASK-20260910152029904-deck-add-and-remove-destroy-every-comment-in-skill-deck-toml-via-an-iarna-toml-parse-stringify-round-trip.md` |
| Decision (accepted) | `cortex/adr/02-accepted/ADR-20260910152957509-deck-declaration-writes-must-touch-only-the-bytes-they-are-about-locate-with-an-ast-splice-back-by-range-never-reserialise-the-document.md` (accept commit `6ac2324d`) |
| Repo HEAD | `6ac2324d` (clean tree at review time) |
| Runtime | `bun 1.3.11`, `uname -s -r` → `Darwin 24.6.0` |
| Test baseline (independently re-run) | `253 pass / 1 skip / 0 fail / 661 expect` across 16 files, `bun test packages/lythoskill-deck/`, 1.71s |
| Target artifact size | `skill-deck.toml` = 3439 bytes = **3416 JS code units**, 9 comment lines, LF only, trailing newline present |

The bug is real and I reproduced it end to end: on the repo's own deck, `deck remove lythoskill-coach` takes comments **9 → 0** and shrinks the file 3439 → 2799 bytes. The card's diff sketch (`also_link_to = [ ".agents/skills" ]`) reproduces on the untouched-key formatting too.

**Core mechanism independently verified** (this is the good news): `toml-eslint-parser@1.0.3` — 86490 B unpacked + 1 dep (`eslint-visitor-keys`), matching the ADR's `86 KB + 1 依赖` — parses the real deck and gives per-table ranges. Applying the ADR's delete rule verbatim (`[node.range[0], node.range[1])` + swallow up to 2 `\n`) to `tool.skills.diagnose`: comments **9 → 9**, seam restored to exactly one blank line, reparse OK, prefix/suffix byte-identical. The ADR's measured table replicates.

## 2. Comprehension check (from the card alone)

**WHAT** — `deck add` and `deck remove` rewrite `skill-deck.toml` through `parseToml(raw)` → mutate object → `stringify` → `writeFileSync`. Comments are not in the object, so every run destroys every comment in the file (and lets the serialiser choose array spacing). The fix is to change the write path so a write touches only the bytes the operation is about.

**WHY** — `skill-deck.toml` is the project's git-tracked declarative source of truth and is reviewed via diffs; its comments are its human documentation. The reformat turns every `deck remove` into an unrelated whole-file diff, and noise is where real changes hide. It is also an ownership violation against `ADR-20260910112404500` (deck may only delete what deck created; comments are user-authored).

**HOW** — implement the ADR's spec table: locate the target by AST key text, splice out exactly that byte range (plus at most 2 following newlines), insert new entries after the last same-prefix table, never delete comments, never write when nothing changed, fail loudly rather than falling back to full re-serialisation. Apply at `remove.ts` (write at `:152`) and `add.ts` (`:445`, `:468`), pin it with tests that compare bytes, and rule on `migrate-schema`.

**Things I only understood by luck / not from the card:**
1. **How to get ranges at all.** The card never names a parser or mechanism. `@iarna/toml` — the dependency currently imported at both write sites — exposes no node ranges. I only knew to reach for `toml-eslint-parser` because it appears in the ADR's *Options* table, not in the Decision's spec table or the card.
2. **That `(tool.skills.<alias>)` is an example, not the grammar.** The locate rule is written with a `tool`-only example, but the code being changed also handles `innate` and legacy arrays.
3. **Which deck the tests must use.** AC1/AC2/AC3 never name a fixture.
4. **That the same write path also serves a brand-new file** (`add.ts:468`, the `else` branch) and the schema migration (`migrate-schema.ts`), the latter only as an open question.

## 3. Spec-hole probe results

Method: fixture decks in `/tmp/zk-904/`, run against the **real CLI** (`bun packages/lythoskill-deck/src/cli.ts remove … --deck … --workdir …`, isolated cold pool under `/tmp`), then re-simulated against the ADR's rule with a real AST. "Spec decides it" = the ADR's spec table or the existing code determines the answer.

| Case | Does the spec decide it? | What the executor must invent |
|---|---|---|
| Alias present in **two sections** (`[innate.skills.dup]` + `[tool.skills.dup]`) | **Partly.** Rule text says "match top-level table node (`tool.skills.<alias>`)". Live code decides the *section*: `remove.ts:119` uses `match.type` from `parseDeck` order → removes the `innate` copy, leaves the `tool` copy, exit 0 (verified). | Nothing blocking: mirror existing behaviour. But the spec's example reads as tool-only, so an executor could "fix" the wrong copy. LOW. |
| **Inline table** (`[tool.skills]` with `foo = { path = "…" }`) | **No — open.** Currently works: `deck remove foo` on that shape succeeds today (verified). AST has only one node, `tool.skills`, and **no** `tool.skills.foo` node → per "定位不到目标 → 报错退出" the tool would start hard-failing an input it accepts today. | Whether to (a) fail loudly, (b) extend the locate rule to inline entries, or (c) treat `[tool.skills]` as the target. **No AC covers it and no test covers it** — a regression here is silent. |
| **Legacy string-array** (`[tool] skills = ["…"]`) | **No — open.** `remove.ts:130-138` handles it; `add.ts:408-419` auto-migrates it; and a **green** test pins the behaviour: `remove.test.ts` C11.b asserts `not.toContain('skills = [')` after removing the last array entry (verified). AST: node `tool` with a `TOMLKeyValue skills → TOMLArray`; there is no per-skill node. | A splice rule for array *elements*, and a rule for "array became empty" (the only way to satisfy C11.b is to delete/mutate the parent, i.e. an ownership-shaped decision the ADR's table does not make). Getting this wrong collides with AC4 (`0 fail`) or with "绝不退回整份重写". |
| **Multi-line string containing a table header** (`prompt = """…[tool.skills.real]…"""`) | **Yes.** AST gives `tool.skills.real` range `[103,174]`, disjoint from `combo.x` `[223,317]` (verified). A real parser is not fooled; the ADR forbids line/regex location, so this is decided. | Nothing. (The card's `add.ts:468` header-comment path is ASCII-only and also unaffected.) |
| **CRLF deck** | **No — open.** Parses fine, but the swallow loop stops at `\r`, so the rule as literally written ("最多吞 2 个 `\n`") leaves the separator behind → one extra blank line; and insert injects a bare `\n\n`, producing mixed endings, contradicting the spec's own "行尾不动". Today's behaviour (all `\r` stripped, verified on `D-crlf.toml`) is arguably worse. | Whether the unit of "newline" is a character or a sequence, and whether inserts must adopt the file's ending. No CRLF deck exists in the repo → cosmetic only. |
| **No trailing newline** | **Mostly.** Verified: prefix `src.slice(0, range[0])` + `src.slice(range[1])` reparses and leaves a clean tail (`…# last table comment\n`). | Nothing beyond the newline-unit question above. |
| **Last table in file** | **Partly.** With a trailing newline, "swallow ≤ 2" leaves the file ending `…# last comment\n` — clean (verified). Where the deleted node is last *and* only 1 newline follows, "at most 2" is what makes it clean; where 0 follow, the rule is undefined but harmless. | Only the general "at most 2" boundary. LOW. |
| **`remove` of an alias not present** | **Yes.** `remove.ts:108-115` errors (`Skill not found in deck`) and **does not write** — I confirmed the file is byte-identical afterwards (`cmp` clean). | Nothing. |
| **`add` of an alias already present** | **Yes.** `add.ts:402-405` errors and exits before any write. | Nothing. |
| **Insert point / seam for `add`** | **Partly.** "After the last same-prefix table" resolves to `tool.skills.lythoskill-dreaming` `[2123,2226]` on the real deck. But whether the inserted block ends with `\n` is unspecified, and it is observable: `\n\n`+block → one blank line (correct); `\n\n`+block+`\n` → **`\n\n\n`**, i.e. two blank lines (verified). | The block's trailing newline — the exact class of diff noise the ADR exists to remove. |
| **Nothing changed ⇒ do not write (mtime)** | **No reachable trigger.** For both commands every path either mutates the file or exits before writing (verified for the error paths). The ADR's idempotence row ("第二次是 no-op") is also inaccurate as stated: the second `remove` exits **1**, not 0. | An operation whose "unchanged" outcome can be observed/tested — otherwise the mandated test can only be vacuous. |
| **Parse failure** | **Yes.** `toml-eslint-parser` throws on malformed TOML (verified), so "报错退出,绝不退回整份重写" is implementable — and the card should note it changes the accepted grammar (`parseDeck` today soft-fails with `errors[]`; nothing is written either way). | Nothing. |

## 4. Gaps

### HIGH

**H1 — The locate rule has no case for the `[tool.skills]` + inline-entry shape, which works today.**
Verified live: `deck remove foo` succeeds on a deck written as `[tool.skills]` with `foo = { path = "…" }`. The AST for that file contains exactly one table node (`tool.skills`) — there is no `tool.skills.foo` node — so the spec's rule + "定位不到目标 → 报错退出" converts a working input into a hard error. No AC covers it and no test in `packages/lythoskill-deck/src/` exercises that shape (`grep "= { path" *.test.ts` → nothing). Executor's only choice is to invent.
*Action*: add a spec row — either "inline entries are unsupported: detect and emit a specific error naming the shape" (then it is a *decided* narrowing and needs a test) or "locate the key-value inside `[tool.skills]` and splice it". Say which; add an AC.

**H2 — The legacy string-array shape sits on the same write path, has a green test pinning the old behaviour, and the spec gives no array rule.**
`remove.ts:130-138` (array branch) and `add.ts:408-419` (auto-migrate) exist today, and `remove.test.ts` C11.b asserts that after removing the last array entry the file no longer contains `skills = [`. A literal implementation of the spec (locate a *table node*; fail loudly if absent) turns that test red while AC4 demands `0 fail`. The two documents never acknowledge the collision: the ADR says "实现即照此" and forbids the obvious fallback.
*Action*: add a spec row for the array shape — minimum: splice the element + its comma out of the array literal; if the array becomes empty, what happens to the parent table/header; and state explicitly that "never re-serialise" still holds on this path. Alternatively declare the legacy shape out of scope and *say* what happens to the C11.b test.

**H3 — The spec says "字节区间/逐字节" but the parser returns UTF-16 code-unit offsets.**
Measured: `toml-eslint-parser` reports `[tool.skills.lythoskill-red-green-release]` at offset **1674**, whose byte offset is **1686** — drift 12, on the repo's own deck, caused by the `→` characters in the `role =` lines above it. The ADR's own headline number corroborates the confusion: it measures the deck as **"3416 字节"**, and 3416 is exactly the file's **code-unit** count (3439 bytes). An implementation that reads a `Buffer` (which the spec's wording invites) and slices with AST offsets will corrupt any non-ASCII deck — and a synthetic ASCII-only test fixture will pass. The deck in this repo is non-ASCII, so the hazard is live, not theoretical.
*Action*: one sentence in the spec — "offsets are JS string indices over the file read as UTF-8 text; read and splice as a string, never as a Buffer" — and one AC/test that round-trips a fixture containing a multi-byte character, asserting the untouched prefix/suffix are byte-identical.
*Note in fairness*: the natural implementation (`readFileSync(p,'utf-8')` + `String.prototype.slice`, as the existing code already reads the deck) is correct by construction, so this is a wording-vs-reality trap rather than a guaranteed failure. If you judge the trap unlikely, this is the one HIGH you could demote — but the wording should still be fixed, because the number in the ADR is wrong.

### LOW

**L1 — Insert-block trailing newline unspecified.** Verified observable difference: `\n\n` + block → clean single blank line; `\n\n` + block + `\n` → `\n\n\n`. *Action*: state that the inserted block carries no trailing newline (the document's own separator supplies it).

**L2 — CRLF is undecided and self-contradictory.** The swallow loop stops at `\r` (extra blank line, verified), and inserts inject bare `\n` into a CRLF file while the spec promises "行尾不动". *Action*: define newline as a sequence, or state that CRLF decks are not supported and that the file's endings are preserved for untouched bytes only. (No CRLF deck exists in the repo.)

**L3 — "无变化则不写文件 (mtime 不变)" has no reachable trigger, and the ADR demands a test for it.** Both commands either mutate or exit before writing; the only observable form ("failed lookup does not write") already holds today (verified byte-identical). The ADR's idempotence row is also wrong about the observable: a repeated `remove` exits 1, not 0. *Action*: either drop the row, or say what it is a guard for (e.g. `migrate-schema --dry-run` / future callers) and drop the mandated test.

**L4 — The new runtime dependency is missing from the card.** The card's Requirements and "Related Files → Added" never mention a parser, yet `@iarna/toml` (the dep currently imported at both write sites) exposes no ranges, so `packages/lythoskill-deck/package.json` must change. The ADR names `toml-eslint-parser` only inside the *Options* table. *Action*: name the parser in the card and list `package.json` under Modified. (I verified the ADR's numbers: 1.0.3, 86490 B unpacked, 1 dep, registry reachable from this machine.)

**L5 — AC1/AC2 are not assertions, and the fixture deck is unnamed.** "diff 只显示被删的那一块,无其他行变化" needs translating into `expect(after).toBe(expected)` / prefix-suffix equality, and the ACs never say whether the fixture is synthetic or the repo's real deck. A synthetic ASCII fixture is precisely what would hide H3. *Action*: name the fixture (`src/toml-splice.test.ts` with an inline comment-dense deck, per TESTING.md co-location) and say the assertion is byte comparison. Note AC2 is feasible: `add.ts` already exposes an IO seam (`AddSkillIO.probe/fetchPlan/exit`) so the clone can be stubbed.

**L6 — The card contradicts the ADR on location technique.** "Added: (执行时填:测试 + **可能的行级编辑实现**)" reads as line-based editing, while the ADR's Decision Driver 3 rejects line/regex location outright. The card's own prose says 语法树, so a careful reader is fine — but the wording should not survive into an executable card.

**L7 — Stale path in the card.** Related Files points at `cortex/adr/01-proposed/ADR-20260910152957509-*.md`; the ADR is in `02-accepted/` and `01-proposed/` is empty.

**L8 — `add.ts:468` is cited as part of the bug path but is the new-file branch.** It writes a literal comment header + a freshly stringified minimal deck; there are no pre-existing comments to destroy. *Action*: split the citation so the executor does not "fix" the new-file path — and so the existing "created with" test (`add.test.ts:244`) keeps holding.

**L9 — `migrate-schema` scope is left vague between the two documents.** The card's AC5 accepts "修 / 明确不修 + 理由"; the ADR's Follow-up says "需核实是否同病并**一并处理**". Either is decidable, and I can report the open question *is* answerable: it is the same disease (`migrate-schema.ts:39/52`, `stringify(parsed)` + `writeFileSync`), but it is gated on `deprecated` (legacy decks only) and it already makes a `.bak.<ts>` backup before writing — a real rationale for "not fix". What is missing is *where the conclusion must be recorded* (the ADR footer tells the executor to "tick the item here and write the commit sha", but no accepted ADR in `02-accepted/` uses that `- [x]` form). *Action*: say "record the conclusion in the card's Notes and tick the ADR Follow-up line with the sha".

**L10 — The orphaned comment is intended, but the card's bug report reads as if it were part of the bug.** The card's Background cites "`# section comment for skill-b` 与 `[tool.skills.skill-b]` 一起消失" as a reproduction, and `ADR-20260910112404500`-style reasoning then decides the comment must **stay** (orphaned). The ADR says this explicitly ("包括紧贴在块上方、看起来属于它的注释"), so it is decidable — but the card should repeat it, or an executor may "fix" the orphan by deleting it and violate the ADR.

**Trivia (not worth its own number)**: the card's `Git Commit Message` placeholder uses `feat(scope)` while the package's convention is `fix(deck)`/`feat(deck)`; a scope that the executor must pick.

## 5. What I could not check

- **`add` end to end.** I did not run a real `deck add` (it clones from the network). I verified the write sites by reading, and the insert rule by simulating it with the AST; AC2's testability rests on the existing `AddSkillIO` seam, which I read but did not exercise.
- **Whether the executor's chosen parser is what the project will accept.** I verified `toml-eslint-parser` meets the ADR's stated numbers and handles this repo's decks; I did not check it against exotic TOML this repo does not use (`[[array-of-tables]]`, dotted/quoted keys, `x.y.z = …` inline dotted).
- **Any state outside the repo.** `remove` also calls `pool.metadata.removeReference`, which writes into the cold pool. I redirected `cold_pool` to `/tmp` in every fixture to avoid touching `~/.agents/`; I therefore did not observe that write path.
- **Whether the completed work will need to satisfy the ZK/arena gates of `AGENTS.md` §3** (e.g. a user-sim reviewer or cross-model check) — that is a process question the card does not raise and I cannot settle from the card.
- **The ADR's own prototype.** No script, fixture, or artifact from the ADR's measurements exists in the repo or in `/tmp`, so the "实测" table was reproduced from scratch rather than audited. My reproduction confirms the delete rule and contradicts the units label (H3).

## 6. Verdict

**3 HIGH + 10 LOW.** The specification is much better than typical — the mechanism was measured, the rejected options are recorded, and its central claim (`splice by range preserves comments`) reproduces exactly on this repo's deck. But it is written for the *happy shape* only: it defines the grammar of "a skill is a table node `tool.skills.<alias>`" while the code it replaces accepts two more shapes (inline entries, legacy arrays) that the spec silently drops, one of which has a green test asserting the old behaviour.

**Would I let an executor start from this plan as-is? No — not without H1 and H2 answered.** An executor following the spec literally would either redden `remove.test.ts` C11.b (breaking AC4) or invent an undocumented rule, and would silently narrow the accepted deck grammar on the inline path with nothing in the acceptance criteria to catch it. H1 and H2 are each a few sentences in the card's Technical Approach (or a new row in the ADR's spec table); H3 is one sentence. With those three folded in, this is a clean, executable card — most of the remaining LOWs the executor can fill in with common sense, and per the protocol's own bar the card would then be under the 2-HIGH threshold.
