# TASK-20260909155425926: CLI adapter hardening — symlink tiers, hazard classes, per-run dirs

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created from wedge-path research synthesis (P2) |
| completed | 2026-09-09 | Closed via trailer |

## Background & Goals

The 2026-09-09 CLI skill-dir survey (16 agents, every claim sourced) gives deck's
fan-out layer its first independent audit. Headline: `.claude/skills` +
`.agents/skills` are the highest-coverage targets (repo defaults already align), but
symlink guarantees split into docs-level vs issue-level-hazard tiers, and one
confirmed deletion hazard (Goose #11600 — removing a linked project skill can
recursively delete the symlink target = cold-pool content). deck link's projection
design is validated; the adapter POLICY layer needs tiering to match reality.

Source: cortex/wiki/02-research/2026-09-09-wedge-path-research-synthesis.md §B.

## Requirements

- [x] Adapter registry: per-CLI record of symlink guarantee tier (docs / issue /
      hazard), fan-out targets, per-run set-switching mechanism, per-role scoping
      shape. Data, not docs prose — link.ts `also_link_to` strategy becomes data.
- [x] Hazard-class handling:
      - Goose unlink special-case (#11600: verify symlink before rm; never recurse
        into target)
      - Cline = copy/rsync target (`.clinerules/` symlinks confirmed not followed;
        skills symlinks unverified)
      - opencode: no double-fan to same pool via two scanned roots (duplicate-name
        WARN #46327); guarantee acyclic absolute symlinks (cycle = ENAMETOOLONG
        crash #45961)
      - Codex: 5 open symlink issues — keep symlinks valid; note name-loss risk
- [x] Per-run mode: support Kimi `--skills-dir` / `extra_skill_dirs` and Crush
      `option skill-path` — side-deck without relinking (zero-projection path)
- [x] Pinned-version smoke: deck link smoke test against docs-tier CLIs (Claude /
      Roo / Gemini / Codex-AGENTS.md) enters the probe discipline (round-2
      adapter depreciation discipline item c)

## Technical Approach

- Registry as a typed data file consumed by link.ts (avoid synonymous-command trap:
  name by target state, per ADR-20260509144134332)
- Goose unlink fix is correctness-critical (data loss), not UX — prioritize within
  the card; add dormancy test (rm path on Goose target must not touch cold pool)
- Per-run mode = render CLI args/config from deck state; no relink side effects
- Hazards sourced per-CLI in the registry; re-survey cadence = quarterly (P6 watch)

## Acceptance Criteria

- [x] Registry file exists, covers all 16 surveyed CLIs, each row has source URL
      and verification date
- [x] Goose unlink hazard has a test (dormancy: symlinked target survives unlink)
- [x] Kimi/Crush per-run paths render from deck state with a smoke test
- [x] link.ts behavior unchanged for docs-tier CLIs (no regression)

## Progress Log

- 2026-09-09: card created from synthesis P2.
- 2026-09-09: implemented. `adapter-registry.ts` (16 rows, typed, self-check via
  `registryProblems()`), `safe-remove.ts` (unlink-only symlink removal — Goose
  #11600 防线), `adapter-policy.ts` (dup-scan #46327 + data-loss triggerDirs),
  `per-run.ts` (`deck per-run <cli>` — Kimi/Crush zero-projection render).
  link.ts: cycle guard before clear-site (#45961), lstat-based removal, adapter
  warnings block (zero on default deck — dormancy-tested). Bonus fix: remove.ts
  existsSync leak of broken symlinks. 16th registry row (Qwen Code) restored by
  zero-context verification agent after the original survey report was lost
  unpersisted; all issue URLs re-verified by that agent. Commits: c8ebcc76 +
  2686e0d4 (ZK fold-back). Tests 213 pass / 0 fail.
- 2026-09-09: **ZK re-trial 8.5/10 PASS** (gate ≥7; zero-context agent,
  /tmp/arena-p2-adapter-retrial/, adversarial suite of 10, 11/11 URLs
  re-verified, 212 tests independently reproduced, no data-loss path). All 5
  findings fixed same-session in 2686e0d4: .clinerules-as-file EEXIST guard
  ([warning] defect), cline #3092 closed-label, crush optList note, opencode
  unverifiable claim softened, dup-scan advice corrected.

## Related Files
- Modified: packages/lythoskill-deck/src/link.ts, remove.ts, to-symlink-snapshot.ts, cli.ts, README.md, skill/SKILL.md
- Added: packages/lythoskill-deck/src/adapter-registry.ts (+test), adapter-policy.ts (+test), safe-remove.ts (+test), per-run.ts (+test), adapter-smoke.test.ts

## Git Commit Message
```
fix(deck): adapter policy tiers from 16-CLI survey — Goose unlink hazard, per-run dirs (TASK-20260909155425926)

- adapter registry: guarantee tier + hazard flags + switching mechanism per CLI
- Goose unlink special-case (#11600 recursive-delete guard) + dormancy test
- Kimi --skills-dir / Crush skill-path per-run rendering (zero-projection path)
```

## Notes

### 已知未修(2026-09-10 辩论确认)

2026-09-10 的 inbox-debate 试验(challenge 式质询,`playground/2026-09-10-inbox-debate/`)
对本卡全部宣称做了逐条复核。sober judge 终裁 = **附条件维持**,缺陷清单分三态:
**A = 已修** / **B = 已证实的事实且未修** / **C = 未验证方案**。

本卡在**收卡时点**成立,其中若干条**次日被部分证伪**。按 judge 原话:
> `completed` 的成色 = 收卡时点成立、次日被部分证伪 —— **注记比改状态诚实,`completed` 保留**。

故状态**不动**(`completed`),正文**不改**(项目纪律:已收卡不重写),错在下面逐条注明。

**本卡正文中已被证伪/需要限定的话(以本节为准)**

| 卡面 | 原话 | 2026-09-10 复核结论 |
|---|---|---|
| `:64` | `safe-remove.ts`(unlink-only 删除 — **Goose #11600 防线**) | **措辞夸大**。judge 实查父 commit:旧代码**无可达的**"递归进 symlink 目标"路径 —— 没有被挡住的实际漏洞。真实价值 = 显式不变式 + 断链修复 + 防未来回退 |
| `:71` | 「Tests **213 pass / 0 fail**」 | **裸值 + 缺环境**。这是**条件值**,非不变量:canonical 调用下为 `213 pass / 1 skip / 544 expect / 16 files` @ Bun 1.3.11 / macOS;`214/0/0` 仅在 git spawn 探针成功时成立。引用须带环境 |
| Progress Log | `212 tests **independently** reproduced` / `ZK re-trial 8.5/10` | **「独立」混淆两层**。知识独立(prompt 零上下文)→ **达成**;编排独立(被评方之外的方验证)→ **未达成**(折入是同 session 同 agent 做的)。原文两处「独立」读起来像后者,实际只有前者 |
| Progress Log | 本卡与 daily 谓「六处删除点审计无 data-loss 路径」 | **次日被部分证伪**。见下一节 |
| 正文 | `adapter-registry.ts` / `adapter-policy.ts` / `CliAdapter` 等 | **已改名**(2026-09-10):`cli-layout.ts` / `layout-policy.ts` / `CliLayout` 等。原因 = 与 `@lythos/agent-adapter` 的 `registry.ts` 撞名且无交叉文档(debate B14/C4/C5),见下 |

**删除边界被证伪(2026-09-10 新卡收口)**

`TASK-20260910111600389`(commit `e2edc52e`,ADR-20260910112404500)查明:本卡交付的 fan-out
删除用的是**目录包容**(containment)边界,而非**归属**(ownership)边界 ——
当 `also_link_to` 指向**项目外**目录(另一个项目的 `.claude/skills`、用户的全局 CLI 配置)时,
可递归删掉 deck **从未创建过**的东西。本卡"六处删除点审计无 data-loss 路径"的结论,
对**默认 deck 工作集**成立,对 **fan-out 目标**不成立 —— 而 fan-out 正是本卡的交付内容;
且那次审计的范围本身不全,2026-09-10 的全仓复扫又在 `add.ts:332` 找到一处未覆盖的删除。
已改为 k8s `ownerReferences` 式归属判定:证明不了"是我建的"就不删,改为 warn + 给 `rm -r` 建议。
**另**:本卡同时退役了备份路径(`--no-backup` 保留但 inert)—— 归档不可解(含 `../` 前缀的 tar 成员),
"假的安全承诺"与假 source 同类。

### Follow-up

- **未修项(judge 判 B 类)全部落到** `cortex/tasks/01-backlog/TASK-20260910110545092-cli-layout-follow-ups-unfixed-b-class-findings-from-2026-09-10-inbox-debate.md`
  —— 含 B2/B3/B4/B5/B6/B8/B9/B10/B11/B12/B13 + 取证未留痕 + 两条 owner 裁决项(B17/B18)。
- **命名与轴归属** → `cortex/adr/02-accepted/ADR-20260910113131220-player-axis-is-open-registration-cli-layout-axis-is-closed-sourced-data-two-axes-never-merge.md`
- **删除边界** → `cortex/adr/02-accepted/ADR-20260910112404500-deck-removal-boundary-is-ownership-not-directory-containment-k8s-ownerreferences.md`
- **本卡的独立验证证据只在 `/tmp/arena-p2-adapter-retrial/`,未入仓** —— 仓里
  `showcase/` + `reproduce.sh` 协议(ADR-20260518024500631)本批**零套用**。随重启即失。
- **`also-link-to-bdd/reproduce.sh` 与本卡的新归属语义相冲**(其 PHASE 2 仍断言
  "所有目标里 skill-a 都不存在"),且从未产出 verdict 产物 → 见 follow-up 卡 B19。
