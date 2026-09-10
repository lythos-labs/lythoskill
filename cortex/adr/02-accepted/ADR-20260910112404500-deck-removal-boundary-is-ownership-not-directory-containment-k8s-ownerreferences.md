# ADR-20260910112404500: deck-removal-boundary-is-ownership-not-directory-containment-k8s-ownerreferences

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|--------|
| proposed | 2026-09-10 | Created |
| accepted | 2026-09-10 | Accepted |

## Background

`deck link` 把工作集与 `also_link_to` 扇出目标收敛到声明态时,需要"清位"——把某个
alias 上的旧条目换成新条目。2026-09-09 落地的实现把清位写成了**目录扫描 + 无条件
递归删除**:凡是在 `working_set` / `also_link_to` 目标目录里、名字不在本次声明中的
非 symlink 条目,一律 `rmSync(..., { recursive: true })`。上游另配一个 tar 备份兜底。

两件事在 2026-09-10 的 inbox-debate 复盘与随后的源码复核中被确认:

1. **安全边界取错了。** `also_link_to` 是**用户可指向任意目录**的配置项。它可以指向
   `~/.config/goose/skills`、`~/.kimi/skills`,也可以指向**另一个项目**的
   `.claude/skills`。"这个条目在我扫的这个目录里"与"这个条目是我建的"是两件事 ——
   前者包含用户手写的 skill、别的工具放的 skill、另一个项目共享的 skill。
   一次 `deck link` 足以静默吃掉它们。
2. **备份是一条假的安全承诺。** 归档成员带 `../` 前缀,bsdtar 拒绝解出 —— 即
   "已备份"这句话在需要它的那天不成立。按 `no-source-no-rule` 的同一把尺子
   (2026-09-09 B1 已据此撤掉一行假 source):**假的安全承诺与假的来源同类**,
   必须撤,不是修。

关键事实:五个删除点(`link.ts` 目录审计 / symlink 回收 / alias 清位 / 元数据循环清位、
`remove.ts` 工作集与 fan-out、`to-symlink-snapshot.ts` 两个方向、`add.ts` 失败清理)
共享同一个错误前提。仓里**不存在**可援引的正确先例 —— 落地前 `to-symlink-snapshot.ts`
的 `currentMode` 来自 `lstatSync`,不是来自 state;它能"正确"只是因为还没人把外来目录
放到那个名字上。

## Decision Drivers

- **破坏性操作的代价不对称**:删错的损失不可逆,少删一个旧条目的代价只是"多留一份文件"。
  按 owner 的原则:*"破坏性操作还是太可怕了,尤其备份路径反而心不在焉"*。
- **k8s 协调心智的正确那一半**:`ownerReferences` —— 系统只管理它能证明由自己创建的对象。
  owner 明确:同样是协调心智,"只管自己认领的还是好的"。
- **fan-out 目标的所有权天然不属于 deck**:deck 是这些目录的**使用者**而非所有者。
- **可证性优先于覆盖率**:判据必须是"可证明"的,不能是"看起来像"的。
- **报告优先于静默**:拒绝删除时必须说清 what / why / fix(agent-facing HATEOAS),
  否则用户只会看到"东西还在",不知道 deck 已经放弃管理它。

## Options

### Option A: 保持目录包含即所有权,只把备份修好
即"删还是照删,但保证备份可解"。

**Pros**:
- 改动最小;备份确实可修(去掉 `../` 前缀、用 `-C` 归档)。

**Cons**:
- **没有解决任何问题**:备份修好了也还是"删别人的东西",只是从"赔不起"变成"赔得起"。
  用户手写 skill 的内容、mtime、git 状态都不在归档语义里。
- 备份是**事后**补偿,而正确性应该是**事前**的。要求用户为 deck 的越权行为兜底。
- 与 `prune` 的既有立场矛盾(`feedback_prune_is_heredoc_generator`:deck 的破坏性操作
  输出 `rm` 脚本供人审,不自己执行)。

### Option B: 只删能证明是 deck 创建的两类条目(所有权判据)
deck 拥有一个条目的充要条件是二者之一:
  (a) 它是 symlink,且目标解析后落在**本 deck 的 cold pool** 内;
  (b) 它被记录在 `skill-deck.state` 的 `managed_dests`(`dest` ∪ 全部扇出目标)中。
两者都不满足 → **不删**,报告 what/why/fix 并继续处理其余条目(一个拒绝不污染整轮)。

**Pros**:
- 判据**可证**,不依赖任何猜测;两个证明都是 deck 自己写的记录。
- 拒绝是**局部**的:其余 skill 照常链接,不因一个外来条目整轮失败。
- 与 `prune` / `refresh` 的既有立场一致(破坏性操作产出建议,不自行执行)。
- 顺带修掉一处假陈述:`to-snapshot` 原先对外来真实目录无条件说"已经是 snapshot 模式"。

**Cons**:
- 历史 `managed_dests` 缺失时的**一次性保守**后果:老 state 文件里只有 `dest`,
  历史 fan-out snapshot 会被判成外来并被拒绝替换(安全侧倒,需要用户手动清一次)。
- 需要一次跨运行的状态契约扩展(`managed_dests` 字段),schema 变更。
- 一次运行内创建又立刻要替换的条目,判定输入必须是**即时账本**而非期初快照
  (实测踩到:否则本次运行的产物自己证明不了自己,skill 静默进不了 linkedSkills)。

### Option C: 保留现状 + 加 `--force` 让用户自己承担
**Pros**:
- 不改变默认行为;给了"我知道我在做什么"的逃生口。

**Cons**:
- **把判断推给最没有信息的一方**。用户看不到 deck 内部的扫描逻辑,也无法在删除前
  逐一核对(扫描发生在 `link` 内部,不是交互式)。
- `--force` 的存在会训练用户习惯性加它 —— 这正是"备份路径反而心不在焉"的同一机理。
- 把一次架构错误降级成一次 UI 选择,决策并未被做出。

## Decision

**Choice**: **Option B —— 所有权判据,取代目录包含判据。**

**Rationale**:

- 删除的授权只能来自**创建**。deck 在 `link` 时写下 `managed_dests`,在 `remove` /
  `to-symlink` / `to-snapshot` 时读它 —— 证明链闭合在 deck 自己的记录上,不依赖对
  文件系统内容的解释。
- 包含关系**在语义上不成立**:`also_link_to` 的目标是用户资产目录,deck 只是被允许
  在其中放入自己的条目。所有者与使用者在这里必须分开。
- 备份的退役与判据的收紧是**同一件事的两面**:没有越权删除,就没有需要备份的东西;
  而"删之前先备份"这个句式本身在暗示越权是常态。
- 拒绝路径要有**可执行的下一条**(HATEOAS 三件套),否则防线会退化成静默:
  用户看不到"deck 已放弃管理这个 alias"。

**落地形态**(实现细节见 TASK-20260910111600389):

- `deckOwnsEntry(entryPath, ctx): OwnershipVerdict` —— 只判定,不删;三态
  (`owned` / `present:false` / `present:true 但非己`),**三个变体字段完整**,
  避免调用方在 owned 分支上把"这是我的"读成"这儿什么都没有"。
- `removeEntryForRelink` —— 判定与执行分离:先判归属,后决定删不删。
- `state-file.ts` 单点装配判定输入(`dest` ∪ `managed_dests`),并暴露**即时认领口**
  —— 本次运行创建即登记,不等下一次运行。
- 判据**不得**降级为 `lstat` 推断:`lstat` 只能说"路径上有个真实目录",说不出
  "这个目录是 deck 建的"。

## Impact

- **Positive**:
  - `deck link` 不再可能删除 deck 未创建的条目 —— 用户资产目录、跨项目共享目录、
    CLI 全局配置均免疫。
  - 一处假的安全承诺(tar 备份)随之退役,`--no-backup` 从"暗示有备份"变为
    "接受但明说无作用"。
  - 六个删除点收敛到一条可测判据;新增的 dormancy / 拒绝用例把语义钉住。
  - 顺带修掉 `add.ts:332` 同类可达路径(`status:'failed'` 的 localhost 来路在
    exists 检查之前返回,可删掉运行前就存在的目录)—— 由 AC4 的全仓复查发现。
- **Negative**:
  - 老 state 文件(无 `managed_dests`)下,历史 fan-out snapshot 会被判成外来并被
    拒绝替换,需用户手动清一次。这是**刻意的安全侧倒**。
  - `skill-deck.state` 契约扩展,新增 `managed_dests` 字段。
  - 用户直接改 `deck.toml` 删除条目时,非己的残留条目不再被自动收敛,需要手动清 ——
    这是"deck 放弃越权"的必然代价。
- **Follow-up**:
  - `TASK-20260910111600389` 收口实现与测试。
  - `--no-backup` 的正式移除(当前为接受但无作用的 no-op + 说明)。
  - 同类复查:仓内其余 `rmSync(..., {recursive:true})` 是否都在所有权证明之后可达。

## Related
- Related ADR: ADR-20260508230803515(curator 不做 feed-adapter —— "未经治理引入"的同类事故)
- Related ADR: ADR-20260507190157540(snapshot/symlink 模式语义)
- Related Task: TASK-20260910111600389
- Related Memory: `feedback_prune_is_heredoc_generator`(破坏性操作产出建议,不自行执行)
