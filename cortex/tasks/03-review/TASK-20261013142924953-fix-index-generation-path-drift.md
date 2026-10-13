# TASK-20261013142924953: fix index generation path drift

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |
| in-progress | 2026-10-13 | Started |
| review | 2026-10-13 | Deliverables committed |

## Background & Goals
`cortex index` 生成的 `INDEX.md` 落点与文档漂移。文档（SKILL.md Directory Structure、
AGENTS.md §0、包 README）一致声明索引在 `cortex/INDEX.md`，但
`generate-index.ts` 的 `generateIndex()` 写的是 **CWD 相对路径** `INDEX.md`
（generate-index.ts:251），从仓库根目录运行就落到仓库根的 `INDEX.md`。
实证（ZK 评审修正过叙述）：根 `/INDEX.md` 不止流浪——它自 MVP 起被**跟踪在册、
反复再生成反复提交**（如 b2bd7d6a 06-16、3d16fcec 09-09、30302f8a 09-11；
daily/2026-05-03.md:175 自记"M INDEX (cortex index 重生成)"），是六个月的
 standing artifact，不是一次性事故。`init` 也完全不创建 INDEX.md，
新鲜 init 的项目目录树与文档不符。

## Requirements
- [x] `generateIndex()` 将主索引写到 `cortex/INDEX.md`（由 config 的 `tasksDir` 推导 cortex 根）— 从项目根运行时落点与 CWD 无关；相对 config 路径的 CWD 语义与本 CLI 全部路径一致，不在本卡范围（ZK P3 边界修正：原措辞"不依赖 CWD"过度承诺）
- [x] `init` 结束时生成初始 `cortex/INDEX.md`（空项目也有文档承诺的文件）
- [x] `generateWikiIndex()` 行为不变（本就写 `cortex/wiki/INDEX.md`）
- [x] 新增协同定位测试：断言主索引落在 cortex 根、且 CWD 根不出现 `INDEX.md`
- [x] 删除本仓库根目录的流浪 `/INDEX.md`（跟踪在册的生成物，无任何引用，4a01af6b 删除 -595 行）

## Technical Approach
行为对齐文档的 bug fix，不引入新抽象/边界/概念，0/6 C-criteria，无需 ADR。
- `generate-index.ts`：`writeFileSync('INDEX.md', …)` → `writeFileSync(join(dirname(config.tasksDir), 'INDEX.md'), …)`。
  用户 config 若把 `tasksDir` 配成无父级的 `'tasks'`，`dirname` 得 `'.'`，行为同旧版，向后兼容。
- `init.ts`：config 写盘完成后调用 `generateIndex(config)`，一次调用同时覆盖"树里有 INDEX.md"与"内容即时可用"。
- 测试：`src/generate-index.test.ts`，`mkdtempSync` 建临时目录，绝对路径 config，
  断言 `tmp/cortex/INDEX.md` 存在且 `tmp/INDEX.md` 不存在。
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe.

     ⚠️ A DECISION DOES NOT BELONG IN THIS SECTION. If this card introduces or
     changes an abstraction, a module boundary, a package boundary, a named
     concept, or a closed data set — that is an architectural decision, and it
     must be recorded in an ADR. This section may only REFERENCE that ADR; it
     must never be the only record. A one-line statement of intent gives a
     reviewer nothing to object to: no options to reject, no rejected
     alternative to question. Two same-shape incidents (feed-adapters.ts 2026-05,
     adapter-registry.ts 2026-09) both rode in exactly this section.

     Prepare it first, in full:  bunx @lythos/project-cortex adr "<decision-title>"
     Criteria (hit >= 2 of C1-C6): AGENTS.md § Decision Records -->

## Acceptance Criteria
- [x] `bun test src/ --pass-with-no-tests`（lythoskill-project-cortex 包）全绿，含新测试 → Verify: `bun test src/ — 213 pass / 0 fail / 487 expect @ Bun 1.3.11/macOS`（ZK 独立复跑核实,非自报）
- [x] 新测试断言：索引写入 `<tasksDir 父级>/INDEX.md`，CWD 根无 `INDEX.md`（generate-index.test.ts:55-59 双向断言,变异钉经 ZK 复核为真:回退修复 → 测试 1/2/3 全红）
- [x] 仓库根 `/INDEX.md` 已删除，`git status` 不再出现该流浪文件（4a01af6b;ZK 核实 `ls INDEX.md` absent + status clean;795172ee 后续再生成未复发,repo 自身工作流实证）
- [x] 全仓 `bun --filter='*' run test` 通过 → Verify: `1283 pass / 0 fail across 13 packages`（ZK 独立复跑核实）

## Progress Log
- 2026-10-13 漂移实证：`generate-index.ts:251` 写 CWD 相对路径；根 `/INDEX.md`（60KB 跟踪在册）为活证据；`init.ts` 无 INDEX.md 产物。
- 2026-10-13 实现 + 提交：4a01af6b（fix+test+删 stray）→ b9f4f8cb（卡）→ 随 v0.20.0 发布（npm 全 14 包 0.20.0 核实）。**plan-after-code 承认**：卡的实质填充晚于 fix 提交 30 秒,流程债记此。
- 2026-10-13 ZK 评审（零上下文 subagent, pass-with-notes, 0 P1 @ da50fe4e 前状态）:四条 AC 逐条独立核实为真;P2/P3 全部吸收（背景叙述修正、"不依赖 CWD"过度承诺修正、本卡 hygiene 补全）。
- 2026-10-13 折后未评（delta: generateIndex 写入加 try/catch 护栏, ZK nit, 因 v0.20.0 起 init 路径上的写入失败不应中断 init;行为面无变化,测试不变）——搭本 review-trailer 提交,未独立重评。

## Related Files
- Modified: packages/lythoskill-project-cortex/src/generate-index.ts, packages/lythoskill-project-cortex/src/commands/init.ts
- Added: packages/lythoskill-project-cortex/src/generate-index.test.ts;删除仓库根 INDEX.md

## Git Commit Message
```
fix(project-cortex): write INDEX.md under cortex root, not CWD; init seeds it (TASK-20261013142924953)
```

## Notes
