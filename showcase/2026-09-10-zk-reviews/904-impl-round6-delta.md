# ZK review — delta pass on the round-6 LOWs (`937bb4b7`)

**Object**: `937bb4b7` (HEAD). Repo pinned, read-only, `git status --porcelain` empty before and
after; experiments in `/tmp/zk904`; scratch restored to HEAD at the end (`diff` against
`937bb4b7:…/toml-splice.ts` empty).

| | |
|---|---|
| bun | `1.3.11` (af24e281) · `Darwin 24.6.0` (arm64) |
| suite | **293 pass / 0 fail / 786 expect / 293 tests / 17 files**; `toml-splice.test.ts` **38** (was 36) |

## Answer: **ship.** No new HIGH in either fold.

---

## Fold 1 — the drift (flag from the surviving hits)

Measured on my exact round-6 input:

```
in : "[deck]\nmax_cards = 10\n\n[tool]\nskills.alpha.path = \"P\"\nskills.alpha.meta = { x = 1 }\nskills.beta.path = \"Q\"\n"
out: "[deck]\nmax_cards = 10\n\n[tool]\nskills.beta.path = \"Q\"\n"     ← clean (6f67c212's output restored)
```

Test present (`a line-form group containing an inline-table value does not drift`), and the mutation
you named reproduces: reverting the flag to the OR over all hits → **1 red**, exactly that test.
Re-collapsing nested hits (R4(a)) now reddens 2 (it also breaks this one) — consistent.

The fix is the right shape too: the *discarded* nested hit stops voting, rather than the line form
being special-cased. Nothing else regressed — see the sweep below.

## Fold 2 — the guard's parser, and the two-failure message

`finalize` now parses with `@iarna/toml`, the reader's parser. Verified both directions of the
message split by measurement, not by reading:

| input | reader (iarna) on the input | result | message branch |
|---|---|---|---|
| multi-line inline table (`skills = {\n  alpha = { … }\n}`) + insert | **rejects** | refused | **deck-side**: "this deck cannot be read by the tool's own parser (…). Fix the deck first: 'deck validate' uses the same parser." ✓ |
| scalar `skills = "oops"` + insert | accepts | refused | **splice-side**: "the spliced result would not parse (Can't redefine existing key …)" ✓ |

Test present (`the result guard uses the READER's parser, and says which of the two failures it is`),
and reverting the parser → **1 red** ✓ (your claim reproduced).

**No false refusals.** I re-ran every probe battery — `probe15` (7 shapes), `probe16` (15), `probe18`
(12), `probe19`, `probe20` (6), `probe17` (4 line-ending cases), plus `probe5`/`probe2` shape and
insert sweeps: **refusals 0, INVALID 0** everywhere, with one intended exception: the multi-line
inline table (a deck the tool's own reader rejects) is now refused with the deck-side message, where
before the fold the writer would have "succeeded" on a deck the tool cannot read. That is the fold
working as designed, and it is unreachable through the CLI anyway — measured: `deck validate` on that
deck → `❌ Validation failed`, `deck remove` → no match/crash before the splice, so the branch is
defensive. Good: the writer no longer claims success on such a deck at the unit level.

## New and HIGH? No. One new LOW, found while checking the fold

**The splice-side message is not pinned.** With both branches forced to emit the deck-side wording,
the suite stays **38 pass / 0 fail** — no test distinguishes them. The existing `R2-H4` test asserts
`code === 'would-corrupt'` and `message).toContain('refusing to write')`, and *both* messages satisfy
both. Consequence if someone later collapses the split: every user with a genuine splice defect gets
told "your deck cannot be read, run `deck validate`" — the exact misdirection this batch has been
fixing. The code is currently **correct** (measured above); only the pin is missing. One assertion on
the case already in the suite (`scalar` → `toContain('defect in the splice')`) closes it. LOW, not a
blocker.

Two observations, explicitly **not** counted against this delta:

- **`deck remove` on an iarna-unreadable deck crashes with a raw stack trace** (iarna's
  `parseInlineTable` frames, rc=1, file unchanged) rather than a message, because `remove.ts`'s
  `parseToml(deckRaw)` is unguarded. **Pre-existing**, verified: the same call exists at
  `ddddcb16^:remove.ts:87`. Same class as the `--dry-run` TDZ (which has its own card) — worth a card
  if you want a clean message, not caused by either fold.
- **A side effect of my own command, disclosed:** my earlier combined check passed a clone-triggering
  locator to `deck add`, which attempted a real fetch and left an empty
  `~/.agents/skill-repos/gitlab.com/a/` in your home cold pool (timestamps 16:32/16:34 today; nothing
  was cloned — the fetch failed with `ETIMEDOUT`). The repo itself and `github.com/` under the cold
  pool are untouched. Two empty directories; remove them if you want the prior state, and my mistake
  for not stubbing that call.

## LOW list state

Recorded and accurate: ② multi-line array drift, ③ `skills = [ ]` insert artifact, ④ legacy-append
branch unreachable for `github.com` locators (intended, reason corrected), ⑥ `basename`/`parseDeck`
alias divergence — plus this delta's one new entry (the unpinned splice-side wording). ① (interior
comment) and the round-6 pair are closed with tests. Nothing on that list is a ship blocker, and the
card now carries each with its decision rather than inheriting them.

**Verdict: shippable at `937bb4b7`, with the LOW list recorded.** Both folds are correct, both are
pinned by mutations that go red, and I could not construct a new HIGH in either. Stop forking me on
this loop — the remaining items are recorded, bounded, and one assertion each.
