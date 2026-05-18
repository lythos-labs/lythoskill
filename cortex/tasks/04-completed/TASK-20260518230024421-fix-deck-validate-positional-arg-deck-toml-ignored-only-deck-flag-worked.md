# TASK-20260518230024421: fix(deck): validate positional arg [deck.toml] ignored — only --deck flag worked

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

## 背景与目标

CLI help 显示 `validate [deck.toml]` 支持位置参数，但 `validate /path/to/deck.toml` 实际上验证了默认的 `skill-deck.toml`（从 cwd 向上查找），完全忽略了传入的路径。用户必须通过 `cd` 到 deck 所在目录才能验证指定文件。

## 需求详情
- [x] 修复 `validate` case 以正确处理位置参数 `[deck.toml]`
- [x] 位置参数的解析逻辑与 `--deck` 标志一致（支持相对路径、绝对路径）

## 技术方案

在 `cli.ts` 的 `validate` case 中，当 `deckPath`（来自 `--deck`）未设置时，回退检查 `args[1]` 是否为非标志的位置参数，并用 `resolveDeckPathSync` 解析为绝对路径。与其他命令（`refresh`、`remove`）的位置参数处理模式保持一致。

```typescript
case 'validate': {
  let validateDeckPath = deckPath
  if (!validateDeckPath && args[1] && !args[1].startsWith('-')) {
    validateDeckPath = resolveDeckPathSync(args[1]).path
  }
  await validateDeck(validateDeckPath, workdir, { ... })
  break
}
```

## 验收标准
- [x] `deck validate /tmp/my-deck.toml` 验证 `/tmp/my-deck.toml`，不是默认 skill-deck.toml
- [x] `deck validate --deck /tmp/my-deck.toml` 继续正常工作（标志方式不受影响）
- [x] `deck validate`（无参数）继续从 cwd 向上查找默认 skill-deck.toml

## 进度记录
- 2026-05-18: Bug 复现确认 — `validate /tmp/test.toml` 报告了默认 deck 的 15 max_cards 而非测试 deck 的 5
- 2026-05-18: 修复 — 在 validate case 中添加位置参数回退逻辑
- 2026-05-18: 验证 — `validate /tmp/test.toml` 正确报告测试 deck 的内容

## 关联文件
- 修改: `packages/lythoskill-deck/src/cli.ts`

## Git 提交信息建议
```
feat(scope): description (TASK-20260518230024421)

- Detail 1
- Detail 2
```

## 备注
