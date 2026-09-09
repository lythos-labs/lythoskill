# Wedge Path Research Synthesis — deck × cortex × memory family

> 2026-09-09。三条独立研究线(CLI skill-dir 普查 16 家 / 分发渠道 + dsh 调研 /
> skill 经济学专家盲评 round 1+2)+ 关键词散弹枪 brainstorm,在本笔记合成。
> 锚定用户四条框架(§0)。输出口:§F roadmap(分阶段,优先级排序)。
> 上游卡片: TASK-20260909150851116(wedge path)/ TASK-20260909152255103(deck UX)/
> TASK-20260909152355793(keyword research)。评审归档:
> [2026-09-09-moo-pareto-article-expert-peer-review.md](../03-lessons/2026-09-09-moo-pareto-article-expert-peer-review.md)。

## 0. 用户四条框架(本研究的锚,先于一切证据)

1. **幸存 skill 的实体 = 企业内知识库 + SOP + 业务凝聚成的 skill 形态**(不是
   公开市场的通用技能)。
2. **企业为何在模型有能力的情况下仍上 SOP/workflow/pipeline/guard** =
   工业时代"标准件"需求的延续:互换性、边界质检、责任可追溯。
3. **当前典型 skill 形态 ≈ 古早前端 JS 脚本**:agent 现写或提前写,无模块边界、
   无测试、无准入,test/质量问题不可解——这正是 thin pattern 分离 CLI 的缘由。
4. **底层变量 = 确定性 vs 幻觉和即兴**:模型输出是分布采样(即兴),确定性不是
   模型的属性,是 artifact + 制度的属性。

## A. Skill 经济学(专家盲评,round 1 + round 2)

方法:合成型领域专家 persona(平台经济学 × 软件工业架构史 × LLM agent 基建),
零上下文盲评,arena standard posture,decision-log 25 条留痕。

**Q1 被吃掉 vs 幸存。** 判别变量不是 capability overlap("模型也能做"双向误分类),
是三测试:**capability exclusivity**(含模型推定时点没有的信息?)/ **repeatability-
traceability demand**(有需要跨场合跨 agent 可证明同样执行的当事方?)/ **maintenance
coupling**(内容随环境腐化、有活的更新义务?)。三关全失 = 被吃。关键切分:
**capability-SOP(被吃)vs covenant-SOP(幸存,治理 artifact)**——runbook 在三十年
工程师能力增长中幸存,因为它服务 assurance 不是 performance。两个漏掉的幸存类:
**anti-default discipline**(何时不做模型会自信地默认做的事;每 token 杠杆最高;
模型保持人群校准,组织需要 helpful-specific)/ **environment-coupled procedures**
(绑工具版本/内部端点/凭证布局;按与判断不同的日程腐化)。

**最锋利推论(exclusivity corollary):幸存的恰好是跨组织可转移性最低的类。**
幸存存量 ≈ "带额外步骤的内部治理文档"——不是市场,勉强算公地;可共享残余只有
协调协议和 anti-default 纪律,且作为**标准**共享而非 artifact。生态层价值归零,
项目本地价值保留——ε 胜利条件从后门到达。**动态框架:skill 组合 = 折旧资产,
模型升级 = 减值触发器;arena try-on 应作为折旧审计运行。**

**Q2 幸存者 infra。** registry/传输给定后,开放问题全在 **assurance 列**:
证据挂载、再验证/过期检测、conformance、激活治理、归因。推论:curator/发现层
可能被过度投资(发现优化的是贬值最快的类)——curator 最小化从此有了经济学论证;
唯一天经地义需要新机制的地方:**constraint-composition 冲突检测**(多张
anti-default + covenant gate 组合的联合可满足性;npm/git/harness 都不拥有)。
**ADR 候选,不进实现。**

**Q3 harness 脱皮。** 分层架构对,成本模型错一处:CLI glue 是全栈最暴露层
(driver API/插件宿主半衰期数月到数年 vs 文件格式数十年),必须按**折旧中的
driver adapter 组合**预算:小、单一真相源生成、对钉死版本回归测试。churn
**支持**分层而非威胁——若派生视图是严格生成的 projection(deck.toml 真相源 →
软链可重跑投影,已是现状)。断点不在 glue 在 **activation**:harness 若改
API-only 私有注册,markdown 幸存但激活死亡(沉淀层 vendor 捕获的投递层形态)。
**"Watch the activation layer, not the glue."**

**round 1 遗留**(详见评审归档):信任架构 L1/L2/L3 满绩;α 支配论证五折
(α 在安全撤销/发现完备性/机构责任轴上严格更好,占据前沿低端);registry≠hub
切分需在文章补澄清段;compute-monopoly 钟摆风险被低估。

**田野核验**:dsh 脱皮 VERIFIED(README 大写 COMPATIBILITY-BREAKING CHANGES
警告、插件钉 rc、社区钉 SHA);Codex "我用 skill 干嘛" discourse VERIFIED,
最强反证 = OpenAI 自己把 skill 定位为 agentic 工作的 "**systematization**"
——价值在工作流制度化,不在能力转移。两证同真,共同指向 Q1 切线。

## B. CLI skill-dir 普查(16 家,每条带来源)

普查结论按 deck 视角组织(全表见 agent 报告,机器可读要点在此):

**格式收敛实锤。** 全部 surveyed 工具接受 `<dir>/SKILL.md` + YAML
name/description。`~/.agents/skills/` + `.agents/skills/` 对成为共享约定
(Goose/opencode/Crush/Kiro/Codex source/Kimi/Cursor/Windsurf/Roo 均扫描或别名)。
SKILL.md = 事实互操作标准,deck 的目标格式选对了。

**Symlink 保证分级**(deck fan-out 的直接输入):
- **docs 级保证**:Claude Code(显式支持+按 target 去重)/ Roo Code(显式,
  深度 ≤5)/ Gemini CLI(`skills link` 的实现就是 symlink)/ Codex(AGENTS.md
  链 "Symlinks are allowed" + symlinked CODEX_HOME 需 opt-in)。
- **issue 级危险区**:opencode 6 个 open issue(循环符号链接 ENAMETOOLONG
  崩溃、Windows 不发现、无 inode 去重);Cline `.clinerules/` 符号链接确认
  不跟随(应作 copy/rsync 目标);**Goose #11600:删项目侧链接 skill 会递归删除
  符号链接目标——deck unlink 必须 special-case,否则 rm 掉的是 cold pool 真身**;
  Codex skills 5 个 open symlink issue(名字丢失/watcher 递归等)。

**命名集合切换(per-run set selection)稀有**,且形态各异:
Kimi `--skills-dir`(可重复,唯一"为外挂 skill 目录而生"的配置键)+
`extra_skill_dirs`;Crush `option skill-path`;Gemini `--extensions`(bundle
role+skills);Goose recipes / `--with-extension`;Claude Code `--plugin-dir`。
Cursor/Roo 切的是 role(mode)而非 set;Codex `--profile` 切 config 不切 skills。
**含义:deck 的"声明式集合 + 机械投影"在多数 CLI 上没有原生对等物,仍是空位。**

**Per-role scoping 分级**:Claude Code `skills:` frontmatter 是 preload 非限制;
**Kiro 最干净**(custom agents 默认零 skill,`resources: ["skill://…"]` URI 显式拉取);
opencode `permission.skill` deny/allow 模式最强;Roo `rules-{slug}/` per mode;
Gemini 无 skills 字段(verified);Kimi/Cline/Windsurf/Crush/Aider 无。
dsh 官方 agent-teams 无 per-member scoping(社区插件 limuyang2/agent-team 补位)。
**deck 的 per-role 定位在"声明 + 机械投影"层成立,不需要 CLI 原生支持。**

**本仓库对齐确认**:link.ts 默认 `working_set = ".claude/skills"` +
`also_link_to = [".agents/skills"]` 与普查最高覆盖扇出目标一致——deck link 的
投影层设计被独立普查验证。

**其他基础设施漂移**(记入边界条件):Windsurf docs 迁至 Cognition docs.devin.ai;
Goose 迁至 aaif-goose/goose;opencode 迁至 anomalyco/opencode;developers.openai.com
硬阻断非浏览器抓取。

## C. 分发渠道对比(dsh + distribution 调研)

- **dsh(DeepSeek Harness)**:everything-is-plugin(Cordis 内核);agent presets
  ≙ deck 概念;`ctx.skills` 分层注册表(nearest-layer-wins)= 唯一发现的
  registry 强制 per-role 可见性机制;发现根 `.dsh/skills`(100)/`.agents/skills`
  (200)/custom(300)/user(400-600)。**harness 即域名锚点的活证据。**
- **npm 内容包** = 首选投递:sha-512 + sigstore provenance,Fontsource 先例
  (字体即内容包)。skill 是 markdown 内容,同构。
- **Claude Code plugin marketplace**:`.claude-plugin/marketplace.json`,
  sources 支持 path/gh/git/npm/archive;superpowers = 内容仓上的薄指针市场
  先例。
- **gist 否决**:1MB/file API、10MB→git clone、300 文件截断、无 releases/
  tags/topics——结构性不适合 skill 包。
- **MCP registry 教训**:trust theater + 验证命名空间——curator 的
  L1/L2/L3 设计已经是对的回应。
- **thin pattern 结论不变**:复用 GitHub(发现/传输)+ npm(版本/完整性),
  不造 hub——round 2 给此立场加了经济学论证(发现层优化贬值资产)。

## D. 关键词发现(community vocabulary,散弹枪 phase 完成)

- **"agent harness" domain anchor 实锤**:Towards AI explainer(Agent = Model +
  Harness;dsh 自证;lm-eval-harness 词源链)。低竞争高权威。
- **one-workspace × many-agents 痛点 verbatim 确认**(V2EX),已长出三个 indie
  工具;per-role scoping 无官方解(dsh/Claude 同缺)= 内容空位。
- **Top-8 shortlist**:①skill not triggering ②session handoff ③sync skills
  across AI CLIs ④agent harness ⑤ZH 上下文丢失/失忆 ⑥test/benchmark skills
  ⑦are skills safe/supply chain ⑧fresh eyes review。社区地图 + 28 候选 + 逐条
  证据 URL 见 agent 报告。
- 流程倒置声明:product-first 变种(先搓需求再找词),经典哥飞的生成层在这里
  是"社区词汇理解",deck 工具只打分。

## E. 合成:四条框架 × 三线研究的收敛

**确定性 vs 即兴 = 一切的底层变量。** 模型是即兴演奏者:每次输出是分布采样,
"能做"是能力陈述,"每次都按同样方式做且可证明"是制度陈述。幻觉是即兴的认知面,
guard 是对冲。框架 4 给框架 2 提供了机制解释:企业上 SOP/guard 不是因为模型
不会,是因为**确定性不是模型的属性,是 artifact + 制度的属性**——模型越强、
即兴越流畅,anti-default 类 guard 反而越必要(模型保持人群校准,组织需要
helpful-specific)。这也解释 covenant-SOP 为何免疫能力增长:assurance 需求不随
能力消失。

**标准件类比精确成立,且映射到 lythoskill 已有结构。** 工业革命互换性零件的
前提是接口标准化 + 边界质检 + 责任可追溯,不要求工匠更强。映射:SKILL.md
frontmatter = 互换接口规格;npm 版本 + provenance = 合格证;arena verdict =
质检报告;deck lock = BOM 钉版;curator L3 = 质检档案。lythoskill 建的不是
"skill 工具",是 **skill 标准件的基础设施**——四条框架把项目已有决策全部
再推导了一遍。

**thin pattern 的再推导(回答"为啥分离 CLI")。** 古早 JS 的质量病不是程序员菜,
是形态不承载工程纪律;agent 现写 markdown skill 同形态同病(每次即兴生成)。
三层分离的意义:**让确定性住到机械层**(可钉版本、可回归测试、harness 蜕皮时
折旧费用可预算),**让判断住到内容层**(可评审、可 ZK 试用、能力折旧可审计)——
各层各得其所的测试方法。混在一层则每层都不可测试。

**SKILL.md 形态的理由(回答"为啥是这个样子写")。**
- desc = agent-facing SEO:**触发不确定则一切免谈**;hybrid 格式(口嫌体正直)
  是触发率的工程解;有效性只能由 zero-context subagent 实测证明(arena)。
- **no source no rule + provenance tag = 反幻觉纪律写进 authoring 规范**——
  skill 内容本身的确定性来源。
- progressive disclosure(metadata → body → references/)= 上下文预算下的
  确定性加载;frontmatter 最小稳定集 = molting-proof 层(harness 约定漂移时
  最先死的是花哨字段)。
- banned-lexicon + coach = 词汇层面的确定性(禁模糊营销词,强制可验证陈述)。

**企业级幸存类 = 项目的天然形态。** 框架 1(企业 KB+SOP+业务凝聚)就是 Q1 修正后的
幸存类实体(covenant-SOP + 私有事故库 + env-coupled + anti-default)。expert
corollary 说这类最不可转移——含义不是没市场,是**市场形态天然 local-first /
private**,而 lythoskill 架构恰好是这个形态(local cold pool、L3 私有元数据为
最终激活权威、deny-by-default)。thin pattern 第一性推导出的结构,正好服务
企业级幸存类——这不是巧合,是同一逻辑的两端。叙事上可理直气壮:定位 =
"agent harness 的 skill 标准件层";demand-side 叙事 = 企业 skill 数字化
(KB/SOP/业务 → skill 形态),OpenAI "systematization of agentic work" 是最好的
权威背书;不与 α 形态(hub)争生态位,吃 γ/ε 的。

**roadmap 的含义收敛为一句话:发现层轻投入(它优化贬值资产),assurance 层
重投入(它服务幸存资产),adapter 层按折旧预算(小、生成、钉版本),activation
层设监视哨。** SEO/自来水仍然值得做——它捕捉的正是"确定性焦虑"的搜索需求
(skill not triggering / context loss / are skills safe 全是确定性痛词的变体)。

## F. Roadmap(分阶段;显化 → 质量 → 适配 → 发现 → assurance → 分发)

> 排序原则:先修自己(便宜、立即),再适配外部(中价、结构性),后做发现/分发
> (持久、复利)。每项标上游卡片或新建卡建议。分发机制走 ADR,accept 前不实现。

### P0 显化层(side-deck 模式对外可理解)— 立即
来源:side-deck 显化审计 + F3 词汇缺口。
1. 命名统一:文档/帮助里统一 side-deck 话语(区分 project deck / side deck /
   local deck),AGENTS.md §Side Decks 与 README 对齐。 [改文档]
2. combo 消费方声明:deck schema 文档写明 combo prompt 由 agent 读、CLI 只解析;
   prepare-workdir 生成的 AGENTS.md 置顶 deck combo 段(F1)。 [deck+arena]
3. arena `single --out` 写进 `--help` 示例(P4)。 [arena]
4. showcase/ 条目:gefei-seo side-deck 用法 + reproduce.sh(P3)。 [showcase]

### P1 deck UX 修复(ZK 验收闭环)— 立即
TASK-20260909152255103 全卡(F1-F6),修完用同一 ZK 协议重跑 gefei-seo 试用,
≥7/10 收卡。**这是 gefei 评分关的前置**(评分卡 TASK-20260909152355793 的 AC
依赖 deck 可用)。

### P2 adapter 加固(普查直接输入)— 下一个迭代
新建卡(survey-adapter 卡):
1. **adapter 注册表**:per-CLI 记录 symlink 保证级(docs/issue/hazard)+ fan-out
   目标 + 切换机制;link.ts 的 also_link_to 策略数据化。
2. **危险区分级**:Goose unlink special-case(#11600 递归删除目标,先验 symlink
   再 rm);Cline 改 copy/rsync 目标(`.clinerules/` 不跟随符号链接);opencode
   双扇出去重(`.claude`+`.agents` 同源重复 WARN),保证无环绝对链。
3. **per-run 模式**:Kimi `--skills-dir` / Crush `skill-path` 支持——deck 可以
   不 relink 直接 per-run 指目录(side-deck 零投影路径)。
4. **钉版本回归**:对 docs 级保证 4 家(Claude/Roo/Gemini/Codex)把 deck link
   冒烟纳入 probe 体系(呼应 round 2 的 adapter 折旧纪律 c 条)。

### P3 发现资产(关键词 → README/site)— 本周
TASK-20260909152355793 执行:P1 完成后用 gefei-seo deck 对 28 候选跑评分关
(hunter 八维 + calibrator),top-8 落 README 段落 + 未来 site 页面骨架
(lythos-info quest 解禁后)。**新动作:top-8 补一个 Tier-1 企业词簇**(agentic
workflow / SOP for AI agents / agent standardization——框架 1+2 的搜索面),
与 D 的现有 shortlist 合并排序。

### P4 assurance 层投资(幸存资产的基础设施)— 排期讨论后
新建卡(assurance 卡,可拆多张):
1. **过期/再验证机械**:curator 已有 index staleness 警告,扩展到"能力独占性
   过期"提示(折旧审计的初等形态;arena 折旧审计是完整形态,降级版=frontmatter
   维护日期 + 模型代际 tag)。
2. **conformance 测试**:协调协议类的契约验证(deck 已 deny-by-default,
   缺"对端是否满足契约"的检查)。
3. **constraint-composition ADR**:anti-default/covenant 组合的联合可满足性
   检测——唯一"新机制"候选,先 ADR 论证,不实现。
4. curator 最小化确认:L3 优先策略不变,发现层不追加投资(经济学论证已立)。

### P5 分发机制 ADR — 用户审阅后
ADR 候选(不接受不实现):npm 内容包为主投递(Fontsource 先例)+ plugin
marketplace 薄指针(superpowers 模式);gist 已否决记录进 ADR 的 rejected
alternatives(项目纪律:拒绝的流行方案也要留痕)。

### P6 activation 层监视哨 — 持续
边界条件清单加一条:任一 harness 出现 API-only 私有 skill 注册(无文件系统投影
可能)= round 1 触发器 #1 的投递层形态触发。季度检查一次各 harness 的 skill
投递 changelog。低成本,高预警价值。

### 显式不做(本轮研究确认的反向结论)
- 不造 hub/registry(distribution 调研 + round 2 经济学双重否决)。
- 不做 per-CLI 深度集成适配器(只到"投影 + 保证分级"层;深度集成是各 harness
  自己的事)。
- 不投资发现层排名/推荐机制(curator 维持索引 + L3,不做 ranking)。
