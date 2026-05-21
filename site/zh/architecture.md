# 架構

> 三大支柱：Deck（治理）、Arena（驗證）、Curator（探索）。

## 儲存與選擇

在治理、驗證或探索可以運作之前，有一個結構性問題必須先解決：技能需要一個地方存放，但不是每個技能都應該在每個專案中 active。

預設的做法把儲存和選擇塞進同一個目錄。`~/.claude/skills/` 同時承擔兩個角色——你收集過的每一個技能都對每個 agent session 可見。更多技能意味著更多 context 被消耗、更多 trigger 衝突、更不可預測的行為。

Lythoskill 將它們分開：

- **冷池**——技能住的地方。一個放 git clone 技能 repo 的目錄。把所有你可能會用的技能放在這裡。冷池裡的東西不會自動 active。
- **工作集**——agent 看到的東西。`.claude/skills/` 中的 symlink。只有 `skill-deck.toml` 宣告的技能才會出現在這裡。

```
冷池 (~/.agents/skill-repos/)       工作集 (.claude/skills/)
├── anthropic-superpowers/            ├── lythoskill-deck → ...
├── mattpocock-skills/                ├── lythoskill-arena → ...
├── antigravity-skills/               ├── lythoskill-curator → ...
├── vercel-labs-skills/               └── tdd → ...
└── ...                                   （只有牌組宣告的）
    （所有 repo，curator 全索引）           （預設拒絕）
```

**冷池與工作集是分離的。** Curator 索引冷池中所有內容。Deck 選擇什麼進入工作集。這防止了「所有東西到處安裝」的反模式：儲存一次，按專案選擇。

三大支柱——Deck、Arena、Curator——都建立在這個基礎之上。

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
