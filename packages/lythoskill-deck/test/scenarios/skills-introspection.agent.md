---
name: "Agent introspects deck skills via checkpoint"
description: |
  Verify that an agent reading a skill-deck.toml can identify declared
  tool skills and report them through the checkpoint mechanism.
timeout: 300000
---

## Given
- skill-deck.toml with tool skills: skill-a, skill-b

## When
Read skill-deck.toml in the current directory. Count how many skills are
declared under [tool.skills] sections. Write a single JSONL line to
_checkpoints/introspection.jsonl with this exact shape:

{"step":"deck.introspection","tool":"read","args":["skill-deck.toml"],"final_state":{"tool_skill_count":2}}

## Then
- _checkpoints/introspection.jsonl exists and contains valid JSONL
- checkpoint.step === "deck.introspection"
- checkpoint.final_state.tool_skill_count === 2

## Judge
Verify the checkpoint accurately reflects the skill-deck.toml content.
Return PASS if the count is correct and the checkpoint shape matches.
