# TASK-20260503154401905: Make README + CI surface red-green refactor + coverage visible

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created — user wants TDD red→green visibility for deck refactor |

## 背景与目标

CI 第一次绿之后(commit 7e81950, run 25273343292),用户说:"通过之后我们能看到重构和测试覆盖率 red-green 转起来"。意思是接下来 deck 3-axis 重构(ADR-20260503152000411 + 6 个子 task)会用 TDD 方式推,需要 README + CI 把"红→绿"循环和覆盖度做成可见的反馈,而不是仅一个 pass/fail badge。

同时今天读 README 发现几个明显残留:
- Tech Stack 表写 "pnpm workspaces"——违反 ADR-20260503170000000(Bun-only),实际 root 用 `bun install` + `bun.lock`
- Development 段 `pnpm install` / "pnpm ≥8.0" 同样错
- 测试入口 `bun packages/lythoskill-deck/test/runner.ts`(单 package),没有统一入口;CI 也只跑 cortex 一家,deck runner 完全没在 CI 里跑
- 没有 BDD scenario 目录索引,新加 scenario 不在 README 上下文里出现

## 需求详情

### 1. 修 README 现存事实错误(优先级最高)
- [ ] Tech Stack 表 "pnpm workspaces" → "Bun workspaces"
- [ ] Development 段:把 `pnpm install` → `bun install`,删 "pnpm ≥8.0" 前置条件
- [ ] 测试命令统一指向 root `bun test:all`(见下)
- [ ] README.zh.md 同步(若存在)

### 2. 统一测试入口
- [ ] root `package.json` 加 `"scripts": { "test:all": "bun packages/lythoskill-project-cortex/test/runner.ts && bun packages/lythoskill-deck/test/runner.ts" }`
- [ ] 后续 deck BDD scenarios 落地(TASK-20260503152006435)和 test-utils harness 自身测试,都挂这个 script
- [ ] CI workflow 改用 `bun run test:all` 替换两条独立 `bun ...` 行

### 3. CI workflow 把 deck runner 接进来
- [ ] `.github/workflows/test.yml` 加上 deck runner(直接进 `test:all` 后自动覆盖)
- [ ] deck runner 当前是 self-contained(不依赖 `@lythos/test-utils`),但若以后迁移要同步加 `workspace:*` 声明
- [ ] CI annotation 段干净(配合 TASK-20260503154354857 升 actions/checkout@v5)

### 4. Scenario 可见性(LLM-readable BDD as the spec)
- [ ] `packages/lythoskill-test-utils/SCENARIOS.md`:聚合所有 packages 的 scenario 文件路径 + 一行摘要,生成或手写
- [ ] README 加 "Testing" section:链接到 SCENARIOS.md,说明 BDD scenario 是契约(LLM 直读,不走 Cucumber)
- [ ] 链接 ADR-20260503152000411 + 6 个相关 task,把"重构在哪个阶段"暴露给读者

### 5. 覆盖度选型(讨论:不要急着上 line coverage)
- [ ] 默认推**scenario coverage**:跑前 N scenarios / 通过 M / 失败 K,直接打到 stdout + CI 摘要
  - bdd-runner 已经输出 "12/12 passed"——把这个数抽到 `scenarios.json`,供 README badge 消费
  - 对应 schema:`{"package": "...", "passed": N, "failed": K, "total": N+K, "scenarios": [...]}`
- [ ] **不上 line coverage**(暂)——理由:BDD runner 是自定义不是 `bun:test`,instrument 得改 runner;且 line coverage 对 LLM-driven BDD 价值低于 scenario 数量
- [ ] 后续若 deck 重构产生大量 unit test,再考虑加 `bun test --coverage`(独立 task)

### 6. shields.io endpoint badge(可选,不阻塞)
- [ ] 用 GitHub Pages 或 raw blob 暴露 `scenarios.json` → shields.io 动态 endpoint badge:`scenarios: 21 passing`
- [ ] README 替换 "test" 单 badge → "test 21 ✓ | red-green TDD"
- [ ] 如果嫌麻烦可以延后,先上 1-5

### 7. npm 包 README sweep(大重构落地后扫一遍)
- [ ] deck 3-axis 重构每个子 task 合入后,核对 `packages/lythoskill-deck/README.md` 命令表是否还对
  - `update` → `refresh`(deprecation 文字也要在 README 里出现一次)
  - `add` 新增 `--as` / `--type` 选项
  - 新命令 `remove` / `prune` 加进表
  - `link` 行为说明加上 alias collision 提示
- [ ] `packages/lythoskill-project-cortex/README.md`:若 BDD scenario 数变化,同步 scenario 计数 / 链接
- [ ] 其余 8 个包的 README:扫一眼有没有引用 deck 命令字样,改名版本要补上
- [ ] 这个 sweep 是 release 前必跑步骤——npm 上展示给用户的就是 README,跟 CLI 现状漂移会直接误导
- [ ] 节奏:每个重构子 task 合并后顺手改对应包 README(同 PR),不要堆到 release 前一次扫

### 8. CLI BDD vs Agent BDD 边界明确(写进 README + SCENARIOS.md)
- [ ] README "Testing" section 显式区分三类:
  - **Unit** — Vitest/标准框架,跑函数级,CI 全跑
  - **CLI integration BDD** — test-utils 自定义 runner,跑 CLI 副作用是否符合声明,CI 全跑
  - **Agent BDD** — 同 runner + 真 LLM agent,验证 agent 读 SKILL.md 后行为是否符合预期,**CI 跑不了**
- [ ] SCENARIOS.md 里每条 scenario 标注属于哪一类(默认 CLI integration,标注哪些是 agent-required)
- [ ] coverage 描述要诚实:CI 上的"21/21 passing" 仅指 CLI integration 那一档,不要把 agent BDD 进度算进同一个 badge
- [ ] 当前(2026-05-03)repo 里 0 个 agent BDD scenario;只要写,就放在 `*.agent.md` 之类的命名约定下,runner 跑前判断环境跳过即可
- [ ] 理由(用户原话):"agent bdd 在没有 agent 的环境根本无法测试 …… 因为靠推理的"——验证源是 LLM 推理,CI 没 LLM 就没验证源

## 技术方案

### 新文件
- `packages/lythoskill-test-utils/SCENARIOS.md`(全 monorepo scenario 索引)
- `scripts/aggregate-scenarios.ts`(可选:从两个 runner 输出收 stats → `scenarios.json`)

### 修改文件
- `README.md`:Tech Stack pnpm → Bun;Development pnpm → bun;新增 "Testing" section
- `package.json`(root):加 `scripts.test:all`
- `.github/workflows/test.yml`:用 `bun run test:all`

### 红绿可见的具体形态
- 提交时 husky pre-commit 跑 `bun run test:all`(若没已经在 cortex hook 里),失败直接拦
- CI run 状态对应 commit 的"红/绿";README 上 commit hash 链接 → run 链接,显式映射 TDD 循环
- daily/YYYY-MM-DD.md 在重构推进时记 "red after slice N → green after fix M",形成 narrative

## 验收标准
- [ ] README 没有任何 `pnpm` 字样(除非显式 deprecation note)
- [ ] `bun run test:all` 在 root 跑得通,覆盖 cortex + deck 两个 runner
- [ ] CI 用 `bun run test:all`,所有 BDD scenario 都跑
- [ ] `SCENARIOS.md` 列出当前 12 个 cortex scenarios + 9 个 deck scenarios(后者来自 TASK-20260503152006435)
- [ ] README 新 "Testing" section 解释 BDD = LLM-readable 契约
- [ ] (可选)scenario count badge 上线

## 进度记录
<!-- 执行时更新,带时间戳 -->

## 关联文件
- 修改: `README.md`、`README.zh.md`(若存在)、`package.json`(root)、`.github/workflows/test.yml`
- 新增: `packages/lythoskill-test-utils/SCENARIOS.md`、(可选)`scripts/aggregate-scenarios.ts`、(可选)`scenarios.json`

## Git 提交信息建议
```
docs(readme): unify Bun stack + surface BDD scenario coverage (TASK-20260503154401905)

- Tech Stack / Development sections: pnpm → Bun (matches ADR-20260503170000000)
- Add root `test:all` script; CI uses it (covers cortex + deck runners)
- New Testing section + SCENARIOS.md as LLM-readable contract index
- Wire deck BDD runner into CI (was missing pre-refactor)
- Set up red-green visibility for upcoming deck 3-axis refactor
```

## 备注
- 与 ADR-20260503152000411(deck 重构)的 TDD 推进强耦合:重构开始前先把红绿轨道铺好
- 与 TASK-20260503152006435(deck BDD scenarios)有交叉:那个 task 写新 scenario,本 task 负责把 scenario 接进 CI + 上 README
- coverage 不一上来就上 line coverage;先 scenario coverage 实证够不够用
- 不要再为 monorepo 引入新的运行时(Vitest/Jest 都不要)——bdd-runner 自定义足够
