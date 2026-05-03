# TASK-20260503010229362: 实现 husky post-commit trailer 解析 + 跟随 commit

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

ADR-20260503003314901 选项 C 的核心实现。`.husky/post-commit` 解析 commit message 末尾的 trailer,调对应 cortex CLI 触发流转,产生跟随 commit 把流转的文件变更入库。

让 cortex 治理流转从"agent 自觉"变为 commit-driven 不变量。

## ⚠️ 仓库现状 vs Spec 冲突点(T1/T2 经验,必读)

T1 时 subagent 在 spec 与现状冲突时自创 dir migration,没报告就动手。T2 时 task card 预决了 3 个冲突点,subagent 严守 spec 没自创。T3 已知 5 个冲突点,**按以下处理**(发现新冲突点 → **先报告再动手**)。

### 冲突 1: `.husky/post-commit` 已存在(hexo sync to skills branch)

仓库现状:`.husky/post-commit` 已有内容(同步 `skills/*` + `README.md` 到 `skills` 分支;若 commit 没碰这两类文件,头部 `exit 0` 提前退出)。

**处理**:trailer 解析逻辑作为 **新 block 追加** 到现有文件,**不要重写**。位置:加在文件**头部**(hexo 段之前),原因 ↓。

### 冲突 2: trailer 解析与 hexo sync 的执行顺序

执行序:trailer 解析 → 创建跟随 commit → hexo sync 处理当前 + 跟随 commit 的 skills/README 改动(如果有)。

**处理**:hexo 段已有 `exit 0` 早退条件;只要 trailer 段在前、hexo 段在后,且 trailer 段不修改 skills/README,二者天然兼容。**保持 hexo 段不动**,只在它前面追加 trailer 段。

### 冲突 3: `task done` 严卡 review → completed,无法从 backlog/in-progress 直接关闭

仓库现状:`TASK_VALID_TRANSITIONS` 在 `packages/lythoskill-project-cortex/src/commands/move.ts:21-27`:
```
backlog → in-progress
in-progress → review | suspended
review → completed | in-progress
```
即 `task done <ID>` 要求当前在 review。但 `Closes: TASK-X` 的常见场景是用户在 in-progress 状态下 commit "我做完了",不会先手动 `review`。

**处理**:**新增 CLI 动词 `task complete <ID>`** —— 任意状态 → completed,单条 Status History entry(note 为 "Closed via trailer"),不走多步 FSM。理由:多步 walk FSM 会产生 3 条 Status History entry 同一时间,看起来像噪音。新 verb 是 additive,不破坏现有 `task done` 严格语义(那个用于显式 review → done 流转)。

加完 `task complete` 动词后,trailer dispatch:
- `Closes: TASK-X` → `task complete X`(任意 → completed)
- `Closes: ADR-X`  → `adr accept X`(已实现,proposed → accepted)
- `Closes: EPIC-X` → `epic done X`(已实现,active → done)
- `Task: TASK-X <verb>` → `<verb> X`(显式 verb,如 `start` / `review` / `done` / `suspend` / `resume` / `terminate` / `archive`)
- `ADR: ADR-X <verb>` → `adr <verb> X`(`accept` / `reject` / `supersede`)
- `Epic: EPIC-X <verb>` → `epic <verb> X`(`done` / `suspend` / `resume`)

### 冲突 4: 跟随 commit 的递归触发

仓库现状:husky post-commit 在每次 commit 后都会再次触发自身。如果 trailer 段本身做了 `git commit` 创建跟随 commit,会无限循环。

**处理**:递归保护用 `Triggered by:` 行做 marker。具体:
1. trailer 段开头先 `git log -1 --format=%B HEAD | grep -q "^Triggered by:"` → 命中即 `exit 0`(跳过 trailer 处理,但允许 hexo 段继续跑)
2. 跟随 commit message 必须包含字面 `Triggered by: <source-commit-short-hash>` 行
3. 跟随 commit 用 `git commit --no-verify`(因为是 hook 内部,且 pre-commit 不应在 hook 内重入)

### 冲突 5: cortex CLI 的工作目录

仓库现状:cortex CLI(`bun packages/lythoskill-project-cortex/src/cli.ts`)在内部用 `process.cwd()` 找 cortex 根目录(see `findProjectRoot` 类似逻辑)。post-commit hook 触发时 cwd 通常已经是项目 root,但保险起见显式 cd。

**处理**:trailer 段开头 `cd "$(git rev-parse --show-toplevel)"`。

### 通用规则:遇到未列出的冲突点

- 不要自己发明 migration 或 CLI 语义变更
- 在本卡 "进度记录" 段追加 note 或新写 `cortex/tasks/02-in-progress/` 内 note 文件
- 报告里明确说"我看到 X 与 Y 冲突,我建议方案 Z,但没动手"

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

- 修改: `.husky/post-commit`(在现有 hexo sync 段之前追加 trailer 段)
- 修改: `packages/lythoskill-project-cortex/src/commands/move.ts`(新增 `task complete` 动词,任意状态 → completed)
- 修改: `packages/lythoskill-project-cortex/src/cli.ts`(注册 `complete` 动词 + `--help` 文本)
- 引用: cortex CLI 已有动词(T1 提供:adr accept/reject/supersede、epic done/suspend/resume)

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
