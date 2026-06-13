# TASK-20260530135721111: Arena runner IO injection — extract ArenaIO for spawn/fs/agent operations

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note | 
|--------|------|------|
| backlog | 2026-05-30 | Created as part of EPIC-20260530135721111 |
| completed | 2026-06-13 | Reconciled — work was completed in commit history but Status History was missing |

## 背景与目标

Arena runner (`packages/lythoskill-arena/src/runner.ts`) 的 `runArenaFromToml` 已有 `log?: (msg)=>void` 可选参数，但内部仍直接调用 `mkdirSync`/`writeFileSync`/`Bun.spawn`/`useAgent`。

本任务将统一提取 `ArenaIO` 接口，覆盖：
- `log` / `error` — 输出
- `mkdir` / `writeFile` / `readFile` / `readdir` / `cp` — 文件系统
- `spawn` — 子进程 (deck link)
- `agentSpawn` — agent 调用 (useAgent().spawn)

参考先例：
- `RefreshIO` in `packages/lythoskill-deck/src/refresh-plan.ts`
- Intent/Plan/Execute 分形架构 (cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md)

## 需求详情

- [x] 定义 `ArenaIO` interface 覆盖上述操作
- [x] `runArenaFromToml(opts, io?)` — 统一注入
- [x] `buildArenaPrompt` 保持纯函数（无需 IO）
- [x] 内部所有 fs 操作改为 `io.mkdir`/`io.writeFile` 等
- [x] `Bun.spawn(['bunx', '@lythos/skill-deck', 'link'])` 改为 `io.spawn`
- [x] `useAgent(...).spawn(...)` 改为 `io.agentSpawn`
- [x] 添加 `runner.test.ts` 测试：mock IO 验证 plan 执行路径

## 技术方案

```ts
export interface ArenaIO {
  log?: (msg: string) => void
  error?: (msg: string) => void
  mkdir?: (path: string, opts?: { recursive?: boolean }) => void
  writeFile?: (path: string, data: string) => void
  readFile?: (path: string) => string
  readdir?: (path: string) => string[]
  cp?: (src: string, dest: string, opts?: { recursive?: boolean }) => void
  spawn?: (cmd: string[], opts: { cwd: string, env?: Record<string,string> }) => Promise<{ exitCode: number | null, stderr: string }>
  agentSpawn?: (opts: { player: string, cwd: string, brief: string, timeoutMs: number }) => Promise<{ stdout: string, stderr: string, durationMs: number }>
}
```

Default IO 使用真实 `node:fs`/`Bun.spawn`/`useAgent`。

## 验收标准

- [ ] `bun test packages/lythoskill-arena/src/runner.test.ts` 通过
- [ ] Mock IO 测试覆盖：dry-run、单 cell 执行、错误恢复
- [ ] `bun --filter='*' run test` 全绿

## 关联文件
- 修改: `packages/lythoskill-arena/src/runner.ts`
- 修改: `packages/lythoskill-arena/src/runner.test.ts` (已有，需扩展)

## Git 提交信息建议
```
feat(arena): IO inject runner layer — ArenaIO for fs/spawn/agent operations (TASK-20260530135721111)

- Extract ArenaIO interface with fs/spawn/agentSpawn hooks
- Inject into runArenaFromToml
- Extend runner.test.ts with mock IO coverage
```
