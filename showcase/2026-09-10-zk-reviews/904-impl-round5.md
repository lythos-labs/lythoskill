# ZK review round 5 — ADR-20260910152957509 implementation

**Object**: `6f67c212` (HEAD). Repo pinned, read-only, `git status --porcelain` empty before and
after; all writes/mutations in `/tmp/zk904`.

| | |
|---|---|
| bun | `1.3.11` (af24e281) · `Darwin 24.6.0` (arm64) |
| suite | **285 pass / 0 fail / 765 expect / 285 tests / 17 files**; `toml-splice.test.ts` alone **30 pass** (was 25) |

**Answer up front: R4-H1's headline shapes are closed and every mutation you named is now red. One
level inside, 5 of 15 inline-map shapes still refuse and 2 more leave a residue — the ADR's rule ⑤
now says each group entry is cut with an adjacent comma, and for the multi-field / long / mixed-map
cases the code does not do that. So: 1 HIGH, and no, I would not ship yet — the closing delta is
~10 lines and I validated it (§3).**

---

## 1. The matrix at `6f67c212` (Q1)

Driver `/tmp/zk904/mutate5.py`. Baseline **30 pass / 0 fail**. 21 defect mutations + 3 diagnostics.

**Nothing is green that should be red — and all four round-4 fix mutations are now red**, which was
the thing I most wanted to see:

| round-4 green mutation | round-5 status |
|---|---|
| R4(e) drop the `isAdjacent` gate | **red** — `the adjacency gate is pinned: a comment … must survive` |
| R4(c) EOF eol back to the round-3 last-newline scan | **red** — `the EOF path uses the insertion point, not a scan` |
| R4(d) EOF eol to offset 0 | **red** — `R2-H2: the EOF insert path also uses the file's own line ending` |
| R4(b) the (dead) map-residue line | **red** via its replacement — `R5(b) map-emptied cascade removed` → `R4-H1c` goes red |

Your round-5 surfaces, verified independently:

| mutation | expected | actual |
|---|---|---|
| R5(a) comma handling in the group cut disabled | red | **red** (2: `R4-H1`, `R4-H1b`) — matches your count |
| R5(b) map-emptied cascade removed | red | **red** (1: `R4-H1c`) |
| R5(c) adjacency gate dropped | red | **red** (1) |
| R5(d)/(e) EOF eol reverted (either earlier version) | red | **red** (1 each, by different tests) |

All 17 carried-over defect mutations are red as well (byte offsets, `lineEndingRun`, cut line
endings, legacy branch, inline-map branch, insert placement, all four cascades, basename matching,
raw-key lookup, empty-map comma, the guard, rule ⑤, un-collapsed hits).

And the two round-3 LOWs you rebuilt are genuinely fixed, measured on the discriminating input:

```
EOF eol — LF file with CRLF inside a multi-line string:
  in : '[deck]\nmax_cards = 10\nnote = """line1\r\nline2"""\n'
  out: '[deck]\nmax_cards = 10\nnote = """line1\r\nline2"""\n\n[tool.skills.beta]\npath = "b"\n'   ← LF separators, nothing introduced
CRLF file with LF inside a multi-line string:
  out: '…b"""\r\n\r\n[tool.skills.beta]\r\npath = "b"\r\n'                                        ← CRLF separators
map emptied (placement 5): '[deck]\nmax_cards = 10\n\n'  ← whole section cascades, no `{  }` residue
```

So the round-4 method criticism landed where it should: the three unverified fixes are now verified,
and the one that was dead code is gone.

---

## 2. Is R4-H1 closed? (Q2) — one level inside it, no

**What is fixed (I verified each):** a dotted map with two or three single-field entries — removing
the first, the middle or the last now produces clean text with no dangling comma; a map whose entries
are inline values; a mixed map's *outer* entries; and emptying a map takes the `skills` key and then
the section header.

**What is not (15 shapes probed, `/tmp/zk904/probe16.ts`): 5 REFUSED, 2 residue, 8 clean.**

| shape (all reader-accepted — `validate` passes, `parseDeck` returns the alias) | `deck remove` | cause |
|---|---|---|
| `skills = { alpha.path = "P", alpha.role = "R" }` · remove alpha | **REFUSED** | A |
| `skills = { alpha.path = "P", alpha.role = "R", alpha.why = "W" }` · remove alpha | **REFUSED** | A |
| `skills = { alpha.path = "P", alpha.meta = { x = 1 } }` · remove alpha | **REFUSED** | A |
| `skills = { a = { path = "A" }, b.path = "B", c = { path = "C" } }` · remove **b** (middle) | **REFUSED** | B |
| `skills = { alpha.path = "<430 chars>", beta.path = "Q", gamma.path = "R" }` · remove **beta** | **REFUSED** | B |
| `… "<430 chars>", beta.path = "Q" }` · remove beta (the last field) | ok, leaves `{ …,  }` | B |
| `… "<430 chars>", beta.path, gamma.path }` · remove gamma (the last field) | ok, leaves `{ …,  }` | B |
| the other 8 shapes (single-field entries, first/last/middle of plain dotted maps, mixed maps' outer entries, inline-value entries, the table form) | ok | — |

Through the CLI, on the first row (a deck `validate` accepts):

```
$ bun …/cli.ts validate ./skill-deck.toml
✅ Validation passed: 1 skill(s), max_cards = 10 …
$ bun …/cli.ts remove alpha --deck ./skill-deck.toml --workdir .
❌ Cannot remove "alpha" from skill-deck.toml
   why:  the spliced result would not parse (Unexpected token) — refusing to write.
         This deck uses a shape this writer does not model; the file is byte-identical to before.
   rc=1, sha256 unchanged
```

**Cause A — one entry's several fields are cut as overlapping ranges.** The group for
`alpha.path` + `alpha.role` is two hits; each `cutOne` takes *the same* comma as its neighbour (the
first takes it as its *following* comma, the second as its *preceding* one), and both ranges are then
applied to the original indices. Overlapping ranges + shifting string = the same offset arithmetic
that R3-H1 was about. The table placement of the same entry works only because each field is on its
own line, so the per-line ranges happen not to overlap (`probe16` control case).

**Cause B — `inInline` is a 400-character textual heuristic, and it misfires.** It asks "is there an
unmatched `{` in the 400 chars before this node". It returns false (a) whenever a `}` intervenes
between the map's `{` and the field — i.e. any map that contains an inline-table *value* before the
target — and (b) whenever the map's `{` is more than 400 chars before the field (a long path, or
many entries). Both misfires are measured above, and the consequence is either a refusal (middle
field) or a dangling comma (last field). The AST already answers this question — `walkKv` reaches
inline-table bodies through `walkKv(inner, path, cb)`, so "this hit is inside an inline table" is a
property of how it was reached, not a guess about the preceding 400 characters. The ADR's own
Decision Driver 3 is 「判据不能是启发式」, which this line contradicts.

These two causes also mean the ADR's rule ⑤ sentence — "**组内每个条目都要像数组元素一样连一个相邻
逗号一起剪**" — is **not implemented** for the inline placement, which is why I am calling this HIGH
rather than recording it: it is a spec row the code does not satisfy, and the user is blocked.

---

## 3. Would I ship this? (Q3)

**No — one more small round.** Not because the remaining shapes are common (no deck in this repo uses
dotted keys at all), but because the mechanism that keeps producing them is still in place: a
heuristic standing in for a structural fact, and per-hit cuts standing in for "the entry goes as one
unit". This family has produced a HIGH in three consecutive rounds; replacing the mechanism ends it,
where extending the enumeration only moves it.

**The closing delta, validated — not proposed.** I patched two things in the scratch copy and re-ran
everything:

1. `inInline` → the structural signal (the hit was reached through an inline-table body);
2. merge the group's ranges into one interval per entry **before** cutting.

Result: **all 15 `probe16` shapes and all 7 `probe15` shapes pass** — refusals 5 → 0, residues →
clean text (e.g. `skills = { alpha.path = "P", alpha.role = "R" }` minus alpha → `"[deck]\nmax_cards = 10\n\n"`,
and the 430-char last-field cases lose the dangling comma). **And the suite stays 30 pass / 0 fail**,
which tells you the tests for these shapes still have to be written.

One caveat on my patch, so you do not take it verbatim: merging globally is slightly too broad — it
also merges the *table*-form group across lines and shifts that output's blank lines (measured:
`[tool]\n\n\nskills.beta.path = "Q"` where the pristine code gives `[tool]\nskills.beta.path = "Q"`).
Merge only within an inline table; leave the per-line table path alone, since it works.

If you would rather ship and record, that is a defensible call — but then the rule ⑤ row has to name
the shapes it does **not** support, because as written it claims them, and the error message
("a shape this writer does not model") sends the reader looking in the wrong place: the writer *does*
model it, it located the entry and then mis-cut it. That misdiagnosis is the same one I flagged in
round 4 and it is still there.

---

## 4. The recorded LOW list — one decision I would reopen, one I would correct

I checked all six entries against the code and the ADR; five of the six decisions I agree with
(accepted drift or intended behaviour, all cosmetic or unreachable). Two things:

- **① the interior-comment case — I would reopen this one.** It is the only recorded item whose
  failure mode is *silent deletion of a user's comment*, which is the exact class this ADR exists to
  abolish; the ADR's 注释 row specifies the behaviour ("节点范围之内的注释随节点一起走"); and it is one
  fixture plus one written-out expectation to pin. Recorded-as-drift is the right treatment for a
  whitespace artifact (②, ③) or an unreachable branch (④, ⑥) — for ① it leaves the *specified*
  behaviour of `cut()` unguarded, and round 4's own lesson was that an unpinned behaviour is not a
  behaviour. Everything else on the list I am content to see recorded.
- **④ the recorded *reason* is not the one I measured.** The card says the legacy append branch is
  unreachable "在'数组里已有该 alias'时"; what I measured (round 2, re-checked) is that it is
  unreachable for `github.com` locators because `add.ts` always sets `entry.source`, which
  `spliceInsertSkill` classifies as unrepresentable — so **every** `deck add` on a legacy deck ends in
  the `migrate-schema` error. The decision (record, don't fix) is right; the sentence should carry the
  measured reason or the next agent will go looking for a duplicate-alias path that exits earlier anyway.

Your three other ADR claims verified independently: the spec table's rows are all well-formed again
(2 cells each; the `<br>|` swallow is gone), the Impact section now states the mtime withdrawal
(`:170`), and the adjacency reasoning is recorded as a choice.

---

## What I could not check, and why

- **Whether any real deck uses these shapes** — none in this repo (`grep` over every `*.toml` finds no
  dotted-key placement), so the frequency argument is unavailable in both directions; my claim is
  about legal, reader-accepted input.
- **A real network clone through `deck add`** — the write path is exercised with the `AddSkillIO` seam
  stubbed; the pre-clone half is untouched by this commit.
- **My diagnostic patch as a finished fix** — I verified it against the probes and the suite, not
  against a code review of its own (it is two edits in a scratch copy, and it has the table-form
  caveat above).
