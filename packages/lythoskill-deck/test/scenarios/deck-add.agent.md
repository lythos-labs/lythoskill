---
name: "Agent adds a skill to the deck"
description: |
  Verify that an agent can add a new skill to the deck: create the
  cold-pool source, update skill-deck.toml, sync the working set via
  link, and record the action in a checkpoint.
timeout: 300000
---

## Given
- skill-deck.toml with tool skills: skill-a

## When
1. Create cold-pool/skill-b/SKILL.md with content "# skill-b\n".
2. Add a new [tool.skills.skill-b] section to skill-deck.toml with path = "localhost/skill-b".
3. Run `./deck link` to sync the working set.
4. Write a checkpoint to _checkpoints/add.jsonl with this exact shape:
   {"step":"deck.add","tool":"Bash","args":["./deck link"],"final_state":{"added":"skill-b"}}

## Then
- skill-deck.toml contains [tool.skills.skill-b] with path = "localhost/skill-b"
- .claude/skills/skill-b is a symlink pointing to cold-pool/skill-b
- _checkpoints/add.jsonl exists and contains valid JSONL
- checkpoint.step === "deck.add"
- checkpoint.final_state.added === "skill-b"

## Judge
Verify that:
1. skill-b was added to skill-deck.toml correctly
2. The working set symlink was created and points to the cold-pool source
3. The checkpoint shape matches the expected schema
Return PASS if all conditions are met, otherwise list the first failure.
