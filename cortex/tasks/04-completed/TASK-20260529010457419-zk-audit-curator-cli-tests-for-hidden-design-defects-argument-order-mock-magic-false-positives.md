# TASK-20260529010457419: ZK audit: curator CLI tests for hidden design defects (argument order, mock magic, false positives)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created |
| in-progress | 2026-05-28 | Started |
| review | 2026-05-28 | Deliverables committed |
| completed | 2026-05-28 | Done |

## 背景与目标

本次 IO 注入 refactor 暴露了 curator CLI 测试中的隐藏缺陷：

1. **F1-F3 参数顺序错误**：`runFind(['--db', dbPath, 'fullstack-dev'])` 中 `dbPath` 被当作 bare name，因为 `argv.find(a => !a.startsWith('-'))` 返回第一个非 flag 参数
2. **F4 假阳性**：`['--db', '/tmp/fake.db']` 中 `/tmp/fake.db` 被当作 bare name，"missing bare name" 分支从未被触发
3. **Mock 魔法掩盖缺陷**：原始测试用 `spyOn(console)` + `process.exit` mock，这些 mock 的副作用碰巧让测试通过，但测试从未真正验证行为契约

这些不是 TDD 违规（是历史遗留），但类似模式可能存在于其他测试文件中。需要 ZK agent 审计全 repo 的测试代码。

## 需求详情

- [ ] ZK agent 审计 `packages/*/src/*.test.ts` 中的测试设计缺陷
- [ ] 重点检查：
  - 参数顺序/解析错误（如 `argv.find(a => !a.startsWith('-'))` 的误用）
  - Mock 魔法（`spyOn` 掩盖了被测函数的真实行为）
  - 假阳性（测试通过但不验证实际行为）
  - 直接赋值 `console.log = ...` 替代 IO 注入
- [ ] 产出审计报告：文件、行号、缺陷类型、修复建议
- [ ] 对高优先级缺陷创建修复 task

## 技术方案

1. **ZK agent 读取测试文件**：不读业务代码，只读测试文件
2. **ZK agent 识别模式**：
   - `spyOn(console, ...)` → 标记为需要检查是否掩盖了 IO 缺口
   - `console.log = ...` / `console.error = ...` → 标记为直接赋值反模式
   - `process.exit` mock → 标记为需要验证 exit code 是否真正被断言
   - 参数构造 → 验证参数顺序是否符合被测函数的解析逻辑
3. **ZK agent 输出结构化报告**

## 验收标准

- [ ] 审计覆盖所有 `packages/*/src/*.test.ts`
- [ ] 报告包含：文件路径、行号、缺陷类型、风险等级、修复建议
- [ ] 高优先级缺陷（类似 F1-F4 的参数误用）创建修复 task
- [ ] 报告通过 ZK 验证（另一个 ZK agent 能读懂并确认）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 审计目标: `packages/*/src/*.test.ts`
- 参考案例: `packages/lythoskill-curator/src/cli.test.ts` (F1-F4 修复记录)

## Git 提交信息建议
```
audit(test): ZK sweep for hidden test design defects (TASK-20260529010457419)

- Argument order bugs in argv parsing tests
- Mock magic masking real behavior gaps
- False positives where tests pass without verifying contracts
```

## 备注

**为什么用 ZK agent 而不是自己审计？**

- 自己审计会带入"我知道这段代码是干什么的"的先验知识
- ZK agent 从零读测试代码，能发现"这个测试到底在测什么"的歧义
- 类似于代码审查中的"fresh eyes"效应

**审计标准**：

不是检查"测试是否通过"，而是检查"测试是否证明了被测行为"。一个测试如果：
- 用 mock 替代了被测函数的核心输出路径
- 构造的输入不会触发期望的分支
- 断言的是实现细节而非行为契约

就是可疑的。
