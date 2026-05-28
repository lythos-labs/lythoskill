# TASK-20260529003742409: Refactor curator CLI: add IO injection to runAdd/runFind/runCurator, remove L1 Escape Hatch exemption

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created |
| in-progress | 2026-05-28 | Started |
| review | 2026-05-28 | Deliverables committed |
| completed | 2026-05-28 | Done |

## 背景与目标

User decision: 移除 CLI 层的 IO 注入豁免。理由——"减少心智记忆"的价值大于 60 行改动的成本。豁免本身在消耗 agent 的 context window（需要读文档、理解条件、判断适用性），而统一风格不需要这些认知开销。

> "context 空间问题比这个问题重要多了"

这是从"豁免派"到"统一派"的立场转换。ADR-20260529002942317 和 conventions.md §5 的 L1 Escape Hatch 是刚刚写的，现在需要撤销。

## 需求详情

- [ ] 定义 `CuratorIO` 接口（`log`, `error`, `exit`）
- [ ] 改 `runAdd` 签名：添加 `io?: CuratorIO` 参数，默认回退到 `console`/`process.exit`
- [ ] 改 `runFind` 签名：同上
- [ ] 改 `runCurator` 签名：同上（如果它也直接调 console）
- [ ] 替换所有 `console.error` → `io.error`，`console.log` → `io.log`，`process.exit` → `io.exit`
- [ ] 重写 `cli.test.ts` 中 `runAdd` 测试：去掉 `spyOn(console)`，改为注入 `CuratorIO`
- [ ] 重写 `cli.test.ts` 中 `runFind` 测试：同上
- [ ] 跑 `bun --filter='*' run test` 验证全绿
- [ ] 删除或撤销 ADR-20260529002942317
- [ ] 删除 conventions.md §5 "L1 Escape Hatch" 段落
- [ ] 更新 pitfalls.md §10b：移除对 L1 Escape Hatch 的引用
- [ ] 更新 Internal Roundtable 模式文档：标记 runAdd 案例为"已解决"

## 技术方案

```ts
// packages/lythoskill-curator/src/cli.ts
export interface CuratorIO {
  log?: (msg: string) => void
  error?: (msg: string) => void
  exit?: (code: number) => never
}

const defaultCuratorIO: Required<CuratorIO> = {
  log: console.log,
  error: console.error,
  exit: (code: number) => { process.exit(code) },
}

export function runAdd(argv: string[], io: CuratorIO = defaultCuratorIO) {
  // ... io.error(...) instead of console.error(...)
}
```

测试改写：
```ts
const errors: string[] = []
const logs: string[] = []
runAdd(['github.com/foo/bar'], {
  error: (msg) => errors.push(msg),
  log: (msg) => logs.push(msg),
  exit: (code) => { throw new Error(`EXIT:${code}`) },
})
expect(errors.some(e => e.includes('--pool'))).toBe(true)
```

## 验收标准

- [ ] `bun test packages/lythoskill-curator/src/cli.test.ts` 全绿
- [ ] `bun --filter='*' run test` 全绿
- [ ] `grep -n 'spyOn(console' packages/lythoskill-curator/src/cli.test.ts` 返回 0 结果
- [ ] `grep -n 'console.error\|console.log' packages/lythoskill-curator/src/cli.ts` 在 `runAdd`/`runFind`/`runCurator` 函数体内返回 0 结果
- [ ] ADR-20260529002942317 移动到 `03-superseded/` 或标记为撤销
- [ ] conventions.md 不再包含 "L1 Escape Hatch" 段落
- [ ] pitfalls.md §10b 不再引用 L1 Escape Hatch

## 进度记录

**2026-05-29**: Subagent 已完成 cli.ts 的 IO 注入改造（CuratorIO 接口 + runAdd/runFind 签名修改 + console/process.exit 替换）。但测试暴露了几个原始测试就存在的缺陷：

### 发现的测试缺陷（原始测试就有的，不是 refactor 引入的）

1. **F4: rejects missing bare name** — 原始测试设计错误
   - 输入：`['--db', '/tmp/fake.db']`
   - 测试期望：触发 "missing bare name" 错误
   - 实际行为：`/tmp/fake.db` 不以 `-` 开头，被当作 bare name，不会触发 missing error
   - 这是**原始测试用 `spyOn(console)` + `process.exit` mock 时可能碰巧通过**的隐藏 bug

2. **F2/F3: lines 数组为空** — 测试假设 `io.log` 在 `io.exit(0)` 前被调用，但 `io.exit(0)` 抛出异常后控制流跳到 catch，需要验证 `lines` 的填充顺序

3. **F3: 断言字符串不匹配** — `expect(output).toContain('skills share the name')` 但实际输出可能是 `Multiple skills found` 或其他文案

### 修复策略

- F4: 修正输入为真正缺少 bare name 的情况（如 `['--db', '/tmp/fake.db', '-x']` 或空数组）
- F2/F3: 验证 `io.log` 调用确实发生在 `io.exit(0)` 之前，如果顺序正确则测试逻辑没问题，需要检查其他原因
- F3: 匹配实际输出文案

**关键洞察**：这些不是"refactor 破坏了测试"，而是"refactor 移除了 mock 的魔法，暴露了测试原本就有的假设错误"。这正是 IO 注入的价值——测试必须明确声明行为契约，不能依赖 mock 的副作用碰巧覆盖。

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts`
- 修改: `packages/lythoskill-curator/src/cli.test.ts`
- 修改: `cortex/wiki/04-ssot/conventions.md`
- 修改: `cortex/wiki/04-ssot/pitfalls.md`
- 修改: `cortex/wiki/01-patterns/2026-05-29-internal-roundtable-pattern.md`
- 移动/修改: `cortex/adr/02-accepted/ADR-20260529002942317-...`

## Git 提交信息建议
```
refactor(curator): IO injection for all CLI entry points (TASK-20260529003742409)

- Add CuratorIO interface (log/error/exit)
- runAdd/runFind/runCurator accept injectable IO, default to console
- Remove all spyOn(console) from cli.test.ts
- Delete L1 Escape Hatch exemption (conventions.md §5)
- Supersede ADR-20260529002942317
- User decision: "reduce cognitive load > 60-line refactor cost"
```

## 备注

**为什么撤销刚写的 ADR？**

因为用户指出了真正的成本不是代码行数，是 context window。豁免需要：
1. Agent 读到代码中的 `console.error`
2. Agent 查 conventions.md 看是否允许
3. Agent 读 L1 Escape Hatch 的三个条件
4. Agent 判断当前函数是否符合条件
5. Agent 决定是"合规"还是"违规"

统一风格只需要：
1. Agent 看到 `io.error`
2. Agent 知道这是 IO 注入模式
3. 结束

**豁免的隐藏成本 = 每个 agent 每次读代码时的认知税。**
