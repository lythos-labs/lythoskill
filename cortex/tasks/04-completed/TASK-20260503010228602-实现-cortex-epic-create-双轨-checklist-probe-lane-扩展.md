# TASK-20260503010228602: 实现 cortex epic create 双轨 + checklist + probe lane 扩展

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |
| in-progress | 2026-05-03 | Started |
| review | 2026-05-03 | Deliverables committed |
| completed | 2026-05-03 | Done |

## 背景与目标

ADR-20260503003315478 选项 E 的核心机制实现。`cortex epic create` 时:

- **Hard**:lane 检查(main / emergency 各 ≤ 1)
- **Soft**:5 题 checklist
- 同时扩展 `cortex probe` 检查 lane 超额

把 epic 创建从"agent 自觉"变为 admission control 工具不变量。

## ⚠️ 仓库现状 vs Spec 冲突点(T1 经验,必读)

T1 实现时 subagent 在 spec 与仓库现状冲突时(spec 说 `epic done → 02-done/`,仓库已有 `02-archived/` 占用)**自己发明了 data migration**(把 archived 改到 `04-archived/`),没报告就动手 —— 虽然结果可接受,但破坏了"task card = 完整 bootloader"假设。T2 已知 3 个冲突点,**按以下处理**(如发现新冲突点 → **先报告再动手**)。

### 冲突 1: 现有 7 个 active epic 没有 `lane` 字段

仓库现状:`cortex/epics/01-active/` 下 7 个 epic(EPIC-20260423185732845 / 429234732479 / 430011158241 / 430012504755 / 430174751856 / 501091716524 / 503010218940),都没有 `lane` 字段。

**处理**:全部回填 `lane: main`。理由:都是当前项目工作,无"紧急轨"语义;一次性回填后 probe 不会持续 warn。

### 冲突 2: 现有 epics 没有 YAML frontmatter

仓库现状:epics 用 markdown 表格记 Status History,没有 YAML frontmatter 块。

**处理**:新字段用 YAML frontmatter 写在文件顶部,格式严格如下:

```yaml
---
lane: main | emergency
checklist_completed: true | false
checklist_skipped_reason: <optional string>
lane_override_reason: <optional string>
---
```

现有 Status History markdown 表格保留不动,frontmatter 加在 `# EPIC-XXX:` 标题之前。

### 冲突 3: `packages/lythoskill-project-cortex/templates/` 目录不存在

仓库现状:`templates/` 整个目录不存在,现有 cli.ts 用硬编码字符串生成 epic 文件。

**处理**:新建 `packages/lythoskill-project-cortex/templates/epic.md`,内容 = 现有 cli.ts 硬编码字符串抽出 + 顶部 YAML frontmatter 占位 + 顶部 callout(见下)。CLI 改为读模板替换变量。模板顶部 callout(从 ADR-B 抽):

```markdown
> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。
```

### 通用规则:遇到未列出的冲突点

如果发现 spec 与仓库现状还有别的不一致,**不要自己发明 migration**:
1. 在本卡 "进度记录" 段追加 note(或新写一个 note 文件,放在 `cortex/tasks/02-in-progress/` 内)
2. 报告中明确说明:"我看到 X 与 Y 冲突,我建议方案 Z,但没动手,等用户确认"

完成交付前用户会读你的报告 + working tree 状态;**报告 = 交付的一部分,不只是 working tree 干净就完事**。

## 需求详情

- [ ] `cortex epic "<title>" --lane main|emergency` — 必填,缺省时报错引导
- [ ] Lane-full 拒绝:目标 lane 已有 active epic → 阻断,提示四选一(完成 / 挂起 / 归档 / 重分类为现有 epic 的 task)
- [ ] `--override "<reason>"` 应急口:lane 满时绕过,理由记入 epic frontmatter `lane_override_reason`
- [ ] 5 题 checklist(题目见 ADR-B 方案 E):outcome 明确 / 可结案性 / 1~3 周尺寸 / 不是 task / 不是 ADR
- [ ] `--skip-checklist [reason]` 跳过,reason 记入 frontmatter
- [ ] Epic frontmatter 新字段:`lane`、`checklist_completed`、`checklist_skipped_reason`(可选)、`lane_override_reason`(可选)
- [ ] `cortex probe` 扩展:扫描 `01-active/` 下 epic,统计 lane 数;main > 1 或 emergency > 1 → warn
- [ ] 更新 epic 模板顶部加 callout:"Epic 是什么 / 不是什么 + Workflowy focus 心智 + 双轨说明"

## 技术方案

- 实现位置:`packages/lythoskill-project-cortex/src/cli.ts`(epic 子命令扩展)
- 模板:若已有 `templates/epic.md` 修改;否则先抽出为模板再用
- Checklist prompt:简单 readline 交互;非 TTY 场景 fallback 到 `--skip-checklist` warn
- Frontmatter:可继续用现有 Status History + 在文件顶部加 YAML 块兼容
- Probe:复用现有 probe 入口,加 lane 统计子检查

## 验收标准

- [ ] `cortex epic "X" --lane main` 在 main lane 已有 active epic 时拒绝
- [ ] `cortex epic "X" --lane main --override "reason"` 通过,frontmatter 含 reason
- [ ] checklist 5 题 prompt 可创建;`--skip-checklist "reason"` 也可,frontmatter 区分
- [ ] `cortex probe` 在主动构造 2 个 main lane epic 的 fixture 上输出 warn
- [ ] 已有 `EPIC-20260503010218940` 加 `lane: main` 字段后 probe 不报警

## 进度记录

(执行时追加)

## 关联文件

- 修改: `packages/lythoskill-project-cortex/src/cli.ts`
- 修改/新增: `packages/lythoskill-project-cortex/templates/epic.md`
- 修改: `cortex/epics/01-active/EPIC-20260503010218940-...md`(回填 lane: main 字段)

## 引用

- ADR: ADR-20260503003315478(方案 E + 决策驱动 + 决策原因 1-3 + 影响段)
- Epic: EPIC-20260503010218940(主题B)
- Sibling: TASK-20260503010227902(T1 — 状态机命令前置)

## Git 提交信息建议

```
feat(cortex): epic create dual-lane + checklist + probe lane check (TASK-20260503010228602)

Closes: TASK-20260503010228602
```

## 备注

- 不依赖 hook(T3/T4),但 T5 的文档需要等 lane / checklist UX 稳定后再写
