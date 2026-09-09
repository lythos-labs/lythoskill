# Expert Cold Read — MOO Pareto Form-Deduction Article (peer review)

> 评审对象: [2026-05-02-skills-as-flat-controllers-evolution.md](../01-patterns/2026-05-02-skills-as-flat-controllers-evolution.md)
> (ADR-20260502012643544 深度论证,五形态 α/β/γ/δ/ε Pareto 前沿推演)
> 方法: 盲评。合成型领域专家 persona(平台经济学/市场结构 × 软件工业架构史 ×
> LLM agent 基建),零上下文,隔离 workdir,只给文章文本,不告知作者身份与立场。
> 协议: arena standard posture(prepare-workdir + dispatch + decision-log 全程留痕,
> 15 条判断记录)。2026-09-09。

## 评审结论(TL;DR)

信任架构(L1/L2/L3 栈、"被喜欢≠被触发")**值一个下午**;规范性 Pareto 结论
**(α 支配劣解)打五折**——支配论证不成立,因为文章不承认 α 在若干轴上严格更好
(安全撤销、发现完备性、机构责任需求)。最强洞察与最大缺口见正文。

## 作者回应(2026-09-09,口头,非评审内容)

作者立场澄清,回应评审第 2/3 条(registry/hub 切分):

> "我承认 registry 存在哦?恰恰是'不想再造一个',我认为 GitHub 和包管理器已经足够。"

即:文章反对的是**中心化 ranking-hub 作为推荐权威**(α 的策展垄断形态),
从未反对 registry 作为基础设施——lythoskill 的整个 thin pattern 就是
**复用** GitHub(发现/传输)与 npm(版本/完整性)而不是新建一个。
评审指出的"registry ≠ hub 混淆"在作者意图层面不成立,但文章文本确实
**没有把这个区分写明**——值得补一段澄清,而非撤回结论。

## 合成跟进项(评审发现 × 作者回应 × 旁证)

1. **文章补澄清段**:registry-as-infrastructure(拥抱)vs ranking-hub-as-authority(拒绝)
   的显式切分。 thin pattern(recursive-thin-layer)在此处的推论是复用而非新建。
2. **compute-monopoly 风险**加入钟摆反向条件清单:它不是压缩 γ 份额,是证伪
   PC 钟摆前提——评审认为文章低估了这一条。
3. **安全外部性缺口**与分发渠道调研互相印证:MCP 生态 1,899 server 研究
   发现 5.5% tool-poisoning 信号(Queen's University 研究,二手来源,medium
   confidence)——"机构需要中央对手方"是真实需求,不只是假设。
4. **逃生舱稳定性**:「agent 增强搜索索引不做 ranking」被评审判定不稳定
   (算法相关性排序在经济学上就是注意力分配)——与 curator 层设计
   (L3 私有元数据为最终激活权威)直接相关,curator 演进时需回应。

---

## 评审全文(盲评原文,未改动)

# Expert Cold Read — "Skills as Flat Controllers"

## 1. Restatement

The article is an extended architectural defense of a specific design (call it γ): skill packages as thin, stateless markdown artifacts, named by fully-qualified Go-module-style paths (`host.tld/owner/repo/skill`), carrying no inter-skill dependency declarations (composition is a curated-bundle, not a dep-graph), with all state, orchestration, and memory pushed up into the "fat agent," and with heavy assets, social layer, and identity deliberately outsourced to mature existing infrastructure (npm, GitHub, Hermes/OpenClaw). The core claim is twofold: (a) an analytical claim — under the constraint that skill authors are naturally heterogeneous and share no common memory model, a centralized hub (α) is a *dominated* solution on a Pareto frontier spanning cognitive burden, customization, autonomy, and infrastructure overhead, because it transfers skin-in-the-game to a middleman who cannot price recommendation errors and inevitably recreates the SEO/advertising pathology; and (b) a historical/forward claim — the agent era is a recurrence of the PC-era decentralization pendulum, this time made viable because agents collapse the entry cost of operating decentralized tooling, so federated + locally-runnable forms are structurally favored. Framing devices: context window as a non-expandable address space (6502/virtual memory/kernel-mode layering), TCG (trading card game) metaphors for curation and trust, and Taleb-style skin-in-the-game as the evaluation lens for all ecosystem forms.

## 2. Load-bearing assumptions

1. **"Natural multi-author coexistence" is the binding constraint, and it forecloses centralized governance.** Stated explicitly, and *partially* true. Multi-author coexistence is real, but the article leaps from "no shared memory model" to "central onboarding is in conflict with the essence." npm and PyPI absorb heterogeneous authors fine — onboarding friction is a cost, not a contradiction. The stronger argument (given later, re: skin-in-the-game) is about *recommendation*, not registration; the article somewhat conflates registry (naming/availability) with hub (curation/ranking). Go modules, its own cited precedent, still tolerate proxy.golang.org as a *de facto* availability layer. Assumption is doing more work than the evidence given.

2. **The diamond-dependency and transitive-closure problems of a skill-level dep manager are real and fatal.** Stated explicitly. I assess this as **mostly true but overstated**. "Skill A imports skill B" in a prompt-driven system is far weaker than runtime imports — diamond conflicts are semantic/prompt-level, largely commutable (both versions can be loaded into context), and resolvable by the orchestrating agent at use time. The article correctly identifies that 99% of real "dependencies" are curated bundles, which guts the need for a resolver; but it then treats the resolver's absence as a structural inevitability rather than a near-trivial simplification of a low-stakes problem.

3. **desc-SEO / advertising pathology is structurally inevitable for any hub with ranking power.** Stated explicitly ("这一节的预测不是 if，是 when"). This is the article's *strongest* assumption and I assess it as **true** — with one important qualification the article itself supplies: the trigger is *ranking power*, not mere indexing. The pathology claim doesn't dominate the hub form unless the hub wields attention-allocation power. That is precisely the hinge of the whole α-domination argument, and the article should be credited for locating it rather than relying on generic "centralization bad" sentiment.

4. **Agents collapse the entry cost of decentralized operation.** Stated explicitly as the key variable that flips the PC→cloud pendulum. Plausible and well-argued (the "下云" repatriation precedent is genuinely good evidence), but it is an *assertion about adoption behavior*, not a mechanism the article demonstrates. It also cuts against the article in one place it doesn't fully acknowledge: the same agent capability lowers the cost of operating *inside* walled gardens, and of vendor-provided agents choosing the "替代 wrapper" branch (§3.3) — the fork the article's own topology diagram says is possible.

5. **Skin-in-the-game is the right objective function for judging ecosystem forms.** Stated explicitly and used as the universal lens. As a market-design matter this is *one* legitimate objective, not a sufficient one. It systematically undervalues: security externalities (a compromised skill harms parties who didn't choose it — user-borne skin doesn't internalize this), coordination economies (standards, vetting, dispute resolution have public-good character that reputational incentives underproduce), and the revealed preferences of ordinary users who *routinely* rationally outsource trust (app stores, Debian, car mechanics). The article's β/ε acknowledgment partially compensates, but the α verdict leans entirely on this lens.

6. **The frontier axes are separable and α is dominated on all of them.** Stated in the Pareto table. This is the weakest assumption; expanded in section 3 below.

7. **Context window is a fixed hardware-like constraint justifying OS-kernel architecture.** Stated, and as a modeling device it's fine. But the historical analogy cuts both ways: virtual memory was invented *because* address spaces turned out not to be the fixed wall they seemed (bank switching → segmentation → paging → 64-bit flat). Context windows have expanded ~two orders of magnitude in three years and cache/pointer mechanisms (subagents, retrieval, compaction tooling) are a moving frontier. Designing for scarcity is prudent; reifying current scarcity as "不可扩展的硬件约束" is the kind of claim that ages badly.

## 3. The five-form Pareto deduction

The γ-is-non-dominated half convinces me readily: ε (zero overhead), β (low cognitive burden), and γ (high customization, no middleman) clearly sit on different axes, and δ plausibly occupies an autonomy axis. A skeptical reader should grant this part; it's almost the *definition* of honest multi-objective analysis, and the article deserves credit for refusing to claim γ is "the" answer.

The α-is-dominated half does **not** convince me as stated, for four reasons:

1. **A dominated point must be weakly worse on every axis and strictly worse on one.** The article shows α is worse on *flexibility* and *skin-in-the-game arrangement*. But α is plausibly strictly better on axes it never admits into the frontier: **security/vetting** (a central authority can revoke malicious skills at ecosystem speed; the article's own trust-crisis pendulum-reverse row concedes this — users flee to the audited hub after one supply-chain scare, which is a revealed-preference point *for* α under a security axis), **discovery completeness** (its own boundary condition 3 admits "Discovery 难度真实存在——awesome-list 解决 70% 但不到 100%"), **onboarding cost for non-expert users** (the β row's "低认知负担" advantage partially belongs to α too, since a hub with reviews is the everyday user's KOL substitute), and **coordination of standards**. Once you add even one axis on which α is strictly better, α is on the frontier, just at an unfavorable point — which changes the verdict from "唯一明确反对" to "占据前沿低端、可能随安全事件扩张."

2. **The article's own evidence undercuts the dominance claim.** The "many hub forms keep appearing" observation is implicit throughout — the author feels obliged to address real hubs (and even concedes "Lythoskill 尊重、理解并认可 KOL/大V 和 Hub 的工作价值"). In market-design terms: persistent re-emergence of hub-like intermediaries under a supposed dominated-form theorem implies a missing objective or unmodeled dynamic. Candidates: (a) **trust is a network good with economies of scale** — vetting cost per user falls with centralization; (b) **liability allocation** — enterprises and regulators *demand* a central counterparty; the "高度同质化合规生态" row in the article's own Pareto table quietly admits this is α's home turf, which is not a niche but (in enterprise spend terms) potentially the majority market; (c) **the frontier moves dynamically** — one supply-chain incident shifts mass toward the security axis, and α's frontier share expands (the migration table's α→γ "Hub 丑闻" edge has no listed counterpart, but γ→α under "Trust 危机引发逃回 walled garden" does — asymmetric evidence the article itself documents).

3. **The domination argument targets a straw-ish α.** The α that is "dominated" is defined as hub *with ranking/featured/trending*. The article immediately concedes an "α 的合理子集" — agent-boosted search index without ranking. But an index that crawls, deduplicates, and serves relevance-ranked results *is* exercising ranking power in any economically meaningful sense; "no editorial ranking" and "algorithmic relevance ranking" are indistinguishable to the ad-economy pathology the article predicts. The hub the article executes is the hub-with-payola; the hub that exists in the world is often closer to a *trust infrastructure* (Debian archive, npm with 2FA mandates) whose failure modes are real but different. Beating the worst version of your opponent is not dominance.

4. **Static frontier, dynamic game.** Pareto dominance is a static efficiency concept; ecosystem morphology is path-dependent and strategic. Hubs possess a **first-mover aggregation advantage** (discovery begets authors begets discovery) and can *implement* the γ design internally (a hub can host FQ-located, git-backed, markdown skills — indeed that is roughly what any "skill store" would look like). If α can absorb β and γ's engineering choices while adding vetting, the "dominance" dissolves into a difference about governance incentives, not architecture. The article's one structural counter — FQ locator lets users migrate out — is a real defense, but it's a *portability* argument, which is about exit costs, not Pareto dominance.

Where the argument *does* land: **attention-allocation power + self-declared content + indexability ⇒ ad-market dynamics**. That chain is solid, matches web/app-store history, and correctly predicts that even agent-consumers ("理性偏好" and "trigger-level 易感性" decoupling) won't neutralize it. My pushback is not with this mechanism but with its use as a *dominance* claim rather than a *specific failure-mode-of-ranking-hubs* claim.

## 4. Game-space dynamics — what actually triggers in 3 years

Ranking the listed triggers by likelihood over a ~3-year horizon:

1. **沉淀层 vendor 垄断 (sediment-layer vendor capture)** — *most likely, and already underway.* Requires no legislation, no scandal, no user behavior change: it only requires one agent CLI vendor to ship a proprietary skill format extension or an exclusive marketplace, which every major vendor has independent incentive and ability to do. The article's mitigation (vendor-neutral tooling, `deck_` prefixes) is proportionate. The "agent 内置 skill 反向吃掉沉淀层" variant listed in the blind-spots section is the most probable single mechanism — quiet, gradual, and individually rational for vendors.

2. **Trust 危机引发逃回 walled garden** — *high likelihood of the trigger, ambiguous effect.* The first high-profile malicious-skill or credential-theft event is nearly certain within 3 years (supply-chain attacks follow attention, and skill ecosystems are now attracting attention). The article's hope — that such a crisis becomes γ's marketing moment ("自己跑 arena 才能合脚") — is the less probable branch; the revealed-preference precedent (every previous ecosystem panic: browser extensions, npm events, Android sideloading debates) is a flight to *curation*, not to local verification. Ordinary users do not run arenas.

3. **协议标准化被捕获 (standard capture via superset extensions)** — *likely.* This is the historical modal outcome of format standards without a strong governance body (xHTML/kHTML → vendor prefixes; OpenAI function-calling vs. everyone else's; MCP vs. A2A as a live example as of writing). The article's mitigations (prefix conventions, reference-implementation posture) are the right ones but modest.

4. **γ → β 信任外包 (γ users drift to KOL-following)** — *likely at the individual level*, as the migration table itself concedes; not a failure of the framework, just the dominant user equilibrium. The β row's honest treatment of this is one of the article's better moments.

5. **Agent runtime 平台 lock-in** — *possible but slower* on open desktop platforms within 3 years; mobile agent platforms could move faster. Partially outside any ecosystem project's control, as the article correctly notes.

6. **算力垄断 + 闭源模型 frontier gap** — *the sleeper risk the article ranks too low.* If open-weight models remain N generations behind frontier APIs, then "fat agent on user hardware" is a niche hobbyist posture and the entire PC-pendulum premise (the article's foundational bet, §3) weakens. The article lists it but underweights it relative to vendor-marketplace capture, because the former invalidates the mental foundation while the latter only compresses γ's market share.

7. **监管 mandatory vetting** — *lowest likelihood within 3 years*, right to be ranked last; regulatory latency on novel software categories typically exceeds that window, though a single catastrophic event could compress it.

## 5. Strongest insight vs. biggest gap

**Strongest insight**: the separation of *recommendation authority* from *indexing*, formalized as the L1/L2/L3 trust stack, with L3 (local, tried-on, private metadata) as final activation authority. This is a genuinely good piece of market-structure reasoning: it identifies that the failure mode of app-store-style ecosystems is not central *availability* but central *attention allocation over self-declared content*, and it designs an engineering structure (curator metadata + arena try-on + fork-as-escape) that relocates the trust anchor to the party with actual skin in the game. The observation that agents decouple "liking" from "being triggered" (pushy descriptions reduce approval but not activation) is a sharp, empirically load-bearing refinement that most commentary on agent-facing SEO misses. The "购买秀/买家秀" engineering of the L3-c fork path through existing `localhost/` FQ mechanics is elegant precisely because it requires no new infrastructure.

**Biggest gap**: the absence of a security-externality and institutional-demand treatment of α. The entire α analysis runs on incentive-alignment and advertising-pathology lenses; it never confronts the two facts that keep hubs alive in every comparable market: (1) a malicious skill's cost is partly borne by *third parties* (exfiltrated credentials, downstream systems, employers), so "user runs arena and bears their own risk" does not internalize the externality — the same gap that justifies building codes and FDA vetting despite Taleb's objections to middlemen; (2) **institutional buyers (enterprises, regulated industries) structurally demand a liable central counterparty**, and their demand subsidizes the hub form regardless of individual-user welfare. The article's Pareto table assigns α to "高度同质化合规生态（不适合 skill）" as if that market were a rounding error — for every previous platform transition it was the revenue center. A dominance claim that excludes the segment whose revealed preference runs most strongly toward the dominated form is not a dominance claim; it's a claim about the consumer long tail. If the authors want the α verdict to survive contact with an enterprise architect, this is the section to write.

## 6. Verdict for the field

To a skeptical infrastructure engineer asking "is this worth my afternoon": **yes, but for the L1/L2/L3 trust architecture and the agent-SEO dynamics, not for the Pareto verdict.** Read §Skin-in-the-Game, the α section's advertising-pathology table, and the γ curator three-layer defense — that material is fresh, mechanism-level, and will change how you think about agent-facing metadata whether or not you ever touch this project. Skim or skip the OS-kernel metaphor section (serviceable as internal design language, thin as argument), and treat the "α is dominated" conclusion as a *position* — a well-defended one about ranking-hubs with ad incentives, but not the established market-design result the TL;DR claims. The pendulum-reversal and boundary-conditions material is unusually honest for an advocacy document and is the best index of the authors' seriousness; an architecture doc that spends this much effort specifying the conditions under which it loses is rarer and more valuable than one that only argues for its win. Net: two hours well spent for anyone building or choosing skill/agent infrastructure, with a discount factor of roughly 50% applied to the normative conclusions and 100% kept on the trust-layer mechanics.

---

# Round 2 — 被吃掉 vs 幸存的 skill / 幸存者 infra / harness 脱皮(2026-09-09)

> 发问(用户原话锚点):"我最感兴趣的你如果能 fork 出来追问也好——因为 harness 是脱皮的。
> 我其实已经发现 skill 爆炸+模型强大,尤其 codex 生态有'我用 skill 干嘛'的声音出现。
> 被模型强大吃掉的 skill 和不会被吃的 skill,还有那些 skill 希望的 infra 形态。"
> 方法:同一专家 persona 带完整评审上下文 resume,三问(Q1 把用户假设摆上桌面让它攻击)。
> decision-log.jsonl 追加 10 条(15 → 25,语法校验通过)。原始文件 /tmp/arena-moo-expert-read/
> (ephemeral,本文档为归档真相)。

## 证据核验(先核验后回答)

- **dsh 脱皮:VERIFIED**。README 大写警告 "THERE WILL BE COMPATIBILITY-BREAKING CHANGES";
  插件生态钉 `0.1.0-rc.7` + bump-on-breakage 实践;社区指南钉 SHA + 升级回归测试。
- **agent-teams 对重命名 host service key 的 shim:UNVERIFIED**——与 preview 状态一致,
  但未找到具体 shim。按作者直接观察处理。
- **"我用 skill 干嘛" discourse:Claude 侧 VERIFIED**(2026-06 Reddit 帖
  *"Why are all the Claude Code skill files I see online completely pointless?"*,
  论点:共享 skill 复述模型基线能力;原帖不可直接抓取,细粒度主张为二手)。
  **Codex 侧最强反证:OpenAI 自己的研究把 skill 定位为 agentic 工作的
  "systematization"**——价值在工作流制度化,不在能力转移。两者同时为真,
  且共同指向同一条切线(Q1 的判别变量)。

## Q1 裁决:用户假设方向对,判别变量错

- "模型也能做"是错误检验——它双向误分类:组织需要*可证明地每次同样执行*的
  SOP(发布门禁/评审清单/合规步骤)即使模型原生会也照样幸存(runbook 在三十年
  工程师能力增长中幸存,因为它服务 assurance 不是 performance);而"世界知识"
  类不是被吃掉是**贬值**(折旧时钟 = 训练数据周期,公开事故复盘越来越在前沿
  训练数据里)。
- 正确判别变量 = 三个独立测试:**capability exclusivity**(含模型推定时点
  没有的信息?)/ **repeatability-traceability demand**(有需要跨场合跨 agent
  可证明同样执行的当事方?)/ **maintenance coupling**(内容随环境腐化、有活的
  更新义务?)。三关全失 = 被吃。
- 用户的 "generic SOP 被吃" 类必须拆开:**capability-SOP(被吃)vs
  covenant-SOP(幸存,作为治理 artifact)**。
- 两个漏掉的幸存类:**anti-default/escalation discipline**(编码"何时不做模型
  会自信地默认做的事"——模型保持人群校准,组织需要 helpful-specific;每 token
  杠杆最高的类)/ **environment-coupled procedures**(绑工具版本/内部端点/
  凭证布局——模型不可能知道,幸存,且按与判断不同的日程腐化)。
- **最锋利的一击(exclusivity corollary):幸存的恰好是跨组织可转移性最低的类。**
  幸存存量 ≈ "带额外步骤的内部治理文档"——不是市场,勉强算公地。可共享残余
  只有协调协议和 anti-default 纪律,且它们作为**标准**共享而非 artifact。
  这是 round 1 迁移表里 ε 胜利条件("LLM 升级后 niche skill 边际价值逼近 0")
  从后门到达:**即使 skill 幸存,生态层价值归零,项目本地价值保留**。
- 动态框架:skill 组合 = **折旧资产**,模型升级事件 = 减值触发器;每个前沿版本
  发布触发组合复审,重测 "capability exclusivity 还在吗"。arena try-on 是对
  的仪器,但应作为**折旧审计**运行(由外部能力事件触发),不是一次性策展。

## Q2 裁决:开放问题全在 assurance 列,不在 distribution 列

registry/传输给定后,幸存的每个类的 infra 需求全部落在:**证据挂载、再验证/
过期检测、conformance、激活治理、归因**。项目已有资产(deck 准入控制、arena
try-on、L3 私有元数据)恰好全在对的列。

两个推论:
- **curator/发现层可能被过度投资**:幸存 skill 按定义 context-bound,跨组织
  发现优化的是贬值最快的资产类(能力转移型)。文章自己的 "agent-boosted
  search index 不做 ranking" 边界不只是意识形态立场,现在是经济立场——
  curator 保持最小化,L3 优先是对的。
- 唯一天经地义需要**新机制**而非延 defer 的地方:**constraint-composition
  冲突检测**(多张 anti-default + covenant gate 组合时 override 可能互相矛盾;
  能力组合的 dependency resolver 被正确拒绝了,但约束组合是不同、更难、
  无人拥有的问题——npm/git/harness 都不拥有)。ADR 候选。

## Q3 裁决:分层架构对,成本模型错一处

- 建筑史分类:文件格式/纯文本/目录结构半衰期数十年;**driver API、插件宿主、
  UI 约定半衰期数月到数年**。CLI glue 层正坐在第二类——它是**全栈最暴露的层,
  必须按"折旧中的 driver adapter 组合"预算**,不是基础设施。历史类比 =
  device drivers/HAL:没有人维护"driver 层",维护的是 N 个便宜的 per-device
  driver,每个在宿主 OS rev 时预期重写。正确姿势:per-harness adapter (a) 小
  到一天能重写,(b) 从单一真相源生成、绝不手工同步,(c) 对钉死版本做回归测试。
- **churn 支持分层,不是威胁——若派生视图是严格生成的 projection**。deck.toml
  是真相源、.claude/skills 软链是可重跑的投影(post-agent-adapter deck link
  已是这个形态)——则 harness 蜕皮成本 = 重跑 + 小 adapter 补丁,作为**折旧费用**
  吸收而非资产损失。蜕皮观察反而验证了分层。
- **断点不在 glue 在 activation**:若某 harness 把 skill 注册改为 API-only 私有
  格式(无法文件系统投影),markdown 幸存但激活死亡,skill 退化为惰性文档。
  这是 round 1 "沉淀层 vendor 垄断"机制的投递层形态。对冲:(1) degrade-to-
  filesystem 永久兜底(任何 agent 都能 Read markdown,最坏情况当粘贴 prompt 仍
  工作);(2) 多 harness 支持 = 维持期权价值;(3) FQ locator 退出 = 结构保证。
  **"Watch the activation layer, not the glue."**
- 战略升级建议:harness 蜕皮事件与模型升级事件对称处理——都是一等组合触发器;
  两个断代折旧纪律(skill 随能力折旧、adapter 随 harness 约定折旧),稳定基底
  只有两样:markdown(LLM 可读的体裁)+ git(传输),其余全部显性计价折旧。

## Round 2 合成跟进项(评审发现 × 项目立场)

1. **折旧纪律落地**:arena 验收标准增加"模型升级触发复审"语义;deck/curator
   增加"能力独占性过期"检测思路。候选进 roadmap。
2. **constraint-composition 冲突检测**:全新机制候选(唯一不被 defer 的),
   需 ADR 级论证。登记研究项,不进实现。
3. **adapter-as-depreciating-asset 姿势**:deck link 投影层已符合(b 条);
   缺的是 (c) 对钉死 harness 版本的回归测试——与 probe-fix/ADRing 相关。
4. **anti-default discipline 作为 skill 类**:与 sober(刹车纪律)高度同构,
   creator/coach 分层规则时引用 Q1 三测试。
5. **activation 层监视项**:对应 round 1 触发器 #1(沉淀层 vendor 捕获)的
   投递层形态;写入边界条件监测清单。
6. **curator 最小化的经济论证**:round 2 给出独立支撑(L3 优先策展的
   经济学理由),与 curator-three-layer-trust 记忆互为印证。

## Round 2 评审全文(verbatim,未改动)

# Round 2 — Eaten vs. Surviving Skills, Survivor Infrastructure, Harness Molting

## 0. Field-context verification (before answering)

- **dsh molting: VERIFIED.** DeepSeek's harness repo and README explicitly label dsh a developer preview with capitalized warnings that "THERE WILL BE COMPATIBILITY-BREAKING CHANGES"; the plugin ecosystem targets specific release candidates ("Currently targets DeepSeek Harness `0.1.0-rc.7`, which is still a Developer Preview") and community guidance is to pin exact versions/commits and re-test on upgrade because "upstream is an early developer preview that promises breaking changes between releases." ([flowtivity.ai](https://flowtivity.ai/blog/deepseek-harness-open-source-agent-explained/), [deepseek-harness discussion #2535](https://github.com/deepseek-ai/deepseek-harness/discussions/2535), [falsify-dsh adapter](https://github.com/shi275773124/falsify-dsh))
- **agent-teams shim for renamed host service keys: UNVERIFIED** by my searches — plausible and consistent with the verified preview status, but I could not find the specific shim. Treat as author's direct observation.
- **"why would I even use skills" discourse: VERIFIED in the Claude community, PARTIALLY verified for Codex.** A June 2026 Reddit post titled *"Why are all the Claude Code skill files I see online completely pointless?"* argues that most shared skill files contain generic instructions (e.g., "expert full-stack developer") that the model already knows, and that skill files should instead fix specific behavioral issues ([aibriefs.news summary](https://aibriefs.news/card/2d588868-60cc-4ef1-b847-7a0409c7735c) — original thread not directly fetchable, so finer-grained claims from it are secondhand). The strongest *counter*-evidence to the "skills are dead" position is OpenAI's own Codex research, which describes the shift from ad-hoc prompting to skills as the "**systematization** of agentic work" — "without it, users must repeatedly supply task context, procedural guidance, and instructions, limiting the extent to which work can be handed off" ([OpenAI, The Shift to Agentic AI: Evidence from Codex](https://cdn.openai.com/pdf/5d1e1489-21c0-43e4-9d42-f87efdbf0082/the-shift-to-agentic-ai-evidence-from-codex.pdf)). Note the tension inside the field's own evidence: the systematization value is real, but it accrues to *workflow institutionalization*, not to *capability transfer* — which is exactly the line Q1 asks about.

---

## Q1 — Eaten vs. surviving skills: taxonomy and the real discriminating variable

### The author's hypothesis, restated

Eaten: (a) world knowledge the model already has, (b) generic SOPs the model performs natively, (c) one-off lookups. Survivors: (a) project-specific conventions/state externalities, (b) incident-distilled pitfalls, (c) inter-agent coordination protocols, (d) skin-in-the-game-backed taste rules.

### The core correction: "the model could do this" is the wrong test

The hypothesis frames the discriminating variable as **capability overlap** — does the artifact add information the model lacks? That variable misclassifies on both sides:

- **False survivors under the author's own framing**: a generic SOP that the model performs natively *still survives* the moment an organization needs it performed *provably, the same way, every time* — a release gate, a review checklist, a compliance step. The model "could do it" in exactly the sense that a mid-level engineer could follow a checklist without the checklist. Organizations kept runbooks, style guides, and checklists through thirty years of increasingly capable engineers, not because the engineers lacked capability but because the artifacts serve **assurance, not performance**: they are contracts that eliminate per-occasion renegotiation and create an audit trail. An SOP skill is normative, not informative.
- **False eaten**: "world knowledge the model already has" is a *depreciating* class, not an eaten one — and the depreciation clock is the training-data cycle, not the artifact's content. Public incident writeups (your surviving class (b)) are increasingly *in* frontier training data. What survives of (b) is not "pitfalls" as a content class but **pitfalls whose incident evidence is private to the deploying org**.

The right discriminating variable from first principles is: **at which time does the artifact deliver value — inference time (capability) or coordination/assurance time (repeatability, traceability, accountability, blame)?** Decompose into three independent tests:

1. **Capability exclusivity** — does the artifact contain information the model plausibly lacks at inference time? (Project-internal state, private incident corpora, environment coupling.)
2. **Repeatability/traceability demand** — does any party need this done the same way, provably, across occasions and across agents? (SOPs, gates, coordination protocols — survives regardless of test 1.)
3. **Maintenance coupling** — does the content rot when the environment/org changes, creating a *living* update obligation? (Survivors have owners and review cycles; eaten skills are write-once.)

A skill failing all three is eaten. The author's (a)-eaten and (c)-eaten classes fail all three. But the author's (b)-eaten class ("generic SOPs") fails only test 1 — and passes 2 and 3 for any org that needs *its* SOP done *its* way. The author would respond that "generic SOPs" means capability-bearing procedures, not org commitments; the taxonomy needs that split explicitly: **capability SOPs** (eaten) vs. **covenant SOPs** (survive, as governance artifacts).

### Two missing classes

- **Anti-default / escalation discipline**: skills encoding *when not to do the thing the model will confidently do by default* — "when you see X symptom, do NOT apply the popular fix; it masks Y." Models are calibrated toward helpful-average; organizations need helpful-specific. This is orthogonal to both knowledge and SOP-ness, survives every capability gain (frontier models remain population-calibrated), and is the highest-leverage skill class per token.
- **Environment-coupled procedures**: bindings to installed tool versions, internal endpoints, credential layouts, ticket-system field names. The model cannot know these; they survive; they rot fast (test 3). Distinct from "project-specific conventions" in that the content is not judgment but *coupling* — and coupling rots on a different schedule than judgment.

### The sharpest attack on the hypothesis — the exclusivity corollary

Rewrite the taxonomy with the corrected variable and an uncomfortable corollary falls out: **the classes that survive capability growth are exactly the classes with the least cross-org transferability.** Project-specific conventions, private incident corpora, org covenants, environment coupling — none of these are meaningfully shareable. The shareable residue is coordination protocols and anti-default discipline, and those are shareable *as standards*, not as artifacts. Implication for the ecosystem's economics: the surviving skill stock is mostly **internal governance documentation with extra steps** — not a market, barely a commons. This is the ε-form victory condition from the round-1 migration table ("某轮 LLM 升级后… 特定 niche skill 边际价值逼近 0 → γ → ε") arriving through the back door: even when skills survive, their *ecosystem-level* value migrates to zero while their *project-local* value holds. The author's hypothesis is directionally right about which classes survive; the corrected taxonomy says the survival is local, private, and non-tradable.

### Dynamic framing: skill portfolios are depreciating assets

The eaten/surviving boundary is not a taxonomy snapshot — it is a **depreciation schedule with model-upgrade events as write-down triggers**. Every frontier release should trigger a portfolio review: re-test each skill against "does this still add capability exclusivity?", retire the ones that fail. The ecosystem already has the right instrument for this (arena try-on, from round 1) — but it should be run as a *depreciation audit* triggered by external capability events, not as a one-time curation pass. Skill authors and curators who do not internalize the write-down schedule will be running a museum.

---

## Q2 — What infrastructure do surviving skills want?

Mapping each surviving class to its infra needs, with registry/transport (git, GitHub, npm) taken as given:

| Surviving class | Versioning | Evidence/QA attachment | Discovery | Composition governance | Distinctive need |
|---|---|---|---|---|---|
| Project conventions / state | git (given ✓) | Low — enforced by code review | ~None (project-local by definition) | Activation gating (which conventions bind this session) | Ownership/attribution (CODEOWNERS-equivalent) |
| Incident pitfalls (private) | git ✓ | **High — must link to incident record + repro; needs sign-off by incident owner** | Low | Revalidation triggers: pitfall rots as codebase changes; needs staleness detection tied to the system it guards | **Evidence attachment + periodic re-validation** |
| Coordination protocols (inter-agent) | git ✓ + protocol version | **Conformance testing** (does counterparty satisfy the contract — JSON-Schema/OpenAPI analogy) | **Highest of the survivors** — counterparties are external and change | **Deny-by-default admission** (the deck mechanism, correctly) | **Contract versioning + conformance harness** |
| Covenant SOPs / release gates | git ✓ | Audit trail (who activated which gate) | None | Activation governance + budget | Attributability (blame/audit) |
| Anti-default discipline | git ✓ | Arena/incident evidence that the default fails | Medium — this is the shareable class | Careful: composing many anti-defaults can conflict | **Conflict detection between overrides** |
| Taste/judgment (maintained) | git ✓ | **Strong: provenance chain + fresh evidence; taste must be re-derived, not just stated** | Low | Personalization binding (whose taste) | **Re-derivation pipeline from fresh evidence** |

### The structural answer

Given registry and transport are solved, **every open problem is in the assurance column, not the distribution column**: evidence attachment, re-validation/staleness, conformance, activation governance, attribution. The ecosystem's distinctive assets (deck admission control, arena try-on, L3 private metadata) all live in exactly the right column. Its weakest investment, on this analysis, is **discovery/curator search**: surviving skills are context-bound by definition, so cross-org discovery is optimized for the asset class that is depreciating fastest (capability-transfer skills). As eating proceeds, marginal value of ecosystem-level discovery infrastructure trends toward zero, while marginal value of project-local assurance infrastructure rises. I would advise: keep curator minimal (the article's own "agent-boosted search index, no ranking" boundary is not just an ideological stance but now an economic one — do not over-invest in the depreciating class), and double down on the two capabilities with rising marginal value: **re-validation/staleness machinery** for environment-coupled and pitfall skills, and **conformance testing** for coordination protocols.

One genuinely open infra question the table exposes: **conflict detection in composition**. When an agent's deck contains multiple anti-default skills and covenant gates, overrides can contradict. Dependency-resolver-shaped tooling was rejected for capability composition; but *constraint composition* (these covenants and overrides must be jointly satisfiable) is a different, harder problem that no existing layer owns — not npm, not git, not the harness. This may be the one place the ecosystem legitimately needs a new mechanism rather than a deferral.

---

## Q3 — Harness molting: where should stable infrastructure live?

### Verdict on the ecosystem's layering

The proposed stack — intelligence in the markdown artifact, stable integration in package registries, mechanical glue in CLIs, state externalized to agent/workspace — is **architecturally right, but the cost model attached to it is wrong in one place**.

Map it onto the architectural-history taxonomy of what molts and what doesn't: **file formats, plain-text encodings, and directory structures have half-lives of decades; driver APIs, plugin hosts, and UI conventions have half-lives of months to a few years.** The markdown artifact sits in the first class (it is not even a protocol — it is a training-data genre; any LLM harness can read it; its stability risk is semantic drift, which the article's own boundary condition 4 already concedes and monitors). Package registries sit in the first class. **The CLI/glue layer sits squarely in the second class** — and this is where the field evidence lands: dsh is an explicit developer preview promising "COMPATIBILITY-BREAKING CHANGES," its plugin ecosystem already practices pin-to-rc and bump-on-breakage, and at least one adapter in the wild treats any green self-test as non-authoritative until run against a frozen SHA ([sources in §0](#0-field-context-verification-before-answering)).

So: the layer the ecosystem calls "mechanical glue in CLIs" is **the most molting-exposed layer of the entire stack, and it should be budgeted as such** — not as infrastructure but as a **portfolio of depreciating driver adapters with a write-off schedule**. The historical analogy is device drivers / HALs: nobody maintains "the driver layer"; they maintain N cheap per-device drivers, each expected to be rewritten when the host OS revs. The correct institutional posture is: per-harness adapters should be (a) small enough to rewrite in a day, (b) generated from a single source of truth, not hand-synchronized, and (c) regression-tested against pinned harness versions with upgrade checklists.

### Does churn support or break the layering?

**Supports it — with one identified break point.** The delivery/invocation seam between artifact and model is harness-specific: frontmatter conventions, skill-catalog surfacing mechanisms (system-reminder listings, skill tools), activation semantics (progressive-disclosure formats), and per-harness file locations (`.claude/skills` vs `.codex/skills` vs `.kimi`). This seam is the MMU/driver boundary. The ecosystem's design handles this correctly *only if* the derived per-harness views are strictly generated artifacts: `deck.toml` is the source of truth, `.claude/skills` symlinks are a re-runnable projection. On that design, a harness molt costs a re-run plus a small adapter patch — churn is absorbed as *depreciation expense*, not *asset loss*. The evidence from round 1's memory (post-agent-adapter deck link fanning out to multiple CLIs in one op) suggests this projection-layer design is already in place; if so, the layering is validated by the molting observation rather than threatened by it.

**The break point**: if a harness ever moves skill registration to API-only with a proprietary format — no filesystem projection possible — the markdown artifact survives but *activation* dies, and the skill degrades to inert documentation. That is round 1's 沉淀层 vendor 垄断 mechanism in delivery-layer form. No filesystem-side hedging fully covers it; the hedges are (1) degrade-to-filesystem as the permanent fallback position — any agent can `Read` a markdown file, so worst-case the skill still works as a pasted prompt, (2) multi-harness support as maintained option value, (3) FQ-locator exit as the structural guarantee. The honest statement is: **the artifact layer is molting-proof, the glue layer is molting-budgeted, and the activation layer is the hostage.** Watch the activation layer, not the glue.

### The one strategic upgrade I'd recommend

The ecosystem should treat **harness-molt events as first-class portfolio triggers**, same as model-upgrade events in Q1: each breaking harness release triggers an adapter re-validation pass against the regression checklist. Symmetric discipline: skills depreciate with capability; adapters depreciate with harness conventions; both are depreciating assets over stable substrates (markdown over LLMs; deck.toml over git). The stable substrate of the whole system is exactly two things — markdown as a model-readable genre, and git as transport — and everything else should be explicitly priced as depreciation.
