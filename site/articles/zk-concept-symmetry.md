# Two Agent "Limitations" We Use on Purpose

This is a companion piece to [Agent-Boosted UX](./agent-boosted-ux), the canonical article on designing lythoskill's surfaces for agent consumers. That article covers five patterns; this one expands a single idea it only sketches: the symmetry between two agent properties most projects treat as defects.

| Property | Usually treated as | Lythoskill uses it as |
|----------|-------------------|----------------------|
| Ignorance (no project context) | A limitation: the agent doesn't know our codebase | A sensor: a zero-knowledge agent finds documentation gaps |
| Broad knowledge (training data) | A liability: the agent reasons about things it hasn't seen | A bridge: concept migration transfers ideas across domains |

The same agent that is too ignorant to work without docs is too knowledgeable to need docs for cross-domain analogy. ZK Review deploys the first end of that spectrum; concept migration (OS vocabulary, HATEOAS) deploys the second. The canonical article details both mechanisms. What follows is what we learned from running the first one as a mandatory gate.

The two properties pull in opposite directions on the same surface. Too little documentation starves the ignorant end: the fresh agent cannot start. Too much documentation wastes the knowledgeable end: the agent already carries OS architecture, REST, and memory hierarchies in its training data, so a precise term transfers a whole mental model in one line and a re-explanation is dead weight. Writing for agents means holding both ends at once, which is why the symmetry matters more than either half alone.

## What the sensor actually finds

ZK Review is the pre-assignment gate for task cards: a fresh subagent with zero project context reads only the card and answers WHAT/WHY/HOW, and reported gaps get processed until the card is executable (methodology: `packages/lythoskill-project-cortex/skill/references/zk-review.md`). The dispatch is pass-by-reference: the subagent receives the file path to the card and the file path to AGENTS.md, never pasted content, so the card stays the single source of truth. In practice the gaps cluster into four types:

| Type | Question | Example fix |
|------|----------|-------------|
| Prerequisite knowledge | Where is the code? | File path + line number |
| Interface contracts | What are the signatures? | Upstream/downstream declarations |
| Baseline data | What are the anchors? | Current value, target range |
| Scope declaration | Mandatory vs optional vs not-doing? | Explicit boundaries |

The most valuable findings are scope declarations, and the reference doc's worked example shows why. That example is an illustrative voice-encoder case from the doc itself; lythoskill has no voice-encoder code. A ZK agent reading the task "Implement V2 encoder with temporal smoothing" reported: "The old encoder already does some temporal smoothing in `_encode_pcm_tts()`. The task doesn't say whether V2 replaces, extends, or duplicates that logic." The author knew the answer and never wrote it down. Self-review cannot catch this class of gap, because the author's own intent is invisible to the author; the ZK agent catches it precisely because it has nothing to fill the blank with.

## A sensor, not an oracle

ZK output detects gaps; it does not establish truth. "This flag name is confusing" is information about naming, not a command to rename. "This is clearly wrong" is a lead that has to be verified against the code. The sensor also produces false positives: we have seen a ZK agent report a term as undefined when the definition sat in a referenced file it hadn't opened. There the agent failed to follow the reference and the doc was fine, so the correct response is to challenge the finding; patching the doc would teach the sensor that crying wolf works. The author evaluates, filters, decides.

## How the loop converges

Each reported gap gets one of three dispositions: fill it, challenge it, or reject it as out of scope. Challenges have to be written into the task card or review log with their reasons, because the next round spawns a fresh agent that will otherwise re-raise the same false positive and burn a round. Three rounds is the practical ceiling. A card that still has new gaps entering round three is not under-documented; its design is suspect, and the right move is to rewrite the card, because a fourth review round will not converge.

The loop works because the sensor is cheap and disposable. Each round costs one subagent with no context to poison, and the card accumulates the answers so later rounds start from a better page.

## The recursion

The symmetry closes on itself. ZK Review validates the task cards that build the ZK Review tooling. The arena skill that test-plays decks is itself declared in `skill-deck.toml`, so arena runs exercise the deck that contains arena. A governance layer governs itself with its own instruments.

Whether that self-application is healthy is an open question, and we can state what would change our mind. If cards that pass the four gap types above keep failing in execution, the gate measures the wrong thing and the pattern needs redesign; more documentation would not fix it. So far the findings our zero-knowledge sensors report keep landing on missing documentation, and each one gets fixed as documentation. That is evidence for the pattern, but it is the kind of evidence a single strong counterexample would overturn.
