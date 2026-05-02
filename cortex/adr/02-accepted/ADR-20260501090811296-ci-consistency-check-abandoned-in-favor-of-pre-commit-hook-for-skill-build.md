# ADR-20260501090811296: CI consistency check abandoned in favor of pre-commit hook for skill build

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-01 | Created |
| accepted | 2026-05-01 | Approved by user — supersedes the CI portion of ADR-20260423124812645 |

## 背景

ADR-20260423124812645 决定采用"方案 A + G（提交 skills/ 到 main 分支 + CI 一致性检查），过渡期采用方案 F（pre-commit hook）作为临时保障"。

但项目自 2026-04-23 以来，始终未建立 CI 基础设施，`.github/workflows/` 目录为空。相反，`.husky/pre-commit` 自第一天起就稳定运行，在 skill 源码变更时自动 rebuild 并 stage 产物，从未出现 source drift。

这导致了一个 governance 问题：**ADR 记录的决定与实际系统状态不一致**。旧 ADR 承诺了 CI 兜底，但实际上 CI 从未出现，且 pre-commit hook 已证明足够可靠。

## 决策驱动

- **单一真相来源**：ADR 必须反映真实系统状态，否则后续 agent 会基于错误假设工作
- **不预测未来**："未来必然需要 CI" 是一个预测。实际上项目规模小、contributor 少，husky 已覆盖全部场景
- **最小有效治理**：增加 CI 是额外复杂度，除非现有方案确实失效

## 选项

### 方案A：保持旧 ADR 不变，静默执行 F

不修改 ADR，继续使用 pre-commit hook，CI 永远停留在"未来计划"。

**优点**:
- 无需改文档

**缺点**:
- ADR 成为谎言——agent 按 ADR 工作会试图创建 CI workflow
- 后续审计（如本次）会持续发现"后续任务未完成"

### 方案B：追认现状，正式作废 CI 部分（推荐）

发布新 ADR，明确声明：
- 旧 ADR 中"方案 G（CI 一致性检查）"部分被本 ADR **作废**
- 旧 ADR 中"方案 A（提交 skills/ 到 main）"仍然有效
- 方案 F（pre-commit hook）从"过渡期临时方案"升格为**正式方案**

**优点**:
- ADR 与系统状态一致
- 明确记录决策变更历史（为什么 CI 被放弃）
- 符合 red-green-release 心智：错误决策也要显式归档

**缺点**:
- 需要多一个 ADR 文件

## 决策

**选择**: 方案B

**原因**:

1. **ADR 是代码的法律，法律必须与执行一致**。如果 ADR 说要做 CI 但实际上没人做，ADR 就失去权威性。

2. **pre-commit hook 已验证可靠**。自项目启动以来，所有 skill 修改都通过 hook 自动 rebuild，skills/ 与 packages/**/skill/ 从未出现 drift。build 耗时 ~0.6s，对 commit 体验影响可忽略。

3. **CI 在当前阶段是过度工程**。本项目 contributor 极少，所有提交都来自本地开发环境。husky 的本地强制已覆盖全部 commit 路径。

4. **保留未来恢复 CI 的可能性**。本 ADR 只作废"必须做 CI"的决定，不禁止未来重新评估。如果项目规模扩大、贡献者增多，可以召开新的 ADR 重新引入 CI。

## 影响

- 正面:
  - ADR 与系统状态恢复一致
  - 后续 agent 不会再试图创建 `.github/workflows/check-skills.yml`
  - 明确记录了"为什么不做 CI"的理由，避免未来反复讨论

- 负面:
  - 无

- 后续:
  - 更新 ADR-20260423124812645 的 Status History，标记被本 ADR 部分覆盖
  - 从 AGENTS.md 中移除或修改关于 CI 的引用（如果有）

## 相关

- **被覆盖 ADR**: ADR-20260423124812645-should-dist-be-committed-to-git-or-ignored.md（仅覆盖其"方案 G（CI）"部分，"方案 A（提交 skills/）"仍然有效）
- 关联 Skill: lythoskill-red-green-release（本 ADR 本身即是一次 red-green 决策修正）
