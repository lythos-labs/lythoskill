# ADR-20260504135256566: cortex init ships trailer-driven hooks as the jira-simulation deliverable

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-04 | Created — frozen scope for future husky-mixin ADR |

## 背景

`lythoskill-project-cortex` 的产品定位是 **GTD-style task / epic / ADR 治理层**,对外承诺的体验是"轻量级 Jira 模拟"——commit 即工单流转、文档即真相。

但目前这个体验的 **80% 不在 cortex 包里**:

- `cortex init` (`packages/lythoskill-project-cortex/src/commands/init.ts`) 只做目录脚手架(`tasks/` `epics/` `adr/` `wiki/` + 各自的 `01-…` 状态子目录)+ 拷贝四份模板 + 写 `.cortex.json`。
- 真正"像 Jira 一样自动流转"的逻辑全部躺在 **本仓库手写的 `.husky/post-commit` + `.husky/pre-commit`** 里。
- 任何用 `cortex init` 起的新项目,目录是齐的,**自动化是空的**——拿到的是 Jira 的"项目模板",不是 Jira 本身。

这次决策不解决 husky-mixin 怎么打包的问题(那是另一个 ADR),只回答:**Jira-simulation 的最小可移植内核到底包含哪几块行为?** 划清楚了,后续 mixin 才有冻结的设计目标。

## 决策驱动

- **可发现性**:Jira-simulation 是 cortex 区别于普通 GTD 工具的差异化卖点。如果 `init` 不交付,新用户拿到的是空壳——典型的"装了但没用上"陷阱。
- **单一真相源**:目前的手写 hook 是项目内的孤岛副本。一旦 cortex CLI 命令重命名(如 `complete` → `done`),手写 hook 静默失效,不会有任何告警。
- **Skin in the game**:把 hook 行为绑定在 cortex 包里,等于给 cortex 维护者强制建立"破坏自动化 = 破坏自家测试"的反馈回路。
- **边界**:本仓库 `.husky/*` 里同时混杂着 **skill-builder 的职责**(skill 重建、hexo-style skills 分支同步)和 **cortex 的职责**(trailer 调度、Epic-ADR 耦合、lane 守护)。两边不能糊在一起。

## 选项

### 方案 A:维持现状(`cortex init` 永远只做目录)

`init` 就是脚手架,husky 由用户自己手写,文档化推荐配置。

**优点**:
- cortex 包面最小,不引入 husky 依赖
- 对自定义 hook 流程的项目零干扰

**缺点**:
- 80% 的 Jira-simulation 体验不在产品里;`init` 完成后看似 ready,实际所有自动化都缺
- 用户必须先理解 trailer 协议、recursion guard、Epic-ADR 耦合、lane 双轨道,才能复刻——而这正是 cortex 应该承担的复杂度
- 团队间的 hook 实现会分叉:每个项目都要重新发明轮子,bug fix 不会回流

### 方案 B:`cortex init` 直接覆盖写 `.husky/post-commit` + `.husky/pre-commit`

`init` 时把当前手写文件原样落到目标项目。

**优点**:
- 一行 `cortex init` 即获得完整 Jira-simulation
- 实现简单,字符串复制即可

**缺点**:
- 抢占用户的 husky 文件,无法和其他 hook 共存(本仓库自己就有 lythoskill-creator 的 skill build 和 hexo sync,会被覆盖)
- 不可升级:cortex 行为更新后,用户已修改的文件无法干净地 patch
- 与"thin-skill"哲学冲突:cortex 应该薄,不该侵占用户的执行平面

### 方案 C:`cortex init` 走 husky-mixin 协议,**本 ADR 冻结 mixin 内 cortex 自治的最小行为集**

mixin 协议本身留给后续 ADR;本 ADR 只回答"cortex 在 mixin 里负责哪几件事"。

**优点**:
- 与 skill-builder mixin / hexo mixin / 用户自定义 mixin 共存
- 锁定行为集 = 后续 mixin ADR 的设计输入是冻结的,不会和"我们到底要哪些"扯皮
- 可独立升级:mixin 协议提供 install/upgrade/uninstall 钩子

**缺点**:
- mixin 协议尚未存在,本 ADR 落地后短期内 `.husky/*` 仍维持手写
- 需要后续 ADR 跟进 mixin 设计

## 决策

**选择**:方案 C。明确 cortex 在 husky-mixin 中自治的最小行为集 = **三块**,全部以"提取 `.husky/*` 中 lythoskill 自主部分"为口径。

### 行为 1:T3 trailer-driven 任务/ADR/Epic 自动流转(post-commit)

来源:`.husky/post-commit` 中 `trailer_block()` 函数(L13–L154)。

**职责**:
- 解析 commit message 中的 `Task: <ID> <verb>` / `ADR: <ID> <verb>` / `Epic: <ID> <verb>` / `Closes: <ID>` 行
- 通过 `bun packages/lythoskill-project-cortex/src/cli.ts <verb> <ID>` 调用 cortex CLI
- 把 cortex CLI 的产出(目录移动、INDEX 更新)作为 follow-up commit 落盘
- Recursion guard:follow-up commit 携带 `Triggered by: <source-hash>` marker,hook 见到 marker 立即 return

**为什么是 jira-like**:这是 Jira 里"在提交里写 issue key 触发 transition"的等价物——commit 即流转。失去这块,cortex 退化成手动改文件的目录约定。

### 行为 2:Epic→ADR 自动接受(pre-commit)

来源:`.husky/pre-commit` 第 22–37 行的 Epic-ADR 耦合保护块。

**职责**:
- 当 staged 文件中出现 `cortex/epics/01-active/EPIC-*.md`(新 Epic 进入 active 轨道)时
- 扫描 `cortex/adr/01-proposed/ADR-*.md`,匹配 `Epic: $epic_id`
- 对命中的每个 ADR 自动调用 `bun packages/lythoskill-project-cortex/src/cli.ts adr accept`
- 把 ADR 移动产出 staged 进同一个 commit

**为什么是 jira-like**:Jira 里"epic 被批准 → 子任务的设计文档同步 unblock"的耦合,自动化版本。手动维护的话,proposed ADR 容易和已激活的 Epic 失同步,造成"epic 已经在干了,但其设计还挂在 proposed"的尴尬状态。

### 行为 3:Lane 守护(双轨道 max-1-active)

来源:目前在 cortex CLI 层(`epic create` / `epic resume` 时强制),commit-time guard 尚不存在。

**职责**:
- 维持双轨道(`main` + `emergency`),各自最多 1 个 active epic
- CLI 层面已强制(违反则拒绝创建/激活)
- mixin 内**应额外提供 commit-time guard**:防止 `git mv` / 手动文件移动绕过 CLI 改写状态目录

**为什么是 jira-like**:Jira 的 sprint/board WIP 限制。WIP 不是建议,是硬上限——多线并行是 GTD 失败的头号症状,cortex 必须强制阻断。

### 显式排除(本 ADR **不** 收录)

以下虽然也在 `.husky/*` 里,但属于 **skill-builder / lythoskill-creator** 范畴,不是 cortex 自治:

- `.husky/post-commit` 中的 **hexo-style skills 分支同步**(L155–L197):专属 skill-builder/release。
- `.husky/pre-commit` 中的 `bun packages/lythoskill-creator/src/cli.ts build --all` skill 自动重建(L9–L19):专属 skill-builder。
- `.husky/pre-commit` 中的 `scripts/adr-check.sh`:介于 cortex governance 和项目脚本之间,本 ADR 暂归 cortex 自治候选,但实现时再确认是否进 mixin。
- **husky-mixin 协议本身**(分发顺序、install/upgrade/uninstall、与其他 mixin 的协作)→ 留给后续 ADR。

## 影响

### 正面

- 划定了 cortex Jira-simulation 的**最小可移植内核** = 三块行为
- 给后续 husky-mixin ADR 提供冻结的设计目标:不需要再讨论"我们到底要哪些",只需讨论"怎么打包"
- 新项目 `cortex init` 未来可以一行获得当前手写的 jira-like 体验
- 把 hook 行为绑定在 cortex 包里,CLI 命令重命名时立即触发 mixin 测试失败,断绝静默失效

### 负面

- 锁定行为集 = 任何 cortex CLI 命令名变更都必须考虑 mixin 兼容性,新增治理类 hook 必须先过 ADR
- 当前已落地的 `.husky/post-commit` + `.husky/pre-commit` 未来需要从手写迁移到 mixin,迁移期需做行为对比测试
- 三块行为合并打包后,用户若只想要其中一块(如只要 trailer 不要 lane 守护)需要 mixin 协议提供选择性激活——增加协议复杂度

### 后续

1. **起草 husky-mixin ADR**:分发协议 / 与其他 mixin 的 install 顺序 / 失败处理 / 选择性激活。
2. **冻结期保留手写**:mixin 落地前,本仓库 `.husky/*` 维持现状,**不重构、不抽象**(避免在协议设计前搞错抽象)。
3. **mixin 完工后**:通过 `cortex init --upgrade` 在现有项目上无损安装;同时把本仓库自己的 `.husky/*` 切到 mixin 输出,作为 dogfood 验收。
4. **lane commit-time guard**:在 mixin 实现时落地,验证手段 = 故意手动 `git mv` 一个 epic 文件到 active,观察 hook 是否拦截。

## 相关

- **ADR-20260503003314901**:trailer-driven cortex governance, option C(`.husky/post-commit` 头部注释直接引用)——本 ADR 是其"打包路径"决议
- **ADR-20260423101938000**:thin-skill pattern,frontmatter as agent-visible metadata——本 ADR 与"cortex 应该薄,但 jira-simulation 必须随包发"之间的张力定调
- **ADR-20260424125637347**:daily handoff dated path——commit-driven governance 与 daily journal 是 cortex 治理的两条腿
- `packages/lythoskill-project-cortex/src/commands/init.ts`:当前只做目录脚手架,本 ADR 落地后该文件需扩展 mixin 调用
- `.husky/post-commit`, `.husky/pre-commit`:当前手写实现,本 ADR 中三块行为的来源
- 关联 Epic:(待 mixin ADR 起草时挂接)
