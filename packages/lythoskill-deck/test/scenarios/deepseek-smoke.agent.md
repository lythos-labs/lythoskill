---
name: "DeepSeek Hello World + self-report skills"
description: |
  Verify that a DeepSeek TUI agent in one-shot mode can write a file
  and discover skills from a linked skill-deck.toml workspace.
timeout: 180000
---

## Given
- skill-deck.toml with no skills declared (scout deck — intentionally thin)
- deck link has been run to populate .claude/skills/

## When
1. Write a file named output.md containing exactly "Hello, World!" (no quotes).
2. Read skill-deck.toml and check .claude/skills/ for any linked skills.
3. Write a file named skill-report.md listing:
   - Each skill found (name + one-line description)
   - If no skills found, write "No skills found."
4. Write a checkpoint to _checkpoints/deepseek-smoke.jsonl with this shape:
   {"step":"deepseek.smoke","tool":"write","args":["output.md"],"final_state":{"hello":"written","skills_found":0}}

## Then
- output.md exists and contains "Hello, World!"
- skill-report.md exists and has content
- _checkpoints/deepseek-smoke.jsonl exists with valid JSONL
- checkpoint.step === "deepseek.smoke"
- checkpoint.final_state.hello === "written"

## Judge
Verify that:
1. The agent successfully wrote output.md with the expected content
2. The agent correctly inspected .claude/skills/ and reported findings
3. The checkpoint shape matches the expected schema
For a scout deck (no skills), skills_found should be 0.
Return PASS if all conditions are met.
