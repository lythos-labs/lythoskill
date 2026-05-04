# TASK-20260503235014489: Coverage sweep: backfill edge cases to 80% coverage

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

T1-T5 已通过 vertical slice 覆盖了 deck 包的核心公共接口（纯函数、reconciler、命令层）。本卡是 **Theme C 收尾**——用 `bun test --coverage` 测量当前覆盖率，补漏边缘 case，把 deck 包推到 **80%**。

这不是"写一堆测试"，而是**数据驱动的查漏补缺**：先跑覆盖率报告，看哪些行/分支未被命中，再决定补哪些 test。

## 关联引用(零上下文 subagent boot 用)

| 引用 | 路径 | 用途 |
|---|---|---|
| Epic | `cortex/epics/01-active/EPIC-20260503234346583-...md` 主题 C / 归档条件 | 80% 覆盖率是 epic 归档的硬性条件 |
| 前序任务 | T1-T5 (`TASK-20260503235008935` 到 `TASK-20260503235013705`) | 核心接口测试已落地，覆盖率基线已建立 |
| 源文件 | `packages/lythoskill-deck/src/*.ts` | 待测实现 |
| 现有测试 | `packages/lythoskill-deck/src/*.test.ts` | T1-T5 已写的测试 |
| /tdd 准则 | `.claude/skills/tdd/SKILL.md` | 覆盖率是信号，不是目标；禁止为覆盖率而写无意义测试 |

## 需求详情(数据驱动，非猜测)

- [ ] **S1** 跑 `bun test --coverage packages/lythoskill-deck`，生成覆盖率报告
  - 记录当前行覆盖率 / 分支覆盖率 / 函数覆盖率
  - 识别覆盖率最低的 3 个文件

- [ ] **S2** 补漏 `link.ts` 边缘分支（T1-T3 未触达的代码）
  - 候选: `parseSkillFrontmatter` 异常分支（SKILL.md 不存在、frontmatter 解析失败）
  - 候选: `calculateDirSize` 异常分支（目录不可读）
  - 候选: backup 逻辑（nonSymlink > 100MB 时的 tar 路径）—— 可用 mock 或只测路径构造
  - 候选: transient 过期警告（`days <= 14` / `days <= 0`）
  - 候选: managed_dirs 重叠检测（父子目录包含关系）
  - **原则**: 只补"有业务意义"的分支，不追 `catch {}` silent ignore 行

- [ ] **S3** 补漏 `validate.ts` 边缘分支（T4 未触达）
  - 候选: transient 段验证（`expires` 格式错误、`path` 不存在）
  - 候选: deprecated string-array 格式的 warning

- [ ] **S4** 补漏 `add.ts` / `remove.ts` / `refresh.ts` / `prune.ts` 边缘分支（T4-T5 未触达）
  - 候选: `addSkill` 的 auto-migrate 逻辑（旧 string-array → dict）
  - 候选: `removeSkill` 的 legacy string-array 格式处理
  - 候选: `refreshDeck` 的 `localhost` 跳过、`not-git` 状态
  - 候选: `pruneDeck` 的 empty cold pool / all-referenced 早退

- [ ] **S5** 再次跑 `bun test --coverage`，验证 ≥ 80%
  - 若仍未达 80%，记录缺口原因（哪些文件确实难测），写入本卡备注

## 技术方案

- **位置**: 在现有 `*.test.ts` 文件中追加 `it()`，不新建文件（除非新文件能让覆盖率更清晰）
- **工具**: `bun test --coverage`（Bun 内置，无需额外配置）
- **策略**: 
  - 行覆盖率 < 80% 时，优先补"低风险高覆盖"的 test（如 error path、warning path）
  - 分支覆盖率 < 行覆盖率 时，优先补 `if/else` 的双边
  - 对 `process.exit` 相关的 error path，若 T2-T5 阶段未重构，可用 `spawnSync` 子进程方式补
- **禁止**: 不为覆盖率而写"调用函数但不断言"的空壳测试；每新增一个 test 必须有具体的行为断言

## 验收标准

- [ ] `bun test --coverage packages/lythoskill-deck` 显示行覆盖率 ≥ 80%
- [ ] 所有新增 test 通过 `bun test` 全绿
- [ ] `bun run test:all` 未被破坏
- [ ] 覆盖率报告截图或文本摘要附在本卡进度记录中
- [ ] 若存在确实无法覆盖的代码（如 network 边界、交互式 CLI），在备注中说明原因

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
  - `packages/lythoskill-deck/src/link.test.ts`
  - `packages/lythoskill-deck/src/validate.test.ts`
  - `packages/lythoskill-deck/src/add.test.ts`
  - `packages/lythoskill-deck/src/remove.test.ts`
  - `packages/lythoskill-deck/src/refresh.test.ts`
  - `packages/lythoskill-deck/src/prune.test.ts`
- 新增: 无（优先追加到现有文件）

## Git 提交信息建议
```
test(deck): coverage sweep — backfill edge cases to 80% (TASK-20260503235014489)

- link.ts: frontmatter failure, backup threshold, transient expiry, dir overlap
- validate.ts: transient invalid expires, deprecated format warning
- add/remove/refresh/prune: legacy format handling, localhost skip, empty cold pool
- Coverage: 67% → 82% lines

Closes: TASK-20260503235014489
```

## 备注

- **覆盖率是信号，不是目标**: 80% 是 epic 归档条件，但"为了 80% 而写无意义测试"是反模式。如果某些代码确实无法有意义地单元测试（如 `skills.sh` 下载、交互式 `confirm()`），接受缺口并记录在案。
- **T1-T5 的 process.exit 重构状态**: 若 T2-T5 中未解决 `process.exit` 的可测试性问题，部分 error path 可能只能通过子进程测试补覆盖，成本较高。此时优先补能直接测的分支，把子进程测试留给专门的任务。
- **本卡是 white-box 侧终点**: T6 完成后，white-box 单测阶段结束，进入 black-box Agent BDD（T7-T9）。
