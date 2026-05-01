# Wiki Knowledge Capture
## Flow
```
Task execution → LGTM confirmed → Distill to Wiki → Future tasks reference
     ↓                ↓                 ↓                    ↓
  Concrete work    Validated       Abstract pattern      Quick lookup
```

## Wiki Types
| Directory | Purpose | Example |
|-----------|---------|---------|
| `01-patterns/` | Reusable solutions | CSS Flex alignment pattern |
| `02-faq/` | Common questions | Why does Grid squeeze labels? |
| `03-lessons/` | Retrospective insights | Epic post-mortem |

## When to Create Wiki Entries
Only after success is confirmed (LGTM). Do not speculatively document
patterns that haven't been validated in practice.
## Wiki Entry Structure
```markdown
# Pattern: Descriptive Title
## Problem
What recurring situation does this address?
## Solution
The reusable approach.
## Source
Discovered in TASK-XXX during EPIC-YYY.
## Usage
How to apply this in future tasks.
```
## Referencing Wiki from Tasks
When starting a new task, search for existing patterns:
```bash
ls cortex/wiki/01-patterns/ | grep <keyword>
```
Reference in the task's Technical Approach section:
```markdown
## Technical Approach
Per cortex/wiki/01-patterns/css-flex-alignment.md, use Flex + fixed width...
```

## Principles
- **Capture after validation** — LGTM first, wiki second
- **Link back to source** — always reference the originating task/epic
- **Search-friendly names** — clear file names and titles
- **Living documents** — update patterns as understanding deepens
