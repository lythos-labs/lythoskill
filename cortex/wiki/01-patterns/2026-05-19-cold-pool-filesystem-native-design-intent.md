---
created: 2026-05-19
updated: 2026-05-19
category: pattern
---

# Cold Pool: 为什么是文件系统原生，而不是 registry / hub / gitea

> 回答一个问题：cold pool 管理大量 git repo，天然让人联想到 gitea、npm registry、Maven Central。它们都像，但都不 fit。那条共同的分界线是什么？
>
> 来源：与项目作者的费曼对话（gitea 视角追问）、[`2026-05-07-cold-pool-evolutionary-rationale.md`](./2026-05-07-cold-pool-evolutionary-rationale.md)、ADR-20260507021957847、ADR-20260508230803515、ADR-20260517152850372（POSSE）。

---

## 1. 问题：cold pool 像很多现有系统，但都不是

cold pool 的核心行为——管理一组 git 仓库、从 remote 拉取、在本地维护索引——和多个成熟系统表面相似：

| 系统 | 像的地方 | 不像的地方 |
|------|----------|------------|
| **gitea** | 都管理大量 git repo；都涉及 clone/fetch | gitea 是服务，cold pool 不是 |
| **npm registry / Maven Central** | 都管理依赖包；都有本地缓存（`node_modules` / `~/.m2`） | registry 是中心化的权威真源，cold pool 不是 |
| **K8s** | 都使用 reconciliation（声明式期望 ↔ 实际状态） | K8s 有 controller 持续运行，cold pool 没有 |
| **agentskill.sh / Vercel Skills CLI** | 都是技能生态系统 | 它们是平台 + 托管服务，cold pool 是本地文件系统 |

如果只看"像"，很容易推导出一个错误结论：**cold pool 是一个"还没做好的"本地版 gitea / registry / hub**——它只是暂时没做服务层、没做后台同步、没做 Web UI。

这个结论错在把"设计意图"误判为"技术债务"。

---

## 2. 逐个对比：像与不像的分界线

### 2.1 gitea / Git hosting service

**像**：都管理 git repo；目录下有 `.git/`；可以 `git pull` 更新。

**不像**：
- gitea 是一个**服务**。有进程生命周期，监听端口，有数据库真源，用户通过 API/Web 间接操作仓库。
- cold pool **没有服务层**。没有 `cold-poold`，没有端口。curator 扫描完就退出。git 操作是 CLI 直接 `execFileSync('git', ...)`。
- gitea 的 mirror 是**后台持续同步**（cron / webhook → 自动 `git fetch` → 本地始终跟进 upstream）。cold pool 是**按需、命令触发**的（`deck link` 时才 fetch），获取后即冻结。
- gitea 支持**多用户协作**。cold pool 是单代理/单用户的私有工作空间。

**分界线**：服务化 vs 无服务。

---

### 2.2 npm registry / Maven Central

**像**：都有"本地缓存"（`~/.agents/skill-repos` 类比 `~/.m2/repository`）；都从 remote 拉取内容到本地；都有元数据索引。

**不像**：
- registry 是**中心化权威**。包的版本解析、依赖树、完整性校验都指向 registry 作为真源。`package.json` 里的 semver 范围最终由 registry 解析。
- cold pool **没有中心化权威**。`skill-deck.toml` 里的 FQ locator 直接指向 git URL，没有"registry 告诉我这个版本对应哪个 tarball"。
- registry 的元数据（`package.json` 内容、版本列表）是**治理真源**。cold pool 的 metadata DB 是**派生索引**——文件系统才是真源，数据库只是辅助笔记。
- npm / Maven 有**版本解析算法**（semver range → concrete version）。cold pool 没有版本解析——你指哪个 ref（branch/tag/commit），就 checkout 哪个 ref。

**分界线**：中心化权威 vs 本地文件系统真源。

> 参见 [`2026-05-07-cold-pool-evolutionary-rationale.md`](./2026-05-07-cold-pool-evolutionary-rationale.md) 第 6 节：Maven 的 companion file 机制可借鉴，但 cold pool 不引入 coordinate 系统或 Merkle tree。

---

### 2.3 Kubernetes

**像**：都使用 reconciliation 语义——声明式期望状态（`skill-deck.toml`）vs 实际文件系统状态 → 收敛。

**不像**：
- K8s 有**持续运行的 controller**（kube-controller-manager）不断 watch → reconcile → apply。
- cold pool 的 reconcile 是**命令触发的**（`deck link` / `curator scan` 时一次性执行），没有 watch loop，没有 daemon。
- K8s 的 desired state 存放在 **etcd**（服务化数据库）。cold pool 的 desired state 就是 `skill-deck.toml` 文件本身。

**分界线**：持续运行的 controller vs 一次性的 CLI 收敛。

> 参见 [`2026-05-07-cold-pool-evolutionary-rationale.md`](./2026-05-07-cold-pool-evolutionary-rationale.md) 第 4 节：K8s reconciliation 是心智模型，不是实现复制。

---

### 2.4 agentskill.sh / Vercel Skills CLI（技能平台）

**像**：都是技能生态系统；都从 remote 拉取技能；都有索引/发现机制。

**不像**：
- 技能平台是**封闭或半封闭的服务**。agentskill.sh 的 registry、Vercel 的 marketplace 是平台方控制的基础设施。
- cold pool 是**完全开放的文件系统**。任何 git repo 都可以是 skill，不需要"提交到平台"或"通过审核"。
- 平台锁定技能（你必须在平台注册才能被发现）。cold pool 遵循 **POSSE**（Publish on your Own Site, Syndicate Elsewhere）——技能的真身在任何 git host，cold pool 只是本地镜像。

**分界线**：平台锁定 vs POSSE 式自托管。

> 参见 ADR-20260517152850372、[`2026-05-05-multi-agent-posse-syndication.md`](./2026-05-05-multi-agent-posse-syndication.md)。

---

## 3. 核心设计意图：dev 感（developer-native）

以上所有对比的交集，指向同一个设计意图：

> **cold pool 不是"本地版 X"，它是一个 dev-native 的工作空间。**

一个开发者看 `~/.agents/skill-repos/github.com/owner/repo` 时：
- 他知道这是什么——普通的 git 仓库
- 他能 `cd` 进去，`git log`，`git diff`，手动改东西调试
- 他能 `rm -rf` 掉整个目录，再跑一次 `deck link`，系统会重新拉回来
- 他能直接 `git checkout` 到旧版本测试，不需要通知任何"系统"

这些行为在服务化系统里都会变成**违规操作**：
- gitea 说"不要直接操作裸仓库，走 API"
- npm 说"不要改 `node_modules`，用 `npm install`"
- K8s 说"不要直接改 pod，改 deployment manifest"

cold pool 的设计立场是**相反**的：文件系统是你的，git 仓库是你的，你可以随意操作。数据库（`.cold-pool-meta.db`）只是你放在抽屉里的**笔记本**——记录"上次 pull 的是哪个 commit"、"哪个 deck 引用了这个 skill"，方便查，但它不阻止你做任何事，也不声称自己是真源。

---

## 4. 反模式：如果把 cold pool 服务化，会失去什么

假设某天把 cold pool 加上 gitea-like 的服务层：

| Dev 感行为 | 服务化后的代价 |
|---|---|
| `cd ~/.agents/skill-repos/... && git pull` | "不要直接操作，请走 API" |
| `git checkout 旧版本` 临时回退 | 状态与数据库不一致，metadata 撒谎 |
| 手动 clone 一个实验性 fork | "未在系统中注册，不可见" |
| `rm -rf` 整个 cold pool 重建 | 数据库 orphan，需要 `repair` 操作 |
| 用 `git diff` 看 skill 改了什么 | 必须调 API 或读派生视图 |

这些不是"高级功能缺失"，而是**基础操作权的让渡**。cold pool 的设计拒绝这种让渡。

---

## 5. 与已有架构决策的关联

| 决策 | 如何支持"文件系统原生" |
|------|------------------------|
| **ADR-20260507021957847**（cold-pool 是 git 副作用唯一持有者） | git 操作是开发者直觉能理解的，不是被抽象层封装后的黑魔法 |
| **ADR-20260508230803515**（curator 只做本地 cold pool，不做 remote feed adapter） | 拒绝引入需要持续运行的服务层或远程依赖 |
| **ADR-20260517152850372**（POSSE / `also_link_to`） | 技能不锁在任何平台里，文件系统是最小的"自有站点" |
| **Smart Agent, Dumb Tool** | CLI 是纯函数、零副作用；复杂判断（包括"要不要更新 skill"）属于 agent，不属于工具 |

---

## 6. 一条简洁的判断标准

当你评估某个功能"是否属于 cold pool"时，可以用这个标准：

> **如果该功能需要引入持续运行的进程、网络端口、中心化数据库真源、或多用户协作模型——它不属于 cold pool，属于另一个独立系统。**

cold pool 可以**与**这类系统共存（例如，你可以用 gitea 托管 skill 的 upstream，用 npm 发布 starter 包），但 cold pool 本身不会**变成**这类系统。

---

## 交叉引用

- 演进理性（checksum + K8s 心智模型）：[`2026-05-07-cold-pool-evolutionary-rationale.md`](./2026-05-07-cold-pool-evolutionary-rationale.md)
- POSSE 模式：[`2026-05-05-multi-agent-posse-syndication.md`](./2026-05-05-multi-agent-posse-syndication.md)
- 文档站点认知拓扑 lesson：[`../02-research/2026-05-19-documentation-site-cognitive-topology-lesson.md`](../02-research/2026-05-19-documentation-site-cognitive-topology-lesson.md)
- reconcile-plan 中 `behind` 的预留 hook：`../../packages/lythoskill-cold-pool/src/reconcile-plan.ts`

---

> **Cold pool family**: 6 related pattern files. See index at [cold-pool-cli-boundary](./2026-05-07-cold-pool-cli-boundary.md) for full cross-reference list.
