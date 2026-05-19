# TASK-20260519144445916: Symlink pollution cleanup

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Discovered during sober deck add + skills/ audit |
| in-progress | 2026-05-19 | Cleanup in progress |
| completed | 2026-05-19 | Closed via commit 64d0d41 |

## 背景与目标

Agent 误将 `skill-deck.toml` 的 `working_set` 从 `".claude/skills"` 改为 `"skills"`，导致 `deck link` 在 build output 目录里创建符号链接。随后 agent 将这些符号链接提交到 git，造成 cold pool 路径泄漏。

## 发现的问题

1. **working_set = "skills"** — 与 thin pattern 的 build output 目录冲突
2. **`.agents/skills/` × 15 符号链接** — 全部指向 `/Users/chariots/.agents/skill-repos/...` 的绝对路径
3. **`skills/diagnose` 和 `skills/tdd`** — 外部 mattpocock 技能以符号链接形式混入 build output

## 修复内容

- [x] 恢复 `working_set = ".claude/skills"`
- [x] `git rm` 17 个符号链接（`.agents/skills/` × 15 + `skills/` × 2）
- [x] `build --all` 重建 12 个包的 build output
- [x] 添加 husky pre-commit guard：阻止 `skills/` 里的符号链接和多余条目
- [x] `.gitignore` 防御性加入常见 CLI working_set 路径
- [x] 添加 artifact lockfile 忽略规则
- [x] 将 `lythoskill-sober` 加入 deck.toml 作为 innate skill
- [x] 更新 curator Discovery SOP（加入 `bunx skills find`）
- [x] 更新 AGENTS.md recent decisions

## 关联提交

```
64d0d41 chore: cleanup agent-caused symlink pollution + add skills/ purity guard
```

## 关联 ADR

- ADR-20260519144445916: working_set Must Not Alias Build Output Directory
