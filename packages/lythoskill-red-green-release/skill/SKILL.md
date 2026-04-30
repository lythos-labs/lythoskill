---
name: lythoskill-red-green-release
version: 0.6.0
description: |
  User-acceptance-driven release workflow using heredoc patch files.  Each iteration produces a timestamped pr-<timestamp>-<desc>.sh that  self-archives after execution. No tag without explicit user LGTM.  Supports rollback via archived backups.
when_to_use: |
  LGTM, ship it, looks good, tag it, rollback, broke it, create patch,  apply changes, version release, 对了, 就是这样, 我觉得ok, 可以打tag,  改坏了, 回滚, 打tag.
---
# Red-Green Release Workflow
> No tag without LGTM. Every change is a self-archiving patch. Every state is rollback-able.
## Core Principles
1. **User acceptance drives releases** — "LGTM" / "对了" / "就是这样" → then and only then commit + tag.
2. **Atomic patches** — Each iteration = one `pr-<timestamp>-<desc>.sh` with heredoc content replacement.
3. **Self-archiving** — Patch copies itself to `archived-patches/` and deletes itself after execution.
4. **Rollback-ready** — Every patch backs up originals before modifying. Rollback = restore backup.
## Workflow (4 Phases)
**Phase 1 — Plan**: Understand requirement, describe approach, user confirms design.
**Phase 2 — Create Patch (dry-run)**: Write `pr-<timestamp>-<desc>.sh` containing
backup + heredoc replacement + self-archive logic. Show to user for review.
User says "apply it" → proceed.
**Phase 3 — Apply & Test**: Execute patch (`bash pr-*.sh`). Restart service.
User tests. If issues → back to Phase 2 with a new patch. Iterate until green.
**Phase 4 — Accept & Tag**: User says LGTM →
```bash
git add -A
git commit -m "<summary>"
git tag -a <tag> -m "<summary>"
```
## Patch File Format
### Naming
```
pr-<timestamp>-<description>.sh
```
**Forbidden words in description**: `final`, `done`, `fix`, `ok`. These words
encourage skipping the red-green test cycle by implying pre-verified success.
### Template
```bash
#!/bin/bash
# PR: <timestamp>-<description>
# 1. Create archive directory
mkdir -p archived-patches
# 2. Backup current files (for rollback)
cp src/target.ts "archived-patches/target.ts.$(date +%Y%m%d).bak"
# 3. Apply changes (declarative full-file replacement via heredoc)
cat > src/target.ts << 'PATCH_EOF'
// Full replacement content here — exact file state after patch
PATCH_EOF
# 4. Self-archive: copy patch to archive, then delete from root
cp "$0" "archived-patches/$(basename "$0")"
rm "$0"
```

> ⚠️ Heredoc delimiter (`PATCH_EOF`) must be quoted in the `cat` command to prevent variable expansion. See [references/archive-format.md](./references/archive-format.md) for multi-file patches and escaping rules.

## Supporting References
Read these **only when the specific topic arises**:

| When you need to… | Read |
|--------------------|------|
| See complete heredoc syntax, multi-file patches, and escaping rules | [references/archive-format.md](./references/archive-format.md) |
| Understand the 4-phase workflow in detail | [references/phase-details.md](./references/phase-details.md) |
| See conversation examples of red-green iterations | [references/conversation-examples.md](./references/conversation-examples.md) |
