# ZK review round 6 — ADR-20260910152957509 implementation

**Object**: `5adeb73f` (HEAD). Repo pinned, read-only, `git status --porcelain` empty before and
after; all experiments in `/tmp/zk904`.

| | |
|---|---|
| bun | `1.3.11` (af24e281) · `Darwin 24.6.0` (arm64) |
| suite | **291 pass / 0 fail / 780 expect / 291 tests / 17 files**; `toml-splice.test.ts` **36 tests** (was 30) |
| repo-wide | `bun --filter='*' run test` → 14/14 packages `Exited with code 0`, deck `291 pass / 0 fail` |

**Answer up front: 0 HIGH. Q1 — nothing green that should be red; refusals and residues are zero on
every shape I have. Q2 — one level deeper is clean except one cosmetic drift that is new in this
commit (two blank lines; fix validated, no test covers it). Q3 — yes, I would ship.**

---

## Q1 — matrix at `5adeb73f`

Driver `/tmp/zk904/mutate6.py`, baseline **36 pass / 0 fail**. Your five round-6 surfaces, re-run
independently:

| mutation | your count | mine |
|---|---|---|
| `inInline` → false | 6 red | **6 red** ✓ |
| structural signal reverted (inline bodies unflagged) | 6 red | **6 red** ✓ |
| merge of overlapping ranges off | 1 red | **1 red** ✓ |
| dangling-comma recovery off | 1 red | **1 red** ✓ |
| comma-aware group cut off | 3 red | **5 red** — my mutation disables the whole inline branch (line-form fallback) rather than just the comma, so it catches two more; not a discrepancy, a wider blade |

All 16 carried-over defect mutations are red as well (byte offsets, legacy branch, inline-map branch,
insert placement, both H3 paths, rule-②/③/map cascades, empty-map comma, the guard, rule ⑤ off,
un-collapsed hits, map-emptied cascade, adjacency gate).

**Shapes: 15/15 `probe16` clean (refusals 5 → 0, residues → clean text), 7/7 `probe15` clean.** The
two former dangling-comma cases (`… "<430 chars>", beta.path` removing the last field) now end with
`…"<LONG>" }` — no trailing comma, and the 430-char path is irrelevant to the outcome, which is the
structural signal doing its job.

The two reopenings are closed as asked, verified by reading the artefacts: the interior-comment
fixture exists (`it('interior comments: a comment BETWEEN key-values of the removed table goes with
the node')`, asserting the comment is gone *and* `[combo.weekly]` survives), and the card's LOW ④ now
carries the reason I measured (`add.ts` always writes `entry.source` for github locators), explicitly
marking the old reason as wrong. The error message is fixed too — it now says "This is a defect in
the splice, not an unmodelled deck shape: the entry was located, so report it with the deck that
triggered it", which is the honest version and stops sending the reader to the wrong place.

Your harness note is the right lesson and I can confirm the *observable* half of it: your counts
reproduce here (6/6/1/1). The harness itself is not in the commit (4 files: ADR, card, test, src), so
I could not inspect it — noting that rather than passing it.

---

## Q2 — one level deeper (`probe18`, `probe20`)

I probed 19 further shapes: dotted keys three and four levels deep inside a map,
`alpha.meta = { path = … }` (nested inline table holding the path), nested inline values under rule ④
(`alpha = { path, meta = { deep = { x } } }`), interleaved fields of one entry
(`alpha.path, beta.path, alpha.role` — non-adjacent ranges), mixed dotted/inline maps removing first /
middle / last, a map emptied while the section keeps other keys, and a multi-line map with a comment.

**18 of 19 are clean** — correct removals, valid TOML, neighbours untouched, cascades firing. The
reader-ignored shapes (`alpha.meta.path = "P"`, `alpha.a.b.c = "P"`, `[tool.skills] alpha.meta.path`)
are *ignored by both sides*, which is the consistency the 总则 actually asks for.

**One residual — LOW (cosmetic, and new in this commit):**

```
in : "[deck]\nmax_cards = 10\n\n[tool]\nskills.alpha.path = \"P\"\nskills.alpha.meta = { x = 1 }\nskills.beta.path = \"Q\"\n"
out: "[deck]\nmax_cards = 10\n\n[tool]\n\n\nskills.beta.path = \"Q\"\n"      ← two blank lines left behind
6f67c212 (previous commit): "…[tool]\nskills.beta.path = \"Q\"\n"           ← clean
```

Cause: `hitsInInline` is an **OR over all hits**, including the nested `x` inside the inline-table
*value* — a hit the outermost-collapse then drops. So a line-form group that happens to contain an
inline-table value is cut with the inline logic, which finds no comma and therefore consumes no line
ending. Proof of causation, not inference: forcing `inInline = false` on the same input gives the
clean 6f67c212 output. Fix validated: computing the flag from the surviving `outer` hits (per-hit
flags) — with that patch the drift input is clean, `probe15/16/18` stay at 0 refusals / 0 invalid, and
**the suite stays 36 pass / 0 fail**, so it would land unverified; one test on the input above is what
makes it stick. Not a ship blocker (valid TOML, no data loss, no user blocked) — but it is a
regression against the previous commit on a shape the suite does not cover.

**One latent LOW — the guard's parser is not the reader's parser.** `finalize()` re-parses with
`toml-eslint-parser`; the CLI's reader (`parseDeck`, and therefore `validate` and `remove`'s matching)
uses iarna. Measured disagreement:

```
[tool]
skills = {
  # c
  alpha.path = "P",
  beta.path = "Q",
}
  → toml-eslint-parser: accepts   iarna: REJECTS   parseDeck: 0 entries, 1 error
```

So the guard's promise ("the spliced result would not parse") is weaker than it reads: it can bless a
result the tool itself cannot read. It is **not reachable today** — a deck iarna rejects yields no
entries, so `deck remove` never gets a match and never reaches the splice — which is why this is LOW
and not a HIGH. Hardening is one line (`parseDeck(next).errors.length === 0`, or re-parse with iarna)
if you want the guard to mean what it says.

---

## Q3 — would I ship this? **Yes.**

- **0 HIGH.** The thirteen shapes that produced HIGHs across rounds 1–5 are all fixed, and each fix
  is pinned by a mutation that goes red (verified here, not taken on report).
- The one new defect this round is cosmetic, in a shape that does not exist in any deck in this repo,
  with a validated 3-line fix and a named missing test.
- The shape set is now closed in the sense I can defend: everything a `deck[section].skills[alias]`
  binding can be written as — table header (in any key spelling), map value, array element, dotted
  key at any depth, nested inline tables, interleaved multi-key entries — is located, cut cleanly,
  and cascaded; and the result guard makes the *insert* side structurally incapable of writing an
  unparseable file. I could not construct a 20th shape that misbehaves.
- The two LOWs are recorded, not inherited: the drift has a validated fix and the parser asymmetry has
  a one-line hardening, both with the test to write named above. Ship, and take them as the next
  small item — or fold them first if you would rather ship with the regression gone.

For the record on process: this round the discipline paid for itself twice over — the harness fix
(your first mutation silently failed to match) is the same failure mode as the three "fixes with no
discriminating test" I reported in round 4, and it was caught by the same method. My own round-5
probe tables were again the thing that found the remaining family, which is why I keep asking for the
next level rather than assuming closure.

---

## What I could not check, and why

- **The mutation harness you rebuilt** — not committed (this commit touches ADR, card, test, src), so
  I verified your five counts by running my own mutations rather than inspecting yours.
- **Whether any real deck uses these shapes** — none in this repo; my claim is about legal,
  reader-accepted input, not observed users.
- **A real network clone through `deck add`** — write path exercised with the `AddSkillIO` seam
  stubbed; the pre-clone half is untouched by this commit.
- **The parser-divergence LOW against real iarna/eslint version drift** — I measured the current
  pinned versions only.
