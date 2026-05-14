# TASK-20260510202837850: cold-pool P2 reliability — git timeout, symlink loop, truncated tree, prefix matching, cloneUrl protocol

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-10 | Created |
| completed | 2026-05-10 | Completed — commit bdd8069 |

## 背景与目标

Cold-pool 在真实网络环境和大数据量场景下有五个可靠性缺口，需要加固：

1. **Git 无超时** — `git clone`/`git pull` 在网络异常时会无限挂起
2. **Symlink 循环** — `calculateDirSize` 遇到符号链接可能陷入循环
3. **Truncated tree** — GitHub Tree API 返回 `truncated: true` 时未处理，可能导致 skill 发现不完整
4. **Prefix matching 碰撞** — `startsWith` 前缀匹配可能误判（如 `foo` 匹配 `foobar`）
5. **Clone URL 协议硬编码** — 始终使用 `https://`，不支持内部 Git 仓库的 `ssh://` 或 `http://`

## 需求详情

- [x] Git 操作添加 timeout 参数（clone 默认 120s，pull 默认 30s）
- [x] `calculateDirSize` 跳过符号链接
- [x] Tree API 返回 truncated 时标记 `status: 'incomplete'` 并给出重试指引
- [x] 比较 locator 时使用 `(host, owner, repo)` 三元组而非字符串前缀
- [x] 支持 `LYTHOS_GIT_PROTOCOL` 环境变量覆盖默认协议

## 技术方案

| 修复项 | 实现 | 文件 |
|--------|------|------|
| Git timeout | `GitCloneOptions.timeout?: number`，clone 默认 120_000ms，pull 默认 30_000ms | `git-io.ts:33,48,63` |
| Symlink loop | `if (entry.isSymbolicLink()) continue` | `prune-plan.ts:57` |
| Truncated tree | 检测 `tree.truncated`，返回 `status: 'incomplete'`，提示 retry with non-recursive paging | `validate-plan.ts:103-114` |
| Prefix matching | 比较 `(host, owner, repo)` tuple 而非 `startsWith` | `cli.ts:174-182` |
| CloneUrl protocol | `process.env.LYTHOS_GIT_PROTOCOL || 'https'` | `fetch-plan.ts:25` |

## 验收标准

- [x] `git-io.ts` 所有 git 调用带 timeout
- [x] `prune-plan.ts` 符号链接被跳过
- [x] `validate-plan.ts` truncated tree 返回 incomplete 状态
- [x] `cli.ts` 无 `startsWith` 前缀碰撞风险
- [x] `fetch-plan.ts` 支持 `LYTHOS_GIT_PROTOCOL=http` 生成 `http://` clone URL

## 进度记录

- 2026-05-10: 五项修复合并入 sweep commit `bdd8069`

## 关联文件

- 修改: `packages/lythoskill-cold-pool/src/git-io.ts`
- 修改: `packages/lythoskill-cold-pool/src/prune-plan.ts`
- 修改: `packages/lythoskill-cold-pool/src/validate-plan.ts`
- 修改: `packages/lythoskill-cold-pool/src/cli.ts`
- 修改: `packages/lythoskill-cold-pool/src/fetch-plan.ts`

## Git 提交信息建议
```
fix(cold-pool): P2 reliability — timeout, symlink guard, truncated tree, prefix tuple, protocol override (TASK-20260510202837850)
```
