# ADR-20260508075301691: Deck link --deck accepts http/https URL

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-08 | Created — discovered during quick-agent workflow dogfooding |
| accepted | 2026-05-08 | Accepted |

## 背景

当前分享 deck 的两步操作：

```bash
curl -fsSL https://raw.githubusercontent.com/.../deck.toml > skill-deck.toml
bunx @lythos/skill-deck@latest link
```

`quick-agent.sh` 已经内置了 URL deck 解析逻辑（fetch → 临时文件 → arena agent-run），但 CLI 用户和 agent 每次都要手动 curl。

## 决策驱动

1. **发现于 dogfooding**：quick-agent 流程中 `curl | bash` 是自然模式，但直接 `deck link` 不支持 URL 显得割裂
2. **deck 分享的场景决定了 URL 是主要分发方式**：`curl` 下载 deck 文件是最常用的分享手段，link 应该原生支持
3. **实现极简**：fetch → 临时文件或本地持久化 → 已有 link 逻辑不变

## 选项

### 方案 A: 现状（用户自行 fetch）

- **优点**: 零实现
- **缺点**: 两步操作，agent 和用户都多一步。— **Rejected**

### 方案 B: --deck 接受 URL，fetch 后保存到 cwd — Selected

```bash
# 一行完成
bunx @lythos/skill-deck@latest link --deck https://raw.githubusercontent.com/.../documents.toml
```

行为：
1. 检测 `--deck` 值是 http/https URL
2. `fetch(url)` → 如果成功，保存到 `./skill-deck.toml`（覆盖前确认或 `--force` 跳过确认）
3. 继续正常 link 流程

URL 自动转换（与 `quick-agent.sh` 一致）：
- `https://github.com/lythos-labs/lythoskill/blob/main/examples/decks/documents.toml`
- → `https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/documents.toml`

### 方案 C: --deck 接受 URL，但只 fetch 到临时文件

- **优点**: 不留痕
- **缺点**: 下次 link 需要重新 fetch；用户可能想修改后再 link。— **Rejected**

## 决策

**选择**: 方案 B。`--deck` 接受 URL，fetch 后保存到 cwd 的 `skill-deck.toml`。

## 影响

- 正面: deck 分享从两步变一步；example deck 的 curl 命令可以直接改成 `deck link --deck <url>` 
- 负面: 需要处理 fetch 失败（网络错误、404），覆盖确认逻辑
- 后续: example deck 文档中的两行用法可简化

## 相关
- `quick-agent.sh` 的 URL deck 解析逻辑（参考实现）
- `examples/decks/*.toml` usage 注释（当前写的是 curl + link 两步）
- README Quick Start 的 pre-built deck 部分
