# ZK review round 3 — ADR-20260910152957509 implementation

**Object**: `b24df0be` (HEAD). Repo pinned, read-only, `git status --porcelain` empty before and
after; all writes/mutations in `/tmp/zk904`.
**Round-2 log**: `showcase/2026-09-10-zk-reviews/904-impl-round2.md` — verified byte-identical
(sha256 `d518e9d0…` both sides).

| | |
|---|---|
| bun | `1.3.11` (af24e281) · `Darwin 24.6.0` (arm64) |
| suite | `bun test packages/lythoskill-deck/` → **279 pass / 0 fail / 750 expect / 279 tests / 17 files**; `toml-splice.test.ts` alone **24 pass** (was 18). Repo-wide `bun --filter='*' run test` → 14/14 packages `Exited with code 0` |
| guard universality | every `ok: true` return is inside `finalize` (`toml-splice.ts:102,114`); all 9 write paths call it (`:299,306,316,321,327,380,396,410,416`) — no unguarded return exists |

**Answer up front: 1 HIGH outstanding, and it is the most serious finding of the three rounds —
`deck remove` silently deletes unrelated bytes, exits 0, and reports success.** The shape set is
closed and every mutation is red, but I would not ship until this one is fixed (fix validated, §Q3).

---

## Q1 — Mutation matrix at `b24df0be`

Driver `/tmp/zk904/mutate3.py`. Baseline **24 pass / 0 fail**.

| mutation | expected | actual |
|---|---|---|
| R1(a) `cut()` byte offsets | red | **red** (2) |
| R1(b2) rule-③ cascade off | red | **red** (1) |
| R2(j) map-rule cascade off | red | **red** (1) |
| **R3(b1) rule-② cascade off (revert R2-H1)** | red | **red** (1: `R2-H1: rule ② cascade removes the empty [tool] header too`) |
| R1(d) legacy-array branch dropped | red | **red** (3) |
| R3(i) inline-map branch dropped | red | **red** (3) |
| R1(e) `lineEndingRun` eats 1 sequence | red | **red** (2) |
| R1(f) array element matched by full text | red | **red** (2) |
| R1(g) `cut()` eats no line endings | red | **red** (5) |
| R1(h) insert before the last same-prefix table | red | **red** (2) |
| R1(c1) H3 revert (lastTable path) | red | **red** (1) |
| **R2(c2) EOF path forced to LF** | red | **red** (1: `R2-H2: the EOF insert path also uses the file's own line ending`) |
| R2(k) table lookup by raw key text | red | **red** (1) |
| **R2(m) empty-map always emits a comma** | red | **red** (1) |
| **R3(n) result guard disabled** | red | **red** (1: `R2-H4: a scalar skills value is refused by the RESULT guard`) |
| **R3(o) rule ⑤ (dotted keys) disabled** | red | **red** (2) |
| **R3(p) DIAGNOSTIC — collapse nested hits (the fix for the bug in §Q3)** | — | **GREEN, 24 pass / 0 fail** ⚠️ |

**Is anything still green that should be red? No.** All 16 defect mutations are red, including all
five that were green in earlier rounds — your re-runs are confirmed independently. The only green row
is a *fix*, and its greenness is itself the finding: **the suite cannot distinguish the buggy code
from the fixed code on the dotted-inline-table shape** (no test covers it — §Q3 R3-H1).

---

## Q2 — Is the shape set closed?

**Yes as a set — I could not find a sixth family.** The argument by construction, then the
measurements:

`parseDeck` only ever produces an entry from `deck[section].skills[alias].path`. In a TOML document
that binding can only be created by **(i)** a `[….skills.alias]` table header, **(ii)** a
`skills = { … }` value, **(iii)** a `skills = [ … ]` element, or **(iv)** a **dotted key**. (i)–(iii)
are rules ①–③ plus the map (④); (iv) is rule ⑤, added this round. All five placements of (iv) now
locate (`/tmp/zk904/probe5.ts`, `probe6.ts`, `probe10.ts`):

```
1 top-level                      reader READS  writer removes
2 [tool] + skills.alpha.path     reader READS  writer removes   ← the one I bet on in round 2
3 [tool] + skills.alpha = {…}    reader READS  writer removes*  ← *but see R3-H1
4 [tool.skills] + alpha.path     reader READS  writer removes
5 [tool] + skills = {alpha.path} reader READS  writer removes   (leaves `skills = {  }`, L1)
6 quoted segments "skills"."alpha".path   reader READS  writer removes
```

I also checked the near-misses and they are correctly out of scope (reader and writer **agree**,
which is the actual contract):

| shape | reader | writer | verdict |
|---|---|---|---|
| `[deck]` + top-level `tool.skills.alpha.path` | ignores (it is `deck.tool.…`) | `not-found` | agree — the writer's path computation matches TOML scoping exactly |
| `[[tool.skills]]` / `skills = [ {…} ]` (array-of-tables) | ignores (non-strings skipped) | — | not a reader shape |
| quoted *section* segments `[tool."skills".alpha]`, `"path" = "P"` | reads | removes | covered (segment matching) |
| `deck add --alias foo.bar` (a dotted alias) | would declare `tool.skills.foo.bar`, not an alias | would write `[tool.skills.foo.bar]` (valid TOML, wrong meaning) | **unreachable**: `validateAlias` rejects dots ("No dots, slashes, or special characters"), so the splice is never called. Checked, not a finding |

And on the insert side the corruption class is closed structurally: the guard refused `skills = "oops"`
and every alias/path that cannot be written as valid TOML (space in alias, `"` or newline in path),
while **no legitimate insert is refused** (6 shapes measured: plain deck, commented deck, `[tool]`-only,
inline shape, empty file, comment-only file — all still write).

So: **closed as a set. "Closed" is not the same as "correct"** — rule ⑤ mishandles one of the very
shapes it now covers, and that is the HIGH below.

---

## Q3 — Convergence

**Fewer than 2 HIGH: yes — exactly 1.** **Would I let this ship? No, not at this commit.**

### R3-H1 (HIGH) — rule ⑤'s group cut eats unrelated bytes; `deck remove` reports success

`hits` collects **nested** key-values: for `[tool]` + `skills.alpha = { path = …, source = … }` the
inline table's inner fields are also hits (`tool.skills.alpha.path` is prefixed by
`tool.skills.alpha.`). The group cut then applies each hit's **original** range to a string that is
already shorter, so the outer cut's end offset overshoots by the length of the inner cut(s) and eats
whatever follows.

Trigger: a dotted entry whose value is an **inline table** (placement 3, or the top-level
`tool.skills.alpha = { … }`), with any content after it. Two outcomes — and only one is loud:

```
--- [tool] + skills.alpha = {…}, then more keys ---
  in : "[deck]\nmax_cards = 10\n\n[tool]\nskills.alpha = { path = \"github.com/a/b/alpha\" }\nrole = \"tool-role\"\n"
  out: "[deck]\nmax_cards = 10\n\n[tool]\n"      [reparse-OK → the guard passes]
        → `role = "tool-role"` silently deleted

--- [tool] + skills.alpha = {…, source }, then a section ---
  in : "…\n\n[combo.weekly]\nprompt = \"keep me\"\n"
  out: "[deck]\nmax_cards = 10\n\n[tool]\n"      [reparse-OK → the guard passes]
        → the `[combo.weekly]` section, its comment and its prompt silently deleted

--- [tool] + skills.alpha = {…} + a later skill table ---
  ERR would-corrupt (refused — the tail happens to make the result unparseable)

--- [tool] + skills.alpha = {…} + second entry in the same table ---
  out: "[deck]\nmax_cards = 10\n\n[tool]\na = { path = \"b\" }\n"   [reparse-OK]
        → both real entries gone, and a bogus key `a` left in their place
```

Through the **shipped CLI**, on a deck `validate` accepts first:

```
$ bun …/cli.ts validate ./skill-deck.toml
✅ Validation passed: 1 skill(s), max_cards = 10 …
$ bun …/cli.ts remove alpha --deck ./skill-deck.toml --workdir .
📝 Removed "alpha" from [tool.skills] in …/skill-deck.toml      (exit 0)
   file: 276 bytes → 110 bytes ; the `# ── combo ──` comment and [combo.weekly] are gone
```

So: **silent data loss in a git-tracked declarative file, with a success message and exit 0** — the
class this ADR exists to abolish, and the guard cannot help because the damaged result parses.

**Coverage**: zero. The diagnostic mutation — collapsing nested hits to the outermost — makes all
five probe cases correct (`[combo.weekly]` preserved, `role` preserved, `[tool.skills.beta]`
preserved, `[tool]` cascading away) and the suite stays **24 pass / 0 fail**. The suite is blind to
this shape in both directions.

**Fix (validated, not merely proposed)**: drop any hit contained in another hit
(`hits.filter(h => !hits.some(o => o !== h && o.range[0] <= h.range[0] && h.range[1] <= o.range[1]))`
before the cut), or merge overlapping ranges into one. Two lines. Plus one test with the shape above
and trailing content, and a tightening of the ADR's rule-⑤ row, which currently says only
"等于 `section.skills.<alias>` 或以 `<alias>.` 为前缀的那些" — the sentence that produced the bug —
and should say the group is the **outermost** hits / one merged range.

### LOW

- **L1** — placement 5 (`[tool]` + `skills = { alpha.path = "P" }`) leaves the emptied map behind:
  `"[deck]\nmax_cards = 10\n\n[tool]\nskills = {  }\n"`, where the object layer deleted the `skills`
  key and then the empty section. The 空容器级联 row is not applied on rule ⑤'s path when the
  container is a map value. Cosmetic (valid TOML, reader sees nothing).
- **L2** — the EOF insert's line-ending criterion deviates from the spec row ("从**插入点**相邻字节判定"):
  the code scans the whole file (`/\r\n/.test(src)`, `:415`). Measured consequence: an LF deck whose
  only CRLF lives inside a multi-line string gets CRLF separators —
  `'[deck]\nmax_cards = 10\nnote = """line1\r\nline2"""\n'` + insert →
  `'…line2"""\r\n\r\n[tool.skills.beta]\r\npath = "b"\n'` (mixed; the correct criterion is
  `lineEndingAt(src, trimmed.length)`). Exotic trigger, one-line fix, wrong bytes.
- **L3** — rule ②'s cascade is gated on `isAdjacent`, so a comment between `[tool]` and `[tool.skills]`
  keeps the empty header: `remove alpha` on
  `'…\n[tool]\n# note about the tool section\n[tool.skills]\nalpha = { path = "a" }\n'` →
  `'…[tool]\n# note about the tool section\n'`, where the object layer gives `'[deck]\nmax_cards = 10\n'`.
  Deliberate conservatism (the comment is the user's and stays), but it diverges from the spec's
  cascade row, and rules ③/④ cascade with no adjacency requirement at all — two criteria for one rule.
- **L4** — round-1/2 LOWs still open, unchanged: interior-comment deletion untested by any fixture;
  multi-line legacy arrays drift when an element is removed; `skills = [ ]` + insert → `["path" ]`;
  the legacy-array "append" branch is unreachable for `github.com` locators; the ADR's Impact section
  still lists the withdrawn mtime test; `basename()` vs `parseDeck`'s alias rule diverge for
  trailing-slash array entries.
- **L5** — the ADR's 定位 row ⑤ states the prefix rule that produces R3-H1; after the code fix the row
  should name "outermost / merged" explicitly (the table is the SSOT the next agent reads).

### Verdict

Numerically the bar is met (1 HIGH < 2). I would still hold the ship on **R3-H1** alone: it is
silent data loss, not a cosmetic or blocked-user case, it is reachable from a documented command on a
deck the toolchain has just validated, it reports success, and no test can see it. The fix is
validated and cheap (two lines + one test + one spec sentence); once it lands and a test pins it —
i.e. the R3(p) diagnostic stops being green — the remaining items are the LOWs above, none of which
I would block on. Everything else in this round checks out: the guard is universal and has no false
positives, all five dotted placements locate, both insert line-ending paths are correct, the
rule-② cascade closes, and every mutation that was green in rounds 1–2 is now red.

---

## What I could not check, and why

- **Real CRLF decks / real dotted-key decks in the wild** — none exist in this repo
  (`grep -rn` over every `*.toml` finds no dotted-key placement); all such inputs are synthesized.
- **A real network clone through `deck add`** — the write path is exercised with the `AddSkillIO`
  seam stubbed; the pre-clone half is untouched by these commits.
- **Whether the ADR/Impact residue (L4) is in scope for the card** — I verified the table is updated
  for rules ④⑤, the map insert row and the guard, and that the Impact section's withdrawn-mtime-test
  line is still there; I did not judge whether the coordinator intends to fold that.
- **A full sweep of `validate`'s own acceptance rules** — I used `validate` as the reader oracle for
  the shapes above (it and `parseDeck` agreed on every shape I tried), but I did not enumerate every
  path through `validate.ts`.
