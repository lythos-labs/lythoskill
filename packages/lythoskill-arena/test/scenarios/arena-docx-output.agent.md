---
name: Arena .docx output test
description: Verify single can produce a formatted .docx file using the documents deck.
timeout: 120000
---

## Given
- Working directory with no existing files
- bun is available

## When
Write a recipe for chocolate chip cookies as a formatted .docx file named `chocolate-chip-cookies.docx`.

The document should include:
- A title heading "Perfect Chocolate Chip Cookies"
- An ingredients list with measurements
- Step-by-step instructions
- A tip section at the end

Use the docx skill (available via the linked deck) to produce the .docx file.
Write a brief summary of what you created to `output-summary.md`.

## Then
- `chocolate-chip-cookies.docx` exists and is a valid .docx file (not empty, not plain text renamed)
- `output-summary.md` exists describing the output

## Judge
Evaluate the agent's output on:
- file_creation: Was a .docx file actually created (not just markdown)?
- content: Does the document contain a recipe with ingredients and instructions?
- tool_use: Did the agent use the docx skill/tool correctly?
- completeness: Is the output well-structured with proper formatting?
