# ADR-20260503003314901: git-coupling for cortex governance documents via commit trailer

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-03 | Created — couples cortex FSM transitions to commit messages |

## 背景

Cortex 用有限状态机管理三类治理文档:**task**(`backlog → in-progress → review → completed`,加 `suspend/resume/reject/terminate/archive` 分支)、**ADR**(`proposed → accepted | rejected | superseded`)、**epic**(`active → done | suspended`)。截至 2026-05-03,只有 task 有完整状态机 CLI(`start / review / done / suspend / resume / reject / terminate / archive`),ADR 与 epic 仍依赖手动 `mv` 文件或目录。

但即使有 task CLI,实际 session 中**仍然反复出现"工作做了,task 卡片没动"的现象**:

### 问题 1:高频事件没驱动低频事件

工作的物质载体是文件编辑 + git commit(每次 session 多次发生),状态流转是单独动作(每个 task 生命周期里 2~3 次发生)。**两者没耦合**,所以 commit 之后 agent 经常忘记跑 `cortex review/done`,task 长期滞留在 `02-in-progress/`。

### 问题 2:ADR / epic 没有 CLI 兜底

即使 agent 没忘,ADR / epic 的状态变更只能 `git mv 01-proposed/... 02-accepted/...`,容易写错路径、漏掉 Status History 表格更新、忘记 INDEX 重生成。本次 session 内已经亲历过一次:`ADR-20260502234833756` 移到 `02-accepted/` 后,Status History 还停留在 `proposed`,直到第二轮 review 才补 `accepted` 行。

### 问题 3:已完成工作没有可追溯反向链接

即使 task 移到了 `04-completed/`,从 commit 反查 "这个 commit 闭合了哪个 task?" 还是要靠 commit message 里的人工裸文本(`feat(creator): implement bump subcommand (ADR-20260502233119561)` 这种括号引用)。约定不一致,机器无法解析。

### 用户原话与心智参照

> "之前你做了很多工作都非常好,但是没有触发 task card 跟着流转,所以想着怎么植入流程自然触发"
> "做完了和 git 关联一下,jira ticket 心智类似物这样?"

Jira 通过 `Closes JIRA-1234` / `Refs JIRA-1234` 在 commit message 里关联 ticket,是个被验证多年的模式。本 ADR 的目标是把同一种"低成本声明 + 自动化执行"的耦合迁移到 lythoskill 的 cortex 上。

### 为什么不是教育问题

session 经验显示,反复提醒 agent "commit 后记得 `cortex done`" 不可持续 —— 跨压缩、跨 CLI、跨 agent,记忆一定会丢。**必须把流转嵌入到 commit 这个一定会发生的动作里**,才能把"记得"从 agent 责任转换为工具不变量。

## 决策驱动

- **高频事件载低频事件**:让必发生的 commit 触发可遗忘的状态变更
- **Opt-in,非强制**:不写 trailer = 不流转,保留增量提交自由(agent 可以每隔几次 work-in-progress commit 才声明一次状态变更)
- **三类文档统一**:同一套 trailer 语法覆盖 task / ADR / epic,降低记忆成本
- **复用 CLI**:hook 调用现成的 cortex CLI 命令,不在 hook 里再实现一份状态机
- **跨 CLI / 跨压缩可记忆**:约定写进 AGENTS.md / CLAUDE.md / auto-memory 三层(参考 ADR-20260502233119561 的镜像模式)
- **不阻塞主流程**:hook 失败时不阻断 commit;只是失败时打印警告,允许人工补救
- **可审计**:跟随 commit 反向引用源 commit hash,从 git log 上能看到"哪次 commit 触发了哪次流转"

## 选项

### 方案A:维持现状(CLI 已存在,靠人记得调)

依赖 AGENTS.md 中的"操作规范"段落 + agent 自觉。

**优点**:
- 零实现成本

**缺点**:
- 已经验证不可持续(本 ADR 背景列出的全部问题)
- 跨压缩 / 跨 session / 跨 CLI 的记忆衰减无解

### 方案B:commit-msg hook 原子化(work + transition 合一)

用 `commit-msg` hook 解析 trailer,**在 commit 还没入库前**调 cortex CLI 移动文件,然后把移动产生的 diff 也加入正在打包的 commit。最终一个 commit 同时包含工作变更和文档流转。

**优点**:
- bisect 时一个 commit 一个语义单元(无中间态)

**缺点**:
- `commit-msg` hook 重新 stage 文件流程复杂、跨 git 版本兼容性差
- 一个 commit 揉两件事,违反"single concern per commit"原则
- 错误处理硬:如果 cortex 移动失败,要回滚 staged area,极易出错
- diff 在 review 时混在一起,降低可读性

### 方案C(推荐):commit trailer + post-commit hook 跟随 commit

**约定**:在 commit message 末尾加 git-trailer 风格的一行:

```
Task: TASK-20260502233741335 review
ADR: ADR-20260502233119561 accept
Epic: EPIC-20260430012504755 done
Closes: TASK-20260502233741335
```

- **动词**与 cortex CLI 命令名对齐(`start` / `review` / `done` / `suspend` / `resume` / `reject` / `terminate` / `archive` 对 task;ADR / epic 各自的状态动词)
- **`Closes:` 是简写别名**,按 ID 前缀分流:
  - `Closes: TASK-...` → `task review` 然后 `task done`(若已 review,直接 done)
  - `Closes: ADR-...` → `adr accept`
  - `Closes: EPIC-...` → `epic done`
- **多 trailer 串行执行**(一次 commit 同时收尾多张卡)

**Hook**: `.husky/post-commit`
- 解析最近 commit message
- 找出 `Task:` / `ADR:` / `Epic:` / `Closes:` trailer
- 对每个 trailer 调对应 cortex CLI(`bun packages/lythoskill-project-cortex/src/cli.ts <verb> <ID>`)
- 把 cortex CLI 产生的文件变更(被移动的 doc + 重新生成的 INDEX.md)用一个跟随 commit 提交,message 形如:

```
chore(cortex): TASK-20260502233741335 review

Triggered by: <source-commit-hash>
```

- 失败兜底:trailer 格式不合法 / 状态转换非法(例如 task 还在 backlog 就来 done)→ 打印警告,不创建跟随 commit,不阻塞用户

**优点**:
- 主流程零侵入(`git commit` 还是 `git commit`)
- trailer 是声明式意图,hook 是执行;两者解耦
- 两个 commit 各讲一件事(实际工作 vs 治理状态),bisect 友好
- 失败时影响面最小(只是没生成跟随 commit,工作 commit 已入库)
- 反向链接(`Triggered by: <hash>`)让 git log 可追溯

**缺点**:
- agent 必须学一种 trailer 语法(成本由 AGENTS.md / CLAUDE.md / memory 三层镜像吸收)
- 两个 commit 不是原子,理论上 push 之间存在中间态;但 cortex 状态本身就是项目状态记录,不是生产系统,不要求原子

### 方案D:cortex CLI 包装 git commit(`cortex commit`)

引入新动词 `cortex commit "<message>" --task <id> --to <state>`,内部依次:
1. 跑 cortex 状态变更
2. 跑 git commit 把工作 + 状态变更一起入库

**优点**:
- 单一动作完成两件事

**缺点**:
- 训练 agent 用 `cortex commit` 替代 `git commit` 困难;`git commit` 是 muscle memory
- 与 IDE / GUI / aliases / pre-commit 体系打架
- 违反"高频事件就用现成的"原则

## 决策

**选择**: 方案C

**原因**:

1. **mirror 已经验证有效的"hook + 不变量"范式**:ADR-20260502233119561 的 lock-step bump 也是"通过工具级强制把 agent 自觉转换成不变量"。本 ADR 在 cortex 流转上做同样的事,机制对称、心智一致。

2. **耦合点选在 commit 是 cost / benefit 最优**:commit 是一定会发生的、agent 必经的动作;trailer 是"已经在写的 commit message"末尾加一行 —— 边际成本最低,边际收益(自动流转)最高。

3. **拒绝原子化(B)**:工作 diff 与状态 diff 在语义上就是两件事。强行 atom 化会让 review 难读、bisect 失去精度、错误恢复困难。

4. **拒绝包装(D)**:lythoskill 的整体设计哲学是 "defer to mature infra"。git commit 是 mature infra,不应该被自家 wrapper 替换。trailer + hook 是嫁接而不是替代。

5. **同一套 trailer 覆盖三类文档**:语法对称(`<DocType>: <ID> <verb>`)+ ID 前缀分流,记忆成本只一份。

6. **失败兜底由 `cortex probe` 已覆盖**:hook 静默失败的 worst case 是"工作 commit 入库,但治理文档没流转 → 状态漂移"。但 cortex CLI 已经有 `probe` 子命令做一致性检查(扫描 `01-active/02-in-progress/...` 与 INDEX / status history 对照),漂移可观测、可驱动回归一致。也就是说**自动化失败 ≠ 数据损坏**,只是回到方案 A 的人工补救路径,且补救工具现成。这让选 C 的 downside 接近零 —— 自动化成功是收益,失败也只是退化为 baseline。

## 影响

- 正面:
  - **流转自动化**:`cortex done <id>` 之类的手操从 session 责任降级为可选(失败兜底,可以人工补)
  - **三类文档治理统一**:实施过程中顺便把 ADR / epic 的状态机 CLI 命令补齐(原本只有 task 有)
  - **可审计**:`git log --grep "Triggered by:"` 可以从治理变更反查工作 commit
  - **跨 session 心智一致**:trailer 约定写入 AGENTS.md / CLAUDE.md / memory 三层,跨压缩可恢复
  - **降低 epic graveyard 风险**:配合 ADR-20260503003315478(epic 粒度)使用时,流转自动化可以让 epic 真的能"完成"

- 负面:
  - hook 失败时需要人工补 cortex CLI(可接受 — 只是少了自动化,没破坏数据)
  - 学习一种 trailer 约定(成本由文档与三层镜像吸收)
  - 一次有效 commit + 一次跟随 commit,review history 多一行(但跟随 commit 信息密度高,不是噪声)

- 后续:
  1. 创建 Epic 跟踪本 ADR 的实施(本身作为"epic 应有单一 outcome"的范例,见 ADR-20260503003315478)
  2. T1: 扩展 ADR / epic 状态机 CLI 命令(prereq for trailer 全功能)
  3. T2: `.husky/post-commit` + trailer 解析器实现
  4. T3: `.husky/pre-commit` 软提醒(in-progress 不为空时打印一行 reminder,不阻塞)
  5. T4: AGENTS.md / CLAUDE.md / auto-memory 三层镜像更新(对称 release & auth 那套)
  6. T5: 同步 `packages/lythoskill-project-cortex/skill/SKILL.md` 与包内 README
  7. T6: BDD 覆盖(用 `@lythos/test-utils`),subagent 跑三类文档 × 各转换 + trailer 缺失 / 格式错的 sample 验证

## 相关

- 关联 ADR:
  - ADR-20260502233119561(lock-step bump)— 同一种"hook + 工具级不变量"范式
  - ADR-20260424125637347(handoff daily-first)— 也属 cortex 流转治理
  - ADR-20260503003315478(epic granularity discipline)— 平行 ADR;本 ADR 的自动化让 epic 真的能"完成",granularity ADR 让 epic 真的能"开始"
- 关联 Epic: 待创建(`Cortex 自动流转 — git 驱动取代手操`)
- 关联 Skill: lythoskill-project-cortex(实现位置:`packages/lythoskill-project-cortex/src/cli.ts` 扩展、`.husky/post-commit` 新增)
