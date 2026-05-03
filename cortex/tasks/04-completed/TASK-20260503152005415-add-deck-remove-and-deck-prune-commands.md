# TASK-20260503152005415: Add deck remove and deck prune commands

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 Decision B (lifecycle closure) |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

声明层和物料层目前各只有 add 进、update / refresh 刷新,缺出口和 GC。ADR-20260503152000411 Decision B 补两个命令:
- `deck remove`:声明层删 — 从 deck.toml 拿掉条目并 unlink working set
- `deck prune`:物料层 GC — 删 cold pool 中已无任何 deck 引用的条目

每条命令副作用单层,不跨轴。

## 需求详情

### `deck remove <fq|alias>`
- [ ] 解析 fq 或 alias → 定位 deck.toml 条目(`[[<type>.skills]]` 块)
- [ ] 删该块,写回(用 `@iarna/toml` stringify)
- [ ] 删 working set symlink `.claude/skills/<alias>/`
- [ ] **不动 cold pool**(用户后续可手动 prune)
- [ ] 找不到对应条目 → 报错并退出
- [ ] 多 deck.toml 场景:与 `--deck` 选项配合(沿用 add / link 的约定)

### `deck prune`
- [ ] 扫所有当前已知 deck.toml(`--deck` 显式 / cwd 默认)+ 它的引用集合
- [ ] 列出 cold pool 中无引用的条目(go-module 形完整路径 + 大小)
- [ ] 交互确认(`--yes` 跳过)
- [ ] 删除被确认的条目
- [ ] **不动 deck.toml / working set**

## 技术方案
- 新增 `remove.ts` 和 `prune.ts`,在 `cli.ts` 注册
- `remove`:复用 schema parser 拿到所有 entries → match by path / alias → splice → write
- `prune`:扫 cold pool 目录树,collect 所有 `<host>/<owner>/<repo>/` 第三层路径,与 declared paths 求差集
- prune 默认只看当前 cwd 下的 deck.toml(避免误删别项目的依赖);加 `--all-decks` 选项时扫已知所有 deck(后续工作)
- 交互确认看 monorepo 是否已有 `prompts` / `readline` 之类的依赖,有则复用

## 验收标准
- [ ] `deck remove github.com/foo/bar/baz` 删 deck.toml 对应块 + 删 symlink,cold pool 路径仍在
- [ ] `deck remove tdd-foo`(by alias)同上
- [ ] `deck remove <不存在>` 退出 non-zero,信息明确
- [ ] `deck prune` 列出 cold pool 中已无引用的条目,确认后删除
- [ ] `deck prune --yes` 不交互直接删
- [ ] prune 不删 declared 条目(即便 working set 缺 symlink)
- [ ] prune 不动 deck.toml

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 新增: `packages/lythoskill-deck/src/remove.ts`、`packages/lythoskill-deck/src/prune.ts`、对应 test
- 修改: `packages/lythoskill-deck/src/cli.ts`、`packages/lythoskill-deck/skill/SKILL.md`(命令表)

## Git 提交信息建议
```
feat(deck): add remove and prune commands (TASK-20260503152005415)

- `remove <fq|alias>` — delete deck.toml entry + unlink working set
- `prune` — GC cold pool entries no longer referenced; interactive confirm
- Strict per-axis side effects (no cross-axis writes)
- Implements ADR-20260503152000411 Decision B
```

## 备注
- 依赖 TASK-20260503152001333(parser)+ TASK-20260503152002342(alias resolver)
- prune 跨多 deck.toml 的扫描后续可独立讨论
