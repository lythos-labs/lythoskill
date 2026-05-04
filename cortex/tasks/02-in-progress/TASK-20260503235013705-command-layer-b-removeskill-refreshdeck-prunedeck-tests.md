# TASK-20260503235013705: Command layer B: removeSkill, refreshDeck, pruneDeck tests

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-04 | Pulled from backlog — T4 done, remove/refresh/prune next |

## 背景与目标

T4(`TASK-20260503235012454`)已覆盖 `validateDeck` + `addSkill`。本卡完成命令层剩余三个公共接口：`removeSkill`、`refreshDeck`、`pruneDeck`。

这三个命令构成 deck CRUD 的"后半段"：
- `removeSkill`: 声明层删除（deck.toml 清理 + symlink 删除，不动 cold pool）
- `refreshDeck`: 上游刷新（git pull，有 network 副作用）
- `pruneDeck`: 冷池 GC（交互式确认 + `--yes` 强制）

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 C | 范围、共同纪律 |
| 前序任务 | `cortex/tasks/01-backlog/TASK-20260503235012454-...md`(T4) | validateDeck + addSkill 测试，sandbox 模式已验证 |
| 源文件 | `packages/lythoskill-deck/src/remove.ts` | `removeSkill` 实现 |
| 源文件 | `packages/lythoskill-deck/src/refresh.ts` | `refreshDeck` 实现 |
| 源文件 | `packages/lythoskill-deck/src/prune.ts` | `pruneDeck` 实现 |
| Bug fix | `cortex/tasks/01-backlog/TASK-20260504012457126-...md` | refresh monorepo git root 修复，可能与本卡 refresh 测试重叠 |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | vertical slice; public interface only |

## 需求详情(每条 = 1 vertical slice, RED→GREEN 单独走完)

### removeSkill

- [ ] **C9** Remove by alias → deck.toml 清理 + symlink 删除 + cold pool 保留
  - 构造 sandbox: deck.toml 声明 skill-a，working set 有 symlink，cold pool 有实体
  - 调用 `removeSkill('skill-a', deckPath, projectDir)`
  - 断言: deck.toml 中无 skill-a
  - 断言: working set 中无 skill-a symlink
  - 断言: cold pool 中 skill-a 仍在

- [ ] **C10** Remove by FQ path → 同 C9，但用 FQ path 定位
  - 调用 `removeSkill('github.com/owner/repo/skill-a', ...)`
  - 断言: 同 C9

- [ ] **C11** Remove non-existent target → error
  - 调用 `removeSkill('not-in-deck', ...)`
  - 断言: 非零退出，stderr 含 `Skill not found in deck`

### refreshDeck

- [ ] **C12** Refresh all skills → git pull 在每个 cold pool repo 执行
  - 构造 sandbox: cold pool 中放 2 个带 `.git` 的 fake repo（可用 `git init` 在 tmpdir 中初始化）
  - deck.toml 声明这两个 skill
  - 调用 `refreshDeck(deckPath, projectDir)`
  - 断言: stdout 报告每个 skill 的状态（up-to-date / updated）
  - 断言: 无 `Not a git repository` 错误（若 bug fix `TASK-20260504012457126` 未先合并，此测试可能失败）

- [ ] **C13** Refresh single skill by alias → 只处理目标 skill
  - 构造 sandbox: 2 个 skill
  - 调用 `refreshDeck(deckPath, projectDir, 'skill-a')`
  - 断言: 只报告 skill-a 的状态，skill-b 未被处理

- [ ] **C14** Refresh with updated skills → triggers linkDeck
  - 构造 sandbox: 1 个 skill，修改其 `SKILL.md` 后 commit
  - 调用 `refreshDeck`
  - 断言: stdout 含 `Running deck link...`

### pruneDeck

- [ ] **C15** Prune with unreferenced repos → 列出候选，交互确认后删除
  - 构造 sandbox: cold pool 中有 2 个 repo，deck.toml 只引用 1 个
  - 调用 `pruneDeck(deckPath, projectDir, true)`（`--yes` 跳过交互）
  - 断言: 未引用的 repo 被删除
  - 断言: 引用的 repo 保留

- [ ] **C16** Prune with all referenced → no-op
  - 构造 sandbox: cold pool 中 repo 全部被 deck 引用
  - 调用 `pruneDeck(..., true)`
  - 断言: stdout 含 `Nothing to prune`
  - 断言: exit 0

## 技术方案

- **位置**:
  - `packages/lythoskill-deck/src/remove.test.ts`
  - `packages/lythoskill-deck/src/refresh.test.ts`
  - `packages/lythoskill-deck/src/prune.test.ts`
- **沙箱**: 同 T1-T4 的 `mkdtempSync` + `afterEach`
- **removeSkill**: 零 network，纯 fs 操作，和 T2 同难度
- **refreshDeck**: 需要 fake git repo。
  - 在 tmpdir 中用 `spawnSync('git', ['init'])` + `spawnSync('git', ['commit', '--allow-empty', '-m', 'init'])` 创建合法 git repo。
  - 若 `TASK-20260504012457126`(monorepo git root)已修复，需额外构造 monorepo 布局验证向上回溯。
  - 若 bug fix 未合并，C12 可能失败——此时将 C12 标记为 `// skipped until bug fix`。
- **pruneDeck**: `pruneDeck` 是 `async`（有 `confirm()` 交互）。传 `yes=true` 跳过交互。
- **process.exit**: `removeSkill` / `refreshDeck` / `pruneDeck` 内部也有 `process.exit`。同 T2-T4 的风险管理。

## 验收标准

- [ ] `remove.test.ts` 落地，3 个 `it()` 全绿
- [ ] `refresh.test.ts` 落地，3 个 `it()` 全绿
- [ ] `prune.test.ts` 落地，2 个 `it()` 全绿
- [ ] `bun test packages/lythoskill-deck/src/*.test.ts` 本地全绿
- [ ] `bun run test:all` 未被破坏
- [ ] 所有断言通过公共接口
- [ ] 每个 test 独立 tmpdir
- [ ] 进度记录段保留 RED→GREEN 节奏脚注

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: 无
- 新增:
  - `packages/lythoskill-deck/src/remove.test.ts`
  - `packages/lythoskill-deck/src/refresh.test.ts`
  - `packages/lythoskill-deck/src/prune.test.ts`

## Git 提交信息建议
```
test(deck): add command layer B tests — remove, refresh, prune (TASK-20260503235013705)

- removeSkill: by-alias, by-FQ-path, non-existent-target error
- refreshDeck: all-skills, single-target, updated-triggers-link
- pruneDeck: unreferenced-deleted, all-referenced-no-op
- git init fixture for refresh tests; --yes bypass for prune interactivity

Closes: TASK-20260503235013705
```

## 备注

- **refreshDeck 与 bug fix 的关系**: `TASK-20260504012457126` 修复 monorepo git root 回溯。若 bug fix 先合并，C12 可直接覆盖 monorepo 场景；若本卡先执行，C12 用 flat repo 测，monorepo 场景留给 bug fix 的回归测试。
- **不要**重写 `remove.ts` / `refresh.ts` / `prune.ts`。
- **不要**预写 coverage sweep（那是 T6）。
