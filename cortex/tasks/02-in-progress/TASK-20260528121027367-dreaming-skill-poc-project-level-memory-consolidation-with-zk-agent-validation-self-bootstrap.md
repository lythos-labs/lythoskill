# TASK-20260528121027367: Dreaming skill PoC — project-level memory consolidation with ZK agent validation, self-bootstrap

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created — EPIC T6. ZK validation is our innovation over OpenClaw's dreaming |
| in-progress | 2026-05-28 | Started |

## 背景与目标

### 问题

1000+ commits 的文档积累产生了恶性循环：

1. Agent 读旧文档 → 产生过时假设
2. Agent 写新文档时携带旧假设 → 产生漂移
3. 下一个 agent 读新文档 + 旧文档 → 上下文爆炸，噪音 > 信号
4. Context 压力迫使 agent scan 而非 read → "scan → 学不到位 → 瞎写"

**OpenClaw/Hermes 的 dreaming 机制**（已在 wiki 中有研究：`2026-05-03-hermes-self-evolving-skill-field-notes.md`）解决了 "自动归档 + 内存整理"，但有一个盲区：**做梦完没有验证层**。做梦输出可能自洽但对外部 agent 不可读。

### Lythoskill 的创新

**Dream → ZK validate → revise 闭环**。做梦 skill 产出 SSOT → 零知识 subagent 验证可读性 → ZK agent 误解的内容需要 revision。今天的 session 验证了这个模式有效（两次 ZK 验证：path convention 理解、thin-skill 理解）。

### 目标

- 把 Hermes Curator 的 dreaming 模式 + ZK agent validation 层封装为 project-level skill
- 产出 `cortex/wiki/04-ssot/` 目录——当前有效状态的 single source of truth
- Self-bootstrap：lythoskill 治理自己的文档（吃自己的狗粮）
- `cortex probe` -> dreaming -> ZK validate -> revise -> `cortex probe` 再次确认

## 需求详情

### Phase 1 — 概念设计

- [ ] 设计 dreaming skill 的三阶段流程：
  1. **Scan**: 扫描 wiki/adr/daily → 识别过时内容、重复内容、矛盾内容
  2. **Consolidate**: 提取当前有效状态 → 写入 `cortex/wiki/04-ssot/` 
  3. **ZK Validate**: 零知识 subagent 读 SSOT → 自我报告理解 → 误解的内容标记为需 revision
- [ ] 和 OpenClaw/Hermes dreaming 的差异点写清楚
- [ ] SKILL.md draft 完成

### Phase 2 — 首次试运行

- [ ] 手动执行 dreaming 流程一次（agent orchestrated，不需要 CLI）
- [ ] 产出第一批 SSOT 文档到 `cortex/wiki/04-ssot/`
- [ ] ZK agent 验证 → 记录可读性评估

### Phase 3 — 集成

- [ ] Dreaming 输出和 `cortex probe` 的联动
- [ ] 更新 AGENTS.md onboarding order：SSOT 优先于 wiki/adr 全量扫描

## 技术方案

### 参考资产

| 来源 | 内容 |
|------|------|
| `cortex/wiki/03-lessons/2026-05-03-hermes-self-evolving-skill-field-notes.md` | Hermes Curator dreaming 机制（两阶段：确定性过渡 + LLM 审查） |
| `cortex/wiki/03-lessons/2026-05-03-hermes-skill-governance-real-pain-points.md` | Hermes 真实痛点（context 超限、skill 冲突、factory 过度生产） |
| `cortex/wiki/01-patterns/2026-05-02-thin-skill-pattern.md` | User-Agent-Skill-CLI 协作模型 + Smart agent, dumb tool 原则 |
| `AGENTS.md` § ZK Validation Pattern | ZK agent 验证的规范 |
| Speedrunlab memory thresholds | 80%/90%/95% 三级阈值 + consolidation 规则 |

### ZK Validation 机制（lythoskill 创新）

```
Dreaming skill 产出 SSOT
  ↓
Level 1: ZK subagent (same player) 读 SSOT → self-report
  ↓  误解 / 不清楚 → SSOT revision → 再验证
  ↓
Level 2 (重要文档): arena single --player kimi 跨模型验证
  ↓  kimi 也能读懂 → 文档泛用性确认
  ↓  kimi 误解 → Claude-特定语境泄漏，需要修正
```

**和 OpenClaw 的关键差异**：OpenClaw dreaming 是自我一致性检查（同一个 agent 读自己写的），ZK 验证是**外部可读性检查**（零知识 agent 读）。Level 1 保证自洽，Level 2 保证跨模型泛用。

## 验收标准

- [ ] SKILL.md 完成，包含三阶段流程描述 + ZK 验证机制
- [ ] 和 OpenClaw/Hermes 的差异写清楚
- [ ] 首次试运行产出至少 3 个 SSOT 文档
- [ ] ZK agent 验证报告：可读性评估 + 修正建议
- [ ] `cortex probe` 通过
- [ ] AGENTS.md 引用了 dreaming 产出

## 进度记录

## 关联文件
- 修改: AGENTS.md (加 ZK validation pattern)
- 新增: `packages/lythoskill-dreaming/skill/SKILL.md`, `cortex/wiki/04-ssot/`

## Git 提交信息建议
```
feat(dreaming): dreaming skill PoC with ZK agent validation (TASK-20260528121027367)

- Design three-phase dreaming flow: scan → consolidate → ZK validate
- ZK validation is lythoskill's innovation over OpenClaw's dreaming
- Self-bootstrap: lythoskill governs its own documentation
```

## 备注

Refs: EPIC-20260527212032856 T6
Blocked by: None
Blocks: T3 (wiki/ADR audit — dreaming 产出指导 audit 优先级)
Root: 今天 session 发现 "agent scan → 学不到位 → 瞎写" 是系统性模式；ZK 验证已验证有效（两次 ZK agent 测试）
