---
type: arena
objective: |
  Compare document output with and without deep research skills.
evaluation_criteria:
  - depth
  - relevance
  - structure
  - token
---

# Arena Task: Research + Document Output

## Subagent Instructions

You are in an isolated workspace with a deck pre-configured.
Link the deck, then produce a structured .docx report on:

The AI agent skills ecosystem — how skills like deck, coach, arena compose together.
Cover the thin-skill pattern, deck governance (deny-by-default), and the arena
comparison methodology.

Write the output to `runs/<side-name>/<side-name>.md`.
