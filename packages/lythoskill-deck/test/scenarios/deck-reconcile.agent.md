---
name: "Agent detects cold-pool drift via deck reconcile"
description: |
  Verify that `deck reconcile` detects three types of drift between
  skill-deck.lock (desired state) and cold pool filesystem (actual state):
  missing repos, extra repos, and behind repos (metadata drift).
  Plan-first: reports only, no mutation.
timeout: 300000
---

## Given
- A project directory at `/tmp/reconcile-test` (cwd and deck location are SEPARATE — deck at `./project/skill-deck.toml`, workdir at `./project`)
- Cold pool at `/tmp/reconcile-test/cold-pool` with two valid repos:
  - `github.com/test-org/skill-a/SKILL.md` (referenced, clean)
  - `github.com/test-org/skill-b/SKILL.md` (referenced, behind — metadata records old HEAD)
- skill-deck.toml declares both skill-a and skill-b
- skill-deck.lock exists (from a prior `deck link`)
- Metadata DB records `skill-b` with an old HEAD ref

## When
1. Create the directory structure:
   ```
   /tmp/reconcile-test/
     cold-pool/
       github.com/test-org/skill-a/SKILL.md  (content: "# skill-a")
       github.com/test-org/skill-b/SKILL.md  (content: "# skill-b")
       github.com/test-org/orphan/SKILL.md   (content: "# orphan" — NOT in deck!)
     project/
       skill-deck.toml  (declares skill-a, skill-b)
   ```
2. Run `bun packages/lythoskill-deck/src/cli.ts link --deck /tmp/reconcile-test/project/skill-deck.toml --workdir /tmp/reconcile-test/project`
3. Manually seed metadata for skill-b with a fake old HEAD:
   ```js
   const { ColdPool } = await import('@lythos/cold-pool')
   const pool = new ColdPool('/tmp/reconcile-test/cold-pool')
   pool.metadata.recordRepoRef('github.com', 'test-org', 'skill-b', '0000000000000000000000000000000000000000')
   pool.metadata.close()
   ```
4. Run `bun packages/lythoskill-deck/src/cli.ts reconcile --deck /tmp/reconcile-test/project/skill-deck.toml --workdir /tmp/reconcile-test/project`
5. Write a checkpoint to `_checkpoints/reconcile.jsonl`:
   ```json
   {"step":"deck.reconcile","tool":"Bash","args":["bun packages/lythoskill-deck/src/cli.ts reconcile --deck /tmp/reconcile-test/project/skill-deck.toml --workdir /tmp/reconcile-test/project"],"final_state":{"missing":0,"behind":1,"extra":1}}
   ```

## Then
- stdout contains "Behind:" or "behind" (skill-b has metadata drift)
- stdout contains "Extra:" or "extra" (orphan repo not in lock)
- stdout contains "skill-b" in a behind/behind context
- stdout contains "orphan" in an extra context
- stdout does NOT contain "skill-a" in any warning/error context (it's clean)
- _checkpoints/reconcile.jsonl exists with valid JSONL
- checkpoint.step === "deck.reconcile"
- checkpoint.final_state.behind >= 1
- checkpoint.final_state.extra >= 1

## Judge
Verify that:
1. reconcile correctly detected the behind repo (skill-b with stale metadata)
2. reconcile correctly detected the extra repo (orphan not in lock)
3. reconcile correctly did NOT flag the clean repo (skill-a)
4. The plan-first approach reported without mutating the cold pool
5. The checkpoint shape matches the expected schema
Return PASS if all conditions are met, otherwise list the first failure.
