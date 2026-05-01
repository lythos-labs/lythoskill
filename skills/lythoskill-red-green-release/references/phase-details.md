# Phase-by-Phase Detail
## Phase 1: Plan
1. Understand user's requirement (what's broken, what's wanted)
2. Create a plan (mental or written) for the approach
3. Describe the plan to the user
4. Wait for user confirmation: "确认设计" / "go ahead"
Do not start writing code until the approach is confirmed.

## Phase 2: Create Patch (Dry-Run)
1. Create `pr-<timestamp>-<desc>.sh`
2. Include in the patch:   - `mkdir -p archived-patches` (idempotent)
   - Backup of all files being modified (`.bak` with date)
   - Heredoc `cat >` blocks for every modified file (full content)   - Self-archive logic: `cp "$0"` + `rm "$0"`
3. Show the patch to the user for review
4. Wait for "apply it" / "可以应用"
## Phase 3: Apply & Test
```bash
bash pr-<timestamp>-<desc>.sh
```

After execution:
- Original files are backed up in `archived-patches/`
- New content is written to target files
- Patch file is moved to `archived-patches/`
- Patch file is deleted from project root

Then:
- Restart service if needed
- User tests the changes
- If issues: go back to Phase 2, create a new patch
- If green: proceed to Phase 4

## Phase 4: Accept & Tag
User signals acceptance (LGTM, 对了, etc.):

```bash
git add -A
git commit -m "<type>(<scope>): <description>
- Detail 1
- Detail 2"
git tag -a v<X.Y.Z> -m "<description>"
```

Tag format: semantic versioning. User decides the version number.

## Iteration Pattern
```
Phase 2 → Phase 3 → user tests → issues? → Phase 2 (new patch)
                                    ↓ no issues
                               Phase 4 (tag)
```

Typical iteration count: 1–3 patches before LGTM.
