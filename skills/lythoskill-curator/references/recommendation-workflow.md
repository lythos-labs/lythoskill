# Agent Recommendation Workflow
When the user asks "recommend a deck" or "what skills should I use for X":
## Step 1: Verify Index Exists
Check for `catalog.db` or `REGISTRY.json` at expected paths.
If missing, prompt the user to run `bunx @lythos/skill-curator` first.

## Step 2: Query the Index
Use SQL for targeted searches or read REGISTRY.json for full enumeration.
Key queries:
- By niche: find skills relevant to the user's domain
- By managed_dirs: detect potential conflicts with existing deck
- By type: separate standard tools from flow orchestrators
## Step 3: LLM Reasoning with Project Context
Combine index data with what you know about the project:
- Tech stack (from package.json, CLAUDE.md, etc.)
- Current deck (from skill-deck.toml)
- User's immediate task
- Team size and workflow style

## Step 4: Output Tiered Recommendations
```
🔴 Core (must-have for this project type):
   project-cortex, repomix-handoff

🟡 Force Multipliers (amplify core skills):
   report-generation-combo, epic-tree

🟢 Optional (useful but not critical):
   dev-logging, project-scribe
```

Why a **pool** not a fixed set: you have task-specific context that curator
cannot anticipate. Some skills are "force multipliers" (routing, visualization)
rather than core executors. The tiered pool lets you make final selection.

## Step 5: Apply to Deck
Edit `skill-deck.toml` with the selected skills, then run `deck link`.
Only append — do not remove existing declarations without user confirmation.
If same-niche skills already exist, flag and suggest arena comparison.
