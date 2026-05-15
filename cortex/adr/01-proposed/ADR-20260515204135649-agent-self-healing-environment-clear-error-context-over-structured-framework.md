---
created: 2026-05-15
updated: 2026-05-15
---

# ADR-20260515204135649: Agent self-healing environment — clear error context over structured framework

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-15 | Created |

## 背景

当前代码在系统工具缺失时抛出 `ENOENT` 或通用字符串错误，例如 `curl failed` 或 `git clone failed`。Agent 读到这类错误只能两件事：
1. 瞎猜修复方案
2. 回报失败让人类介入

两种都是 dead-end。但反方向——给 agent 造一个 `EnvironmentProbe` + `ReconcilePlan` + `ToolRegistry` 框架——同样是 dead-end：过度工程化，agent 根本不需要人类式的流程图。

Agent 的真正能力：**读错误 → web fetch 查安装方法 → bash 执行修复**。只要错误信息给够上下文，agent 自己能走完这个循环。

## 决策驱动

1. Agent 有 web fetch 和 bash 工具，能自主查找和安装缺失工具
2. 人类不需要 "环境检查清单" 这种 ceremony，agent 更不需要
3. 错误信息的 token 效率 > 结构化框架的 token 效率（一行清晰的 install hint 胜过 50 行 reconciliation schema）
4. 与现有 HATEOAS 式 CLI 错误心智一致：错误是自导航的，不是诊断报告
5. **ReAct Loop 是 IoC 的延续** — 见 §架构定位

## 选项

### 方案 A: 结构化环境框架（EnvironmentProbe + ReconcilePlan）— Rejected

构建一个声明式工具注册表 + 探测纯函数 + 协调计划生成器。agent 消费 JSON plan 后执行修复。

- **优点**: 人类可读，CI 可消费，看起来"正规"
- **缺点**: agent 不需要。agent 看到 `"curl not found"` 后自己去搜索 `how to install curl macos` 比解析 JSON plan 更快更准。框架代码 > 实际价值。

### 方案 B: 清晰错误上下文 + agent 自主 — Selected

不造框架。改造所有系统工具调用点的错误信息，让 agent 看到错误后**直接知道该怎么办**。

核心规则：错误信息必须包含三件事（3-part template）：

```
[What failed] + [Why it matters] + [How to fix / alternative]
```

示例对比：

| 当前 | 改进 |
|------|------|
| `Error: curl failed` | `curl not found — required for LYTHOS_SOCKS_PROXY. Install: brew install curl (macOS), sudo apt-get install curl (Linux). Or disable proxy: unset LYTHOS_SOCKS_PROXY` |
| `Error: git clone failed` | `git not found — required for deck add/refresh. Install: https://git-scm.com/downloads. Or use --offline to skip network ops.` |
| `Error: bun not found` | `bun not found — required to run this CLI. Install: curl -fsSL https://bun.sh/install \| bash` |

Agent 看到改进后的错误，可以：
1. 直接执行建议的安装命令（bash 工具）
2. 如果建议不适用，web fetch 查当前系统的安装方法
3. 选择替代方案（如 `unset LYTHOS_SOCKS_PROXY`）

## 架构定位：ReAct Loop 是 IoC 的延续

传统软件中的 IoC（控制反转）：框架调用应用代码，应用代码不主动控制流程。

Agent 时代的 IoC：agent 根据环境反馈自主决定行动，代码不预设行动路径。

| 层级 | 控制方 | 示例 |
|------|--------|------|
| 传统 IoC | 框架 → 调用 → 应用代码 | Spring DI 容器决定注入哪个 bean |
| Arena runner | prompt 模板 → agent 自主 ReAct | `buildArenaPrompt()` 提供约束，agent 决定工具调用顺序 |
| **环境协调** | **错误上下文 → agent 自主修复** | **代码只说 "curl 缺失，最小版本 7.60"，agent 自己决定 `brew install` 还是 `apt-get`** |

这就是"寻路心智"：不是代码框架给 agent 一张地图（ReconcilePlan），而是给 agent 一个指南针（清晰的错误上下文），agent 自己根据实时环境找路。

## 决策

**选择**: 方案 B — 清晰错误上下文 + agent 自主。

**原因**:
1. Agent 的 superpower 是"读提示 + 搜索 + 执行"，不是"解析结构化 schema"
2. 一行清晰的 install hint 的激活效率高于一个 JSON schema
3. 不需要维护 ToolRegistry（不同系统安装方法会变，agent 的实时搜索比硬编码 registry 更准）
4. 与现有 HATEOAS CLI 错误设计一致：错误是自导航的
5. **符合 IoC 延续**：代码提供约束和上下文，agent 自主决策和执行

## 实施清单

改造以下调用点的错误信息，遵循 3-part template：

- [ ] `packages/lythoskill-infra/src/fetch-with-proxy.ts` — curl 失败
- [ ] `packages/lythoskill-cold-pool/src/mirror.ts` — curl 失败（probeConnectivity SOCKS 路径）
- [ ] `packages/lythoskill-cold-pool/src/git-io.ts` — git 失败
- [ ] `packages/lythoskill-cold-pool/src/fetch-plan.ts` — git fetch 失败
- [ ] `packages/lythoskill-creator/src/build.ts` — bun 失败
- [ ] `packages/lythoskill-creator/src/bump.ts` — bun 失败

## 影响

- **正面**: agent 遇到环境缺失时自主修复率大幅提升；不需要新框架代码
- **负面**: 错误信息变长（对人类终端读者略不友好）→ 用 `--format=json` 解决，text 模式下保持简洁
- **后续**: 验证 seed bootstrap 或 arena 场景中 agent 是否真的能自主修复缺失的 curl/git

## 相关

- 关联 ADR: ADR-20260507014124191 (Agent-friendly CLI error as decision tree) — 本 ADR 是该决策在"环境协调"场景的具体应用
- 关联 Wiki: `cortex/wiki/01-patterns/cold-pool-unified-facility-design.md`
