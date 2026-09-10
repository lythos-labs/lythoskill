# ZK Review — Delta pass on the round-3 fold

**Object**: `TASK-20260910152029904` + `ADR-20260910152957509` @ `b290c42e` (delta reviewed).
**Base of the delta**: `e369729e` (round-3 convergence, 0 HIGH + 4 LOW — `904-plan-round3.md`).
**Delta scope as declared**: the ADR `### 规格` → 插入(legacy 数组 section) row; the card's §Technical Approach; the showcase index row.
Environment unchanged: `bun 1.3.11`, `Darwin 24.6.0`. Repo read-only; scratch in `/tmp/zk-904/`.

## Verdict

**0 HIGH. LOW-1, LOW-2 and LOW-4 are closed. LOW-3 is closed except for one cell.** The convergence at `e369729e` stands at `b290c42e`. Nothing in the delta introduces a new failure path; the rewritten row is strictly narrower than the old one in the ways that mattered and strictly wider in none.

## 1. Does the rewritten insert row close LOW-1 / LOW-2 / LOW-4? — yes, all three

**LOW-1 (the criterion was a field test; `--alias` slipped through) — closed, and closed the right way.** The criterion is now operation-level — "能否追加取决于**这次操作是否携带字符串表达不了的东西**" — with both cases named (`source`/extra fields, and a custom `--alias`, with the reason: the alias is the TOML *key*, derivable in an array only as `basename(path)`). Two things I checked beyond the wording:
- **It does not over-refuse.** The row adds "(alias 须等于 basename)", so `--alias` set to exactly the derivable name still takes the append path. That matters, because the alternative reading — "any `--alias` at all → error" — would have been a new narrowing of a currently-working invocation. It isn't that.
- **The distinguishing facts are available before the write.** The requested alias is finalised at `add.ts:370`, the deck write is at `:444+`; `basename(fqPath)` is computable from the entry. So the comparison the row demands is implementable where it must be.

**LOW-2 (precondition was deck-scoped) — closed.** "**判据按 section 定,不按整个 deck 定**:该 section 用的是数组形态(`[<section>] skills = [...]`,无 `[<section>.skills.*]` 节点)". I re-walked the scenario you asked about — mixed-section legacy deck plus `--type` — against the parser, on all three branches the row can now take:

| Branch | Resolution under the new row | Verified |
|---|---|---|
| target section **is** the array form | append (or the expressibility error) — to *that* section, because the section comes from the entry | wrong-section append is no longer reachable ✓ |
| target section is **not** the array form, the *other* section is | the row does not apply → 常规 row → no same-prefix table → EOF insert | `[innate] skills=[…]` + appended `[tool.skills.n] path=… source=…` **parses** (`deck, innate, tool.skills.n`) ✓ |
| array form adjacent to a new table (the round-2 defect) | explicitly forbidden, with the measured reason kept in the row | still `Defining a key multiple times is invalid` — i.e. the prohibition is load-bearing and retained ✓ |

**LOW-4 (`tool`-only examples) — closed.** "section 由 entry 解析得出(**如 `match.type`**),**示例里的 `tool` 只是例子**". One nit for the record, not a gap: `match.type` is the *remove* side's variable (`remove.ts:119`); the insert side resolves the section from `--type`/`skillType` (`add.ts:422-431`). It cannot mislead — the executor is editing `add.ts`, where `skillType` is the local — so I am naming it, not scoring it.

**LOW-3 (the card was the stale mirror) — closed except one cell.** The card now says "那段**文本**" instead of 字节, points at the ADR's `### 规格` as the single source with the code-unit correction stated in the reader's face, and mandates **two** tests with item ③ explicitly withdrawn as a guard. What survives is a single cell in the *card's* candidate table (`"逐 table 给出精确**字节区间**"`, the parser's capability claim) — the same phrase the H3 finding was about, 13 lines below the sentence that corrects it. The ADR's own §实测 heading is fixed (`3416 **code unit** / 3439 **字节**`), and its §实测 row's "前后缀**逐字节相同**" is *not* an error — comparing file bytes is exactly the right term; only offsets are code units. So the residue is one wrong cell, cosmetic, and covered in spirit by the sentence above it. *Action*: delete "精确字节区间" or write "精确**区间**(UTF-16 code unit)". Low, and optional.

## 2. Does the delta introduce anything new HIGH? — no

I looked specifically for the ways this row could have gone wrong:

- **New refusal where work used to happen?** The only invocation whose outcome *changes* is one that was already broken: a non-github locator carrying a `#ref` produces `fqPath` = `…/repo#ref`, so `basename` ≠ the requested alias and the new criterion now routes it to the `migrate-schema` error — whereas the old path appended a string whose derived alias (`repo#ref`) would later be rejected by `validateAlias`/`path-guard`. Loud now, broken before: an improvement, not a regression. (Trivia: that error's *reason* won't name the ref, so the user who passed only `#v1` may not connect the message to the cause. Message-quality nit on a legacy + non-github + ref + add path.)
- **Does the row's own error message violate anything?** It now carries what/why/fix plus the cold-pool note, which is the repo's agent-facing norm. ✓
- **Any contradiction with a neighbouring row?** The 常规 row ("无同前缀者 → 文件末尾") and this row now partition cleanly by section. The 注释 / 空容器级联 / 数组间距 rows are untouched and unchanged in meaning. ✓
- **Does the delta touch the normative table anywhere else?** One row changed, and I diffed the whole file: the only other ADR edit is the card/ADR prose listed above. ✓

## 3. Remaining items (all LOW, none blocking)

1. **The one stale cell** (card, `"逐 table 给出精确字节区间"`) — LOW, optional.
2. **Trivia, named so the record shows they were seen, not missed**: (a) `match.type` as the example for a section resolved on the insert side by `skillType`; (b) `"字节区间"` also survives in the ADR's *Choice* line and the Option-C heading — the precedence note names `"字节"` among the superseded phrasings, so the normative reading is unambiguous, but the letter of that note says "第一版**表**里那几行" while these two sit above the table; (c) the ref-case error's reason (above).

## 4. Pinning

This pass covers **`b290c42e`** and the declared delta scope. Wording-only folds confined to the cells I named in §3 (the card cell; the ADR Choice/Option-C occurrence of 字节区间; the `match.type` example) fall inside this pass's delta scope — tell me the resulting sha and I will confirm them without a new fork. Anything beyond that scope needs its own delta pass; a substantive rule change would need a fresh round.
