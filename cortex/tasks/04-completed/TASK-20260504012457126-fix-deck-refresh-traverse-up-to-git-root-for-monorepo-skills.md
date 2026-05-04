# TASK-20260504012457126: fix deck refresh: traverse up to git root for monorepo skills

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-04 | Created — 用户旁路登记，可随 BDD 复现 |
| in-progress | 2026-05-04 | Pulled from backlog — urgent, affects all monorepo skills |
| completed | 2026-05-04 | F1-F4 全落地,21 BDD pass,regression test 3 pass |

## 背景与目标

`deck refresh` 在 monorepo 结构的 skill 上全部报 `Not a git repository`，导致 0 个 skill 能被更新。

根因：`refresh.ts` 的 `isGitRepo(path)` 只在 skill 子目录查找 `.git`（如 `~/.agents/skill-repos/github.com/lythos-labs/lythoskill/skills/lythoskill-deck/`），但 monorepo 的 git 根在上一层（`.../lythoskill/`）。`deck add` 确实是 `git clone` 到 repo 根的，只是 skill 子目录本身没有 `.git`。

影响范围：lythoskill 全系（`lythoskill-deck`、`lythoskill-creator`、`lythoskill-project-cortex` 等）以及 `tdd`（`github.com/mattpocock/skills` monorepo）全部受影响。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 C | deck 命令层验证范围 |
| 源文件 | `packages/lythoskill-deck/src/refresh.ts` | `isGitRepo` / `gitPull` / `refreshDeck` 实现 |
| ADR | `cortex/adr/02-accepted/ADR-20260503152004433-...md` | refresh 命令的 CLI 表面行为定义 |
| 关联任务 | `cortex/tasks/01-backlog/TASK-20260503235013705-...md`(T5) | refreshDeck 测试，本修复的回归测试可落在 T5 |

## 需求详情

- [x] **F1** 修复 `isGitRepo` / `refreshDeck` 向上回溯 git 根
  - 当前: `isGitRepo(dir)` 检查 `join(dir, '.git')` exists
  - 改为: 用 `git rev-parse --show-toplevel`（在 skill 目录执行）找到 git 根，或向上遍历 parent 目录直到找到 `.git` 或到达 cold_pool 边界
  - 在找到的 git 根执行 `git pull`，而非 skill 子目录

- [x] **F2** 保持 `localhost/*` 跳过行为
  - `localhost/*` 技能是非 git 管理的本地 skill，`refresh` 应继续跳过，不抛错
  - 当前行为已正确，修复时不要破坏

- [x] **F3** 非 git 安装的 skill（非 monorepo、非 localhost）给出清晰提示
  - 若遍历后仍找不到 `.git`（例如用户手动 `cp` 进 cold pool 的 skill），stdout/stderr 给出 "skipped: not a git repository" 提示
  - 不静默跳过——用户对 "为什么没刷新" 有知情权；`localhost/*` 除外（正常跳过）

- [x] **F4** 回归测试
  - 在 `refresh.test.ts`（T5）或本修复 commit 中追加 monorepo 场景的 test
  - 构造: cold pool 中 `repo/skills/skill-a/` 布局，`.git` 在 `repo/` 根
  - 断言: `refreshDeck` 成功执行 `git pull`（或报告 up-to-date），不再报 `Not a git repository`

## 技术方案

当前 `refresh.ts` 代码（line 24-45）:
```typescript
function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, ".git"));
}
function gitPull(dir: string): { status: "updated" | "up-to-date" | "failed"; message: string } {
  // cwd: dir
}
```

修改方案（推荐 `git rev-parse`，更可靠）：
```typescript
function findGitRoot(dir: string): string | null {
  try {
    const out = execSync("git rev-parse --show-toplevel", {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}
```

然后在 `refreshDeck` 的 loop 中：
```typescript
const gitRoot = findGitRoot(path);
if (!gitRoot) {
  // not-git 处理
  continue;
}
const pullResult = gitPull(gitRoot);
```

**备选方案（纯 fs 遍历）**: 若不想引入 `execSync` 调用，可从 skill 目录向上遍历到 cold_pool 根，检查每个 parent 是否有 `.git`。但 `git rev-parse` 更可靠（处理 `.git` 文件式 submodule 等 edge case）。

**FQ path 辅助验证**: 迁移后的 alias-as-key dict schema 中，skill 的 `path` 是 FQ 路径（如 `github.com/lythos-labs/lythoskill/skills/lythoskill-deck`）。前三段 `host/owner/repo` 就是 git 仓库根，可作为辅助验证或 fallback。

## 验收标准

- [x] `bunx @lythos/skill-deck refresh` 对 lythoskill 系 monorepo skill 能正确执行 `git pull`（或报告 up-to-date），不再报 `Not a git repository`
- [x] `refresh` 对 `localhost/*` 非 git skill 仍然正确跳过
- [x] `link` 行为不变（本修复只改 `refresh`，不改 reconciler）
- [x] `bun test packages/lythoskill-deck` 如已有 refresh 相关测试则仍通过
- [x] 新增/更新的 monorepo 回归测试通过
- [x] `bun run test:all` 未被破坏

## 进度记录
- 2026-05-04 02:25: F1 实现 — `isGitRepo` → `findGitRoot(dir, coldPool)`，用 `git rev-parse --show-toplevel` + `realpathSync` 边界检查
- 2026-05-04 02:30: 第一次 regression：`git rev-parse` 在 BDD sandbox 中找到外层 lythoskill repo 根 → 加上 `resolvedRoot.startsWith(resolvedColdPool)` 边界约束
- 2026-05-04 02:35: 第二次 regression：`resolve()` 不解析 macOS `/var` → `/private/var` 符号链接 → 改用 `realpathSync`
- 2026-05-04 02:40: 新建 `refresh.test.ts` 含 3 个 it()；`bun run test:all` 34 pass 全绿

## 关联 Epic
- [EPIC-20260503234346583](../../epics/01-active/EPIC-20260503234346583-backfill-unit-test-coverage-for-deck-via-tdd.md) — 本 bug 属于 deck verification 主题 C（命令层 `refreshDeck()`）

## 关联文件
- 修改:
  - `packages/lythoskill-deck/src/refresh.ts`（`isGitRepo` → `findGitRoot`，`refreshDeck` loop 中使用 gitRoot）
  - `packages/lythoskill-deck/src/refresh.test.ts`（若 T5 已落地，追加 monorepo 回归测试；否则在本修复 commit 中新增）
- 新增: 无

## Git 提交信息建议
```
fix(deck): refresh traverses up to git root for monorepo skills (TASK-20260504012457126)

- Replace isGitRepo(path) with findGitRoot(path) via git rev-parse
- git pull executes at repo root, not skill subdir
- localhost skills still correctly skipped
- Not-git skills report clear skip reason instead of silent pass
- Monorepo regression test: cold_pool/repo/skills/skill with .git at repo/

Closes: TASK-20260504012457126
```

## 备注

- **最小修改原则**: 只改 `refresh.ts`，不动 `link.ts` / `add.ts` / `cli.ts`。
- **与 T5 的关系**: 若 T5 在本修复之前执行，`refresh.test.ts` 可能尚未存在。此时本修复 commit 可附带一个最小回归测试（1 个 `it()`），T5 后续再扩更多 refresh 场景。
- **与 T9 的关系**: T9 的 `deck-refresh.agent.md` scenario 会自然覆盖 monorepo refresh，可作为端到端验证。
- **向后兼容**: `git rev-parse --show-toplevel` 在 git ≥ 1.7 就存在，所有合理环境都支持。
