# TASK-20260519164655956: A: 删除 CheckResult.remediation 字段 + printRemediationSummary

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| completed | 2026-05-19 | Implemented — remediation removed from types, checks, execute, tests |
| completed | 2026-05-19 | Closed via trailer |

## 背景与目标

entropy-check 的 remediation 字段违反了 CLI/agent 边界原则：脚本替 agent 做判断（"你应该做X"）。应删除所有 remediation，check result 的 message + details 本身就是导航数据。

## 需求详情
- [x] types.ts: 删除 CheckResult.remediation 字段
- [x] checks.ts: 删除 5 个 check 函数的 remediation 数组
- [x] execute.ts: 删除 printRemediationSummary() 函数和调用
- [x] 37 tests pass, 0 remediation 引用

## 技术方案
直接删除，无需替代方案。message + details 提供导航数据。

## 验收标准
- [x] `grep -r 'remediation' scripts/entropy-check/` 无匹配
- [x] `bun scripts/entropy-check/*.test.ts` 37 pass
- [x] `--force` 输出中无 `<spawn subagent>` 字样
