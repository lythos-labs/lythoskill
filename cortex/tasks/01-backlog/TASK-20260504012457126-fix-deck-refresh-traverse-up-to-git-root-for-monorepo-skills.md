# TASK-20260504012457126: fix deck refresh: traverse up to git root for monorepo skills

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

`deck refresh` 在 monorepo 结构的 skill 上全部报 `Not a git repository`，导致 0 个 skill 能被更新。

根因：`refresh` 只在 skill 子目录（如 `~/.agents/skill-repos/github.com/lythos-labs/lythoskill/skills/lythoskill-deck/`）查找 `.git`，但 monorepo 的 git 根在上一层（`.../lythoskill/`）。`deck add` 确实是 `git clone` 来的，只是 skill 本身不是独立仓库。

影响范围：lythoskill 全系（`lythoskill-deck`、`lythoskill-creator`、`lythoskill-project-cortex` 等）以及 `tdd`（`github.com/mattpocock/skills` monorepo）全部受影响。

## 需求详情
- [ ] 在 `refresh` 逻辑中用 `git rev-parse --show-toplevel` 向上回溯找到 git 根目录
- [ ] 在 git 根执行 `git pull` 而非 skill 子目录
- [ ] 确保非 git 目录（如 `localhost/*`）仍然正确跳过，不抛错 —— 当前行为已正确（`localhost/*` 大概率是 `cp` 放入的本地 skill，`refresh` 本来就不会碰）
- [ ] 若遍历后仍找不到 `.git`（非 git 安装的 skill），给出清晰提示告知用户原因——这对用户来说很意外，不应静默跳过；`localhost/*` 本地 skill 除外（正常跳过）
- [ ] 更新 `refresh` 的单测（如有）覆盖 monorepo 场景

## 技术方案

当前 `refresh` 大概率直接在 skill 路径上执行 `git` 命令（或检查 `path.join(skillPath, '.git')` exists）。改为：

```typescript
// 伪代码
const gitRoot = execSync('git rev-parse --show-toplevel', { cwd: skillPath })
  .toString().trim();
// 在 gitRoot 执行 git pull
```

或用 `findUp('.git', { cwd: skillPath })` 找到 git 根后再执行操作。

**补充思路（deck toml path 可推断 repo 位置）**：
迁移后的 alias-as-key dict schema 中，每个 skill 的 `path` 是 FQ 路径，例如：
```toml
[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

从这个 path 可以进一步推断 git repo 的根目录位置（`github.com/lythos-labs/lythoskill/`），作为辅助验证或 fallback。不一定只依赖在 cold pool 目录中盲目回溯 `.git`。

不同上游仓库的组织方式各异（`gstack/*` 独立 repo、`mattpocock/skills` monorepo、`obra/superpowers` 单 skill 等），但 FQ path 的前三段 `github.com/<owner>/<repo>` 就是 git 仓库根——一次正则/路径分割即可提取，无需遍历目录。

参考：
- `packages/lythoskill-deck/src/` 中的 `refresh` 实现
- ADR-20260503152004433（rename deck update to refresh）已定义 `refresh` 的 CLI 表面行为

## 验收标准
- [ ] `bunx @lythos/skill-deck refresh --all` 对 lythoskill 系 monorepo skill 能正确执行 `git pull`（或报告 up-to-date），不再报 `Not a git repository`
- [ ] `refresh` 对 `localhost/*` 非 git skill 仍然正确跳过
- [ ] `link` 行为不变（本修复只改 `refresh`，不改 reconciler）
- [ ] `bun test packages/lythoskill-deck` 如已有 refresh 相关测试则仍通过

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联 Epic
- [EPIC-20260503234346583](../../epics/01-active/EPIC-20260503234346583-backfill-unit-test-coverage-for-deck-via-tdd.md) — 本 bug 属于 deck verification 主题 C（命令层 `refreshDeck()`）

## 关联文件
- 修改: `packages/lythoskill-deck/src/`（refresh 实现文件，需定位具体路径）
- 新增: 无

## Git 提交信息建议
```
feat(scope): description (TASK-20260504012457126)

- Detail 1
- Detail 2
```

## 备注
