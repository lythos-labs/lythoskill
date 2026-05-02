# ADR-20260424113352614: project-scribe remains independent with optional skill cooperation

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created |
| accepted | 2026-04-24 | Approved by user |

## 背景

lythoskill 项目治理体系包含三个相互关联的 skill：

- **project-cortex**: GTD 项目治理（ADR/Epic/Task/Wiki）
- **project-scribe**: Session 记忆存档（Handoff/Pitfalls/Daily）
- **project-onboarding**: 项目入职复盘（分层加载 Handoff → 文件探索）

在演进过程中出现两个设计问题：
1. scribe 的内容和 cortex 的 task/epic 在任务链上关联紧密，是否应合并到 cortex？
2. 三个 skill 是否有共享基础设施的需求（如 timestamp ID 生成、front matter 解析）？

## 决策驱动

- "进度游戏化心智"：把项目治理看作 RPG —— cortex 是主线任务系统，scribe 是存档系统，onboarding 是加载界面
- 松耦合设计：每个 skill 可独立使用，也可组合使用，不强制依赖
- 运维确定性：shell 行为无论挪到哪里都稳定（参考 `--workdir` 的设计原则）

## 选项

### 方案A：scribe 合并到 cortex

**优点**:
- 减少 skill 数量，降低认知负担
- handoff 和 task 在同一个体系内，引用更直接
- 统一模板和状态机

**缺点**:
- scribe 的 session 级别生命周期与 cortex 的项目级别生命周期冲突
- scribe 的自由格式会被 cortex 的严格模板约束，丧失"速记"性质
- onboarding 失去明确的读取对象（它读的是 scribe 的 handoff，不是 cortex 的 task）
- 破坏 CQRS 读写分离设计
- 三个 skill 的边界模糊，silent blend 风险增加

### 方案B：scribe 保持独立，skill 间采用"可选联动"

**优点**:
- 边界清晰：cortex（项目治理）↔ scribe（session 存档）↔ onboarding（session 加载）
- 每个 skill 可独立安装使用
- scribe 的自由格式不受 cortex 模板约束
- CQRS 读写分离得以保持
- agent 自己发现联动关系，不强迫

**缺点**:
- 三个 skill 稍多
- 需要维护 skill 间的协作描述（在 SKILL.md 中说明）

## 决策

**选择**: 方案B

**原因**:

1. **生命周期不匹配**：cortex 是项目级别、跨 session 的；scribe 是 session 级别、单次产出的。合并会导致状态机复杂度爆炸。

2. **格式自由度**：cortex 的 ADR/Epic/Task 有严格模板和状态目录；scribe 的 Handoff 是自由 markdown。合并会牺牲 scribe 的灵活性。

3. **CQRS 价值**：scribe（写）+ onboarding（读）形成自然的读写分离。合并到 cortex 后，这个清晰的对称关系消失。

4. **松耦合优先**：用户可能只安装 cortex（不需要 session 交接），或只安装 scribe（小型项目不需要 GTD 治理）。强迫联动违背 lythoskill 的"按需组装"哲学。

5. **命名已贴切**：scribe = 书记员，准确描述"负责记录的人"的角色。比 describe（动词，像只读）更贴切。

## 影响

- 正面:
  - 三个 skill 边界清晰，silent blend 风险降低
  - 用户可按需组装：小项目只用 scribe，大项目 cortex + scribe + onboarding
  - SKILL.md 中的"相关 Skill"章节帮助 agent 自然发现联动关系

- 负面:
  - 需要维护三份 SKILL.md 中的协作描述
  - 新用户可能需要更多时间理解三者的关系

- 后续:
  - 在 `cortex/wiki/01-patterns/` 中增加"项目治理工具开发公约"，约定 timestamp ID 格式、front matter 字段规范、目录前缀约定
  - 采用"约定优于库"策略：不提取共享 npm 包，而是用文档约定保持三包一致

## 相关

- 关联 ADR: ADR-20260423101938000-thin-skill-pattern.md（thin skill 模式基础）
- 关联 Epic:
- 关联 Skill: project-cortex, project-scribe, project-onboarding
