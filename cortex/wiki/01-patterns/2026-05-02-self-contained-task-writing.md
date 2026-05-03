# Self-Contained Task / Epic Writing

> **原则：读者对项目一无所知。**
>
> 任何 Task 或 Epic 被创建时，必须假设下一个阅读它的 agent（或人类）完全没有本项目的上下文。如果内容依赖"你懂的"、"接上文"、"跟之前一样"，就是不合格的。

## 反模式

| 反模式 | 例子 | 为什么有害 |
|--------|------|-----------|
| **代词陷阱** | "修复之前那个 bug" | reader 不知道"之前"是哪次对话 |
| **缩写黑话** | "USR-005 还需要做" | reader 不知道 USR-005 的内容 |
| **依赖 Epic 上下文** | "继续完成 Epic 里提到的 curator" | reader 可能先读 Task 再读 Epic |
| **验收标准模糊** | "做得差不多就行了" | 无法验证完成度 |
| **缺少背景** | 直接写需求清单，不写为什么 | reader 无法判断方案是否合理 |

## 写作 checklist

创建 Task / Epic 后，自我检查：

- [ ] **背景**：一个完全陌生的人读完后，能理解"为什么需要做这个"吗？
- [ ] **目标**：能用一句话说明白这个 Task 的结束状态吗？
- [ ] **需求**：每个需求条目都是可执行的动作，而非抽象描述？
- [ ] **验收标准**：每条标准都是可验证的（是/否），而非主观感受？
- [ ] **关联文件**：列出了需要修改/创建的具体文件路径？
- [ ] **无外部依赖**：全文不引用未定义的术语、对话历史、或其他文档的隐含知识？

## Subagent Review 最佳实践

写完后，委托一个**对项目一无所知**的 subagent 做 review：

```
你是一个独立的 reviewer，对项目一无所知。
请阅读以下 Task 文件，判断它是否自包含：
- 脱离 Epic 上下文，仅读 Task 本身，能否理解要做什么？
- 评分 1-10，指出依赖外部上下文的地方。
```

如果评分 < 8，重写直到通过。

## 格式规范

本项目使用标准化的 `## Status History` 表格格式：

```markdown
## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-23 | Created |
```

- **目录位置 = 当前状态**（source of truth）
- **表格最后一行 = 最新记录**
- probe 工具会扫描比对，不一致时暴露出来由人工确认

---

*Pattern: 自包含写作 + Subagent Review + Status History 表格*
