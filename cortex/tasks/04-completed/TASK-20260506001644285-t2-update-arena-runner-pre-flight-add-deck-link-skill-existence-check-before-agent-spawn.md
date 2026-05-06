# TASK-20260506001644285: T2: Update arena runner pre-flight — add deck link + skill existence check before agent spawn

## Status History

| Status | Date | Note |
|--------|------|------|
| in-progress | 2026-05-06 | Implementation started |
| in-progress | 2026-05-06 | Started |
| completed | 2026-05-06 | Closed via trailer |

## 背景与目标

Arena grounding smoke tests 暴露了两个问题：
1. **deck link 静默失败** — `bunx @lythos/skill-deck link` 失败时 arena runner 不报错，agent 裸跑，用户以为 skill 在工作
2. **产物复制路径脆弱** — agent 在 `/tmp` 下生成了输出文件，但 `cpSync` 到 `--out` 目录时静默吞错误，导致输出丢失

修复这两个问题，让 arena runner 的 setup 阶段可信任。

## 需求详情

- [ ] Link 后校验：检查 `linkProc.exitCode`，非零则中止并报错
- [ ] Skill 存在性检查：解析 `deck.toml`，对每个声明的 skill 验证冷池路径是否存在；缺失则 warning
- [ ] 产物复制加固：`cpSync` 错误不再静默吞掉；记录复制失败的文件名
- [ ] Agent 输出验证：spawn 完成后检查 stdout 非空；空则 warning

## 技术方案

修改 `packages/lythoskill-arena/src/cli.ts` 中的 `agentRun` 函数：

1. `setupWorkdir` 内部：
   - `linkProc.exited` 后检查 `linkProc.exitCode`
   - 非零 → `console.error` + `process.exit(1)`
   - 解析 `skill-deck.toml`，提取 tool/innate skill path
   - 对每个 skill 检查 `~/.agents/skill-repos/<path>/SKILL.md` 是否存在
   - 缺失 → `console.warn`

2. 复制阶段：
   - 移除内层 `try {} catch {}` 的静默吞错误
   - 改用 `try { cpSync() } catch (e) { console.warn('Failed to copy:', entry, e) }`
   - 额外检查 `agentWorkdir` 是否仍然存在

3. 输出验证：
   - `result.agentResult.stdout` 为空 → `console.warn`

## 验收标准

- [ ] `bunx @lythos/skill-deck link` 失败时 arena runner 立即中止并报告错误
- [ ] deck 声明了不存在的 skill 时 runner 打印 warning（不中止，可能 cold pool 在不同机器上）
- [ ] agent 产出文件能正确复制到 `--out` 目录
- [ ] agent stdout 为空时打印 warning

## 关联文件
- 修改: `packages/lythoskill-arena/src/cli.ts`

## Git 提交信息建议
```
fix(arena): pre-flight deck link verification + output copy hardening (TASK-20260506001644285)

- Check linkProc.exitCode after deck link; abort on failure
- Validate skill existence in cold pool before spawn; warn on missing
- Replace silent cpSync error swallowing with logged warnings
- Warn when agent stdout is empty

The arena grounding smoke tests exposed silent failures: deck link could fail
without detection, and cpSync errors were swallowed, losing agent output.
These pre-flight checks make the setup phase trustworthy.
```
