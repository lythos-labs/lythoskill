# Skill Repo States — Cold Pool Lifecycle

> Finite state machine for skills in the cold pool. Every skill converges toward **git-managed** as the desired state.

## States

| State | Definition | How to detect |
|-------|-----------|---------------|
| **absent** | Not in cold pool at all | `deck link` reports `Skill not found` |
| **git-managed** | Git repo with remote origin | `ls .git/` exists, `git remote -v` returns a URL |
| **orphan** | Present in cold pool but **not** a git repo | Directory exists, no `.git/` subdirectory |
| **detached** | Git repo but no remote origin | `.git/` exists, `git remote -v` returns empty |
| **diverged** | Git repo with uncommitted local changes | `git status --short` returns non-empty |
| **stale** | Git repo, behind upstream | `git log HEAD..origin/main --oneline` returns commits |

## Convergence Paths

```
absent ──deck add────► git-managed
                       ▲
orphan ──re-clone─────┤
                       │
detached ──add remote─┤
                       │
diverged ──stash/pull─┤
                       │
stale ────git pull────┘
```

### Path Details

| From | To | Command | Notes |
|------|-----|---------|-------|
| absent | git-managed | `bunx @lythos/skill-deck add <locator>` | Clones repo into cold pool |
| absent | git-managed | `git clone <url> ~/.agents/skill-repos/...` | Manual, same result |
| orphan | git-managed | `rm -rf <skill-dir> && deck add <locator>` | Orphan cannot be updated |
| orphan | git-managed | `cd <skill-dir> && git init && git remote add origin <url> && git fetch` | Rescue orphan in-place |
| detached | git-managed | `git remote add origin <url> && git fetch` | Re-attach to upstream |
| diverged | git-managed | `git stash && git pull` | Preserve local changes or discard |
| stale | git-managed | `bunx @lythos/skill-deck update` | Pulls all declared skills at once |

## State Detection Commands

```bash
# Check a single skill
cd ~/.agents/skill-repos/github.com/owner/repo/skills/skill-name
[ -d .git ] && echo "git-managed or detached" || echo "orphan"
git remote get-url origin 2>/dev/null || echo "detached — no remote"

# Check all declared skills
cd /path/to/project
bunx @lythos/skill-deck update
# Reports: updated | up-to-date | skipped (localhost) | not-git (orphan)
```

## Troubleshooting by State

| Symptom | Likely State | Fix |
|---------|-------------|-----|
| `deck update` says "Not a git repository" | orphan | Re-clone with `deck add` or `git clone` |
| `deck update` says "skipped — localhost" | localhost (intentional) | No action needed; user-managed |
| `deck update` fails with merge conflict | diverged | `cd <skill-dir> && git reset --hard HEAD && git pull` |
| `deck link` says "Skill not found" | absent | `deck add <locator>` |
| Agent uses outdated skill after `update` | working set stale | Run `deck link` after `update` |
