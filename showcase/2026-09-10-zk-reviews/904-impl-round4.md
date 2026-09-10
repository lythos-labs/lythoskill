# ZK review round 4 — ADR-20260910152957509 implementation

**Object**: `06e77d29` (HEAD). Repo pinned, read-only, `git status --porcelain` empty before and
after; all writes/mutations in `/tmp/zk904`. Round-3 log verified byte-identical in
`showcase/2026-09-10-zk-reviews/904-impl-round3.md`.

| | |
|---|---|
| bun | `1.3.11` (af24e281) · `Darwin 24.6.0` (arm64) |
| suite | **280 pass / 0 fail / 752 expect / 280 tests / 17 files**; `toml-splice.test.ts` alone **25 pass** (was 24) |

**Answer up front: R3-H1 is genuinely fixed and pinned (I reproduced your mutation). But the three
round-3 LOW fixes do not hold up: two do not change the behaviour they claim to change, and none of
the three has a test that distinguishes fixed from unfixed. One new HIGH came out of it (R4-H1, the
same family, sibling fields in an inline map: `deck remove` refuses and misdiagnoses).** 1 HIGH, and
I would hold the ship on it — it is a small, already-validated fix.

---

## 1. Mutation matrix at `06e77d29`

Driver `/tmp/zk904/mutate4.py`. Baseline **25 pass / 0 fail**. 20 defect mutations, 5 fix mutations.

**Every defect mutation is red — nothing that should be red is green.** The carried-over set all
still redden (R1(a) byte offsets, (b2) rule-③ cascade, (c1) H3 lastTable, (d) legacy branch, (e)
lineEndingRun, (f) basename matching, (g) cut line endings, (h) insert placement, R2(j) map cascade,
(k) raw key text, (m) empty-map comma, R3(b1) rule-② cascade, (i) inline-map branch, (n) guard,
(o) rule ⑤).

**R3-H1's fix is real and pinned** — the mutation you ran, re-run here:

| mutation | expected | actual |
|---|---|---|
| R4(a) un-collapse nested hits (`const outer = hits` instead of the filter) | red | **red** (1: `ZK-impl round-3 … an inline-map entry with inner fields does not eat the following comment`) |

And the behaviour, on all my round-3 repros, is now correct — every tail survives:

```
[tool] + skills.alpha = {…} + a section      → [combo.weekly] preserved, [tool] cascaded away
[tool] + skills.alpha = {…} + more keys      → role = "tool-role" preserved
[tool] + skills.alpha = {…} + later table    → [tool.skills.beta] preserved (was: refused)
[tool] + skills.alpha = {…} + second entry   → skills.beta = { path = "b" } intact (was: `a = { path = "b" }`)
top-level dotted + inline table + tail       → [combo.weekly] preserved (was: refused)
```

**The four green rows are all *fix* mutations — that is the finding for this round:**

| mutation | expected | actual |
|---|---|---|
| R4(b) delete the map-residue line (`const start = mapOwner …` → `const start = extend`) | red | **GREEN** — the line is live for no shape I can construct (§2.1) |
| R4(c) EOF eol reverted to the round-3 whole-file scan | red | **GREEN** — no test sees the difference (§2.2) |
| R4(d) EOF eol replaced by the insertion-point criterion | — | **GREEN** — the three criteria are indistinguishable to the suite |
| R4(e) `isAdjacent` always true (drop the gate) | red | **GREEN** — the gate is untested (§2.3) |

So: **the round-3 LOW fixes landed without tests that discriminate**, and for two of them that is
because the behaviour did not change.

---

## 2. Your three LOW fixes, one verdict each

### 2.1 `skills = {  }` residue — **refuted, and the fix is dead code**

```
in : "[deck]\nmax_cards = 10\n\n[tool]\nskills = { alpha.path = \"github.com/a/b/alpha\" }\n"
out: "[deck]\nmax_cards = 10\n\n[tool]\nskills = {  }\n"          [reparse-OK, reader sees no skills]
```
(and the same with a later section: `…[tool]\nskills = {  }\n\n[combo.weekly]\nprompt = "k"\n`)

Why the new line cannot fire: `mapOwner`/`start` sit inside `if (clearsOwner)`, and `clearsOwner`
requires `outer.every(h => ownerBody.includes(h))` — the hits here are the **map's inner fields**,
which are never direct children of the section table, so `clearsOwner` is false and the group
fallback (`{ node: outer[0], group: outer }`) runs instead. I could not construct any shape where
`mapOwner` is non-null **and** `clearsOwner` is true; the mutation that deletes the line (R4(b))
leaves the suite green, consistent with that. The emptied-map case needs the cascade on the **group**
path, not on the `clearsOwner` path.

### 2.2 EOF line ending — **refuted; the new criterion is wrong in both directions**

The fix reads "the last newline before the insertion point", which is not the insertion point:

```
LF file,   CRLF inside a multi-line string → "[deck]\nmax_cards = 10\nnote = \"\"\"line1\r\nline2\"\"\"\r\n\r\n[tool.skills.beta]\r\npath = \"b\"\n"
                                              → CRLF separators spliced into an LF file  (mixed)
CRLF file, LF inside a multi-line string   → "[deck]\r\nmax_cards = 10\r\nnote = \"\"\"a\nb\"\"\"\n\n[tool.skills.beta]\npath = \"b\"\r\n"
                                              → LF separators spliced into a CRLF file  (mixed)
plain LF file / plain CRLF file / CRLF without trailing newline → all correct
```
The criterion that matches the spec's wording ("从**插入点**相邻字节判定") and the `lastTable` path's
`lineEndingAt(src, at)` is `lineEndingAt(src, trimmed.length)` — mutation R4(d) substitutes exactly
that and **no test goes red**, so the suite cannot tell the three criteria apart either.

### 2.3 the `isAdjacent` gate — you asked me to say whether this is a resolution or a rationalisation

**It is a resolution, with one correction to the reasoning.** You turned it into a spec row
("级联的相邻判据" — merge only when nothing but whitespace separates the two nodes), so code and spec
now agree, and that is the thing I actually objected to in round 3. I withdraw "two criteria for one
rule".

The correction: "merging a range across a comment would eat the comment" is true of the
**single-merged-range** implementation you chose, but not of the rule itself. Cutting the two nodes
as two separate ranges keeps the comment and still removes the header — measured:

```
in : "[deck]\nmax_cards = 10\n\n[tool]\n# note about the tool section\n[tool.skills]\nalpha = { path = "a" }\n"
you: "[deck]\nmax_cards = 10\n\n[tool]\n# note about the tool section\n"      ← empty header kept
two separate cuts: "[deck]\nmax_cards = 10\n\n# note about the tool section\n"  ← header gone, comment kept, valid
old object layer:  "[deck]\nmax_cards = 10\n"
```

So the gate is a **choice** (protecting the comment's local context reads as the more conservative,
comment-preserving option, and it is consistent with the 注释 row), not a forced consequence — worth
saying in the spec row so the next agent does not "simplify" it away. Which is exactly why it wants
a test: **R4(e) shows that deleting the gate changes nothing in the suite.** If someone removes the
gate later, the comment gets eaten silently and no test notices.

### 2.4 New HIGH found while checking the above — **R4-H1: rule ⑤ cannot remove a dotted field from a map with siblings**

`skills = { alpha.path = "…", beta.path = "…" }` is reader-accepted (two entries) — and it is a shape
my own round-2/3 tables never exercised, because every map fixture I used had exactly one field. That
was my gap, not yours; the bug is nonetheless live:

| shape (all reader-accepted) | `deck remove` |
|---|---|
| `skills = { alpha.path = "P" }`, remove alpha | `skills = {  }` — silent residue (2.1) |
| `skills = { alpha.path = "P", alpha.role = "R" }`, remove alpha | **REFUSED `would-corrupt`** |
| `skills = { alpha.path = "P", beta.path = "Q" }`, remove alpha (first) | **REFUSED `would-corrupt`** |
| `skills = { alpha.path = "P", beta.path = "Q" }`, remove beta (last) | `skills = { alpha.path = "P",  }` — dangling comma, silent |
| `skills = { alpha.path = "P", beta.path = "Q", gamma.path = "R" }`, remove beta (middle) | **REFUSED `would-corrupt`** |
| `skills = { alpha = { path = "P" }, beta = { path = "Q" } }` (inline values) | works — rule ④ is comma-aware |

Through the shipped CLI, on a deck `validate` accepts:

```
$ bun …/cli.ts validate ./skill-deck.toml
✅ Validation passed: 2 skill(s), max_cards = 10 …
$ bun …/cli.ts remove alpha --deck ./skill-deck.toml --workdir .
❌ Cannot remove "alpha" from skill-deck.toml
   why:  the spliced result would not parse (Unexpected token) — refusing to write.
         This deck uses a shape this writer does not model; the file is byte-identical to before.
   rc=1, sha256 unchanged
```

Root cause: `hit.group` cuts each hit's range with `lineEndingRun` — the adjacent-comma handling that
rules ③/④ have (`arrayElem`) is missing on the group path, so removing a field leaves `{ , … }` /
`{ … , }`. The message also misdiagnoses: the writer **did** model the shape (it located the entry),
it just mis-cut it, so "a shape this writer does not model" sends the reader the wrong way.

Fix direction, validated the same way as last round: cutting a following `,` + inline whitespace (and
a preceding one when the field is last) makes all six shapes produce clean output — and **the suite
stays 25 pass / 0 fail**, i.e. this shape is untested too. First-field, middle, and last-field all
need a test; `{  }` needs the 2.1 cascade on the group path.

---

## 3. The open LOW list, enumerated (your ask)

**Verified open at `06e77d29`, one line each:**

1. **L1 (r1)** — the spec's "comments *inside* a removed node's range go with the node" has no test;
   behaviour conforms (measured) but a fixture with a comment between two key-values of the removed
   block does not exist, so a future `cut()` change could break it silently.
2. **L2 (r1)** — multi-line legacy arrays drift when an element is removed:
   `skills = [\n  "a",\n  "b",\n]` minus `a` → `[\n    "b",\n]` (the comma's following newline is also
   consumed, so the survivor's indentation shifts); single-line forms are byte-exact.
3. **L3 (r1)** — inserting into an empty array moves whitespace: `skills = [ ]` → `skills = ["path" ]`
   (valid TOML, unspecified shape).
4. **L5 (r1)** — the legacy-array "representable → append a string element" branch is unreachable for
   `github.com` locators (`entry.source` is always set), so every `deck add` on a legacy deck ends in
   the `migrate-schema` error; the test pins a path the CLI can take only for another host (measured
   with `gitlab.com`). *Recommendation: record this as intended in the ADR rather than "fix" it.*
5. **L7 (r1)** — the ADR still requires the withdrawn test: Impact `:169` says "③无变化时不写文件
   (mtime 不变)" while the §规格 table (`:112`) explicitly de-commissions it.
6. **L8 (r1)** — `basename()` (splice) and `parseDeck`'s alias rule diverge for trailing-slash array
   entries (`"github.com/a/b/beta/"` → parseDeck alias = the whole string, splice = `beta`);
   unreachable via CLI because `validateAlias` rejects `/`.
7. **R3-L1 / R4-L1 (new)** — the emptied inline map survives as `skills = {  }` on rule ⑤'s path; the
   shipped fix for it is dead code (§2.1).
8. **R3-L2 / R4-L2 (new)** — the EOF line-ending criterion is not the insertion point and misreads a
   multi-line string in both directions (§2.2); untested on the discriminating input.
9. **R4-L3 (new)** — the ADR's §规格 table has one malformed row: line 125 carries 5 pipes where every
   other row has 3, because the new "级联的相邻判据" row and the "插入(`skills = {…}` 内联表 section)"
   row were glued together with `<br>|`. Rendered, the 插入内联表 row is no longer a row — in the table
   the ADR calls 唯一规格.
10. **R4-L4 (new)** — the `isAdjacent` gate has no test (R4(e) green); and the two-cut alternative
    exists, so the spec row's justification should say "we chose one merged range" (§2.3).

**Closed since round 1 (for the record, so the list does not inherit):** r1-L4 (the false
`📝 Auto-migrated …` message — gone), r1-L6 (dead ternary — gone), r2-L1 (empty-map branch — tested),
r2-L2 (ADR named three rules — now five + guard + map row), r3-L3 (the adjacency gate — now a spec row).

---

## 4. Would I ship this?

**1 HIGH outstanding, and no — I would hold the ship on R4-H1.** It is the same class as the two
already-accepted HIGHs (a user blocked on a shape the reader accepts, `validate` green, error message
pointing the wrong way), it is CLI-reproducible, and the fix direction is validated and cheap
(comma-aware group cut + the group-path cascade + three tests). Everything else in this round is a
recorded LOW, and I would ship with those recorded deliberately.

Two things I want on the record about *how* this round went, since they are about the process rather
than the code:

- The two refuted fixes were both "fix the instance, not the class" — exactly the pattern the result
  guard was adopted to avoid. The guard protects the *output file*; it says nothing about whether the
  bytes removed are the right bytes, so a mis-cut that still parses (R3-H1) and a mis-cut that fails
  to parse (R4-H1) both slip past it. Each of these wants a shape-level test, not a stronger net.
- My own round-2/3 shape tables were coarser than the bugs: every map fixture I used had a single
  field, so "the shape set is closed" was true of *families* and false of *shapes within* rule ⑤'s
  family. The corrected statement: the family set is closed (table / map / array / dotted key, plus
  quoted segments); the enumerations inside the dotted-key family are not — sibling fields, and
  map-emptied cascades, are where the remaining faults live.

---

## What I could not check, and why

- **Real decks using any of these shapes** — none in this repo (`grep` over every `*.toml` finds no
  dotted-key placement at all), so R4-H1's frequency in the wild is unknown; my claim is about legal,
  reader-accepted input, not about observed users.
- **A real network clone through `deck add`** — write path exercised with the `AddSkillIO` seam
  stubbed; the pre-clone half is untouched by this commit.
- **How the malformed ADR row renders in the project's own tooling** (site/VitePress) — I verified the
  pipe count and the cell structure, not the rendered output.
