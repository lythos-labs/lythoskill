# Output Format Variants
## With Fresh Handoff (Recommended Path)
```
已复盘项目上下文：

📋 Project: lythoskill (Bun + TypeScript monorepo)
📌 Version: v0.1.9 (git: abc1234)
📄 Source: daily/2026-04-24.md (git_commit match: ✅)
⚠️ Pitfalls: sed -i incompatible on macOS; use Edit tool instead
🎯 Current: TASK-20260424120000000 — Restructure SKILL.md files
💡 Next: Build all skills, run deck link, verify symlinks
✅ Verification: git state matches handoff

有什么可以帮你的？
```

## With Stale Handoff
```
已复盘项目上下文：

📋 Project: lythoskill (Bun + TypeScript monorepo)
📌 Version: v0.1.9 (git: def5678)
📄 Source: daily/2026-04-22.md (git_commit mismatch: ⚠️)
⚠️ Handoff is 2 days old and HEAD has diverged.
   Handoff context used as background; real-time state takes precedence.
🎯 Current: unknown (handoff stale, checking cortex...)
💡 Next: Run `bunx @lythos/project-cortex list` to identify active tasks

⚠️ Warning: Handoff may be outdated. Verified against git — using live state.

有什么可以帮你的？
```

## Without Handoff (Degraded)
```
已复盘项目上下文：

📋 Project: lythoskill (Bun + TypeScript monorepo)
📌 Version: v0.1.9 (git: ghi9012)
⚠️ No daily handoff found. Restored from file exploration.
🎯 Current: EPIC-20260423102000000 active, 3 tasks in backlog
💡 Next: Check cortex/tasks/01-backlog/ for priority
⚠️ Warning: No handoff found — session-specific pitfalls may be lost.

有什么可以帮你的？
```

## Edge Cases
**Empty daily file**: Treat as missing handoff. Degrade to exploration.

**daily/ directory doesn't exist**: Project never used scribe. This is normal
for projects that only use cortex. Degrade to exploration silently.
**Multiple daily files from today**: Read the latest one (by filename sort).
Within a single file, if multiple handoff sections exist, read the last one.
