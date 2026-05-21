# 生態

> 技能被發布的速度超過任何人的追蹤能力。Lythoskill 是為那個世界而建的基礎設施。

## 網路 SEO 的平行演進

技能生態正在重演網路的進化史，壓縮在幾個月之內：

| 網路時代 | 技能時代 | 機制 |
|---------|-----------|-----------|
| 早期網路（1995）| 早期技能（2024）| 任何人都能發布 |
| 網路目錄（Yahoo）| 技能索引（agentskills.io）| 人工策展 |
| 搜尋引擎（Google）| Curator + find-skills | 自動化探索 |
| SEO（2000s）| GEO（2025+）| Agent 面向的最佳化 |
| PageRank | Arena 判決 | 透過實證訊號建立品質 |

**相同的驅動力**：去中心化發布 → 探索競爭 → 排名競爭 → 最佳化。Lythoskill 對應到已被驗證的網路架構：curator = 搜尋索引，arena = 使用者行為訊號，deck = 書籤 / RSS。

## Curator 的三層信任

找到一個技能很簡單。信任它很難。Curator 把探索拆成三個獨立的層：

```
L1：描述（「賣家秀」）
    SKILL.md 裡面寫了什麼。
    → 永遠可用，永遠不夠。

L2：生態索引（「Big V」）
    社群索引和熱門 repo 說了什麼。
    → 有用的訊號，但受歡迎度偏差影響。

L3：私人 Metadata（「買家秀」）
    你的 arena 結果、你的使用紀錄、你的註解。
    → 地面真相。唯一能完全信任的一層。
```

L1 和 L2 幫你找到候選者。**L3 是啟動權威**——只有你自己的實證結果能決定什麼進入你的牌組。

## 冷池作為檔案系統原生

冷池——技能住的地方，與每個專案的工作集分開——刻意做成檔案系統原生，而非資料庫：

```
~/.agents/skill-repos/
├── anthropic-superpowers/     # git clone
├── mattpocock-skills/         # git clone
├── antigravity-skills/        # git clone
├── vercel-labs-skills/        # git clone
└── .lythoskill-curator/       # curator 產出（catalog.db + metadata）
```

**為什麼用檔案系統**：git 是公認的同步機制。不需要 API key、不需要 auth token、沒有 rate limit。`git pull --ff-only` 更新冷池；curator 重新索引。`.lythoskill-curator/` 子目錄是 curator 唯一擁有的產出物——SQLite 資料庫 + tag metadata。

## 競爭地圖

| 做法 | 優勢 | 劣勢 |
|----------|----------|----------|
| **手動安裝**（cp -R）| 零 overhead | 無治理，默默累積 |
| **市集目錄**（agentskills.io）| 可瀏覽 | 無驗證，發布者偏差 |
| **集中式 hub**（Superpowers）| 策展品質 | 單一策展人瓶頸，vendor lock-in |
| **lythoskill** | 去中心化、實證、檔案系統原生 | 需要治理思維 |

Lythoskill 不與市集競爭，它屬於不同層級。市集回答「有什麼」。Lythoskill 回答「什麼對我真的有效」。

## 組合經濟

顯式組合（`[combo.<name>]`）是生態中價值最高的產出物：

- 一個有效的組合可以**跨玩家重用**：同一個管線，不同的 agent
- 一個經過 arena 驗證的組合是**實證有效的**，不只是「我覺得這可行」
- 一個在共享牌組中的組合是**可被探索的**：curator 可以跨池索引 combo 模式

這創造了一種**組合經濟**：探索 → 測試 → 驗證 → 分享 → 探索。每個循環都拉高「有效」的標準。

## 零知識代理

零知識（ZK）agent 模式是 lythoskill 生態工作完成的方式：

```
生成子代理（裸 prompt，無脈絡）
    → 探索（檔案系統、git、curator）
    → 發現（模式、候選者、缺口）
    → 產出（牌組、報告、註解）
```

ZK agent 不繼承父代理的假設。它們看到的是實際存在的東西，不是父代理記得的東西。這使它們特別適合：冷池考古、牌組生成、技能探索、生態繪圖。
