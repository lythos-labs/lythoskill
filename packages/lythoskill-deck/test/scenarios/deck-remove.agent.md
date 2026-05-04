---
name: "Agent removes a skill from the deck"
description: |
  Verify that an agent can remove a skill from the deck: delete the
  deck entry, remove the working-set symlink, leave the cold-pool
  source intact, and record the action in a checkpoint.
timeout: 300000
---

## Given
- skill-deck.toml with tool skills: skill-a, skill-b

## When
1. Create cold-pool/skill-a/SKILL.md and cold-pool/skill-b/SKILL.md with minimal content.
2. Run `./deck link` to establish the working set.
3. Run `./deck remove skill-a` to remove it from the deck.
4. Run `./deck link` again to sync the working set.
5. Write a checkpoint to _checkpoints/remove.jsonl with this exact shape:
   {"step":"deck.remove","tool":"Bash","args":["./deck remove skill-a"],"final_state":{"removed":"skill-a"}}

## Then
- skill-deck.toml does NOT contain [tool.skills.skill-a]
- skill-deck.toml still contains [tool.skills.skill-b]
- .claude/skills/skill-a does NOT exist
- .claude/skills/skill-b is still a symlink
- cold-pool/skill-a still exists (cold pool untouched)
- _checkpoints/remove.jsonl exists and contains valid JSONL
- checkpoint.step === "deck.remove"
- checkpoint.final_state.removed === "skill-a"

## Judge
Verify that:
1. skill-a was removed from skill-deck.toml
2. The working-set symlink for skill-a was removed
3. The cold-pool source for skill-a was NOT deleted
4. skill-b remains unaffected
5. The checkpoint shape matches the expected schema
Return PASS if all conditions are met, otherwise list the first failure.
