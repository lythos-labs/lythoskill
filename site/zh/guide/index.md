# 實戰指南

> 六級旅程：你已經有技能了。這裡教你如何組織它們、測試它們、分享它們。

本指南是自足的——從零開始，依序按照每個級別操作。

## 第 0 級：你已經有技能了

你一直在收集技能。GitHub repos、Superpowers、同事的 gist——技能會累積。你可能比想像中擁有更多。

問題不是你擁有太多。問題是每一個你裝過的技能都對每個 agent session 可見。Context window 被塞滿。Trigger 互相衝突。行為變得不可預測——同樣的 prompt 產生不同結果，因為不同的技能被觸發。

**症狀**：Agent 行為不一致。你無法跨 session 重現結果。

**根源**：工作集是累積，不是選擇。你需要治理。

## 第 1 級：你的第一副牌組

建立 `skill-deck.toml`：

::: code-group

```toml [Claude Code]
[deck]
max_cards = 10
working_set = ".claude/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

```toml [Codex]
[deck]
max_cards = 10
working_set = ".agents/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

```toml [Cursor]
[deck]
max_cards = 10
working_set = ".cursor/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

:::

執行 `deck link`。現在工作集中只有 `tdd` 和 `diagnose`。其他全部消失。

**改變了什麼**：你的 agent 現在只看見 2 個技能。行為可重現。一個檔案宣告什麼是 active——分享它、版本化它、切換它。

## 第 2 級：探索更多技能

你想要更多技能，但不想手動逛 GitHub。

::: tip 技能住在哪裡？
你的牌組宣告哪些技能 active（**工作集**）。但技能本身住在哪裡？這就是**冷池**——一個你 `git clone` 技能 repo 的目錄。你把所有技能儲存在冷池中；你的牌組選擇什麼進入每個專案的工作集。儲存和選擇是分開的兩件事。
:::

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
