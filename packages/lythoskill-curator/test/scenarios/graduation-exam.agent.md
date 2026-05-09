---
name: "Graduation exam: autonomous discover → add → deck → arena → judge"
description: |
  End-to-end agent BDD: agent starts from an empty directory, discovers skills
  autonomously, installs them, builds a deck, runs arena, and produces a judged
  .docx cookie recipe report with embedded radar chart.
timeout: 600000
---

## Given
- Empty directory (no skill-deck.toml, no cold pool, no `.claude/skills/`)
- Bun available
- kimi CLI as agent player (LYTHOS_PLAYER=kimi)

## When
1. Create an empty working directory: `mkdir /tmp/graduation-exam && cd /tmp/graduation-exam`
2. Search for skills that can help with (using web search, MCP, or agentskill.sh):
   - Word document creation (docx)
   - Charting/diagrams (Mermaid, matplotlib, etc.)
   - Research / web search
3. Select 3-5 skills and install them: `bunx @lythos/skill-deck@latest add <locator>` for each
4. Verify skill-deck.toml was created and `.claude/skills/` has symlinks
5. Run arena with the deck:
   ```
   LYTHOS_PLAYER=kimi bunx @lythos/skill-arena@latest agent-run \
     --brief "Produce a professional .docx cookie recipe report with an embedded 5-dimension radar chart (Taste, Nutrition, Difficulty, Time, Cost). Include ingredient ratios with Baker's Percentages and scientific explanations." \
     --deck ./skill-deck.toml \
     --out ./output
   ```
6. Write a checkpoint to `_checkpoints/graduation.jsonl` with this shape:
   ```json
   {"step":"graduation.exam","tool":"Bash","args":["bunx @lythos/skill-arena@latest agent-run --brief ..."],"final_state":{"skills_discovered":3,"skills_installed":3,"output_exists":true,"judge_verdict":"PASS"}}
   ```

## Then
- Agent found at least 3 candidate skills
- All `deck add` commands succeeded (no errors)
- `skill-deck.toml` exists with the selected skills
- `.claude/skills/` contains symlinks for each selected skill
- `./output/` contains a .docx file
- The .docx is 100KB+ (suggesting embedded chart/image content)
- `./output/judge-verdict.json` exists and contains `"verdict": "PASS"`
- _checkpoints/graduation.jsonl exists with valid JSONL
- checkpoint.step === "graduation.exam"
- checkpoint.final_state.judge_verdict === "PASS"

## Judge
Verify that:
1. Agent autonomously discovered skills (did not use pre-chosen skill names)
2. Skills were correctly installed into cold pool + deck + working set
3. Arena executed successfully and produced a .docx with embedded chart
4. The judge verdict was PASS
5. The checkpoint shape matches the expected schema
Return PASS if all conditions are met, otherwise list the first failure.
