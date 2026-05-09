---
name: "Agent switches skill mode via deck to-symlink and deck to-snapshot"
description: |
  Verify that an agent can switch a skill between snapshot (real directory)
  and symlink modes using `deck to-symlink` and `deck to-snapshot`.
  Validates that the lock file's mode field is updated correctly.
timeout: 300000
---

## Given
- A project directory at `/tmp/to-symlink-snapshot-test` with separate deck and workdir
- Cold pool at `/tmp/to-symlink-snapshot-test/cold-pool` with one valid skill:
  - `github.com/test-org/skill-x/SKILL.md` (content: "# skill-x\n\nTest skill.")
- skill-deck.toml declares skill-x with alias "skill-x"
- skill-deck.lock exists with skill-x in "symlink" mode (from `deck link`)

## When
1. Create the directory structure:
   ```
   /tmp/to-symlink-snapshot-test/
     cold-pool/
       github.com/test-org/skill-x/SKILL.md  (content: "# skill-x\n\nTest skill.")
     project/
       skill-deck.toml  (declares skill-x)
   ```

2. Run link to set up working set:
   ```
   bun packages/lythoskill-deck/src/cli.ts link --deck /tmp/to-symlink-snapshot-test/project/skill-deck.toml --workdir /tmp/to-symlink-snapshot-test/project
   ```

3. Verify initial state: `.claude/skills/skill-x` is a symlink. Confirm lock file has `mode: "symlink"`.

4. Switch the skill to snapshot mode:
   ```
   bun packages/lythoskill-deck/src/cli.ts to-snapshot skill-x --deck /tmp/to-symlink-snapshot-test/project/skill-deck.toml --workdir /tmp/to-symlink-snapshot-test/project
   ```

5. Verify snapshot state: `.claude/skills/skill-x` is a REAL DIRECTORY (not symlink), contains SKILL.md with "Test skill". Confirm lock file has `mode: "snapshot"`.

6. Switch the skill back to symlink mode:
   ```
   bun packages/lythoskill-deck/src/cli.ts to-symlink skill-x --deck /tmp/to-symlink-snapshot-test/project/skill-deck.toml --workdir /tmp/to-symlink-snapshot-test/project
   ```

7. Verify symlink state: `.claude/skills/skill-x` is a symlink again. Confirm lock file has `mode: "symlink"`.

8. Write checkpoints:
   ```json
   {"step":"deck.to-snapshot","tool":"Bash","args":["bun packages/lythoskill-deck/src/cli.ts to-snapshot skill-x --deck ..."],"final_state":{"mode":"snapshot","is_symlink":false}}
   {"step":"deck.to-symlink","tool":"Bash","args":["bun packages/lythoskill-deck/src/cli.ts to-symlink skill-x --deck ..."],"final_state":{"mode":"symlink","is_symlink":true}}
   ```

## Then
- After step 3: `.claude/skills/skill-x` is a symlink
- After step 3: `skill-deck.lock` has skill-x with `mode: "symlink"`
- After step 5: `.claude/skills/skill-x` is a real directory (NOT symlink)
- After step 5: `skill-deck.lock` has skill-x with `mode: "snapshot"`
- After step 5: `.claude/skills/skill-x/SKILL.md` contains "Test skill" (content preserved)
- After step 7: `.claude/skills/skill-x` is a symlink again
- After step 7: `skill-deck.lock` has skill-x with `mode: "symlink"`
- to-snapshot stdout contains "symlink → snapshot" or similar mode-switch message
- to-symlink stdout contains "snapshot → symlink" or similar mode-switch message
- Idempotency: running to-snapshot again says "already in snapshot mode" (no-op)
- Idempotency: running to-symlink again says "already in symlink mode" (no-op)

## Judge
Verify that:
1. to-snapshot correctly converts symlink to real directory with content preserved
2. to-symlink correctly converts real directory back to symlink
3. Lock file mode field is updated correctly after each switch
4. Both commands are idempotent (no-op when already in target mode)
5. The working set entry is functional (content accessible) in both modes
Return PASS if all conditions are met, otherwise list the first failure.
