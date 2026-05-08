# ADR-20260508230803515: Curator does not wrap external skill discovery APIs as feed adapters - agent web fetch beats hand-rolled adapters

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-08 | Created |

## 背景

curator 早期实现了 `feed-adapters.ts`,内含 `createLobeHubAdapter` / `createGitHubSearchAdapter` / `createAgentSkillShAdapter` / `createColdPoolFeedAdapter` 4 个适配器,意图把外部 skill 发现源(LobeHub Marketplace、GitHub topic search、agentskill.sh)统一封装成 `FeedAdapter` 接口供 `curator discover` 命令调用。

**这个模式从未走过 ADR 治理**(grep 全部 cortex/adr/ 无 feed-adapter / lobehub / agentskill 决策记录),是 agent autonomous 在"我觉得可以这么干"的判断下引入的**闲子加实验**。

2026-05-08 session 实地审计发现:
- **LobeHub adapter**:`@lobehub/market-cli` 调用用错 flag(`--format json` 应为 `--output json`),JSON 响应 shape 完全没文档化、未验证;`.skip` 跳过测试遮蔽了 bug;注释里"290K+ skills"是凭空编的(包还在 0.0.x)
- **GitHub topic search**:用 `topic:agent-skills`(社区采用稀疏),实际 dominant 关键词是 `topic:claude-skills`(235+ aggregator)
- **agentskill.sh adapter**:占位 `[]` 实现;deep-dive 后发现该平台 MCP server `agentskill-mcp` 真实存在,但其本身只是 `https://agentskill.sh/api/*` 的 thin wrapper — 直接 HTTP 比 MCP 包装更便宜更稳;且实际尝试 `deck add github.com/openclaw/skills/skills/ivangdavila/chinese`(agentskill.sh 自己 indexed 的 path)发现 GitHub repo 直接 404 — **adapter 把外部 source 错误信息原样镜像进来,反而比 agent web fetch + 错误恢复 更脆弱**
- **cold pool 包成 feed**:违反层级(cold pool 是 Layer 0 本地缓存,不是 Layer -1 发现源)

**核心 insight**:hand-rolled adapter 把"哪个 source 有结果 / 期望什么 JSON shape / 怎么处理失败"这种**智能层决策固化进 npm 代码**,创建 maintenance 债务,且每个 source 的 API 飘移都要重新发版。Agent 通用 retrieval(web search / web fetch / `gh` CLI / MCP)在动态 source 多样性下表现更好。

## 决策驱动

1. **闲子被误读为产品**(用户语:"我强调是概念，结果被直接理解错误"):后续 agent session 对每个 adapter 个别加固,未质疑 abstraction 本身,导致 bug 积累而非清理
2. **agent web fetch 比硬套 API 智能**(用户语:"还不如 agent web fetch 来的智能呢. 强行做 feed 不如只留一个正则化"):验证场景充足
3. **thin-skill pattern 三层(`project_thin_pattern_three_layer_essence`)**:智能在 SKILL.md / 稳定集成沉淀到 npm / CLI 机械化。Feed-adapter 把智能(决策"哪个 source 用哪种调用形式")放进 npm = 错位
4. **`feedback_document_rejected_alternatives`**:agents 反复 reflexively 重新提"hub/registry/dep manager"模式;不写 ADR 拒绝 = 下一个 agent 又会重新发明
5. **`feedback_no_source_no_rule`**:无源信源比无信源更糟糕;LobeHub adapter 的 290K skills 数字、未验证 JSON shape 都是无源乱编

## 选项

### 方案 A: 保留 + 加固 feed-adapter 模式

继续 maintain `feed-adapters.ts`,逐个修 bug(LobeHub flag、GitHub keyword、agentskill.sh MCP wrapper 实现等)。

**优点**:
- 不打破现有 `discover` CLI 命令
- 每个 adapter 单独看是合理代码

**缺点**:
- 智能层错位:adapter 代码持有"哪个 source 适合什么查询"的决策,本应在 SKILL.md
- 每个外部 source API 飘移都要 lythoskill 跟着发版
- 跟 thin-pattern 三层原则冲突
- `cold-pool` 包成 feed 的层级混淆遗留

### 方案 B: 删除 feed-adapter,curator 只做本地 cold-pool normalization

`feed-adapters.ts` 删除(或至少剥离 LobeHub/GitHub-search/agentskill/cold-pool 4 个 adapter)。`discover` CLI 命令删除或改为 SKILL.md 级 workflow 引导(告诉 agent "去用你自己的 web search / fetch / gh CLI / MCP 工具找候选,然后用 `curator add <locator>` 持久化")。

**优点**:
- 智能(决策哪里找、怎么 query、怎么过滤)放回 SKILL.md + agent — 跟 thin-pattern 一致
- 消除外部 source 飘移耦合
- curator 代码 surface 大幅缩小(更易测、更稳)
- agent 通用工具(web search / gh / MCP)在动态多样性下更智能

**缺点**:
- `discover` CLI 命令的小破坏性改动(但当前实现已经 broken,清理反而提升)
- agent 必须用 SKILL.md 引导自己 — 但 lythoskill 整套架构本就基于 agent 读 SKILL.md 决策

### 方案 C: 折中 — 留下 `cold-pool` 本地枚举,删外部 adapters

只删 LobeHub / GitHub-search / agentskill.sh 3 个外部 adapter,保留 `createColdPoolFeedAdapter`(纯本地 cold pool 列举)。

**缺点**:user 已明确指出 "cold pool 不是 feed"(Layer 0 vs Layer -1 混淆),这个折中保留了概念错位。

## 决策

**选择**: 方案 B(完全删除 feed-adapter 模式)

**原因**:

1. **未经治理引入** — 没 ADR,意味着这个 abstraction 从未通过设计审查;事后审计发现是 agent autonomous 的"我觉得可以"实验,不是经过深思熟虑的产品决策
2. **实地审计证据充分** — 4 个 adapter 全有 bug;agentskill.sh 的 GitHub path 404 实测;agent web fetch 在 prior session 多次 outperform 这些 adapter
3. **架构一致性** — 跟 thin-pattern 三层 + curator 本地索引职责 + cold pool 层级独立 都对齐
4. **写明 reject 防 reflexive 重提** — 下一个 agent 想加 "feed for X" 时能直接看到 ADR 知道"已经实验过、否决过"

## 影响

**正面**:
- curator 代码 surface 缩小,易测易维护
- 智能层归位 SKILL.md / agent,跟 thin-pattern 一致
- 消除"插件式 feed adapter"诱导,agents 不再 reflexively 提
- 把"agent 自己 fetch + 错误恢复"作为正式 first-class 模式写进 curator SKILL.md

**负面**:
- 现有 `curator discover` CLI 调用方需要适应(但实际 `discover` 当前也未真正 work)
- 用户首次接触 lythoskill 时需要看 SKILL.md 才知道发现 workflow,不能直接 `curator discover --feed lobehub` 一键探索

**后续**:
1. 删除 `packages/lythoskill-curator/src/feed-adapters.ts`(或精简到不含具体 adapter)
2. `curator discover` CLI 命令处置:删 / 改为 SKILL.md 引导跳转 / 保留为 deprecation warning(三选一,T4 epic 决定)
3. 更新 curator SKILL.md `discover` section:写 agent 用自己工具的 workflow,移除 "feed adapter" 描述
4. 创建 wiki lesson 沉淀这个反例(`cortex/wiki/03-lessons/2026-05-08-feed-adapter-counter-example.md`)
5. memory 已落地:`project_curator_no_feed_adapters_agent_does_discovery.md` + `project_thin_pattern_three_layer_essence.md`

## 相关

- 关联 Epic: 待开 T4(curator simplification — feed-adapters 删除 + SKILL.md discover workflow 重写)
- 关联 memory:
  - `project_curator_no_feed_adapters_agent_does_discovery` (项目级)
  - `project_thin_pattern_three_layer_essence` (项目级,upstream principle)
  - `project_lythoskill_over_naked_llm_principle` (项目级,姊妹原则)
  - `feedback_document_rejected_alternatives` (反思:为什么需要这条 ADR)
  - `feedback_no_source_no_rule` (LobeHub 编 290K 数字的反例)
- 关联 wiki:
  - 待写 `cortex/wiki/03-lessons/2026-05-08-feed-adapter-counter-example.md`
- 关联 daily:
  - `daily/2026-05-08.md` 段落:agentskill.sh 调研 / curator stability 验底盘 / 架构反思链
