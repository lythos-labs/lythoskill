# TASK-20260613234838986: Refactor probe.ts into intent-plan-execute IO separation

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-13 | Created |

## 背景与目标

probe.ts 的 `probeStatus()` 是一个 300+ 行的巨无霸函数，混合了文件扫描、状态解析、匹配检查、空壳检测、输出打印等职责。这与项目倡导的 **intent-plan-execute (IO 分离)** 架构模式不一致。

deck/curator/cold-pool 等包已经成熟采用该模式：
- `buildXxxPlan()` — 纯函数，输入数据 → 输出 plan
- `executeXxxPlan(plan, io)` — 接收 plan + 注入的 IO → 执行副作用
- 测试时：测 `buildXxxPlan` 用纯数据，测 `executeXxxPlan` 用 mock IO

probe 目前只有空壳检测部分（`isEmptyShell`, `filterEmptyShells`）做了 IO 分离，其余部分（状态一致性检查、lane 检查、ADR-Epic coupling、staleness）全部内联在 `probeStatus()` 中，导致：
1. 难以测试 — 需要真实文件系统 + 真实 cortex 目录结构
2. 难以 mock — 没有统一的 IO 接口
3. 难以复用 — 纯逻辑和副作用混在一起

本任务要将 probe 全面重构为 intent-plan-execute 架构。

## 需求详情

- [ ] 提取 `buildProbePlan(files, config)` — 纯函数，扫描文件 + 解析内容 → 输出 `ProbePlan`
- [ ] 提取 `executeProbePlan(plan, io)` — 注入 `readFile`, `scanDir`, `log`, `spawn` 等 IO
- [ ] 为 `buildProbePlan` 编写纯数据单元测试（无需文件系统）
- [ ] 为 `executeProbePlan` 编写 mock-IO 单元测试
- [ ] 保持现有 CLI 输出格式不变（用户无感知）
- [ ] 导出 `extractStatusHistory` 和 `checkMatch` 供测试使用（当前是内部函数）

## 技术方案

参考 deck 包的 `refresh-plan.ts` 模式：

```typescript
// Plan 层 — 纯函数
export interface ProbePlan {
  taskResults: ProbeResult[];
  epicResults: ProbeResult[];
  adrResults: ProbeResult[];
  laneWarnings: string[];
  couplingWarnings: string[];
  staleBacklog: string[];
  driftedEpics: string[];
  emptyShells: string[];
  nonAsciiSlugs: string[];
}

export function buildProbePlan(
  files: { tasks: string[]; epics: string[]; adrs: string[] },
  config: WorkflowConfig,
  readFile: (path: string) => string  // 纯函数接口，测试中传入 mock
): ProbePlan;

// Execute 层 — IO 注入
export interface ProbeIO {
  log: (msg: string) => void;
  scanDir: (dir: string, prefix: string) => string[];
  readFile: (path: string) => string;
  spawn: (cmd: string, args: string[]) => { status: number; stdout: string };
}

export function executeProbePlan(plan: ProbePlan, io: ProbeIO, opts?: { suspicious?: boolean }): void;
```

重构步骤：
1. 将 `extractStatusHistory`, `checkMatch`, `inferStatusFromPath` 移到模块顶层并导出
2. 将 `scanDir` 改为接收 `readdirSync` 注入（或保持为内部工具函数）
3. 将 `probeStatus` 拆分为 `buildProbePlan` + `executeProbePlan`
4. `probeStatus` 成为薄包装层：扫描文件 → buildPlan → executePlan

## 验收标准

- [ ] `buildProbePlan` 有 ≥20 个纯数据单元测试，覆盖所有检查类型（status mismatch, missing history, lane violation, coupling, staleness, empty shell, slug charset）
- [ ] `executeProbePlan` 有 ≥5 个 mock-IO 测试，验证输出格式和过滤逻辑
- [ ] 现有 `probe.test.ts` 的 `isEmptyShell` + `filterEmptyShells` 测试继续通过
- [ ] 运行 `cortex probe` 输出与重构前完全一致（肉眼对比）
- [ ] 代码覆盖率：probe.ts 达到 ≥80%（当前未统计）

## 关联文件
- 修改: `packages/lythoskill-project-cortex/src/commands/probe.ts`
- 修改: `packages/lythoskill-project-cortex/src/commands/probe.test.ts`
- 参考: `packages/lythoskill-deck/src/refresh-plan.ts`, `packages/lythoskill-cold-pool/src/reconcile-plan.ts`

## 备注

这是一个架构债务清理任务，不是功能新增。优先级：P2（当 probe 需要新增检查类型时，先做这个重构，否则新增逻辑会让巨无霸函数更大）。
