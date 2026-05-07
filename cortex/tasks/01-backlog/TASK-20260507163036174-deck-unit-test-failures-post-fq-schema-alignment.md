# ${ID}: deck unit test failures — post FQ schema alignment

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-07 | Created after BDD scenario sweep (21/21 green); 11 unit tests pre-existing fail |

## 背景与目标

本轮 BDD scenario sweep 把 21 个 CLI BDD 场景全部对齐到 FQ-only + alias-as-key schema(ADR-20260503152000411)。BDD 层全绿,但 `src/link.test.ts` 和 `src/validate.test.ts` 的 11 个 unit test 仍有 pre-existing 失败。

## 失败清单与根因分析

### Group A: linkDeck reconciler — 3 fail

| 测试 | 期望 | 实际 | 根因假设 |
|------|------|------|---------|
| B4 same-type alias collision | exit 1 + stderr "Alias collision" | exit 1 + stderr 为空字符串 | `link.ts` spawn 时 stderr 未捕获;可能错误走 stdout 或进程级异常未写入 stderr |
| B4.b cross-type alias collision | exit 1 + stderr "Alias collision" | exit 1 + stderr 为空字符串 | 同上 |
| B5 max_cards exceeded | exit 1 + stderr "Budget exceeded" | exit 1 + stderr 为空字符串 | 同上 |

**共同模式**: `spawnSync('bun', [join(import.meta.dir, 'link.ts'), deckPath, projectDir, 'true'], ...)` 返回的 `result.stderr` 是空字符串。`result.status` 正确(=1),说明进程确实以错误码退出,但错误消息没落到 stderr。

可能原因:
1. `link.ts` 的 `console.error()` 输出被 Bun 运行时吞掉(当 `import.meta.main` 为 true 但 entry point 经过 CLI router 时?)
2. `link.ts` 改用 `process.stderr.write()` 但 test 读的是 `result.stderr`(encoding 问题?)
3. 更可能: `link.ts` 的 entry point 重构后,直接 `bun link.ts` 不再走 `import.meta.main` 分支,而是被 `cli.ts` 拦截,导致参数解析不同

验证路径:在 unit test 的临时目录手动跑 `bun link.ts skill-deck.toml . true`,看 stderr 是否真的有内容。

### Group B: validateDeck — 8 fail

| 测试 | 期望 | 实际 | 根因假设 |
|------|------|------|---------|
| C1 valid deck passes | stdout "Validation passed" | 空字符串 | `validate.ts` 无 `import.meta.main` guard |
| C2 missing [deck] section | stdout "[deck] section is required" | 空字符串 | 同上 |
| C3 invalid max_cards | stdout "deck.max_cards must be..." | 空字符串 | 同上 |
| C4 skill not found in cold pool | stdout "Skill not found" | 空字符串 | 同上 |
| C5 budget exceeded | stdout "Budget exceeded" | 空字符串 | 同上 |
| C6 toml parse error | stdout "TOML parse error" | 空字符串 | 同上 |
| C7 deprecated string-array format warns | stdout "deprecated" | 空字符串 | 同上 |
| C8 invalid transient expires errors | stdout "Invalid expires" | 空字符串 | 同上 |

**共同模式**: `validate.ts` 底部没有 `if (import.meta.main) { validateDeck() }` guard。`spawnSync('bun', [join(import.meta.dir, 'validate.ts'), ...])` 直接执行时只做 module loading(定义函数),不执行任何输出。所以 stdout/stderr 永远是空。

对比 `link.ts` 底部有 `if (import.meta.main) { linkDeck(); }`,所以 link 的 unit test 至少能跑到代码(只是 stderr 为空)。validate 的 unit test 连代码都没跑到。

**修复方向**:
- `validate.ts`: 添加 `if (import.meta.main) { validateDeck(); }` 与 link 对齐
- `link.ts`: 调查 stderr 为空的原因。可能需要在 `spawnSync` 里加 `stdio: 'pipe'` 或检查 Bun 的 stderr 行为

### Group C: 无关失败(非 deck 包)

| 包 | 失败数 | 原因 | 优先级 |
|----|--------|------|--------|
| `lythoskill-cold-pool` git-hash | 4 | 测试依赖真实 git repo 环境;temp dir 未 init git | 低(功能正常,测试环境问题) |
| `lythoskill-test-utils` deepseek smoke | 2 | API 调用超时/失败;用户反馈 "api error 变多了" | 低(外部依赖,非代码问题) |

## Exit Criteria

- `bun test src/link.test.ts` 全部通过(3/3)
- `bun test src/validate.test.ts` 全部通过(8/8)
- 或确认这些测试已被 BDD scenarios 覆盖,可以删除

## Deliverables

| # | Deliverable | Verification |
|---|-------------|--------------|
| 1 | 调查 `link.ts` spawn 时 stderr 为空的原因 | 手动复现 + 加 debug log |
| 2 | `validate.ts` 添加 `import.meta.main` entry guard | 跑 `src/validate.test.ts` 验证 |
| 3 | 修复/删除冗余的 link/validate unit tests(如果 BDD 已覆盖) | 对比 BDD 与 unit test 覆盖范围 |
| 4 | 更新 `SCENARIOS.md` 或 test README 记录 schema 约定 | 人工 review |

## 关联

- 刚完成的 BDD sweep commit: `29cf2af`
- ADR-20260503152000411 (alias-as-key schema)
