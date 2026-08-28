# Patterns 索引（P0/P1/P2 分层）

本索引是 `cortex/wiki/01-patterns/` 的重要性分层视图。目录内文件保持时间戳平铺不变，分层只存在于本索引：

- **P0 / Active**：当前 agent 必读的核心模式（判定依据：被 ≥2 个 weekly 的 `decisions_accepted` / `project_lesson_candidates` 引用）。TL;DR 说明为什么现在仍重要。
- **P1 / Absorbed**：知识已被 `cortex/wiki/04-ssot/` 吸收的模式。TL;DR 说明吸收到哪份 SSOT，阅读原文仅用于追溯细节。
- **P2 / Historical**：探索性、实验性或已被取代的记录。TL;DR 给出历史背景，按需阅读。

> 维护：由 lythoskill-dreaming Phase 2 维护；判定规则见 ADR-20260613190449007。
> 边界：`cortex index wiki` 生成器只写 `cortex/wiki/INDEX.md`，从不触碰本文件（generate-index.ts 只写 `join(config.wikiDir, 'INDEX.md')`，且 readWikiDir 过滤掉所有 INDEX.md）。
> 初次分类：2026-08-28（56 篇日期戳 pattern；`weekly-synthesis-template.md` 是模板，不参与分层）。

## P0 / Active

| 文件 | TL;DR |
|------|-------|
| [2026-05-02-thin-skill-pattern](./2026-05-02-thin-skill-pattern.md) | 全项目架构基石（重逻辑进 npm 包、SKILL.md 只做薄路由），W17 与 W22 的 decisions 两次确认（含 deck 创建向导场景）；已同时被吸收进 `04-ssot/architecture.md` 与 `key-decisions.md`，原文仍有最完整论证。 |
| [2026-05-12-workspace-protocol-in-source-concrete-version-at-publish](./2026-05-12-workspace-protocol-in-source-concrete-version-at-publish.md) | `workspace:*` 源码态 + 发布时改写 `^version` 是双受众唯一正解，W19/W20 lessons 各记一次事故与结论，W31 又发生 0.17.2 泄漏事故——每次发布都必须守住；已吸收进 `04-ssot/key-decisions.md`（含 ZK Alert）与 `pitfalls.md` §12-13。 |
| [2026-06-15-zk-review-cognitive-foundations-curse-of-knowledge-review-continuity-attention-economy](./2026-06-15-zk-review-cognitive-foundations-curse-of-knowledge-review-continuity-attention-economy.md) | ZK Review 的认知科学地基（知识诅咒 / 评审连续性 / 注意力经济），W24 decisions 三条收敛规则、W25/W29 lessons 持续引用——它是现行 ZK Review Gate（AGENTS.md §3）之所以成立的解释，执行细节已部分吸收进 `04-ssot/conventions.md` §10 ZK Validation。 |

## P1 / Absorbed

| 文件 | TL;DR（吸收去向） |
|------|------|
| [2026-05-02-player-deck-separation-and-tcg-player-analogy](./2026-05-02-player-deck-separation-and-tcg-player-analogy.md) | Player/Deck 分离模型与 TCG 类比，已吸收进 `04-ssot/key-decisions.md`（ADR-20260424120936541，决策 #3）。 |
| [2026-05-02-skills-as-flat-controllers-evolution](./2026-05-02-skills-as-flat-controllers-evolution.md) | 扁平无状态 skill + 状态外置的历史论证，结论已吸收进 `04-ssot/key-decisions.md`（决策 #4）；原文留给需要 steel-man 推演的人。 |
| [2026-05-02-epic-granularity](./2026-05-02-epic-granularity.md) | Epic = 迭代里程碑而非任务分类器，已吸收进 `04-ssot/key-decisions.md`（ADR-20260503003315478，决策 #23）与 cortex 常规流程。 |
| [2026-05-04-intent-plan-execute-fractal-architecture-pattern](./2026-05-04-intent-plan-execute-fractal-architecture-pattern.md) | Intent/Plan/Execute 分形架构与 IO 注入，测试分层结论已吸收进 `04-ssot/conventions.md` §5，`pitfalls.md` §10 直接点名本文档作为评估者的先修阅读。 |
| [2026-05-05-multi-agent-posse-syndication](./2026-05-05-multi-agent-posse-syndication.md) | Cold pool 为自有站点、`deck link` 向多 CLI 同步的 POSSE 模式，已吸收进 `04-ssot/architecture.md`（Multi-CLI POSSE 节）与 `key-decisions.md`（决策 #20）。 |
| [2026-05-07-expected-coverage-gaps-intent-plan-execute-coverage-strategy](./2026-05-07-expected-coverage-gaps-intent-plan-execute-coverage-strategy.md) | "plan 层高覆盖、execute 层交给 BDD"的覆盖率策略，已吸收进 `04-ssot/conventions.md` §5（L0/L1/L2 测试分层表）。 |
| [2026-05-14-agent-driven-plan-first-architecture](./2026-05-14-agent-driven-plan-first-architecture.md) | 破坏性/网络操作走 plan → agent 判断 → execute，"apply 是 agent 行为而非 `--apply` 标志"，已吸收进 `04-ssot/key-decisions.md`（决策 #38，plan-first 从不隐式执行）。 |
| [2026-05-15-seed-bootstrap-pattern-minimal-governance-skill-enables-agent-self-expansion](./2026-05-15-seed-bootstrap-pattern-minimal-governance-skill-enables-agent-self-expansion.md) | 只给 agent 一个治理 skill 即可自扩展的 Seed Bootstrap，已吸收进 `04-ssot/architecture.md`（Seed bootstrap 节）与 `key-decisions.md`。 |
| [2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table](./2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md) | CLI stdout/stderr 即 agent 中断向量的控制转移协议，被 `04-ssot/reproduce-sh-bdd.md`（§4，sources 显式引用）与 `external-validation-meta-observation.md` 吸收；`key-decisions.md` 亦有专条。 |
| [2026-05-17-shell-stdout-as-agent-prompt-injection](./2026-05-17-shell-stdout-as-agent-prompt-injection.md) | Shell echo 作为 IoC prompt 注入通道（reproduce.sh 的接力机制），被 `04-ssot/reproduce-sh-bdd.md` 显式引用并吸收（sources + Related 双列）。 |
| [2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents](./2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents.md) | 零知识 agent 经 reproduce.sh 自发现完成 BDD 的交接模式，已吸收进 `04-ssot/reproduce-sh-bdd.md`（尤其 §5 Zero-Knowledge Verification）。 |
| [2026-05-19-where-is-the-orchestrator-combo-prompt-as-lightweight-orchestrator-pattern](./2026-05-19-where-is-the-orchestrator-combo-prompt-as-lightweight-orchestrator-pattern.md) | "编排器按重量分布在 combo prompt / SKILL.md / CLI 三层"，已吸收进 `04-ssot/architecture.md`（设计原则 7）、`key-decisions.md`（关键非 ADR 决策）与 `agent-onboarding-guide.md`。 |
| [2026-05-27-path-convention](./2026-05-27-path-convention.md) | `working_set` / `cold_pool` 路径用词约定，已吸收进 `04-ssot/conventions.md` §3（Path Conventions）。 |
| [2026-05-28-agent-skills-path-reference](./2026-05-28-agent-skills-path-reference.md) | 各 agent 的 skills 目录对照表（`.claude/skills` vs `.agents/skills`），结论已吸收进 `04-ssot/conventions.md` §3 与 §10；原文保留 14+ agent 的完整对照。 |
| [2026-05-28-agent-evaluation-arena-pattern](./2026-05-28-agent-evaluation-arena-pattern.md) | "agent 出具的评估不可直接信，派第二个 agent 验证"的认知卫生模式，其 frontmatter 声明内容源自 `04-ssot/pitfalls.md` §10 与 `conventions.md` §5——知识以 SSOT 为准。 |

## P2 / Historical

| 文件 | TL;DR |
|------|-------|
| [2026-05-02-adr-to-lint-bridge](./2026-05-02-adr-to-lint-bridge.md) | 早期"ADR → lint 自动检查"设想，后以 pre-commit guard 体系落地，本文是概念原点记录。 |
| [2026-05-02-agent-skills-spec](./2026-05-02-agent-skills-spec.md) | Anthropic/Kimi Agent Skills 开放格式的基线摘录，属外部规范参考而非本项目模式。 |
| [2026-05-02-alpha-user-simulation-iteration](./2026-05-02-alpha-user-simulation-iteration.md) | 用 subagent 模拟陌生 alpha 用户迭代文档的早期设想，是后来 user-sim reviewer 的思想前身。 |
| [2026-05-02-concurrent-subagent-map-reduce](./2026-05-02-concurrent-subagent-map-reduce.md) | "目录即状态"的并发 subagent map-reduce 实验，playground 时代做法，现由 cortex 任务体系替代。 |
| [2026-05-02-desc-preference-arena](./2026-05-02-desc-preference-arena.md) | 用 arena A/B 测 skill description 触发偏好的方法（W18 decisions 记过一次），desc 风格之争已尘埃落定。 |
| [2026-05-02-fence-variable-trick](./2026-05-02-fence-variable-trick.md) | 模板字符串里用 `'​`'.repeat(3)` 生成嵌套代码围栏的微技巧，仍有效但属实现细节。 |
| [2026-05-02-project-cortex-porting-guide](./2026-05-02-project-cortex-porting-guide.md) | 把独立 skill 迁移进 lythoskill monorepo 的一次性移植记录（以 project-cortex 为例），迁移早已完成。 |
| [2026-05-02-project-scope-and-ecosystem-paths](./2026-05-02-project-scope-and-ecosystem-paths.md) | 项目边界宣言（只做 meta-governance 不做应用工作流），结论已固化进 README/AGENTS.md 的 Identity 节。 |
| [2026-05-02-self-contained-task-writing](./2026-05-02-self-contained-task-writing.md) | "读者对项目一无所知"的任务卡写作规范，现由 cortex 任务模板与 ZK Review Gate 承载。 |
| [2026-05-02-skill-loading-lifecycle](./2026-05-02-skill-loading-lifecycle.md) | Claude Code 会话启动时扫描 skills 的加载行为记录，是 `deck link` 需重启会话生效这一常识的来源。 |
| [2026-05-02-smart-agent-dumb-tools](./2026-05-02-smart-agent-dumb-tools.md) | "编排在上、计算在下"原则，概念已融入 thin-skill 与 orchestrator 分布式两篇（W21 core_thread 曾点名），本文是独立论证版。 |
| [2026-05-02-thin-skill-monorepo](./2026-05-02-thin-skill-monorepo.md) | thin-skill 的 monorepo 三层分离早期版本（含已废弃的 dist/ 目录设计），以 thin-skill-pattern 为准。 |
| [2026-05-02-thin-skill-references-generation](./2026-05-02-thin-skill-references-generation.md) | build 时自动生成 references/COMMANDS.md 的机制说明，现是 creator build pipeline 的内置行为。 |
| [2026-05-03-github-actions-bun-ci-cd-配置模式](./2026-05-03-github-actions-bun-ci-cd-配置模式.md) | GitHub Actions + Bun CI 配置模板（setup-bun、coverage badge），CI 已稳定运行后的留存参考。 |
| [2026-05-06-player-abstraction-agent-swappable-backend](./2026-05-06-player-abstraction-agent-swappable-backend.md) | AgentAdapter 接口实现后端可替换（Kimi 替代 Claude 的验证记录），adapter 体系后由 key-decisions 决策 #42/43 承接。 |
| [2026-05-07-cold-pool-cli-boundary](./2026-05-07-cold-pool-cli-boundary.md) | cold-pool 独立 CLI、不寄生 deck 的命令边界设计共识，决策结果见 key-decisions（#36-38）。 |
| [2026-05-07-cold-pool-evolutionary-rationale](./2026-05-07-cold-pool-evolutionary-rationale.md) | cold pool 从 bare-name 到 FQ locator 的演进论证（含 Go module/Maven 对照），历史选型记录。 |
| [2026-05-07-cold-pool-unified-facility-design](./2026-05-07-cold-pool-unified-facility-design.md) | `@lythos/cold-pool` 抽包时的架构设计记录，实现早已落地，细节以源码为准。 |
| [2026-05-07-graduation-exam-end-to-end-agent-pipeline-deck-arena-multi-skill-orchestration-radar-chart-docx](./2026-05-07-graduation-exam-end-to-end-agent-pipeline-deck-arena-multi-skill-orchestration-radar-chart-docx.md) | 毕业考题初版（docx + 雷达图全链路验证），已被 05-15 的正式 spec 取代。 |
| [2026-05-08-agent-adapter-as-actor-daemon-lifecycle-facade-pattern-for-multi-player-cli-backends](./2026-05-08-agent-adapter-as-actor-daemon-lifecycle-facade-pattern-for-multi-player-cli-backends.md) | 把 daemon 型 agent CLI 包装成 actor + facade 的适配器模式，DeepSeek serve 适配器的设计存档。 |
| [2026-05-08-agents-md-as-network-native-agent-bootloader](./2026-05-08-agents-md-as-network-native-agent-bootloader.md) | AGENTS.md 作为网络原生 bootloader 的设想（URL 即入口），与次日同主题文档近似重复。 |
| [2026-05-08-agents-md-bootloader-pattern](./2026-05-08-agents-md-bootloader-pattern.md) | AGENTS.md bootloader 的 deck 场景版（与上一篇近乎同题两篇），实践已固化进本仓 AGENTS.md 的 boot 流程。 |
| [2026-05-08-curator-comparison-hermes-vs-lythoskill-agent-side-lifecycle-vs-ecosystem-discovery](./2026-05-08-curator-comparison-hermes-vs-lythoskill-agent-side-lifecycle-vs-ecosystem-discovery.md) | Hermes curator 与 lythoskill curator 的概念辨析，属外部对比研究存档。 |
| [2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting](./2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting.md) | deck 与 cold-pool 解耦 + FSM 引用计数的设计记录，实现落地后以源码为准。 |
| [2026-05-09-dormancy-property-test-for-fallback-hints](./2026-05-09-dormancy-property-test-for-fallback-hints.md) | 降级提示必须配"健康路径不出现"的休眠测试，技巧仍有效（AGENTS.md 指针表收录），但未被 weekly/SSOT 引用。 |
| [2026-05-10-cold-pool-metadata-filesystem-ground-truth](./2026-05-10-cold-pool-metadata-filesystem-ground-truth.md) | "文件系统是 ground truth，metadata.db 只是可重建缓存"的原则声明，curator/cold-pool 已实现为该形态。 |
| [2026-05-10-side-deck-pattern-specialized-task-decks-for-arena-single](./2026-05-10-side-deck-pattern-specialized-task-decks-for-arena-single.md) | 任务专用 side deck + `arena single` 的一次性执行模式，现由 AGENTS.md §7 deck-first dispatch 表承载。 |
| [2026-05-11-skills-discovery-vs-governance-complementary-architecture](./2026-05-11-skills-discovery-vs-governance-complementary-architecture.md) | skills.sh 管发现、lythoskill 管治理的互补定位分析，对外定位已写进 site 与 conventions §12。 |
| [2026-05-14-arena-agent-bdd-architecture-flow](./2026-05-14-arena-agent-bdd-architecture-flow.md) | 2026-05-14 时点的 arena single/vs 内部调用流图，属实现快照，后以 reproduce.sh BDD 体系为准。 |
| [2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior](./2026-05-15-annotation-mindset-agent-facing-code-annotations-as-ioc-for-agent-behavior.md) | "注解即 agent 行为的 IoC 触发器"设计哲学（W20 emergent 记录过），AGENTS.md 指针表收录，未被 SSOT 吸收。 |
| [2026-05-15-graduation-exam-spec](./2026-05-15-graduation-exam-spec.md) | 毕业考题正式 spec（cookie 配方 docx + 五维雷达图），考题多轮跑完后成为历史基准。 |
| [2026-05-17-alias-as-role-slot-name-resolution-and-working-set-flattening](./2026-05-17-alias-as-role-slot-name-resolution-and-working-set-flattening.md) | FQ locator → alias 角色槽 → 扁平 working set 的三层命名解析，现是 deck link 的内置行为。 |
| [2026-05-18-skill-incubator-sop-curator-driven-skill-creation-pipeline](./2026-05-18-skill-incubator-sop-curator-driven-skill-creation-pipeline.md) | curator 驱动的 skill 孵化 SOP（journalist skill 的诞生记录），一次性流程存档。 |
| [2026-05-19-cold-pool-filesystem-native-design-intent](./2026-05-19-cold-pool-filesystem-native-design-intent.md) | "cold pool 为什么不是 registry/gitea"的费曼式追问记录，选型论证存档。 |
| [2026-05-20-skill-ecosystem-epistemic-gaps-arena-correction](./2026-05-20-skill-ecosystem-epistemic-gaps-arena-correction.md) | 幂律生态下"流行度是混淆变量、arena 是自己的灯"的认识论宣言，是 arena 存在意义的哲学论证。 |
| [2026-05-29-internal-roundtable-pattern](./2026-05-29-internal-roundtable-pattern.md) | 多 agent 内部圆桌辩论抓自己的盲点（runAdd IO 注入之争），属一次性决策过程记录。 |
| [2026-06-15-long-range-traceability-arena-web-share-from-idea-to-backlog-to-waiting](./2026-06-15-long-range-traceability-arena-web-share-from-idea-to-backlog-to-waiting.md) | 以 arena web share 为例的长程可追溯性案例分析（daily→task→ADR→git 四层载体），属元观察散文。 |
| [2026-07-10-zk-review-trade-off-awareness](./2026-07-10-zk-review-trade-off-awareness.md) | ZK gap 先问"不然呢、代价是什么"再打标的权衡意识（W28 lessons 记过一次），是 ZK Review 的进阶补丁，尚未进入 SSOT。 |
