# ZK review round 2 — ADR-20260910152957509 implementation

**Reviewer**: zero-knowledge (no context from the producing session; round-1 log is mine but was
written against a different commit).
**Object**: `e7ec815e` (the fix commit). HEAD is `f94fd8e6`; `git diff e7ec815e..HEAD -- packages/`
is empty, so the code reviewed here is the code at HEAD.
**Round-1 log**: `showcase/2026-09-10-zk-reviews/904-impl-round1.md` — verified byte-identical to
what I wrote (sha256 `0928d7d1…` both sides).

| | |
|---|---|
| bun | `1.3.11` (af24e281) |
| OS | `Darwin 24.6.0` (arm64) |
| repo state | pinned repo read-only, `git status --porcelain` empty before and after; all writes/mutations in `/tmp/zk904` |
| suite (scratch copy at `e7ec815e`) | `bun test packages/lythoskill-deck/` → **273 pass / 0 fail / 731 expect / 273 tests / 17 files** (card quotes `272 pass / 1 skip / 724 expect / 273 tests / 17 files` — totals, files and 0-fail match; the `1 skip` is the environment-dependent `describeGit` in `cold-pool-health.test.ts:118`, same skew as round 1). `toml-splice.test.ts` alone: **18 pass** (was 13) |

**Answer up front: not converged. 4 HIGH outstanding, of which 2 are round-1 HIGHs the fix did not
actually close.** Do not ship as-is; the remaining delta is small and itemised at the end.

---

## Q1 — Mutation matrix at `e7ec815e`

Driver `/tmp/zk904/mutate2.py` + a follow-up pass (`/tmp/zk904/probe*.ts`), baseline **18 pass / 0 fail**.

| mutation | expected | actual |
|---|---|---|
| R1(a) `cut()` slices a Buffer (byte offsets) | red | **red** (2: the non-ASCII pair) |
| R1(b1) rule-② container never cascades | red | **red** (1) |
| R1(b2) rule-③ container never cascades | red | **red** (1) |
| R1(d) legacy-array branch dropped from `skillsShape` | red | **red** (3) |
| R1(e) `lineEndingRun` eats 1 sequence | red | **red** (2) |
| R1(f) array element matched by full text | red | **red** (2) |
| R1(g) `cut()` eats no line endings | red | **red** (4) |
| R1(h) insert before the last same-prefix table | red | **red** (2 — now also trips the new CRLF test) |
| **R1(c1) H3 revert — eol read at offset 0 (lastTable path)** | **red** | **red** (1: `H3: insert into a CRLF file …`) |
| **R1(c2) H3 revert — eol read at offset 0 (EOF path)** | red | **GREEN — 18 pass / 0 fail** ⚠️ |
| NEW(l) inserted block keeps LF inside a CRLF file | red | **red** (1) |
| NEW(l-b) block separator hardcoded CRLF (into an LF file) | red | **red** (3) |
| NEW(i) inline-map branch dropped from `skillsShape` | red | **red** (2, exactly the two H1 tests) |
| NEW(j) map rule: container never cascades | red | **red** (1) |
| NEW(o) map rule: no section cascade (delete the map only) | red | **red** (1) |
| NEW(k) H2 revert — table lookup by raw key text | red | **red** (1) |
| **NEW(m/r) empty-map addition: always emit a `,` prefix** | red | **GREEN — 18 pass / 0 fail** ⚠️ |
| DIAG add rule-②'s section cascade (the H4 fix that is *not* in the code) | — | **GREEN — 18 pass / 0 fail** (nothing observes it either way) |

**Did every previously-green mutation go red?** The single green mutation of round 1 (c) is now
**red** — teeth confirmed, matching your own re-run. Every other round-1 mutation stayed red.

**Did the fixes introduce a newly-green mutation?** **Yes, two.**

1. **(c2)** — the *same* H3 bug on the *other* insertion path. `lineEndingAt(src, at)` was fixed;
   the EOF path still calls `lineEndingAt(src, Math.max(0, trimmed.length - 1))` (`toml-splice.ts:318`),
   which points at the **last content character**, not the line ending. Reverting it to offset 0
   changes nothing observable to the suite — because there is no CRLF test on that path. And the
   bug is real, not merely unpinned (see R2-H2).
2. **(m/r)** — the new empty-map branch `${isEmpty ? '' : ', '}`. No test covers an empty inline
   map. This is a *test* gap, not a bug: the shipped code is correct (measured:
   `skills = {}` + insert → `skills = {beta = { path = "Q" }}`, reparse-OK), but the mutation's
   output `skills = {, beta = …}` is **invalid TOML** (`Unexpected token`), so the branch is guarding
   the exact corrupt-deck class and nothing pins it.

Plus the diagnostic: **adding** rule ②'s missing section cascade reddens nothing, i.e. the suite is
blind to that behaviour in both directions — consistent with it being absent from the code (§Q3, R2-H1).

---

## Q2 — Is the reader-accepted / writer-refused set closed?

**No. There is a fifth shape, and I would bet on it:**

> **Dotted keys.** Any of these declare the same skill the reader already reads:
> ```toml
> tool.skills.alpha.path = "P"          # top level
> [tool]
> skills.alpha.path = "P"               # inside the section table  ← the one I'd bet on
> [tool]
> skills.alpha = { path = "P" }
> [tool.skills]
> alpha.path = "P"                      # inside the skills table
> [tool]
> skills = { alpha.path = "P" }         # inside the inline map (the branch just added)
> ```

Measured with `parseDeck` (the CLI's reader) and `spliceRemoveSkill` / `spliceInsertSkill`
(`/tmp/zk904/probe5.ts`, `probe6.ts`, `probe7.ts`):

| shape | reader (`parseDeck`) | writer remove | writer insert | old object layer on remove |
|---|---|---|---|---|
| `[tool.skills.alpha]` | reads | removes | reparse-OK | OK |
| `[tool.skills]` + `alpha = {…}` | reads | removes | reparse-OK | OK |
| `[tool]` + `skills = [...]` | reads | not-found (`unrepresentable` on insert — by design) | refuses | OK |
| `[tool]` + `skills = {…}` | reads | removes | reparse-OK (H1 fixed ✓) | OK |
| **top-level dotted key** | **reads** | **not-found** | reparse-OK | **OK (would have removed)** |
| **`[tool]` + `skills.alpha.path`** | **reads** | **not-found** | reparse-OK | **OK** |
| **`[tool]` + `skills.alpha = {…}`** | **reads** | **not-found** | reparse-OK | **OK** |
| **`[tool.skills]` + `alpha.path`** | **reads** | **not-found** | reparse-OK | **OK** |
| **`[tool]` + `skills = { alpha.path }`** | **reads** | **not-found** | reparse-OK | **OK** |
| `[tool."skills".alpha]` (quoted segments) | reads | removes ✓ (R2 fix) | reparse-OK | OK |
| `[tool.skills.alpha]` + `"path" = "P"` | reads | removes ✓ | reparse-OK | OK |
| `[[tool.skills]]` (array-of-tables) | ignores | — | — | — |

Through the shipped CLI, on a dotted-key deck (`/tmp/zk904/e2e/dotted`):

```
$ bun …/cli.ts validate ./skill-deck.toml      # [tool] + skills.alpha.path = "github.com/a/b/alpha"
✅ Validation passed: 1 skill(s), max_cards = 10 …
$ bun …/cli.ts remove alpha --deck ./skill-deck.toml --workdir .
❌ Cannot remove "alpha" from skill-deck.toml
   why:  no tool.skills.alpha in the file: looked for [tool.skills.alpha] (table), …
   fix:  the file was NOT modified …
rc=1 ; sha256 unchanged
```

So it is a loud failure, not corruption — the same class H2 was, and the same rule (总则
「写入器的语法 = 读取器的语法」) is still not satisfied. It is also a **regression** against
`ddddcb16^`: the old object layer removed all four (verified by replaying
`delete deck.tool.skills.alpha` → `OK, keys now []`).

**Why I believe the set is otherwise closed** (rather than just "I stopped looking"):
`parseDeck` only ever produces an entry from `deck[section].skills[alias].path`, and in a TOML
document that binding can only be created by (i) a `[….skills.alias]` table header, (ii) a
`skills = { … }` value, (iii) a `skills = [ … ]` array, or (iv) a **dotted key**. (i)–(iii) are the
three rules in the spec plus the map the fix added; (iv) is the hole. I also checked the near-misses
and they are correctly out of scope: `[[tool.skills]]` and `skills = [ { path = … } ]` are *ignored*
by `parseDeck` (non-strings are skipped), so they are not reader-accepted shapes.

**Insert on the dotted shapes does not corrupt** (good news): measured output for
`[tool]` + `skills.alpha.path = "P"` is `…skills.alpha.path = "P"\n\n[tool.skills.beta]\npath = "Q"`,
both parsers accept it, and `parseDeck` afterwards returns `["alpha=P","beta=Q"]`. So the fix's
corruption class does not extend to dotted keys — only `remove` is blocked.

---

## Q3 — Convergence

**Fewer than 2 HIGH outstanding? No — 4.** Two of them are round-1 HIGHs that the fix did not
close; two are residuals of the same two families.

| # | finding | tier | impact | status |
|---|---|---|---|---|
| **R2-H1** | **H4 not closed**: rule ② (`[tool.skills]` table) still leaves an empty `[tool]` header — the fix covered rule ④ (map) and rule ③ (array), which are not the shape round-1's evidence used | HIGH (spec row not implemented) | cosmetic: a stray empty table header survives where the object layer deleted it | **open** |
| **R2-H2** | **H3 not closed on the EOF insertion path**: `lineEndingAt(src, Math.max(0, trimmed.length - 1))` reads the last content char → LF separator + LF block into a CRLF deck | HIGH (spec row not implemented / wrong bytes) | mixed line endings; the ADR itself says no CRLF deck exists in-repo | **open**, one-character fix |
| **R2-H3** | **Fifth shape — dotted keys** (5 placements): reader reads, writer `not-found` on remove; CLI-verified `validate` ✅ → `remove` exit 1 | HIGH (总则 row not implemented; user blocked) | user cannot remove a skill from a dotted-key deck | **open** |
| **R2-H4** | **Residual of H1 — a scalar `skills` value**: `[tool]` + `skills = "oops"` → `deck add` appends `[tool.skills.beta]` beside it → file no longer parses | HIGH (silent data loss) | the pre-state **validates and links**; after `deck add`, `parseDeck` goes `["keep"] → []`, i.e. another section's declared skill disappears | **open** |
| R2-L1 | the new empty-map branch has no test (its failure mode is invalid TOML) | LOW | none today (shipped code measured correct) | new |
| R2-L2 | the ADR's normative table still names **three** locate rules; the map (code rule ④) is not in it, and dotted keys are not named at all — the SSOT under-describes the writer | LOW | next agent reading the table sees less than the code does | new |
| R2-L3..L8 | round-1 LOWs still open: interior-comment case untested (L1); multi-line array whitespace drift (L2); `skills = [ ]` insert artifact (L3); legacy-append unreachable for `github.com` (L5); ADR Impact still requires the withdrawn mtime test (L7); `basename` vs `parseDeck` alias divergence (L8) | LOW | as before | unchanged |

**LOWs that round 2 closed:** L4 (the `📝 Auto-migrated …` lie) is **fixed** — the loop is gone and
the message no longer prints (measured: the legacy-add stub now prints only
`❌ Cannot add "beta" …`); L6 (the dead `(tail ? … : …)` ternary) is gone with the rewritten
EOF path.

### Per-HIGH detail

**R2-H1 — H4 is not closed.** `locate()` rule ② (`toml-splice.ts:124-130`) returns
`container: isOnlyEntry ? skillsTable : undefined` — the `[<section>.skills]` table is removed but
the section node is never re-checked. Re-running round-1's exact probe at `e7ec815e`:

```
$ bun /tmp/zk904/probe3.ts                       # input: [deck] … / [tool] / [tool.skills] alpha = { path = "…" }
--- new writer ---   "[deck]\nmax_cards = 10\n\n[tool]\n\n"     ← empty [tool] header survives
--- old object layer (ddddcb16^) ---   "[deck]\nmax_cards = 10\n"  ← section deleted
```
Byte-identical to the round-1 output at `c4e75ec7`. The map rule ④ *did* get the cascade
(`container: isOnlyEntry ? (sectionEmpties ? sectionTable0(…) : map) : undefined`, `:142`) and the
array rule ③ already had it, so "both single-cut shapes" in the commit message is accurate for the
shapes that were fixed — it just does not include the shape round-1's evidence came from (the
`[tool.skills]` table, which the code labels rule ②). **The closing clause of that message — "so no
empty `[tool]` header survives" — is refuted as written**: it does survive, on the `[tool.skills]`
shape, which is the one my round-1 log measured. The diagnostic mutation confirms the suite cannot
see the difference either way.

**R2-H2 — the EOF path.** `:316-319`:
```ts
const trimmed = src.replace(/[\r\n]+$/, '')
const tail = src.slice(trimmed.length)
const eol = lineEndingAt(src, Math.max(0, trimmed.length - 1))   // ← last content char, not the eol
```
Through the stubbed CLI `add` on a CRLF deck whose tool section has no prefixed table (a shape
`add.ts` reaches whenever the section is `absent`):
```
📝 Added "beta" to [tool.skills] in …/skill-deck.toml
"[deck]\r\n…[combo.weekly]\r\nprompt = \"k\"\n\n[tool.skills.beta]\npath = \"gitlab.com/a/b/beta\"\r\n"
mixed/plain LF present inside a CRLF file: true
```
The insertion point for this path is `trimmed.length` (where the `\r` of `\r\n` starts) — the `-1`
is what makes it wrong. Reverting this line to offset 0 is mutation (c2), which the suite does not
catch.

**R2-H4 — the scalar.** Reproduced at the CLI's own bar, which is what makes it more than
"garbage in":
```
$ bun …/cli.ts validate ./skill-deck.toml     # [tool] skills = "oops"  +  [innate.skills.keep]
✅ Validation passed: 1 skill(s), max_cards = 10 …
$ bun …/cli.ts link --deck ./skill-deck.toml --workdir .
✅ Sync complete: 0 skill(s) linked (max_cards: 10)
# then a stubbed `deck add`:
inserted; reader before: ["keep"]  ->  after: []
```
The written file is rejected by both parsers (`Defining a key multiple times is invalid`). Round 1
mentioned this in one parenthetical inside H1 ("`skills = "oops"` (a scalar) behaves the same"); the
fix covers the map shape and not this one, so it is promoted to its own finding with the new
severity evidence.

### Would I let this ship?

**No — not at this commit.** The bar the coordinator set ("fewer than 2 HIGH outstanding") is not
met, and R2-H4 is the same *silent data-loss on a deck the toolchain just blessed* class that made
H1 the serious one. That said, the remaining delta is small and mostly mechanical:

1. R2-H4 + R2-H3 are one structural change, not two more branches: **before writing, re-parse the
   spliced text and refuse to write if it does not parse.** That converts every unknown shape —
   present and future — from "corrupt the deck" into "error, file untouched", which is the ADR's own
   「失败即不写」 applied to the output instead of the input. (Suggestion, not a requirement; a
   `shape: 'unknown' → not-found` branch for `insert` would do the same job more narrowly.)
2. R2-H3 needs a `skillsShape`/`locate` branch that tolerates dotted key segments at each of the
   four placements, plus a test per placement — or, if dotted keys are declared out of scope, a spec
   row that says so (they are legal TOML, `validate` accepts them, and the pre-`ddddcb16` code
   handled them).
3. R2-H1 is a 3-line copy of the map rule's cascade into rule ②, plus one probe3-shaped test.
4. R2-H2 is `trimmed.length` instead of `trimmed.length - 1`, plus a CRLF test on the EOF path.
5. Two one-liners: L1 (empty-map test), L2 (put rule ④ and the dotted-key decision into the ADR
   table, which is the SSOT the next agent reads).

If exactly one item must block: **R2-H4** (silent, and reachable from a deck that validates today),
with **R2-H3** second (a whole class of legal decks whose skills cannot be removed).

---

## What I could not check, and why

- **Real CRLF decks** — none exist in this repo (the ADR says so); every CRLF result above is a
  synthesized fixture.
- **A real network clone through `deck add`** — the write path is exercised with the `AddSkillIO`
  seam stubbed (`fetchPlan`/`probe` injected), which covers everything after the clone; the
  pre-clone half is untouched by these commits.
- **Whether dotted keys appear in any real deck** — I searched this repo (`grep -rn 'skills\.' --include='*.toml'`)
  and found no deck using any dotted-key placement, so R2-H3 has no in-repo user today; the argument
  for it is the 总则, not an observed user.
- **The ADR was not updated by `e7ec815e`** (commit stat touches only `add.ts`, the two
  `toml-splice.*` files and the showcase log) — I verified the table is unchanged by reading; I did
  not attempt to judge whether the coordinator considers a doc follow-up part of the card.
- **`f94fd8e6` (the TDZ card)** — read, accurate, credits the review, credibly marked out of scope;
  I did not re-verify the crash beyond the round-1 measurement.
- **The round-1 test-count skew** (`1 skip` in your environment, `0 skip` in mine) — same
  `describeGit` explanation as round 1; the totals agree (273), so I did not chase it further.
