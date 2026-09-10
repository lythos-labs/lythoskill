# ZK Review — Round 3 (fork of rounds 1–2)

**Object**: `TASK-20260910152029904` + `ADR-20260910152957509` @ `e369729e` (reviewed state).
Prior rounds: `904-plan-round1.md` (pinned `6ac2324d`, 3 HIGH + 10 LOW), `904-plan-round2.md` (pinned `125670ef`, 1 HIGH + 6 LOW).
Environment unchanged: `bun 1.3.11`, `Darwin 24.6.0`. All work in `/tmp/zk-904/`; nothing in the repo was modified.

## Verdict

**0 HIGH + 4 LOW → converged** (`zk-review.md`'s bar: fewer than 2 HIGH *and* all remaining low). I would let an executor start from this plan. Every round-2 item I raised is either closed by measurement or answered as a deliberate choice, and the one thing I re-attacked this round (the new insert rule) holds up.

## 1. H-R2-1 is closed — verified, not taken on the wording

The round-2 finding was "the insert rule has no shape rule, so `add` into a legacy deck writes TOML its own reader rejects". The new row closes it with the right mechanism, and I re-ran the whole matrix:

| Insert target vs deck shape | Result | Verdict |
|---|---|---|
| legacy `[tool] skills=[…]` + appended `[tool.skills.n]` (**the round-2 defect**) | **THROWS** `Defining a key multiple times is invalid` | the rule now forbids exactly this ✓ |
| legacy `[innate] skills=[…]` + appended `[tool.skills.n] path=… source=…` | OK (`deck, innate, tool.skills.n`) | benign fall-through ✓ |
| legacy `[tool] skills=[…]` + existing `[innate.skills.x]` (mixed sections) | OK (`deck, tool, innate.skills.x`) | benign ✓ |
| legacy array with a string element appended | OK | reader round-trips it (alias = basename of the path, same as `parseDeck` does for legacy entries) ✓ |

**On your reasoning, since you invited a challenge: I agree with the split, and I'd argue it the same way.** A blanket refusal would re-introduce exactly the narrowing H1/H2 were about — the writer's grammar would no longer equal the reader's for a shape the CLI still reads, and "yesterday's deck errors today" is the failure mode the whole ADR is against. A silent string-append would drop provenance, which is the same class of silent loss the ADR condemns elsewhere (`ADR-20260910113730375`: "文件变了" must equal "内容变了"). Narrowing only where representation is genuinely impossible — and naming the one command that *is* allowed to rewrite, with the `.bak` rationale already on record — is the correctly-scoped version of both. One addition worth making while you are here: the repo's own norm for agent-facing failures is a what/why/fix exit message, and this error is a perfect candidate — state that the clone already landed in the cold pool so the retry after `migrate-schema` is not a re-download. That is a UX clause, not a correctness one (see L3).

## 2. The stale-spec problem is closed, and I re-read every row

The `### 规格` table is rewritten in place and carries an explicit precedence note ("本表是唯一规格 … 冲突时以本表为准"), with the superseded rows named so a reader is warned off them. I checked each row against my own measurements rather than against the intent:

- **定位**: three ordered rules; node ranges exist for all three (verified in rounds 1–2: table node, inline `TOMLKeyValue[14,34]`, array `TOMLValue[17,35]`). ✓
- **删除的区间**: "最多 2 个字符或 2 个行尾序列(取先到者)" — this is the fix for the row I flagged. Verified: CRLF node ranges end at `…"`, so 2 characters consume `\r\n` (whereas the old "只找 `\n`" consumed **zero** and left `\r\n\r\n\r\n`). Consuming `\r\n` leaves exactly one `\r\n` as the seam. The zero-consumption defect is gone. "取先到者" does mean CRLF keeps one more blank line than the LF-mirror (`\r\n\r\n` vs the LF case's removal of both) — that is a cosmetic difference, consistent with the table's deliberate "尾渣不动" stance, and **not** a defect. ✓
- **注释**: exactly my A1 measurement — comments outside the range stay, comments between a block's key-values go with the block. ✓
- **空容器级联**: now recurses through the inline shape (my G-R2-4), and the EOF residue is declared untouched (my G-R2-3, measured `\n\n\n`). ✓
- **插入(常规)**: separator copies the file's own ending; block carries no trailing newline. ✓
- **数组内剩余元素的间距 / 重复执行 / 无变化则不写 / 失败即不写 / 尾部残渣**: all four corrected as accepted. ✓

AC1's tautology is gone (hand-written expected text), AC3 covers 3 shapes × {delete, add} including both legacy-add branches, AC5 pins the conclusion's carrier, AC6 keeps the dependency visible. **CRLF: agreed and closed** — the wrong row was the round-1 one; the corrected row is deterministic and correct-enough, and declining the test remains the right call for a user nobody can name.

## 3. Remaining LOWs (4) — none blocking

**L-R3-1 — the legacy-insert criterion is a field test, but the fact that matters is expressibility of the whole operation; `--alias` slips through.**
The row keys off "条目只含 `path`". But the alias is not a field of an entry — it is the TOML *key*, and the legacy array can only express it as the basename of the path. So `deck add <gitlab-ish locator> --alias custom` on a legacy deck takes the path-only branch, appends a string, and the entry lands under `basename(path)`; the user's explicit alias is silently dropped, with the working-set symlink following the wrong name. Reachable rather than exotic: the path-only branch is precisely the non-github-host case, and `gitlab.com/...` is the documented cold-pool layout (`packages/lythoskill-deck/skill/references/architecture.md:7`, `cold-pool-setup.md:16`); `--alias` is a documented flag (`cli.ts:85` → `add.ts:245`), and for a github.com locator the `source` error fires instead, so there is no silent loss there.
*Action (one clause)*: change the criterion from "entry contains only `path`" to "the operation carries nothing the string form cannot express — a `source`, **or an explicit alias that differs from the path's basename**", and route the second case to the same `migrate-schema` error.

**L-R3-2 — the legacy-insert row's precondition is scoped to the deck, not to the target section.**
It opens "该 deck 没有 `tool.skills.*` 节点". For a deck whose legacy array is in the *other* section than the target, a literal reader either appends to the wrong section's array (silent) or falls through to the 常规 rule and writes the invalid combination L-R3-1's row exists to prevent (verified: `legacy [tool] skills=[…]` + appended `[tool.skills.n]` throws). I am **not** calling this HIGH: it needs a mixed-section legacy deck *and* an explicit `--type` pointing at the legacy section, and the default `--type tool` path resolves benignly (verified). *Action*: write the precondition against the target section ("目标 section 是 legacy 数组形态 → …").

**L-R3-3 — the card's §Technical Approach is now the stale mirror of the ADR.**
Two residues: it still says the parser gives "精确**字节**区间" (the H3 error the ADR just fixed) and still lists the third thing to pin as "③**无变化时不写文件**(mtime 不变)" — the very test the ADR demoted to an unmandatable guard. The Requirements correctly point at the ADR table as authoritative, so this cannot mislead a careful reader; it is the same defect class G-R2-1 fixed one level up. *Action*: two words plus deleting item ③.

**L-R3-4 — the spec's examples are `tool`-only.** Every row writes `[tool.skills.<alias>]` / `[tool.skills]` / `[tool] skills=[…]`, while the code being edited resolves the section from the entry (`section = match.type`) and supports `innate`. **This is on the list for completeness, not because I think it can mislead**: the executor is editing code that already carries that variable, and the 总则 ("writer's grammar = reader's grammar") plus the reader's own section list make it obvious. One word (`[<section>.skills.<alias>]`) would retire it.

Not a gap, for the record: the ADR's Follow-up row still says migrate-schema should be handled "一并处理" while AC5 permits a documented non-fix — that is a close-time annotation on the Follow-up line, which AC5 already requires, so it resolves itself when the conclusion is written.

## 4. What I could not check

- `deck add` end to end (a real clone); the insert-rule conclusions come from the parser's grammar plus `add.ts`'s write path, and AC3's stubbed `AddSkillIO` case is exactly what would exercise them.
- Whether an executor's chosen "inline separator" for the appended array element (`, ` vs `,`) matters to AC3's hand-written expectation — it is a fixture-authoring detail, not a spec hole.
- Nothing else: rounds 1–2's measurements (parser API, node ranges, comment-in-range, cascade chain, C11.b, mixed-shape validity) still hold on this tree, and the tree is unchanged apart from the two documents.

## 5. Pinning

This convergence statement covers **`e369729e`** and nothing later, per `ADR-20260910113730375`. If you fold any of the four LOWs, the folded diff is non-empty: mark it `折后未评` with the delta's scope (or fork me for a delta pass before the fold lands) — the same rule the ADR now quotes at its own footer. The round-1 and round-2 logs being landed verbatim is what makes this round checkable at all, and that part is working.
