# ADR-20260505221432740: Standardize test file co-location across monorepo packages

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-05 | Created |
| accepted | 2026-05-05 | Accepted |

## 背景

2026-05-05 的 deck unit CI 故障（`refresh.test.ts` 用 `execSync` spy 绕过 IO 注入模式）暴露了一个更深层的问题：测试文件在 monorepo 里的组织不一致。

| 包 | 单元测试位置 | BDD 测试位置 |
|---|-------------|-------------|
| `lythoskill-deck` | `src/*.test.ts` (co-located) | `test/runner.ts` |
| `lythoskill-arena` | `src/*.test.ts` | 无 |
| `lythoskill-curator` | `src/*.test.ts` | 无 |
| `lythoskill-project-cortex` | `src/lib/*.test.ts` | `test/runner.ts` |
| `lythoskill-test-utils` | `test/*.test.ts` + `src/sanitize.test.ts` (混合) | 无 |

`test-utils` 是唯一混合的包 — 5 个单元测试在 `test/` 目录，1 个在 `src/`。新贡献者（包括 agent）不知道单元测试该放在哪里。

## 决策驱动

- 统一标准让 agent 和人类贡献者不再困惑
- Bun test runner 对 co-located 和 separate 都支持，不影响功能
- 2025/2026 Bun 生态的社区惯例已明确（详见 [Bun test discovery docs](https://bun.com/docs/test/discovery)）
- lythoskill 所有包都发布到 npm，需要确保测试文件不会泄漏到发布包中

## 选项

### 方案A：Co-located 单元测试 + `test/` 放 BDD runner（Bun 社区推荐）

```
packages/*/src/
├── foo.ts
└── foo.test.ts          ← 单元测试，贴源文件

packages/*/test/
├── runner.ts            ← CLI BDD 集成测试入口
├── scenarios/           ← BDD 场景 (.md 或 .ts)
└── fixtures/            ← 共享 mock 和测试数据
```

**优点**:
- Bun 官方文档首选模式（`bun test` 递归扫描 `*.test.ts`，天然支持 co-location）
- 移动源文件时测试跟着走，不会遗漏
- import 路径短（`./foo` vs `../../src/foo`）
- 4/5 个包已经在用此模式 — 最小化实际改动
- npm publish 已有 `build` 管道过滤 `.test.ts` 文件（`packages/lythoskill-creator/src/build.ts`），不泄漏

**缺点**:
- `src/` 目录里混入测试文件
- 需要 `tsconfig.json` `exclude` 测试文件（已配置）

### 方案B：所有测试在独立的 `test/` 目录（镜像 src/ 结构）

**优点**:
- `src/` 只有生产代码，干净
- TanStack 等大型库推荐此模式（"测试不应放在 src/，会膨胀发布包"）

**缺点**:
- 需要维护镜像目录结构 — 重构时容易遗忘
- import 路径长且脆弱
- 4 个包需要大幅迁移，改动量大
- 与 Bun 生态主流方向背离

## 决策

**选择**: 方案A — Co-located 单元测试 + `test/` 放 BDD runner

**原因**:
1. **最小化破坏** — 4/5 个包已经 co-located，只需迁移 `test-utils` 一个包
2. **Bun-native** — Bun 文档和社区以 co-location 为首选模式
3. **lint/format 无额外配置** — `bunfig.toml` 的 `coverage = true` 和 `bun test` 自动发现均无需改动
4. **Agent 友好** — 写测试时自然放在源文件旁边，不需要学习项目约定
5. **npm 安全** — build 管道已过滤 `.test.ts`，不泄漏

## 影响

- **正面**: 所有包统一标准，agent 无需猜测；重构源文件时测试不遗漏
- **负面**: `test-utils` 需要迁移 5 个测试文件 + 更新 CI 路径 + 更新 `test-report.ts` 路径
- **后续**: 需要创建 `TESTING.md` 文档固化约定；AGENTS.md 增加引用

## 相关

- 关联 Epic: EPIC-20260505221500188
- 关联 ADR: ADR-20260423101950000 (ESM-only, 测试文件也遵守)
- 参考: [Bun test discovery docs](https://bun.com/docs/test/discovery)
- 参考: [Bun monorepo test integration](https://blog.whoisjsonapi.com/integrating-bun-js-test-runner-in-monorepos/)
