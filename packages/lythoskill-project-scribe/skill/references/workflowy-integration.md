# Workflowy 树形结构集成

> Workflowy 的核心：无限嵌套的 bullet list，每个节点可折叠/展开

## 与 Age-Tasks 的映射

```
Workflowy              Age-Tasks
─────────────────────────────────────
Bullet                 Markdown Heading
Indent                 层级关系 (Epic → Task)
Collapse/Expand        文档分块阅读
Tag                    YAML Frontmatter + WikiLinks
Search                 grep + back-links
```

## 树形结构的文件组织

```
docs/guide/current-quest.md  (根节点)
├── ## 迭代概览            (一级节点)
├── ## 任务板              (一级节点)
│   ├── ### 进行中 🔄      (二级节点)
│   │   └── 任务表格       (三级节点)
│   ├── ### 已完成 ✅      (二级节点)
│   └── ### 待确认 ⏸️      (二级节点)
├── ## 关键上下文          (一级节点)
│   ├── ### 最近决策       (二级节点)
│   ├── ### 已知坑点       (二级节点)
│   └── ### 资源位置       (二级节点)
└── ## 下一步              (一级节点)
```

## 在 Markdown 中模拟 Workflowy

### 折叠/展开机制

使用 Markdown 的 details/summary：

```markdown
## 任务板

<details open>
<summary>进行中 🔄</summary>

| 任务 | 负责人 | 状态 |
|-----|-------|------|
| xxx | @AI | 进行中 |

</details>

<details>
<summary>已完成 ✅ (点击展开)</summary>

| 任务 | 完成时间 |
|-----|---------|
| yyy | 2026-03-17 |

</details>
```

### 无限嵌套

```markdown
# Epic: 播放器重构

## 目标
- 支持移动端全屏

## 任务分解
- Task 1: 重构 video-player.tsx
  - Checkpoint 1.1: 移除悬浮按钮
    - 确认不影响其他功能
    - 更新样式
  - Checkpoint 1.2: 添加抽屉交互
- Task 2: 优化 player-page.tsx
  - Checkpoint 2.1: 固定 Header
```

## 与 CQRS 的结合

```
Workflowy 树形结构 (读优化)
    ↓
project-onboarding 快速浏览
    - 折叠已完成部分
    - 展开当前关注
    - 快速定位关键信息

    ↓

扁平化存储 (写优化)
    ↓
project-scribe 原子更新
    - Daily Notes: 按时间线追加
    - Pitfalls: 按主题归类
    - ADR: 独立文档
```

## 实际应用建议

### Current Quest = 可折叠的仪表板

```markdown
# Current Quest

> 像 Workflowy 一样，只展开你关心的部分

<details open>
<summary><b>🎯 当前迭代目标</b> (v0.3.0)</summary>

回放功能完整支持

</details>

<details open>
<summary><b>🔄 进行中</b> (2 项)</summary>

...</details>

<details>
<summary><b>✅ 已完成</b> (5 项) - 点击展开</summary>

...</details>
```

### Daily Notes = 时间线流

不按树形，按时间线：

```markdown
# 2026-03-17

## 上午
- [x] 完成 xxx
- [ ] 开始 yyy

## 下午
- [x] 完成 yyy
- 发现坑点: zzz

## 晚上
- 总结: ...
```

## 关键洞察

Workflowy 的树形结构适合**浏览和规划**，但项目记忆需要**时间线 + 主题**两种视图：

| 场景 | 适合结构 | 工具 |
|-----|---------|------|
| 规划/分解任务 | 树形 | Current Quest |
| 记录历史 | 时间线 | Daily Notes |
| 查找经验 | 主题归类 | Pitfalls / ADR |
| 快速上手 | 摘要 | Onboarding |

project-scribe 负责把**时间线**的记录，整理成**树形**的 Current Quest。
