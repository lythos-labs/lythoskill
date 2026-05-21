# 實戰指南

> 六級旅程：從「我技能太多了」到「我治理我的技能生態系」。

## 第 0 級：問題

你的 `~/.claude/skills/` 有 50+ 個技能。有些是舊工具的 symlink，有些是手動安裝的，有些壞了。你的 agent 看到一切——包括衝突。你不知道哪些技能*應該*是 active 的。

**症狀**：Agent 行為不一致。同一個 trigger，有時 skill A 觸發，有時 skill B 觸發。你無法重現結果。

**根源**：沒有治理。工作集 = 累積，不是選擇。

## 第 1 級：你的第一副牌組

建立 `skill-deck.toml`：

```toml
[deck]
max_cards = 10

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

執行 `deck link`。現在工作集中只有 `tdd` 和 `diagnose`。其他全部消失。

**改變了什麼**：你的 agent 現在只看見 2 個技能。行為可重現。

## 第 2 級：探索更多技能

你想要更多技能，但不想手動逛 GitHub。

```bash
curator scan                    # 索引你的冷池
curator find "fact-check"      # 按名稱或關鍵字搜尋技能
```

Curator 回傳 locator 路徑。加到牌組，執行 `deck link`。探索 → 選擇 → 對帳，一個循環完成。

## 第 3 級：先測試再信任

一個技能的 README 說它很棒。真的嗎？

```bash
arena single --deck skill-deck.toml --task "refactor this auth module"
```

Arena 生成一個零知識子代理，載入你的任務和你的牌組。你看到的是輸出——不是行銷文案。

A/B 比較：

```bash
arena vs --deck-a skill-deck.toml --deck-b skill-deck-alt.toml --task "write API docs"
```

**改變了什麼**：技能採用是實證決策，不是信仰決策。

## 第 4 級：組合管線

有些任務需要多個技能依序執行：

```toml
[combo.release]
prompt = """
1. 用 tdd 技能執行測試
2. 升級版本號
3. 產生 changelog
4. 建立 GitHub release
"""
```

`[combo.<name>]` 是一段 prompt，不是程式碼。Agent 讀取它然後指揮執行。不需要 CLI 狀態機——agent 就是指揮者。

## 第 5 級：規模化治理

當你有 15+ 個技能、跨多個專案時，你需要：

- **階段牌組**：`phase-dev.toml`（工程）、`phase-writing.toml`（文件）、`phase-release.toml`（發布）
- **冷池衛生**：Curator audit 抓出損壞的 SKILL.md、缺少的 frontmatter、過時的 repo
- **生態意識**：Curator query 跨池查詢，揭露重疊、缺口與機會

```bash
deck link --deck phase-dev.toml     # 切換到開發工具組
deck link --deck phase-writing.toml # 切換到寫作工具組
```

每次階段切換都重新對帳工作集。不用手動清理。不留殘留。

## 第 6 級：回饋貢獻

你的 localhost 技能、你的 arena 結果、你的 combo 發現——這些都是生態貢獻。

- Fork 技能到 localhost、迭代、arena 測試、push 回上游
- 發布 arena 判決作為證據
- 分享牌組作為他人的起點

lythoskill 生態系透過使用而成長，不靠中央規劃。
