---
created: 2026-05-03
updated: 2026-05-04
category: pattern
---

# GitHub Actions + Bun CI/CD 配置模式

> 本仓使用 Bun 运行时和 Bun 测试运行器。在 GitHub Actions 中配置 Bun CI 流水线时，覆盖率报告和 badge 的展现方式应遵循开源工程项目的常见惯例。

## Context

`lythoskill` 是 Bun-first 项目（Runtime + Package Manager + Test Runner 全栈 Bun）。当需要为仓库配置 GitHub Actions CI，或向 README 添加覆盖率 badge 时，应使用 Bun 原生工具链，避免引入 Node.js/npm 的冗余依赖。

本模式覆盖：
1. GitHub Actions 中 Bun 的标准配置（setup-bun、install、test）
2. `bun test --coverage` 的终端输出与 lcov 报告生成
3. README badge 的展现方式（Shields.io / Codecov / PR 评论）
4. Monorepo 工作区和已知坑点

## Details

### 1. GitHub Actions 基础模板

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2.x"

      - run: bun install --frozen-lockfile
      - run: bun test
```

关键点：
- `oven-sh/setup-bun@v2` 是官方 action，自带缓存，通常无需手动 `actions/cache`
- `--frozen-lockfile` 是 CI 标准做法，确保 lockfile 与 package.json 同步
- `fetch-depth: 1`（shallow clone）可加速，但如需要 git history 做变更分析则保留默认

### 2. 覆盖率报告 — 三层展现

#### 层 1：终端文本表格（默认）

```bash
bun test --coverage
```

输出示例：
```
-------------|---------|---------|-------------------
File         | % Funcs | % Lines | Uncovered Line #s
-------------|---------|---------|-------------------
All files    |   66.67 |   77.78 |
 math.ts     |   50.00 |   66.67 | 10-15,19-24
 random.ts   |   50.00 |   66.67 | 10-15,19-24
-------------|---------|---------|-------------------
```

可配置 `bunfig.toml` 默认开启：
```toml
[test]
coverage = true
coverageThreshold = { lines = 0.8, functions = 0.8 }
```

#### 层 2：CI PR 评论（lcov + bun-coverage-report-action）

```bash
bun test --coverage --coverage-reporter=lcov --coverage-dir=coverage
```

生成 `coverage/lcov.info`，然后用 GitHub Action 在 PR 中评论：

```yaml
permissions:
  contents: read
  pull-requests: write

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun test --coverage --coverage-reporter=lcov --coverage-dir=coverage
      - uses: 70-10/bun-coverage-report-action@v1
        if: github.event_name == 'pull_request'
        with:
          lcov-path: coverage/lcov.info
          min-coverage: 80
```

效果：PR 中出现覆盖率表格，含文件级覆盖率和变化趋势。

#### 层 3：README Badge

**方案 A：Codecov（需注册第三方服务）**
```markdown
[![codecov](https://codecov.io/gh/OWNER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/OWNER/REPO)
```

**方案 B：Shields.io 静态 badge（无需第三方，手动更新）**
```markdown
![Coverage](https://img.shields.io/badge/coverage-82%25-brightgreen)
```

颜色约定（行业通用）：
| 覆盖率 | 颜色 |
|--------|------|
| ≥ 90% | brightgreen |
| ≥ 80% | green |
| ≥ 60% | yellow |
| < 60% | red |

**方案 C：动态 badge（无第三方服务）**
GitHub Action 把覆盖率 JSON 写到仓库独立 branch，shields.io 动态 endpoint 读取。适用于不想依赖 Codecov 的项目。

### 3. Monorepo 工作区配置

Bun workspaces 在 CI 中自动识别，只需在根目录跑：

```yaml
- run: bun install --frozen-lockfile
- run: bun test
```

如需按包拆分 job：
```yaml
strategy:
  matrix:
    package:
      - packages/lythoskill-deck
      - packages/lythoskill-test-utils
      - packages/lythoskill-project-cortex
steps:
  - run: bun test ${{ matrix.package }}/src/
```

### 4. 常见坑点

| 坑 | 现象 | 规避 |
|---|---|---|
| `--frozen-lockfile` 平台差异 | 本地 macOS 生成 lockfile，CI Linux 报 `lockfile had changes` | 统一 Bun 版本；lockfile 提交前在 Linux 跑一遍 |
| postinstall 死锁 | `bun install` 卡住不退出 | CI step 加 `timeout-minutes: 10`；升级 Bun |
| `bun.lock` vs `bun.lockb` | Bun 1.2 默认文本 lockfile，旧项目可能混用 | 统一用 `bun.lock`，删除 `.lockb` |
| workspace + Docker | 复制不全导致 `--frozen-lockfile` 失败 | 确保所有子包 `package.json` 都复制进容器 |

## When to Apply / When Not to Apply

**适用**：
- 新建 CI workflow 或迁移现有 Node.js CI 到 Bun
- 向 README 添加覆盖率 badge
- PR review 流程中需要覆盖率门槛（quality gate）

**不适用**：
- 本仓已有 `.github/workflows/test.yml`，且运行稳定——不要为改而改
- Agent BDD 测试（`*.agent.md`）**不进 CI**，因为它需要 LLM 推理，CI 无 LLM

## Related

- [bun.com/docs/test/coverage](https://bun.com/docs/test/coverage) — Bun 官方覆盖率文档
- [70-10/bun-coverage-report-action](https://github.com/marketplace/actions/bun-coverage-report) — Bun 覆盖率 PR 评论 Action
- [oven-sh/setup-bun](https://github.com/oven-sh/setup-bun) — 官方 Bun setup Action
- `cortex/adr/02-accepted/ADR-20260503180000000-...md` — bun:test 选型决策
- `cortex/tasks/01-backlog/TASK-20260503235014489-...md` — Coverage sweep 任务（80% 目标）
