---
name: "Agent prunes unreferenced cold-pool repos"
description: |
  Verify that an agent can prune the cold pool: delete repos not
  referenced by the deck, keep referenced repos, and record the
  action in a checkpoint.
timeout: 300000
---

## Given
- skill-deck.toml with tool skills: skill-a (localhost)

## When
1. Create cold-pool/skill-a/SKILL.md and cold-pool/skill-b/SKILL.md with minimal content.
2. Run `./deck link` to establish the working set.
3. Run `./deck prune --yes` to garbage-collect unreferenced repos.
4. Write a checkpoint to _checkpoints/prune.jsonl with this exact shape:
   {"step":"deck.prune","tool":"Bash","args":["./deck prune --yes"],"final_state":{"pruned":1,"retained":["skill-a"]}}

## Then
- cold-pool/skill-a still exists (referenced, retained)
- cold-pool/skill-b does NOT exist (unreferenced, pruned)
- stdout contains "skill-b" and "deleted" or "pruned"
- stdout does NOT contain "skill-a" in a deletion context
- _checkpoints/prune.jsonl exists and contains valid JSONL
- checkpoint.step === "deck.prune"
- checkpoint.final_state.pruned === 1

## Judge
Verify that:
1. The unreferenced repo (skill-b) was deleted from the cold pool
2. The referenced repo (skill-a) was retained
3. The command output correctly reports the pruning action
4. The checkpoint shape matches the expected schema
Return PASS if all conditions are met, otherwise list the first failure.
