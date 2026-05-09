---
type: arena
objective: |
  Compare three deck configurations: baseline documents, plus research, minus PDF.
evaluation_criteria:
  - depth
  - relevance
  - structure
  - token
---

# Arena Task: Compare Document Deck Configurations

## Subagent Instructions

You are in an isolated workspace with a deck pre-configured.
Link the deck, then complete the task below.

### Task

Research the AI agent skills ecosystem (how skills like deck, coach, arena compose)
and produce a structured .docx report covering:
1. The thin-skill pattern and its three layers
2. How deck governance works (deny-by-default)
3. The arena comparison methodology
4. Your deck configuration and what skills were available

Write the output to `runs/<side-name>/<side-name>.md`
