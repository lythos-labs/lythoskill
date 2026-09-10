# ZK review — ADR-20260910152957509 implementation (round 1)

**Reviewer**: zero-knowledge (no context from the producing session).
**Object**: `packages/lythoskill-deck/src/toml-splice.ts` (new), its two call sites
`src/remove.ts` / `src/add.ts`, tests `src/toml-splice.test.ts`.
**Normative spec**: the `### 规格(实现即照此,测试即钉此)` table of
`cortex/adr/02-accepted/ADR-20260910152957509-…-never-reserialise-the-document.md`.
**Card**: `cortex/tasks/03-review/TASK-20260910152029904-…-round-trip.md`.

**Verdict in one line**: the three locate rules, the byte-exact splice, both cascades and the
"failure writes nothing" rule are implemented and pinned by tests that do go red when broken;
**4 HIGH** findings (one of which silently writes an unparseable deck) and **8 LOW**.

## 0. Environment and repo state

| | |
|---|---|
| commit | `c4e75ec7d0e3857ec985bc0ee49d52abf3e0684b` (tree clean before and after every command below; `git status --porcelain` empty) |
| bun | `1.3.11` (af24e281) |
| OS | `Darwin 24.6.0` (arm64) |
| scratch | `/tmp/zk904/…` — every destructive experiment ran on a copy; the repo itself was only read |

Commands in this report were run either in the pinned repo (read-only commands) or in
`/tmp/zk904/repo` (a copy at the same commit) when a mutation or a write was needed.

## 1. Spec vs code, row by row

Spec rows are quoted in shortened form; **command → observation**.

### 1.1 定位(删除) — three rules in order

| rule | verdict |
|---|---|
| ① `[<section>.skills.<alias>]` table | **implemented** — `spliceRemoveSkill(DENSE,'tool','alpha')` removes exactly that node; e2e `deck remove alpha` diff is exactly the block |
| ② `alias = { … }` inside `[<section>.skills]` | **implemented** — `INLINE` fixture test; measured removal of one of two entries |
| ③ element of legacy `[<section>] skills = [...]` | **implemented** — `LEGACY` fixture test |
| 按序尝试三条 | **implemented** — `locate()` order is ①,②,③ (`toml-splice.ts:92-125`) |
| 三条都不命中 → 报错退出 | **implemented** — `not-found` with a message naming all three shapes (`probe.ts` case C) |
| **按 key 文本匹配** + 总则「写入器的语法 = 读取器的语法」 | **REFUTED for four spellings/shapes the reader accepts** → see **H1/H2** |

Measured (`/tmp/zk904/probe.ts` case G, `/tmp/zk904/probe2.ts` cases 1,3):

```
[tool.skills.alpha]          :: reader=reads writer=splices
[tool.skills."alpha"]        :: reader=reads writer=ERR:not-found
[tool.skills.'alpha']        :: reader=reads writer=ERR:not-found
[tool . skills . alpha]      :: reader=reads writer=ERR:not-found
[tool] skills = { alpha = { path = "…" } } :: parseDeck sees alias alpha; writer=ERR:not-found
```

Reader side confirmed through the shipped CLI, not just the library:

```
$ bun packages/lythoskill-deck/src/cli.ts validate /tmp/zk904/e2e/g1/skill-deck.toml   # deck contains [tool.skills."alpha"]
✅ Validation passed: 1 skill(s), max_cards = 10 (1 warning(s) — skills not in cold pool need cloning)

$ bun …/cli.ts remove alpha --deck ./skill-deck.toml --workdir .   # same file
❌ Cannot remove "alpha" from skill-deck.toml
   why:  no tool.skills.alpha in the file: looked for [tool.skills.alpha] (table), …
   fix:  the file was NOT modified — fix the deck by hand or report this shape
   (exit 1; sha256 of the file unchanged)
```

That the old object layer handled all four: `git show ddddcb16 -- remove.ts` shows the removed
`delete deck[section].skills[alias]` / array-filter code, which works on iarna's *normalised* keys —
reproduced directly:

```
$ bun /tmp/zk904/probe2.ts            # case 3
[tool.skills."alpha"]  parseDeck alias=["alpha"]  old-path: OK, keys now []
[tool . skills . alpha] parseDeck alias=["alpha"] old-path: OK, keys now []
```

So this is a **regression** introduced by `ddddcb16`, in exactly the shape the 总则 names
(「昨天还能跑的 deck 今天报错」). It fails loudly, not silently.

### 1.2 删除的区间 — `[node.range[0], node.range[1])` + ≤2 line-ending **sequences**

**implemented**. `cut()` (`toml-splice.ts:59-61`) + `lineEndingRun()` (`:48-56`).
- CRLF removal measured: `'[deck]\r\n…[tool.skills.alpha]\r\npath="a"\r\n\r\n[tool.skills.beta]…'`
  → `'[deck]\r\nmax_cards = 10\r\n\r\n[tool.skills.beta]\r\npath = "b"\r\n'` — no lone CR, one blank line kept.
- Mutation (e) below (1 sequence instead of 2) goes **red**, so the counter is genuinely pinned.
- Note: the spec table's "2 sequences" and the § Round-1 LOW row's "吞 2 个字符在 CRLF 下恰好是 `\r\n`"
  disagree; the code follows the table, which the ADR declares normative. Not a defect.

### 1.3 注释 — outside the range: untouched; inside the range: goes with the node

Both directions **implemented and measured**:

```
$ bun /tmp/zk904/probe.ts            # case A, interior comment
[tool.skills.alpha]
path = "…"
# INTERIOR: human note about alpha
role = "x"
→ TOMLTable range covers the interior comment (parser output printed in the probe)
→ after remove alpha: the interior comment is gone with the block        [spec-conformant]
```

Outside-range: e2e `remove` on a comment-dense deck leaves `# ── tool skills ──` in place
(orphaned above the next block) — spec-conformant, and the ADR/card explicitly want the orphan.

**However**: no fixture in `toml-splice.test.ts` contains an interior comment, so the second half of
this row has no test → **L1**.

### 1.4 空容器级联

| clause | verdict |
|---|---|
| `skills` 空 → 删 `skills` 键 | **implemented** (rule ③, single-element array → whole key-value) |
| section 随之空 → 删 `[<section>]` 表头 | **implemented** for `[<section>] skills=[…]` — `sectionEmpties` (`:116-121`); the LEGACY cascade test asserts `[tool]` is gone |
| 规则 ② 删空 `[tool.skills]` 表时**递归套用同一条级联** | **NOT IMPLEMENTED** → **H4** |
| 「与现有对象层行为**逐字一致**」 | **REFUTED** for that same shape (measurement in H4) |

### 1.5 插入(常规)

| clause | verdict |
|---|---|
| 插到最后一个同前缀 table 之后 | **implemented** + test (`lastTable` search, `:246-252`); mutation (h) red |
| 无同前缀者 → 文件末尾 | **implemented** (`:254-256`); measured on `[deck]`-only files and comment-only files |
| 新块不带结尾换行 | **implemented** — the inserted text has no trailing newline; the document's own blank line follows |
| 分隔符**复制文件自己的行尾**(从**插入点相邻字节**判定) | **NOT IMPLEMENTED** → **H3**. The code reads `lineEndingAt(src, 0)` — offset **0**, not the insertion point (`:210`). For every normal CRLF file `src[0]` is `[` or `#`, so the function returns `'\n'`; it returns `'\r\n'` only when the file begins with an empty CRLF line. Measured: `'\r\n'` separators written into a CRLF deck → mixed line endings |

### 1.6 插入(legacy 数组 section)

| clause | verdict |
|---|---|
| 判据按 section 定 | **implemented** (`skillsShape(nodes, src, section)`) |
| 表达得了 → 追加字符串元素 | **implemented**, and correct for the array shape — but **unreachable from the CLI for `github.com` locators** (see L5) |
| 表达不了 → 报错并点名 `deck migrate-schema` + 「克隆已经落在冷池」 | **implemented** — test asserts `migrate-schema` / `cold pool` / the locator; reproduced end-to-end with a stubbed `fetchPlan` |
| 报错时点名它看到的 locator / ref | **implemented** — message ends `locator: github.com/a/b/beta#v1?x` (measured) |
| **绝不**在数组形态旁新增表(「那是把 deck 写坏」) | **implemented for the array shape only**; the **inline-table** shape (`skills = { … }`) takes the table path and *does* write a broken deck → **H2** |
| section 由各路径自己的解析得出 | **implemented** — remove uses `match.type` (parseDeck, ∈ {innate, tool}), add uses `skillType` |

### 1.7 数组元素的删除 — element + exactly one adjacent comma

**implemented**; measured (`/tmp/zk904/probe2.ts` case 7), all single-line forms:

```
first of two   [ "a", "b" ] → [ "b" ]            ✓ no double space
last of two    [ "a", "b" ] → [ "a" ]
middle of three[ "a", "b", "c" ] → [ "a", "c" ]
no spaces      ["a","b"] → ["b"]                  ✓ comma+whitespace handling
```
Untouched elements are byte-identical in these forms. The **multi-line** array form drifts (L2).

### 1.8 不动的部分

**verified end-to-end.** `deck remove alpha` on the comment-dense fixture → `diff` is exactly the
removed block; comments stay; `also_link_to = [".agents/skills", ".kimi/skills"]` is not respaced;
`max_cards = 10                # budget` keeps its trailing comment and spacing.

### 1.9 无变化则不写 (guard) / 重复执行 / 失败即不写 / 尾部残渣

| row | command → observation |
|---|---|
| 无变化则不写 (guard, 不强制测) | guard present: `if (spliced.src !== src) writeFileSync(...)` in both call sites; no trigger path found, as the ADR says. **ADR residue**: the Impact section (`:166-167`) still lists the withdrawn mtime test → L7 |
| 重复 `remove` = exit 1 且不写 | `bun …/cli.ts remove alpha …` (twice) → `❌ Skill not found in deck: alpha` , `rc=1`, file unchanged |
| 失败即不写 | measured on **four** failure modes — parse-error (`legacy array + table` in one file), parseDeck-level not-found, splice-level not-found (quoted key), unrepresentable (legacy add): in every case `shasum -a 256` is identical before/after |
| 尾部残渣 | removing the file's last node leaves the trailing blank lines untouched (measured: `…path = "a"\n\n\n`) |

### 1.10 Shapes the task named — what each one actually does

| shape | result |
|---|---|
| target section is `innate` | works: `spliceRemoveSkill(innateDeck,'innate','consciousness')` deletes exactly that block; e2e `deck remove consciousness` on an innate deck succeeds and leaves both orphan comments |
| target section is `combo` | unreachable through `remove.ts`: `parseDeck` iterates `["innate","tool"]` only (`parse-deck.ts:33`), and `add.ts:254` rejects `--type combo` (「combo is now a prompt」). The pure functions accept any section name (measured on `innate`) |
| alias present in two shapes at once | the *parser* refuses the file before the splice runs — `legacy array + [tool.skills.alpha] table` and `inline + table` both throw `Defining a key multiple times is invalid` → `parse-error`, nothing written. No silent pick |
| empty array `skills = []` | remove → `not-found` (error, no write); insert → `skills = ["github.com/a/b/alpha"]`; the spaced variant `skills = [ ]` → `["…" ]` (L3) |
| file with no trailing newline | remove of the last node leaves the blank lines that preceded it; insert appends `\n\n` + block with no trailing newline; every output reparses |
| removed table is the file's last node | the trailing blank-line block is not tidied (measured `…path = "a"\n\n\n`) — the 尾部残渣 row, as specified |
| comment between two key-values of the removed table | the parser's `TOMLTable.range` **includes** it, and the splice deletes it with the node — spec-conformant; no fixture covers it (L1) |
| degenerate decks (empty file / comment-only / blank lines only) | insert produces a reparseable file (`"\n\n[tool.skills.x]\npath = \"p\""` for an empty file — a leading blank line, cosmetic); remove → `not-found` |

## 2. Mutation matrix

Driver: `/tmp/zk904/mutate.py` (patches `toml-splice.ts` in the scratch copy, runs
`bun test src/toml-splice.test.ts`, restores). Baseline: **13 pass / 0 fail**.

| # | mutation | expected red | actual |
|---|---|---|---|
| (a) | `cut()` slices a `Buffer` (AST index treated as a byte offset) | the non-ASCII test | **RED — 2 fail**: `① …restores the file的接缝`, `units … a non-ASCII file splices at the right place` |
| (b1) | rule ② container never cascades (`container: undefined`) | rule-② cascade | **RED — 1 fail** |
| (b2) | rule ③ container never cascades | rule-③ cascade | **RED — 1 fail** |
| (c) | insert separator hardcoded to `\n` | the CRLF claim | **GREEN — 13 pass / 0 fail** ⚠️ |
| (d) | legacy-array branch dropped from `skillsShape` (i.e. a table may be emitted beside an array) | the two legacy insert paths | **RED — 3 fail** |
| (e) | `lineEndingRun` eats 1 sequence instead of 2 | the seam tests | **RED — 2 fail** |
| (f) | array element matched by full text instead of `basename()` | rule-③ tests | **RED — 2 fail** |
| (g) | `cut()` eats no line endings | everything | **RED — 4 fail** |
| (h) | insert lands before the last same-prefix table | insert placement | **RED — 1 fail** |

**(c) is the finding the task asked for**: no test in the suite can fail on the insert-side line
ending. The suite does carry a CRLF fixture, but only for **removal**; the insert eol rule
(spec 1.5, last row) is unpinned *and* unimplemented (H3) — the test and the code are both
missing, so nothing here is even "green and wrong", it is "green and absent".

## 3. Findings

### HIGH

**H1 — `deck add` writes an unparseable `skill-deck.toml` when the section's `skills` is an inline
table.** The guard against "a table beside an array" (`skillsShape`) does not cover
`[tool]\nskills = { alpha = { path = … } }`, which the reader accepts as a skills map
(`parseDeck` → alias `alpha`; `validate` → `✅ Validation passed: 1 skill(s)`). The insert then
takes the "regular" path and appends `[tool.skills.beta]`:

```
$ bun /tmp/zk904/add-e2e.ts        # addSkill with AddSkillIO stubs (no network)
✅ Skill ready: beta (alias: beta)
📝 Added "beta" to [tool.skills] in …/skill-deck.toml
🔗 Running deck link...
addSkill threw: Can't redefine existing key at row 9, col 13, pos 151:
 9> [tool.skills.beta]
--- deck after add ---                       ← the file was already written
[tool]
skills = { alpha = { path = "github.com/a/b/alpha" } }

[tool.skills.beta]
path = "github.com/a/b/beta"
source = "https://github.com/a/b/blob/HEAD/beta/SKILL.md"
parseDeck after: []                          ← the whole file no longer parses
```

`skills = "oops"` (a scalar) behaves the same. The write happens **before** `linkDeck`, so the
declarative source of truth is already destroyed when the crash is printed, and the previously
declared `alpha` disappears from every reader's view. This is precisely the failure the spec calls
out — 「**绝不**在数组形态旁新增表…那是把 deck 写坏」 — it just arrives through a different shape.
**Regression**: at `ddddcb16^` the object layer produced a valid file (measured:
`deck.tool.skills.beta = …` → `[tool.skills.alpha]` / `[tool.skills.beta]`, both present).
No in-repo deck uses this shape (`grep -rn 'skills = {' …` → only `add.ts:424`), so the blast
radius is small — but the failure mode is silent data loss, not an error.

**H2 — the locator accepts fewer shapes than the reader, and the missing one is also the corrupting
one.** (a) `[section.skills."alias"]`, `[section.skills.'alias']`, `[section . skills . alias]` are
read by `parseDeck`/`validate` but not located by `tableByKey` (it compares raw key text against the
dotted path). `deck remove` then exits 1 on a deck the CLI itself validated — the 总则
(「写入器的语法 = 读取器的语法」) not implemented, and a regression against the object layer.
(b) The `skills = { … }` inline-table map is likewise unremovable (`ERR not-found`) — the removal
half of H1's shape. Suggested fix direction (not prescriptive): compare the *node's key parts*
(TOMLKey values, quote-stripped) instead of raw text, and add an inline-table branch to `locate`.

**H3 — the insert separator does not copy the file's line ending; it reads offset 0.**
`const eol = lineEndingAt(src, 0)` (`:210`). Measured:

```
$ bun /tmp/zk904/probe.ts         # case H — exact output line
insert into CRLF deck: "[deck]\r\nmax_cards = 10\r\n\r\n[tool.skills.alpha]\r\npath = \"a\"\n\n[tool.skills.beta]\npath = \"b\"\r\n\r\n[combo.weekly]\r\nprompt = \"k\"\r\n"
  mixed line endings present: true
$ bun /tmp/zk904/probe2.ts        # case 5 — same file, path with no same-prefix table
  input starts "[deck]\r\nma" -> mixed-line-endings in output: true
```
The inserted block (`…path = "a"` → the new table) is LF; everything the writer did not touch stays
CRLF.
The rule exists specifically 「免得静默混行尾」 (ADR § Round-1 LOW), and the spec table lists it as
normative. Mutation (c) shows no test guards it. Impact is the smallest of the three HIGHs (the ADR
itself says CRLF decks do not exist in this repo), the fix is one line, and the rule is stated.

**H4 — rule ②'s recursive cascade is missing.** Spec: 「规则 ② 删空 `[tool.skills]` 表时**递归套用
同一条级联**」 and 「与现有对象层行为**逐字一致**」:

```
input:  [deck] max_cards = 10 / [tool] / [tool.skills] alpha = { path = "…" }
new writer  → "[deck]\nmax_cards = 10\n\n[tool]\n\n"      ← empty [tool] header left behind
old layer   → "[deck]\nmax_cards = 10\n"                   ← section deleted (ddddcb16^ code, replayed)
```
Same in the compact variant. Impact is cosmetic (an empty table header is valid TOML and yields no
entries), but the spec row is not implemented and the "逐字一致" claim is refuted.

### LOW

- **L1** — the interior-comment half of the 注释 row is untested: no fixture has a comment between
  two key-values of a removed table. Behavior is spec-conformant (measured, §1.3); a future edit to
  `cut()` could break it silently.
- **L2** — multi-line legacy arrays drift when an element is removed: the cut takes the comma **and
  one line ending after it**, so `[tool]\nskills = [\n  "a",\n  "b",\n]\n` minus `a` becomes
  `[tool]\nskills = [\n    "b",\n]\n` (2-space indent → 4). The spec only defines the single-line
  form; the shape is neither specified nor tested.
- **L3** — inserting into an empty array moves whitespace: `skills = [ ]` + insert → `skills =
  ["path" ]` (the space after `[` ends up before `]`). Valid TOML, unspecified, untested.
- **L4** — `add.ts` still *claims* the removed behavior. The auto-migrate loop (`add.ts:409-420`) and
  its `console.log('📝 Auto-migrated [tool] from string-array to dict format')` survive the change;
  only the in-memory mutation is now dead (the write goes through the splice). Measured, stubbed:

  ```
  📝 Auto-migrated [tool] from string-array to dict format
  ❌ Cannot add "beta" to skill-deck.toml
     why:  [tool] uses the legacy string-array form …
  --- file after ---  identical to before (still `skills = [ "github.com/a/b/alpha" ]`)
  ```
  Two problems: the statement is false (nothing was migrated and nothing will be), and it is printed
  immediately before a message telling the user to migrate. The same lie is printed on the
  **successful** path — measured with a non-`github.com` host (see L5), where the add really does
  go through and the file stays a string array:

  ```
  📝 Auto-migrated [tool] from string-array to dict format
  📝 Added "beta" to [tool.skills] in …/skill-deck.toml
  --- file after ---
  "[deck]\n…\n[tool]\nskills = [ \"gitlab.com/a/b/alpha\", \"gitlab.com/a/b/beta\" ]\n"
  ```
  The commit message / card claim 「add.ts 也不再顺手 auto-migrate 别的 section」 is **refuted at the
  observable level** (the code and its message remain; only the effect is gone).
- **L5** — the legacy "表达得了 → 追加字符串元素" branch is unreachable from the CLI for
  `github.com` locators: `add.ts:435-444` sets `entry.source` for every `github.com` host (except
  when the ref carries `? # @`), and `spliceInsertSkill` treats `source` as unrepresentable. So
  `deck add` on a legacy deck always ends in the `migrate-schema` error. Reachability verified with
  a `gitlab.com` locator (no `source` emitted): the append branch runs and produces
  `skills = [ "gitlab.com/a/b/alpha", "gitlab.com/a/b/beta" ]` — correct, but only for a non-github
  host or a ref containing `?`, i.e. the test that pins the append path pins a path the ordinary
  user cannot take.
- **L6** — dead ternary in `spliceInsertSkill` (`:256`): `(tail ? eol + eol : eol + eol)` — both
  branches are identical; the intended distinction (blank line when the file has no trailing
  newline) is not expressed. No behavioral difference measured.
- **L7** — ADR residue (documentation, not code): (i) the Impact section still requires the
  withdrawn `mtime` test that the §规格 table explicitly de-commissions; (ii) the H3 实测 row's
  absolute offset is off by one — measured on the current, unchanged `skill-deck.toml`
  (`git diff --stat 6ac2324d..HEAD -- skill-deck.toml` is empty): `3416` code units / `3439` bytes
  **✓ exactly as the ADR says**, but the `[tool.skills.lythoskill-red-green-release]` node's
  `range[0]` is **1675** (byte offset **1687**, delta **12**), where the ADR says 1674/1686. Index
  1674 is the `\n` before the `[`. The load-bearing claim (code units, not bytes; delta 12) holds.
- **L8** — `basename()` (splice) and `parseDeck`'s alias rule diverge for array entries with a
  trailing slash: `"github.com/a/b/beta/"` → parseDeck alias = the **whole string**
  (`name.split('/').pop() || name`), splice's `basename` = `beta`. Unreachable in practice
  (`validateAlias` rejects `/`, so `deck remove` never reaches the splice with such an alias), but
  the two "reader" definitions of alias are not the same function.

## 4. Card claims, verified by measurement

| claim in the card / commit | verdict |
|---|---|
| 「deck `267 pass / 1 skip / 0 fail / 706 expect / 268 tests / 17 files`」 | **partially verified.** At `c4e75ec7` I measure `268 pass / 0 skip / 0 fail / 713 expect / 268 tests / 17 files`. Totals and 0-fail match; the `1 skip` is `cold-pool-health.test.ts`'s `describeGit = canSpawnGit ? describe : describe.skip` (git is spawnable here, so it runs). The expect delta (+7) is that same block |
| 「原 `253/1/0/661/254/16`」 | **the delta is verified, the absolute is off by one.** Measured at `ddddcb16^` in the scratch copy: `255 pass / 0 fail / 670 expect / 255 tests / 16 files`. So +13 tests / +1 file / 0 fail ✓ (255→268). But the card's own pair (254 → 268) is +14 while it states +13; 254 appears to be one test low |
| 「端到端,真 CLI:注释 3 → 3(改前会全没),diff 恰好只有被删的那一块」 | **verified in substance** (my own fixture has 2 comment lines): `before` → `after` comments **2 → 2**; `diff before.toml skill-deck.toml` prints exactly the 4 removed lines and nothing else |
| 「`add.ts` …去掉顺手 auto-migrate 别的 section 的行为」 | **refuted as stated** → L4 |
| 「全仓 `bun --filter='*' run test` 零失败」 | **verified.** In the scratch copy at `c4e75ec7`: 14/14 packages `Exited with code 0`; per-package `fail` counts all 0 (deck 268, cold-pool 175, skill-arena 165, project-cortex 138, test-utils 122, skill-curator 112, skill-creator 65, …) |
| 「`migrate-schema` 同病、本卡不修」 (AC5) | **verified by reading**: `migrate-schema.ts:39,52` still `stringify(parsed)` → `writeFileSync`, and it does `renameSync` to `.bak.<ts>` first. The ADR's boundary ("it is itself a whole-file re-serialisation") is accurate |
| 「`toml-eslint-parser@1.0.3` 已进 package.json」 | verified present in `packages/lythoskill-deck/package.json` |

## 5. Call sites (not just the library)

- **`remove.ts`** — the object-layer mutation is gone; the parsed object is now used only for
  `working_set` / `also_link_to` / `cold_pool` (read-only). `section`/`alias` come from
  `parseDeck` (`match.type` / `match.alias`) and are passed straight to the splice, so a
  reader/writer disagreement is exactly a splice `not-found` — loud, file untouched (measured).
  No path was found where the object and the spliced text disagree after the change.
- **`add.ts`** — the remaining object mutations are dead for the write but still *speak* (L4). The
  alias-collision check still reads through iarna, which is fine (read side).
- **State file / lock** — `remove.ts` and `add.ts` never wrote `skill-deck.lock` / `.state` before or
  after this commit (`git show ddddcb16 -- …/remove.ts` changes only the write-back lines). After
  `deck remove` the lock's `deck_source.content_hash` therefore still describes the pre-remove file
  until the next `deck link`; `deck validate` does not flag it (measured). **Pre-existing, not a
  regression.**
- **Failed splice leaves the file byte-identical** — verified for the four failure modes (§1.9).

## 6. Out of scope, but observed (not counted in the HIGH/LOW)

- `deck add --dry-run <locator>` **crashes** at HEAD:
  `ReferenceError: Cannot access 'alias' before initialization` — used at `add.ts:283`, declared at
  `add.ts:371` (TDZ). Verified **pre-existing**: the same crash occurs with `add.ts` checked out
  from `ddddcb16^` (`add.ts:282`). The change neither caused nor fixed it.
- No other file in the repo uses the `skills = { … }` or quoted-key spellings, so H1/H2 have no
  in-repo user today.

## 7. What I could not check, and why

- **The card's "before" numbers in the card's own environment**: a `git worktree` at `ddddcb16^`
  cannot resolve modules (`Cannot find module '@iarna/toml' / '@lythos/cold-pool'`) because the
  package's deps resolve through the workspace root `node_modules` that the worktree does not have.
  I measured `ddddcb16^` by checking the old `src/` into the scratch copy instead.
- **A real end-to-end `deck add` with a network clone**: not attempted (no network / not needed);
  the write path was exercised with the `AddSkillIO` seam stubbed, which covers everything after
  the clone. The pre-clone half is unchanged by this commit.
- **Real Windows/CRLF decks**: none exist in-repo (the ADR says so); all CRLF results above come
  from synthesized fixtures.
- **`deck link` / `refresh` / `to-snapshot` behaviour on the shapes in H1/H2**: I only checked
  `validate` and `parseDeck` accept them; I did not audit the rest of the read path.
- **The one-test discrepancy between the card's before-total (254) and mine (255)**: not explained.
  I checked for conditionally-registered tests and found only the `describe.skip` in
  `cold-pool-health.test.ts:118`, which counts in "Ran N tests" either way.
