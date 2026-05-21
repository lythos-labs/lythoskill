# 架構

> 三大支柱：Deck（治理）、Arena（驗證）、Curator（探索）。

## 玩家與牌組分離

TCG（集換式卡牌遊戲）的類比不是裝飾——是結構性的：

```
玩家（誰在玩）                    牌組（你用什麼玩）
├─ 平台: claude-code             ├─ max_cards
├─ 模型: claude-opus-4-6         ├─ skills[]
├─ 並行數: 4 agents              └─ combos[]
├─ 工具集
└─ 原生能力
```

**同一副牌組，不同玩家，不同結果。** 同樣的 deck 交給 Claude Code、Kimi 或 Codex，表現不同——不是牌組有問題，而是玩家各有強項。Arena 負責量測這件事。

分離使**組合式重用**成為可能：3 個玩家 + 3 副牌組 = 從 6 個檔案產出 9 種測試配置，而非 9 個手動維護的組合。

## 三大支柱

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   DECK   │  │  ARENA   │  │ CURATOR  │
│   治理   │  │   驗證   │  │   探索   │
├──────────┤  ├──────────┤  ├──────────┤
│ 宣告     │  │ A/B 測試 │  │ 掃描冷池 │
│ 對帳     │  │ 裁判評分 │  │ 索引     │
│ 連結     │  │ 比較     │  │ 查詢     │
└──────────┘  └──────────┘  └──────────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
            ┌───────▼────────┐
            │  skill-deck.toml│
            └────────────────┘
```

### Deck 宣告式治理

`skill-deck.toml` 是單一真相來源。`deck link` 將工作集對帳到完全吻合——未宣告的技能被移除，已宣告的技能被 symlink。預設拒絕。

```toml
[deck]
max_cards = 15
cold_pool = "~/.agents/skill-repos"

[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

### Arena 實證驗證

「這個技能真的能用嗎？」——這是描述回答不了的問題。

Arena 生成零知識子代理，各自載入不同牌組，執行相同任務，再由裁判評分輸出結果。**skin in the game**：只有真實任務的表現才算數，行銷文案不算。

```
任務 → [牌組 A 子代理] → 輸出 A ─┐
      [牌組 B 子代理] → 輸出 B ─┤
                                ├→ 裁判 → 判決
      [牌組 C 子代理] → 輸出 C ─┘
```

### Curator 帶信任的探索

找技能的三層信任模型：

| 層 | 來源 | 信任度 |
|-------|--------|-------|
| L1 | SKILL.md 描述 | 「賣家秀」——作者宣稱的 |
| L2 | Big V / 生態索引 | 社群驗證 |
| L3 | 私人 metadata + arena 結果 | 「買家秀」——對你真的有效的 |

Curator 掃描冷池、將 frontmatter 索引到 SQLite、支援結構化查詢。三層機制防止「下載然後祈禱」——L1 告訴你有什麼，L2 告訴你什麼熱門，L3 告訴你什麼是真的。

## 組合認識論

發現技能之間能協作的三種路徑，對應科學方法論：

```
第三層：顯式組合      → 演繹（先驗）
        「設計者知道這些牌會 combo」

第二層：Curator       → 歸納
        「掃描發現 87% 關鍵字重疊」

第一層：Arena         → 實證
        「10 場對戰，80% 勝率」
```

`[combo.<name>]` 在 deck.toml 中定義管線——由 prompt 指揮的多技能工作流。沒有新程式碼、沒有狀態機：agent 讀取 combo prompt，然後指揮技能執行。

## 冷池架構

技能存在**冷池**（檔案系統目錄，放 git repo）。牌組從冷池**選擇**技能進入**工作集**（`.claude/skills/` 中的 symlink）。

```
冷池 (~/.agents/skill-repos/)       工作集 (.claude/skills/)
├── anthropic-superpowers/            ├── lythoskill-deck → ...
├── mattpocock-skills/                ├── lythoskill-arena → ...
├── antigravity-skills/               ├── lythoskill-curator → ...
├── vercel-labs-skills/               └── tdd → ...
└── ...                                   （只有牌組宣告的）
    （所有 repo，curator 全索引）           （預設拒絕）
```

**冷池與工作集是分離的。** Curator 索引冷池中所有內容。Deck 選擇什麼進入工作集。這防止了「所有東西到處安裝」的反模式。
