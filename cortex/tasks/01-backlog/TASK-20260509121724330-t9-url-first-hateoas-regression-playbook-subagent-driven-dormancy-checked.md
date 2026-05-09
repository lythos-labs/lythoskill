# TASK-20260509121724330: T9 — URL-first HATEOAS regression playbook (subagent-driven, dormancy-checked)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-09 | Created — v0.9.43 baseline 已 7/7 PASS,待 T7/T8 应用 |

## 背景与目标

v0.9.43 是 URL-first doc shift 的版本: 所有 user-facing 例子(error / help / README)从本地路径迁到 GitHub raw URL,并加 `ghfast.top` 镜像作为受限网络下的 fetch 失败兜底。

需要验证两件事:
1. **正向**: 健康网络下,所有 URL-first 入口(--help / 无参 error / 端到端)工作,引导清晰
2. **负向(此次新增)**: fallback 提示(`ghfast.top` 镜像)在健康网络下应**不出现** — 不能误触

playbook 同时适用于 T7 (project-cortex HATEOAS) 与 T8 (general catch cleanup) 验证 — 替换 URL/命令即可复用。

## 需求详情
- [x] 7 个场景在隔离 worktree 由 general-purpose subagent 执行
- [x] 每场景输出 ✅/❌/⚠️ + 一行可验证证据
- [x] S6 增加 grep 验证 `ghfast|mirror|proxy|fallback` 在 stderr 中 0 匹配(dormancy 属性测试)
- [x] 报告与 v0.9.39 baseline (T6) 对照差异

## 测试场景与结果(v0.9.43,健康网络)

| # | 命令(简) | 期望 | 状态 | 证据 |
|---|---------|------|------|------|
| S1 | `bunx @lythos/skill-arena@0.9.43 --help` | 列出 single + vs | ✅ | Examples section URL 干净,无本地路径 |
| S2 | `single --help` | 含 raw URL,无本地路径 | ✅ | error-as-help: `--deck <path\|url> is required ... raw.githubusercontent.com/.../scout.toml` |
| S3 | `vs --help` | 含 curl + URL | ✅ | `curl -fsSL https://raw.githubusercontent.com/.../arena.toml > arena.toml` |
| S4 | `single`(无参) | HATEOAS error 指向 raw URL | ✅ | error 含 `Example: --deck https://raw.githubusercontent.com/.../scout.toml` |
| S5 | `vs`(无参) | HATEOAS error: curl + URL | ✅ | error 含 curl + edit + run 三步引导 |
| S6 | `single --deck <URL> --brief "hi" --timeout 60000` | 端到端 + **proxy hint dormant** | ✅ | `📥 Fetching` → `✅ Agent complete (6075ms)` → `🏆 Verdict: PASS` exit 0;grep `ghfast\|mirror\|proxy\|fallback` 返回 **0 匹配** |
| S7 | `vs --config <URL> --dry-run` | 解析 arena.toml | ✅ | 3 cells × 3 sides plan 输出正常 |
| **S8** | **任意 single error / --help** | **同时含 URL 和本地路径例子(URL-first ≠ URL-only)** | **✅ 验证通过** | **subagent D1-D4 全部 ✅: --help / single 无参 / single 无 task/brief / Task file not found 四个表面均同时含 `https://raw.githubusercontent.com/...` 和 `./examples/decks/...` 两类例子** |

副作用记录: `single` 把 fetched deck 写到 `<cwd>/arena-deck.toml` 并在退出前清理,worktree 无残留 diff。

## 技术方案

### 执行模型
- 启动: `Agent` tool, `subagent_type: "general-purpose"`, `isolation: "worktree"`
- worktree 隔离: 避免污染父 working tree(本次 lock-step bump in-flight,worktree 必需)
- prompt 显式要求结构化报告: 每场景 ✅/❌/⚠️ + 一行 stdout/stderr 证据,而非自由叙述
- 命令版本固定 `@0.9.43`: 绕过 bunx 缓存对最新版的解析延迟(handoff 已记录此坑)

### 负向属性测试(此次新增模式)
- 任何"故障 fallback hint"都需配套"正常路径下 dormant"测试
- 实现: subagent 在 happy path 的 stderr 里 grep 关键词,要求 0 匹配
- 反例: hint 永远显示 → 用户被噪音淹没,真正的故障被掩盖
- 通用化: 此模式可适用于任何 fallback / degraded-mode / retry-with-mirror 类提示

### URL-first 审计维度(可移植 T7/T8)
1. error message 含可 fetch URL,而非 `./local/path`
2. --help 例子含 URL
3. 用户从 error 消息复制的 URL 能直接跑通 happy path
4. fallback hint(代理 / 镜像 / 重试)在正常路径下 dormant
5. **URL-first ≠ URL-only**: error/help 同时给本地路径例子(已有本地文件的用户不被引导误读为"URL 必需"); 见 memory `feedback_url_first_not_url_only.md`

## 验收标准
- [x] v0.9.43 arena: 7/7 PASS — 健康网络
- [x] dormancy: ghfast.top hint 不误触 — 健康网络 grep 0 匹配
- [x] **dual-coverage**: error/help 同时含 URL 和本地路径例子(本次 cli.ts:65-79 / 97-113 / 166-172 已修)
- [ ] T7 完成后,playbook 适配 cortex CLI 命令(替换 URL 为 cortex 例子)
- [ ] T8 完成后,playbook 覆盖所有 `❌ ${e.message}` catch 路径

## 应用扩展

### T7 (project-cortex HATEOAS) 验证清单(待 T7 实施后跑)
- 改 S1-S5 到 cortex 命令: `task` / `epic` / `adr` / `wiki` / `index`
- 错误场景: 无参数 / 无效 lane / 缺少必填字段 / 重复 ID
- 期望: 每条 error 引用 `cortex/INDEX.md` 或具体 wiki/adr 路径

### T8 (general catch cleanup) 验证清单(待 T8 实施后跑)
- grep 所有 `catch` 块中 `❌ ${e.message}` 或 `console.error(e)` 模式
- 每个 catch 路径制造可重现失败,验证 error 含 HATEOAS 引导
- 覆盖范围: arena / cortex / creator / curator / deck / cold-pool / agent-adapter

## 进度记录

- 2026-05-09 12:17: 任务创建
- 2026-05-09 ~13:00: subagent 在隔离 worktree 验证 v0.9.43,7/7 PASS,dormancy 通过 grep 在 S6 stderr 验证 0 匹配,与 v0.9.39 baseline (T6) 一致 + 新增 dormancy 维度
- 2026-05-09: 新增 S8 dual-coverage 维度(URL-first ≠ URL-only);user feedback "如果你已经有的确可以用,help 里明确说明支持本地路径。但是如果你为了体验可以直接 url 感受 — 这样是最好的";cli.ts 三处 error/help 增加双例子(URL + 本地);106/106 tests pass
- 2026-05-09: subagent (D1-D4) 全部 ✅ 验证 dual-coverage,4 个用户面 surface 都同时含 URL 和本地路径例子;附带发现: `single --task <bad path> --deck <URL>` 会先 fetch URL 再检查 task 文件存在性(浪费一次网络调用),建议未来重排为 args validation → fetch,但不阻塞 T9 完成
- 2026-05-09: 突击修复上一条发现 — 把 `--task` 文件存在性 + frontmatter 校验提前到 URL fetch 之前(cli.ts: `singleRun` 早期 `let resolvedTaskPath` 块);URL/本地区分仍沿用 `startsWith('http://')` 简单判断;同时清理 2 处冗余的 `await import('node:fs')` / `await import('node:path')`(静态 import 已覆盖,且会让早期校验代码触发 TDZ);106/0 tests pass;手测 `--task /tmp/nonexistent.agent.md --deck https://...` 不再触发 `📥 Fetching`,直接输出 task-not-found
- 2026-05-09: lock-step bump 0.9.43 → 0.9.44 publish 到 npm,4 commit push 到 origin/main(`5654a83` v0.9.43 catch-up · `086c129` feat(arena) · `f373ff4` docs(cortex) T9 · `0b03144` chore(release) v0.9.44)
- 2026-05-09: subagent 隔离 worktree 跑 v0.9.44 全 8 场景(S1-S7 baseline + S8 早期 --task 校验), **All ✅**:bunx 正确解析 0.9.44(122 deps fresh-extracted);S2/S4/S8 dual-coverage(URL + 本地)同时存在;S6 dormancy(`ghfast|mirror|proxy|fallback`)0 匹配;S8 bad task path 不触发 `📥 Fetching`(0 匹配);S6 端到端 6882ms PASS

## 关联文件

- 参考: `daily/2026-05-09.md` §3 自测 loop 结果(本次执行的简版记录)
- 参考: `TASK-20260509104331469` (T6) — v0.9.39 baseline 7 场景,本卡是其在 URL-first 维度的延续
- 修改: 无
- 新增: 无(playbook 文档化即是产物)

## Git 提交信息建议
```
docs(cortex): T9 — URL-first HATEOAS regression playbook + v0.9.43 baseline (TASK-20260509121724330)

- 7-scenario coverage: --help / no-args HATEOAS / end-to-end URL fetch
- New pattern: dormancy property test (S6 grep confirms proxy hint absent on healthy net)
- Subagent + isolated worktree execution model
- Reusable for T7 (cortex HATEOAS) and T8 (general catch) verification
```

## 备注

- arena.toml 的 `task` 字段已锁为文件路径(per T6 修复),inline 描述已废弃 — playbook 不测 inline path
- 镜像代理目前硬编码 `ghfast.top`,后续提取为配置 / env 后,playbook 需扩展"代理生效时实际返回内容"的正向 fallback 测试(目前只测了 dormancy 单边)
- subagent 报告需"结构化 + 证据可验证",自由叙述会让 false positive 难发现 — 见 memory `feedback_validate_companion_pattern`
