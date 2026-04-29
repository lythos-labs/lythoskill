# TASK-20260429225846405: Add --help and validate subcommand to lythoskill-deck CLI

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-29 | Created |
| in-progress | 2026-04-29 | Implementation started |
| completed | 2026-04-29 | Code, tests, and skill docs updated |

## 背景与目标

ADR-4 (Template Variable Substitution and CLI Help Delegation) 确立了运行时命令细节应委托给 CLI `--help` 的原则。但 deck CLI 此前只支持 `link` 命令，传入 `--help` 会走 default 分支打印 usage 并 exit 1，与 ADR-4 的理念存在 gap。

此外，deck 配置（skill-deck.toml）的校验只能在 `link` 时被动进行——用户必须实际执行 symlink 操作才能发现配置错误（如 skill 不存在、超出预算）。一个独立的 `validate` 子命令可以在不修改文件系统的前提下提前暴露问题。

## 需求详情

- [x] CLI 支持 `--help` / `-h` 标志，打印完整用法并 exit 0
- [x] CLI 支持 `validate [deck.toml]` 子命令，校验以下内容：
  - TOML 可解析性
  - `[deck]` 段存在且 `max_cards` 为正整数
  - 声明的 skill 能在冷池/本地找到
  - transient 表包含有效 `path` 和可选 `expires`
  - 总 skill 数不超过 `max_cards` 预算
- [x] skill 层 SKILL.md 同步更新命令参考

## 技术方案

1. **cli.ts**: 添加 `--help`/`-h` case 和 `validate` case，统一 `printUsage` 函数处理成功/失败输出
2. **validate.ts** (新增): 独立验证器，只读操作不修改文件系统
   - 复用 `link.ts` 中的 `findDeckToml`, `expandHome`, `findSource`（改为导出）
   - 错误收集模式：全部检查完成后统一报告
3. **link.ts**: 导出 `findDeckToml`, `expandHome`, `findSource` 供 validate 复用
4. **skill/SKILL.md**: 命令参考表格加入 `validate` 行

## 验收标准

- [x] `bunx @lythos/skill-deck --help` 打印帮助并 exit 0
- [x] `bunx @lythos/skill-deck validate` 通过当前项目 toml
- [x] `bunx @lythos/skill-deck validate` 对无效 toml 报告具体错误并 exit 1
- [x] `link` 命令行为不变（回归测试）
- [x] skills/lythoskill-deck/SKILL.md 包含 validate 命令文档

## 进度记录

- 2026-04-29 22:58: Task created via cortex CLI
- 2026-04-29 23:05: Exported `findDeckToml`, `expandHome`, `findSource` from `link.ts`
- 2026-04-29 23:06: Created `validate.ts` with full validation logic
- 2026-04-29 23:07: Updated `cli.ts` with `--help` and `validate` routing
- 2026-04-29 23:08: Local tests passed (`--help`, `validate` success, `validate` error cases)
- 2026-04-29 23:10: Updated skill/SKILL.md command reference
- 2026-04-29 23:11: Rebuilt `skills/lythoskill-deck/` via `lythoskill build`

## 关联文件

- 修改:
  - `packages/lythoskill-deck/src/cli.ts`
  - `packages/lythoskill-deck/src/link.ts`
  - `packages/lythoskill-deck/skill/SKILL.md`
- 新增:
  - `packages/lythoskill-deck/src/validate.ts`
- 构建产物更新:
  - `skills/lythoskill-deck/SKILL.md`

## Git 提交信息建议

```
feat(deck): add --help and validate subcommand (TASK-20260429225846405)

- CLI now supports --help / -h for usage info
- Add validate subcommand: checks toml structure, skill refs, budget
- Export findDeckToml, expandHome, findSource from link.ts for reuse
- Update skill docs with validate command reference
```

## 备注

validate 使用错误收集模式而非遇到第一个错误就退出，这样用户能一次看到所有问题（类似 `cargo check` 或 `go vet` 的体验）。
