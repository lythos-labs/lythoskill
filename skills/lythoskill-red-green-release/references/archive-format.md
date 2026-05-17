# Archive Format and Traceability
## Directory Structure
```
archived-patches/
├── pr-20260422-mobile-player.sh        # Applied patch (full heredoc content)
├── pr-20260423-fullscreen.sh
├── pr-20260424-error-handling.sh
├── pr-20260424-error-handling-edge.sh
├── route.ts.20260423.bak               # File backup before modification
└── player.tsx.20260424.bak
```

## Ordering
Patches are **partially ordered** (DAG) by timestamp. There is no semantic
dependency between patches — each is a self-contained state declaration.

Timestamp format in filename provides natural chronological sort.
No need for a separate changelog or version history file.
## Traceability
Each archived patch is a complete record:
- **When**: timestamp in filename
- **What**: heredoc content shows exact file state applied
- **Before**: `.bak` files show state before modification

To reconstruct any point in time:
1. Find the relevant `.bak` file (state before patch)
2. Find the patch file (state after patch)
3. Git tags mark user-accepted states

## Relationship with Git
Patches live outside git until LGTM. After acceptance:
- `git add -A` captures the current state (post-patch)
- `git tag` marks the accepted state
- `archived-patches/` is committed with the tag

This means `archived-patches/` in git contains the full
iteration history, while git tags mark the acceptance points.
## Cleanup
`archived-patches/` grows unbounded. Periodically clean old
backups that are no longer needed (states well before the latest tag).
Keep at least the most recent tag's backups for rollback.
