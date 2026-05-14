# TASK-20260509113256236: T8 — General catch error cleanup: replace `❌ ${e.message}` style patterns across all CLI packages

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-09 | Created |
| completed | 2026-05-10 | Partial — user-facing CLI entry points upgraded to HATEOAS; internal resilience catches remain bare by design |

## 背景与目标

T7 聚焦 project-cortex 一个包的 HATEOAS 升级。T8 要求把同一模式推广到**所有 CLI 包**（arena, deck, cold-pool, curator, cortex），将 bare `catch { console.error('❌', e.message) }` 替换为三段式 HATEOAS 错误（问题 + Usage/Example + 下一步指引）。

## 需求详情

- [x] arena: top-level catch 已升级（ZodError 特殊处理 + 通用错误）
- [x] deck: URL fetch / validate / link / add / remove 错误已升级
- [x] cold-pool: lock parse / top-level catch 已升级
- [x] curator: SQL error / clone fail 已升级
- [x] cortex: 已在 T7 完成
- [ ] 内部 resilience catch（mirror probe、optional import、filesystem existence check、git network）仍 bare — 这些是预期内的非致命失败，改为 HATEOAS 反而噪音化

## 技术方案

**用户面错误**（args 缺失、文件不存在、网络失败、schema 校验失败）→ 三段式 HATEOAS
**内部 resilience**（mirror 探测、optional import、fs probe、git 超时、cleanup）→ 保留 narrow catch（区分 ENOENT vs 真实错误，或加注释说明非致命意图）

## 验收标准

- [x] 每个 CLI 包的 top-level `.catch` 或 `main().catch` 含 Usage/Example/指引
- [x] 用户-facing 的 `console.error('❌ ...')` 含可执行修复方案
- [x] 内部 resilience catch 有注释说明为何 silent/narrow 是正确行为
- [ ] 所有 `catch {}` 完全消除 — **未达成**，arena TOML parse (`cli.ts:272`) 等仍有 questionable silent swallow

## 进度记录

- 2026-05-09: T7 连带覆盖 cortex 全部错误路径
- 2026-05-10: arena/deck/cold-pool/curator 用户面错误升级（分散在多个 commit）
- 2026-05-10: sweep 移动时标记 completed，但内部 catch 未完全清理

## 关联文件

- 修改: `packages/lythoskill-arena/src/cli.ts`
- 修改: `packages/lythoskill-deck/src/cli.ts`, `validate.ts`, `link.ts`, `add.ts`, `remove.ts`
- 修改: `packages/lythoskill-cold-pool/src/cli.ts`
- 修改: `packages/lythoskill-curator/src/cli.ts`
- 修改: `packages/lythoskill-project-cortex/src/cli.ts` (T7)

## Git 提交信息建议
```
feat(cli): HATEOAS errors across all packages — user-facing entry points (TASK-20260509113256236)
```

## 备注

- T7 和 T8 的边界在实际执行中模糊。T7 的实施已经覆盖了大部分跨包的用户面错误升级。
- 内部 resilience catch 的清理标准未明确定义（是否所有 `catch {}` 都要消灭？），导致 T8 的 "完成" 判断主观。
- 建议未来将 "internal resilience catch" 作为独立任务处理，与用户面错误分开治理。
