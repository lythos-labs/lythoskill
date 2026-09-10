# ZK Review — Round 2 (fork of round 1)

**Object**: `TASK-20260910152029904` + `ADR-20260910152957509` @ `125670ef` (reviewed state), HEAD now `adfac4e0`.
Round-1 log (pinned `6ac2324d`, 3 HIGH + 10 LOW): `showcase/2026-09-10-zk-reviews/904-plan-round1.md`.
Environment unchanged: `bun 1.3.11`, `Darwin 24.6.0`. All work in `/tmp/zk-904/`; nothing in the repo was modified.

## 0. Verdict up front

**1 HIGH + 6 LOW.** Each accepted fix does close the gap it was aimed at — I verified all three closures mechanically rather than on the strength of the wording — and the new section does not re-open H1/H2/H3. But the plan as it stands *introduces one new corruption path* (H-R2-1: `deck add` into a legacy deck emits TOML its own reader cannot parse), and one stale-table problem runs through the document (G-R2-1: the normative §规格 rows still say the superseded thing in four places). Under the protocol's bar (`< 2 new gaps, all low`) this is **not converged** — but the remaining work is one rule row plus one table rewrite, not a redesign.

## 1. Do the fixes close the gaps? (Q1)

### H1 (inline-entry shape) — **closed, and implementable**
Rule 2 needs a node range for the inline entry, and the parser provides one exactly: for `[tool.skills]\nfoo = { path = "x" }\nbar = { path = "y" }`, the container is `tool.skills[0,55]` and the entries are `TOMLKeyValue foo[14,34]` / `bar[35,55]`, each slice equal to `foo = { path = "x" }`. If rule 2 had been written against a node that carries no range, the fix would have been paper — it isn't.

### H2 (legacy array) — **closed, and the C11.b claim is true**
Rule 3 also has real ranges: `skills = [...]` is `TOMLKeyValue[7,56]`, and its elements are `TOMLValue` nodes (`[17,35]`, `[37,55]` — the commas sit *between* ranges, so "element + adjacent comma" is a structural splice, not a text search). I then ran the whole chain the ADR promises on the C11.b fixture — delete element + comma → `skills = []` → cascade drops the key → cascade drops the `[tool]` header — and confirmed: reparse OK, and C11.b's assertion (`not.toContain('skills = [')`) holds. **The positive answer in the new section is correct**: the spec's "fail loudly rather than re-serialise" never had to be bent for C11.b; what was missing was rule 3.

### H3 (units) — **closed as wording, but not as carriage** (see G-R2-1)
The corrected sentence (slice on the string, never a `Buffer`; fixture must contain non-ASCII) is exactly right, and the ADR now records the correction honestly instead of quietly editing the number.

### Two shapes at once — **no ambiguity, per alias**
The parent's specific worry does not materialise, and it is worth stating why: two rules cannot both match one alias, because a duplicate key is a parse error. `[tool.skills]` + `[tool.skills.bar]` in one file is legal (verified: parses; `parseDeck` returns both `foo` and `bar`, so the reader's grammar genuinely covers the mixed shape, and inserting a new table node there produces a file that reparses). Legacy + table, and legacy + inline container, are **invalid TOML** ("Defining a key multiple times is invalid") — verified — so those combinations cannot arise as *input*. They can, however, arise as *output*, which is H-R2-1.

## 2. Gaps

### HIGH

**H-R2-1 — the insert rule has no shape rule, so `deck add` into a legacy deck writes invalid TOML.**
The new rules are all locate/delete-side (the table's columns are 定位对象 / 删除动作); the insert row is unchanged: *"after the last same-prefix table; if none, EOF"*. A legacy deck has no `tool.skills.*` node, so both readings of "same prefix" (`tool` is literally a prefix of `tool.skills`; or the exact `tool.skills.` — `[tool]` matches the first and nothing matches the second) land at the same place: a new `[tool.skills.new]` table appended to a file that already declares `skills` as an array. Verified: that file **throws on parse** — `[deck]…\n[tool]\nskills = ["github.com/o/r/a"]\n\n[tool.skills.new]\npath = "z"` → *"Defining a key multiple times is invalid"*.
Today's code cannot produce this, because `add.ts:408-419` auto-migrates the section first — by re-serialising the whole document, which this ADR forbids. So the plan removes the re-serialise fallback *without* providing the minimal write that replaces it: a deck that `deck add` just wrote becomes unreadable to `deck link`/`parseDeck`, i.e. the user's declaration file is corrupt and needs hand-editing.
Nothing forces the question: no test covers add-on-legacy (`add.test.ts` has no `migrat` / `skills = [` / `legacy` hit), and AC3's "三种形状各一条用例" does not say whether the three shapes apply to `add` as well as `remove`.
*Action* (either is fine, but pick one and say it): add an **insert-side shape rule** mirroring the container's existing shape — legacy array → append a string element (which `parseDeck` reads back with the path's basename as alias, so semantics survive; note `source` cannot be carried in that shape and say so), inline container → add an inline key, table shape → add a table node — **or** declare add-on-legacy out of scope with an explicit error and an AC. Then state in AC3 whether the three shapes are remove-only.

### LOW

**G-R2-1 — the corrections are a corrigendum, not an amendment: the normative table still states the superseded rules.** `### 规格(实现即照此,测试即钉此)` is unchanged in four places that the new section contradicts 40 lines below it: (a) `定位` still gives the one-rule, `tool.skills.<alias>`-only form; (b) `Choice` and the units sentence still say 字节; (c) `删除的区间` still says "最多吞 2 个(`\n\n`)" — the LF-only swallow, measured to leave `\r\n\r\n\r\n` (one blank line of debris) on CRLF where the corrected "2 characters" rule gives the right seam; (d) the measurement heading still reads "3416 字节", and the Follow-up still mandates the mtime test that §Round-1 修正 withdraws. A reader who trusts "实现即照此" and stops at the table gets the round-1 spec back. *Action*: rewrite the four rows in place; keep § Round-1 修正 as the historical record of what changed and why (that half is working as intended and should not be deleted).

**G-R2-2 — "注释一行都不删" is false as worded, for two distinct reasons.** Measured: a comment *between* a block's key-values is inside the node's range (`[tool.skills.a]` = `[0,53]` including `# interior note`), so splicing the node deletes it; and the cascade's `[tool]` node range likewise contains a comment inside the section (`[tool]` = `[37,94]` incl. `# inside tool`). So "一行都不删" is unsatisfiable by a range splice — the invariant has to be stated about bytes *outside* the block ("块体内部的注释随块走"), and the cascade's rule must choose between "delete the header line only" (keeps an in-section comment, orphaned — consistent with the orphan rule already fixed) and "delete the section node" (kills it). *Action*: one sentence for the invariant's scope + one for the cascade's granularity. I considered raising this to HIGH (a literal executor cannot satisfy the stated invariant) and landed on LOW because the natural implementation is the desired one and no realistic fixture turns it red.

**G-R2-3 — the cascade has no separator rule of its own, and leaves trailing debris.** Verified residue of the legacy chain on the C11.b fixture: the file ends `…cold_pool = "cold-pool"\n\n\n` — two blank lines where the section was. Rule 1's "at most one blank-line separator" was written for the table-node deletion; the cascade's two narrower deletions (key-value line, header line) inherit nothing. *Action*: say whether each cascade step also swallows one adjacent blank line.

**G-R2-4 — the inline shape's cascade is unspecified.** For `[tool.skills]` with inline entries, the cascade text is phrased for the array ("`skills` 空了 → 删掉 `skills` 键"): what happens when the last inline entry is removed — is `[tool.skills]` itself a "section" whose header gets dropped, and does the recursion stop there when `[tool]` has no header? Both answers are legal TOML; only one matches "no stale containers". *Action*: name the container shapes the cascade recurses through.

**G-R2-5 — AC1/AC2's new phrasing is circular as a test.** "结果与「原文减去那一段」逐字节相同" is the implementation's own definition of a splice: a test that derives the expectation from the located range cannot fail for a wrong range. The round-1 wording ("diff 只显示被删的那一块") was informal but independent. *Action*: keep the prefix/suffix byte-identity assertion *and* add a hand-written expected output for the fixture (`expect(after).toBe(<literal>)`). Cheap, and it is the assertion that actually pins "the write touched only what it was about".

**G-R2-6 — rule 3's "adjacent comma" has an unstated whitespace convention.** Deleting `"a"` + comma from `skills = ["a", "b"]` leaves `skills = [ "b"]` — a space the file did not have (the parser's element ranges exclude commas and surrounding whitespace). Legal TOML, inside the touched key, but the expected fixture is then not guessable from the rule as written. *Action*: say what the surviving array literal looks like (one example is enough).

## 3. Q2 — did the fixes introduce a new gap?

Yes, one substantive: **H-R2-1**. It is genuinely new in the sense that matters — the previous behaviour (re-serialise) could not produce a corrupt deck, and the plan removes that path while the insert rule for the legacy shape has no replacement. Everything else the new section adds is either verified-closed (H1, H2, H3, the mixed-shape worry) or a stale-carriage problem (G-R2-1) rather than a new invention.

The two new LOWs that the larger surface produced on its own — cascade granularity (G-R2-2/G-R2-3) and the inline cascade's recursion (G-R2-4) — are real but bounded: they are the same class as round 1's L1 (seam ambiguity), and each is one sentence.

## 4. Q3 — convergence

**Not yet.** The bar is fewer than 2 HIGH *and* all remaining gaps low; with H-R2-1 open the first condition fails. But the distance is short and the shape of the work is different from round 1: no rule is missing from the plan's core, and every closure I checked held up mechanically. Close H-R2-1 with one insert-side rule row (plus an AC clause saying whether the three shapes cover `add`) and fold the four stale rows into §规格 (G-R2-1), and I would let an executor start — the remaining LOWs are the kind an executor fills in with common sense.

## 5. The CRLF challenge — your call is half right

**The test decision is right.** No CRLF deck exists here or downstream, the rule is stated, and refusing to build a rule *and a test* for a user you cannot name is the project's own prior ("检查边界用例是否真有用户再造规则"). I would not add the test.

**The carrier is not.** With the test declined, the prose is the *only* carrier of that rule — and the prose now exists twice with different content: the normative row still says "最多吞 2 个(`\n\n`)", the corrigendum says "吞 2 个字符". I measured the difference: CRLF node ranges exclude the trailing `\r\n` (the slice for `tool.skills.a` ends at `…"`), so swallowing "up to 2 `\n`" consumes **nothing** and leaves `\r\n\r\n\r\n` — one blank line of debris — while consuming 2 characters, or up to 2 line-ending sequences, gives `\r\n\r\n` and matches the LF seam exactly. So your arithmetic claim ("吞 2 个字符在 CRLF 下恰好是 `\r\n`") is **correct**, and the round-1 row it corrects is the wrong one. Declining the test is defensible; leaving the superseded rule standing as the normative one is not, because there is no test to catch a reader who implements it. Same fix as G-R2-1(c): correct the row itself, keep the corrigendum as history.

## 6. What I could not check

- `deck add` end to end (needs a clone); H-R2-1 is established from the parser's grammar plus the write path's text, and AC2's stubbed `AddSkillIO` path is what would exercise it.
- Whether `deck link` tolerates an empty leftover container (`[tool.skills]` with no keys) — G-R2-4's two answers are both legal TOML, but only one may match what the linker expects.
- Whether the project wants ADR corrigenda rewritten in place or appended: I checked and **no accepted ADR in `02-accepted/` uses the `- [x]` tick form** the ADR's footer prescribes, so the "self-carrying" convention AC5 now cites is not evidenced elsewhere in the corpus. That is a documentation-convention question, not an executability one.
