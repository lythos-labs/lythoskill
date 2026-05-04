---
name: "Agent refreshes a declared skill"
description: |
  Verify that an agent can refresh a declared skill. Since the skill
  is localhost-managed (not a git repo), refresh should skip it and
  report accordingly. The agent records the result in a checkpoint.
timeout: 300000
---

## Given
- skill-deck.toml with tool skills: skill-a

## When
1. Create cold-pool/skill-a/SKILL.md with content "# skill-a\n".
2. Run `./deck link` to establish the working set.
3. Run `./deck refresh skill-a` and observe the output.
4. Write a checkpoint to _checkpoints/refresh.jsonl with this exact shape:
   {"step":"deck.refresh","tool":"Bash","args":["./deck refresh skill-a"],"final_state":{"result":"skipped-localhost"}}

## Then
- stdout contains "localhost" or "skipped" (indicating localhost skills are skipped)
- _checkpoints/refresh.jsonl exists and contains valid JSONL
- checkpoint.step === "deck.refresh"
- checkpoint.final_state.result === "skipped-localhost"

## Judge
Verify that:
1. The refresh command was executed for skill-a
2. The output correctly indicates that localhost skills are skipped
3. The checkpoint shape matches the expected schema
Return PASS if all conditions are met, otherwise list the first failure.
