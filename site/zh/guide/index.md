# 實戰指南

> 六級旅程：你已經有技能了。這裡教你如何組織它們、測試它們、分享它們。

本指南是自足的——從零開始，依序按照每個級別操作。

## 第 0 級：快速開始

複製、貼上、執行。這一段腳本會安裝 bun、建立冷池、啟用你的前兩個技能。

請在你的 agent 實際工作的專案目錄裡執行（牌組和工作集是 per-project 的）。貼上之前先知道一件事：`link` 是 **deny-by-default**——第 4 步之後，工作集裡只會剩下牌組宣告的內容，`.claude/skills/` 裡不在牌組中的東西會被移出工作集。磁碟上不會刪除任何東西——只是解除連結，加進牌組就能恢復。如果你有想保留的既有技能，先把它們列進牌組（第 1 級會教）。

```bash
# 0. 進入你的 agent 工作的專案目錄
cd /path/to/your-project

# 1. 安裝 bun（macOS / Linux / WSL）
curl -fsSL https://bun.sh/install | bash

# 在中國大陸，取消下面這行的註解以使用 npm 鏡像源：
# export BUN_CONFIG_REGISTRY=https://registry.npmmirror.com

# 2. 建立冷池——技能 repo 存放的地方
mkdir -p ~/.agents/skill-repos

# 3. 建立你的第一副牌組
cat > skill-deck.toml << 'TOML'
[deck]
# 安全上限 + 心理強制力：選一個數字，守住它。每個技能都消耗
# context，這個硬上限逼你做取捨——這才是它的意義。
max_cards = 10
# 冷池：git-cloned 技能 repo 的共享目錄。link 會自動 clone
# github.com 路徑的 repo——不用手動設定。
cold_pool = "~/.agents/skill-repos"
# Agent 尋找技能的位置。依 agent 更換：
working_set = ".claude/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnosing-bugs]
path = "github.com/mattpocock/skills/skills/engineering/diagnosing-bugs"
TOML

# 4. Link：對帳工作集與牌組
#    自動從 github.com 路徑 clone repo 到冷池。
bunx @lythos/skill-deck@latest link
```

成功的樣子：輸出 `Sync complete: 2 skill(s) linked`，且 `.claude/skills/` 裡有兩個 symlink(`ls -la .claude/skills/` 確認）。你的 agent 現在只看見這 2 個技能——在此目錄開一個新的 agent 會話即可生效。工作集中其他東西都被解除連結，因為它們不在牌組裡。

**前置條件**：[bun](https://bun.sh) 是唯一需要的執行環境。如果你偏好 npm：`npx @lythos/skill-deck@latest link` 也可以，但 `bunx` 更快。

## 第 1 級：理解你的牌組

`skill-deck.toml` 每個欄位的意義：

| 欄位 | 作用 |
|-------|-------------|
| `max_cards` | 安全上限 + 心理強制力。`link` 會在超過時警告你。重點不是技術限制——是心理上的：每個技能消耗 context，硬數字逼你做取捨。 |
| `cold_pool` | 技能 repo 的 git clone 位置。`link` 會自動 clone `github.com/...` 路徑到這裡。 |
| `working_set` | Agent 尋找技能的位置。`.claude/skills/` 給 Claude Code，`.agents/skills/` 給 Codex 等。 |
| `[tool.skills.<alias>]` | 宣告一個技能。`path` 可以是任何 FQ locator——`github.com/owner/repo`、`localhost/me/my-fork`。 |

**改變了什麼**：你的 agent 現在只看見 2 個技能。行為可重現。一個檔案宣告什麼是 active——分享它、版本化它、切換它。

## 第 2 級：探索更多技能

你想要更多技能，但不想手動逛 GitHub。

::: tip 技能住在哪裡？
你的牌組宣告哪些技能 active（**工作集**）。但技能本身住在哪裡？這就是**冷池**——一個你 `git clone` 技能 repo 的目錄。你把所有技能儲存在冷池中；你的牌組選擇什麼進入每個專案的工作集。儲存和選擇是分開的兩件事。
:::

```bash
bunx @lythos/skill-curator ~/.agents/skill-repos   # 索引你的冷池（掃描）
bunx @lythos/skill-curator find "fact-check"       # 按名稱或關鍵字搜尋技能
```

Curator 回傳 locator 路徑。加到牌組，執行 `bunx @lythos/skill-deck@latest link`。探索 → 選擇 → 對帳，一個循環完成。

## 第 3 級：先測試再信任

一個技能的 README 說它很棒。真的嗎？

```bash
bunx @lythos/skill-arena single --deck skill-deck.toml --brief "refactor this auth module"
```

Arena 生成一個零知識子代理，載入你的任務和你的牌組。你看到的是輸出——不是行銷文案。

**前置條件**:arena 需要至少一個 agent「player」來生成子代理。首次執行會自動偵測：`kimi` CLI(`uv tool install kimi-cli` 後 `kimi login`)、`codex` CLI，或 Claude 的 `ANTHROPIC_API_KEY`。裝一個就夠；每次執行會消耗該 player 的額度，時間以分鐘計。

A/B 比較：

```bash
bunx @lythos/skill-arena vs --deck-a skill-deck.toml --deck-b skill-deck-alt.toml --brief "write API docs"
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
bunx @lythos/skill-deck link --deck phase-dev.toml     # 切換到開發工具組
bunx @lythos/skill-deck link --deck phase-writing.toml # 切換到寫作工具組
```

每次階段切換都重新對帳工作集。不用手動清理。不留殘留。

## 第 6 級：回饋貢獻

你的 localhost 技能、你的 arena 結果、你的 combo 發現——這些都是生態貢獻。

- Fork 技能到 localhost、迭代、arena 測試、push 回上游
- 發布 arena 判決作為證據
- 分享牌組作為他人的起點

lythoskill 生態系透過使用而成長，不靠中央規劃。
