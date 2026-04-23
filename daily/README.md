# daily/ — 项目工作手帐

> **为什么这个目录存在？**
>
> 因为默认状态下，agent 会把项目信息留在 session 里，session 结束就丢了。
> 代码和记忆分离，项目就成了一种"失忆代码"——有实现，没历史。

## 问题：session 沙盒陷阱

当你用 Claude Code、Cursor、Windsurf 或其他 agent CLI 工作时，默认行为是：

- 项目信息沉淀在 `.claude/memory/`（用户级、session 绑定）
- 或更糟——只在当前 session 的 context 里，窗口一关就没了
- 换一个 session、换一台机器、换一个 CLI，项目的 handoff、坑点、决策全部归零

**结果**：每个新 agent 进入项目时，都要从零重新探索目录结构，重新踩你踩过的坑。

## 解决方案：daily/ 把项目记忆写回 repo

`daily/` 是一个简单约定：

- `daily/HANDOFF.md` — 当前 session 的交接记录（固定文件名，agent 优先读取）
- `daily/2026-04-23.md` — 历史工作日志（时间戳命名，平铺存储）

这些文件**随 repo 一起版本管理**，不是 session 的私有数据。

## 分层记忆模型

| 记忆层级 | 位置 | 绑定对象 | 生命周期 | 用途 |
|---------|------|---------|---------|------|
| 用户偏好 | `.claude/memory/` | 用户 + CLI | 跨 session | "你是谁、你喜欢什么" |
| 项目历史 | `daily/` | repo + git | 跨机器 | "这个项目今天发生了什么" |
| 运行时 | session context | session | 当前窗口 | "我们刚才在聊什么" |

**两个正交维度：**

```
            项目 A (lythoskill)     项目 B (你的 app)
用户 1       daily/ + .claude/      daily/ + .claude/
用户 2       daily/ + .claude/      daily/ + .claude/
```

- **水平轴**（`daily/`）：这个项目的工作手帐——人走，记忆在
- **垂直轴**（`.claude/memory/`）：这个用户的偏好——项目换，偏好在

两者缺一不可。`daily/` 不知道"你喜欢短回答"，`.claude/memory/` 不知道"我们在做 curator gateway"。

**关键区别**：
- `.claude/memory/` 是**关于你**的记忆——换个项目还在，换台机器可能丢
- `daily/` 是**关于项目**的记忆——clone repo 就有了，任何 agent CLI 都能读

## 对 agent 的意义

当一个新 agent 进入这个项目：

1. 先读 `daily/HANDOFF.md` — 上一个 session 留下了什么未竟之事
2. 扫一眼 `daily/` 历史 — 最近几天的工作节奏和模式
3. 然后才开始探索代码

不需要重新踩坑，不需要重新推理决策。项目记忆是**持续的**，不是每 session 重置的。

## 对人类的意义

- `git log daily/` 能看到项目认知的演进
- 一个 PR 不仅包含代码变更，还包含**为什么这样变更**的上下文
- 开源这个项目时，别人拿到的不仅是代码，还有**开发过程的完整记忆**

## 使用方式

由 `lythoskill-project-scribe` skill 自动维护：

- session 结束前自动 dump 当前状态到 `daily/HANDOFF.md`
- 新 session 开始时自动读取 `daily/HANDOFF.md`
- 归档时简单 `mv daily/HANDOFF.md daily/YYYY-MM-DD.md`

无需手动维护目录结构，无压输入。

---

*这不是一个可选的文档目录。这是项目的基础设施——和 `src/` 一样重要。*
