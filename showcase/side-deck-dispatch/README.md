# Side Deck Dispatch — Task-Scoped Working Set Switch

> Reproduce: `bash showcase/side-deck-dispatch/reproduce.sh` (10 assertions, no network, no LLM)

## What this demonstrates

A **side deck** is a deck file scoped to one task, living outside the project's
standing `skill-deck.toml`. It arrives as a file path or URL; the agent links it
for the duration of the task, then restores the parent deck. This is the
mechanical half of the pattern in [README.md §Side Decks](../../README.md).

```
parent deck linked (standing set)          task arrives + side deck
        │                                          │
        ▼                                          ▼
.claude/skills: parent-skill          deck link --deck qa-sweep.toml
                                              │
                                              ▼
                              .claude/skills: sweep-reader, sweep-writer
                              (parent-skill absent — deny-by-default)
                                              │
                                     task done: deck link (parent)
                                              │
                                              ▼
                        .claude/skills: parent-skill  (zero state pollution)
```

## The two halves of the pattern

| Half | Mechanism | Runnable here? |
|------|-----------|----------------|
| **Mechanical** — working set matches the active deck | `deck link --deck <path>` (CLI) | ✅ This reproduce.sh |
| **Intelligence** — agent reads the deck's combo prompts and executes the pipeline | agent + SKILL.md contract | ❌ Needs an LLM; contract in `packages/lythoskill-deck/skill/SKILL.md` ("combo consumption contract") |

The CLI only parses combos into sections — there is no combo runtime. Skipping
the combo prompts means the deck was never actually run.

## Real-world decks

The fixture deck here mirrors the committed
[`examples/decks/qa-sweep.toml`](../../examples/decks/qa-sweep.toml). Arena's
task-scoped dispatch is the other consumption path:

```bash
lythoskill-arena single --brief "audit this repo" \
  --deck ./examples/decks/qa-sweep.toml --out /tmp/arena-audit
```

(arena additionally isolates the run in a per-run workdir — see
`packages/lythoskill-arena`.)

## What the assertions prove

1. **Phase switch is total.** Linking a side deck removes non-declared skills
   from the agent's view (`parent-skill` absent). The agent *cannot* leak the
   previous phase's skills into the new task — deny-by-default does it.
2. **The lock follows the active deck.** `skill-deck.lock` records the side
   deck as `deck_source` while it is linked — the BOM pin always names what is
   actually installed.
3. **Restore is one command.** `deck link` with no `--deck` finds the parent
   `skill-deck.toml` upward from cwd and puts the standing set back. No
   hand-stitching of symlinks.
4. **The cold pool is never mutated.** All sources intact after both switches —
   working sets are projections, the cold pool is the store.

## Fixture note

The side deck's `cold_pool = "./cold-pool"` resolves relative to the project
workdir (CWD), not the deck file's location — `deck link` prints a hint when
the deck lives in another directory and `--workdir` is unset. In this fixture a
symlink makes the shared pool visible from the project; in real use the pool is
a stable absolute path like `~/.agents/skill-repos`.
