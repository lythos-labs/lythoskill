# TASK-20260503010229362: 实现 husky post-commit trailer 解析 + 跟随 commit

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

ADR-20260503003314901 选项 C 的核心实现。`.husky/post-commit` 解析 commit message 末尾的 trailer,调对应 cortex CLI 触发流转,产生跟随 commit 把流转的文件变更入库。

让 cortex 治理流转从"agent 自觉"变为 commit-driven 不变量。

## 需求详情

- [ ] `.husky/post-commit` 脚本:获取 HEAD commit message
- [ ] 解析 trailer:`Task: <ID> <verb>` / `ADR: <ID> <verb>` / `Epic: <ID> <verb>` / `Closes: <ID>`(简写按 ID 前缀分流)
- [ ] 多 trailer 串行处理(一次 commit 收尾多张卡)
- [ ] 对每个 trailer 调对应 cortex CLI(`bun packages/lythoskill-project-cortex/src/cli.ts <verb> <ID>`)
- [ ] 收集 cortex CLI 产生的文件变更(被移动的 doc + INDEX.md)
- [ ] 跟随 commit message 形如:
  ```
  chore(cortex): <verb> <ID>(or 多条 summary)

  Triggered by: <source-commit-hash>
  ```
- [ ] 失败兜底:trailer 格式不合法 / 状态转换非法 → 打印警告,不创建跟随 commit,不阻塞
- [ ] 防递归:跟随 commit 含 `Triggered by:` → 跳过 hook

## 技术方案

- 实现:bash(项目已用 husky)
- 解析正则:`^(Task|ADR|Epic|Closes):\s+([A-Z]+-\d+)(\s+\w+)?$`
- 调 cortex CLI 时捕获 stderr,失败 warn 不退出
- 跟随 commit 用 `git add` 收集 cortex 改动 + `git commit --no-verify`(仅这一处可以,因为是 hook 内部不让 pre-commit 重入)

## 验收标准

- [ ] commit 带 `Closes: TASK-<已存在的 in-progress task>` → 自动产生跟随 commit,task 移到 04-completed
- [ ] commit 不带 trailer → 不产生跟随 commit
- [ ] commit 带格式错的 trailer → 打印警告,工作 commit 已入库
- [ ] commit 带 `ADR: ADR-XXX accept` 触发 ADR 移到 accepted + Status History 更新
- [ ] 跟随 commit 不递归触发(message 含 `Triggered by:`)

## 进度记录

(执行时追加)

## 关联文件

- 新增: `.husky/post-commit`
- 引用: cortex CLI 命令(T1 提供)

## 引用

- ADR: ADR-20260503003314901(方案 C 描述、决策原因 6 关于 probe 兜底、影响段反向链接)
- Epic: EPIC-20260503010218940(主题C)
- Sibling: TASK-20260503010227902(T1 — 提供 verb 命令,硬前置)

## Git 提交信息建议

```
feat(cortex): post-commit hook for trailer-driven flow (TASK-20260503010229362)

Closes: TASK-20260503010229362
```

## 备注

- 硬依赖 T1(verb 命令必须先存在)
- 测试时建议先在 fixture 仓库(tmpdir 初始化)跑,避免污染主项目历史
