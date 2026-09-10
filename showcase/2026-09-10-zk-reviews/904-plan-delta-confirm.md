# ZK Review — confirmation of the wording fold

**Object**: `TASK-20260910152029904` + `ADR-20260910152957509` @ **`76a3ca44`** (tree clean, pushed).
**Chain**: round 1 `6ac2324d` (3 HIGH + 10 LOW) → round 2 `125670ef` (1 HIGH + 6 LOW) → round 3 `e369729e` (0 HIGH + 4 LOW, converged) → delta `b290c42e` → this fold.
Environment unchanged: `bun 1.3.11`, `Darwin 24.6.0`. Repo read-only; scratch in `/tmp/zk-904/`.

## Confirmed — satisfied at `76a3ca44`

**Three of the four are pure wording; one adds an obligation, and it is the fourth.**

| # | Change | Meaning changed? |
|---|---|---|
| 1 | Card candidate cell → "精确**文本**区间(UTF-16 code unit;不是字节 —— 见 ADR § Round-1 H3)" | **No.** Same claim, now true. The neighbouring "前后缀**逐字节相同**" was correctly left alone — byte comparison of file *content* is the right term; only offsets are code units. |
| 2 | Precedence note widened from "第一版**表**里那几行" to the whole first version, enumerating the stray spots | **No** — and this was the one place the widening could have done damage, so I checked it: the note **enumerates** rather than blanket-supersedes, so the correct byte-comparison statements elsewhere ("逐字节相同" §实测, "其余全部字节" in 不动的部分, "查找失败时文件逐字节不变") were **not** swept away. They survive and they are right. |
| 3 | Insert row's section clause → "各路径自己的解析(插入侧 `add.ts` 的 `skillType`,删除侧 `remove.ts` 的 `match.type` —— 不是同一个变量)" | **No — it corrects a fact, and the fact now checks out.** Verified: `remove.ts:119` `const section = match.type;`; `add.ts:251` `const skillType = (options.type \|\| 'tool').toLowerCase()` used at `:422-444`. The rule (per-section judgement) is unchanged; only the example was wrong before. |
| 4 | "报错时**点名它看到的 locator / ref** —— 只传了 `#v1` 这类字符时,消息要与原因对得上" | **Yes, this is the one that is more than a word.** It is a new obligation on the error *message's content*, not on behaviour: no write path, control flow, or acceptance criterion is affected. It is satisfiable where the error fires (`fqPath`, ref included, is computed at `add.ts:369`, before the write block at `:385+`), it is scoped to that one error clause, and it matches the repo's what/why/fix norm for agent-facing failures. Named rather than blessed silently; I do not consider it a risk. |

## Scope check

`git show --stat 76a3ca44` = the ADR (11 lines), the card (2 lines), and `904-plan-delta.md`. The `INDEX.md` churn and the `03-review → 04-completed` task move that appear in a `b290c42e..76a3ca44` range diff belong to the intervening 5092 completion commit, not to this fold. Every hunk is one of the four above.

## Residual, not a gap (named so the record shows it was seen)

Four loose prose occurrences of "字节" survive outside the corrected cells — Decision Drivers 3 and 4, Option C's body ("把**要改的那一段字节**替换掉", three lines under its now-corrected heading), and the Rationale's "删哪几个字节". All four mean "that portion of the file", and **every normative statement of units is now correct**: the Choice line ("按**文本区间(UTF-16 code unit)**splice") and the table's `[node.range[0], node.range[1])`. No implementer can be misled into byte offsets by them. If a future pass wants one tidy line, Option C's body is the one worth doing; I would not spend a fold cycle on it now.

## Final status

**0 HIGH, 0 LOW outstanding.** The plan is executable as it stands: an executor with the same zero context I had can restate WHAT (`deck add`/`remove` must touch only the text span the operation is about), WHY (git-tracked declarative source of truth; comments are user-authored, and diff noise is where real changes hide), and HOW (ADR § `### 规格` is the single normative table: three locate rules by AST key text, splice `[node.range[0], node.range[1])` plus at most 2 characters or 2 line-ending sequences, one insert rule per section shape with the legacy branch decided by expressibility, cascade on empty containers, comment scope stated both ways) — with the tests named (`src/toml-splice.test.ts`, comment-dense non-ASCII fixture, written-out expected text, `AddSkillIO` stub, `bun test packages/lythoskill-deck/` at `0 fail` from a measured `253 pass / 1 skip / 0 fail / 661 expect` baseline) and `migrate-schema`'s open question given a carrier.

This confirmation covers `76a3ca44`. Anything beyond the four cells above is outside it.
