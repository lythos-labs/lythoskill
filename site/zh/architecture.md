# 架構

> 三大支柱：Deck（治理）、Arena（驗證）、Curator（探索）。

## 儲存與選擇

在治理、驗證或探索可以運作之前，有一個結構性問題必須先解決：技能需要一個地方存放，但不是每個技能都應該在每個專案中 active。

預設的做法把儲存和選擇塞進同一個目錄。`~/.agents/skills/` 同時承擔兩個角色——你收集過的每一個技能都對每個 agent session 可見。更多技能意味著更多 context 被消耗、更多 trigger 衝突、更不可預測的行為。

Lythoskill 將它們分開：

- **冷池**——技能住的地方。一個放 git clone 技能 repo 的目錄。把所有你可能會用的技能放在這裡。冷池裡的東西不會自動 active。
- **工作集**——agent 看到的東西。預設在 `.claude/skills/` 中建立 symlink（可依平台設定）。只有 `skill-deck.toml` 宣告的技能才會出現在這裡。

```
冷池 (~/.agents/skill-repos/)       工作集 (.<agent>/skills/)
├── anthropic-superpowers/            ├── lythoskill-deck → ...
├── mattpocock-skills/                ├── lythoskill-arena → ...
├── antigravity-skills/               ├── lythoskill-curator → ...
├── vercel-labs-skills/               └── tdd → ...
└── ...                                   （只有牌組宣告的）
    （所有 repo，curator 全索引）           （預設拒絕）
```

**冷池與工作集是分離的。** Curator 索引冷池中所有內容。Deck 選擇什麼進入工作集。這和 npm 使用相同的模式：`node_modules/` 存放你裝過的所有套件，`package.json` 宣告這個專案實際使用什麼。儲存一切，有意識地選擇。

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

**漸進探索——從好奇到精通：**

| 層級 | 問題 | 行動 |
|------|------|------|
| **L0** | 「這個技能能用嗎？」 | `arena single --deck <path> --brief "task"` |
| **L1** | 「哪副牌組更好？」 | `arena vs --config arena.toml` |
| **L2** | 「協議如何運作？」 | Agent ↔ CLI 控制權轉移：`prepare-workdir` → agent spawn → `archive` → `deck link` 恢復 |
| **L3** | 「Pareto 前沿是什麼？」 | 多目標最佳化——一副便宜中等品質的牌組和一副昂貴高品質的牌組可以同時是非支配的 |

```
任務 → [牌組 A 子代理] → 輸出 A ─┐
      [牌組 B 子代理] → 輸出 B ─┤
                                ├→ 裁判 → 判決
      [牌組 C 子代理] → 輸出 C ─┘
```

**關鍵設計決策：**

- **在 `/tmp` 中執行，永遠不污染工作集。** 實驗沙箱是隔離的。每次執行後，`deck link` 恢復父牌組。不安裝、不污染工作集、不覆蓋牌組。
- **預設由 agent 指揮。** 對於同玩家牌組比較（95% 的使用場景），agent 透過 Agent 工具直接生成子代理——無需 CLI runner。跨玩家比較（kimi vs codex）是唯一需要 CLI runner 的場景。
- **裁判是語義性的，不可腳本化。** Token 計數可以寫腳本；判斷「哪個輸出更適合場景」需要 LLM 推理。Arena 為此生成裁判子代理。
- **心態驗證器，而非輸出檢查器。** 透過猜測得到正確輸出是 FAIL——技能的心智模型沒有轉移。Arena 在技能到達使用者之前捕捉心態缺口。
- **子代理友善。** 中斷的執行從保存狀態恢復。每個子代理的 decision-log.jsonl 提供了代理推理的完整可觀測性。

### Curator 帶信任的探索

Curator 不是搜尋引擎——它是你在技能生態系中的**個人知識庫**。Agent 負責探索（gh CLI + WebSearch）；curator 是本機快取 + 豐富層。

**漸進探索——從查詢到複利知識：**

| 層級 | 問題 | 行動 |
|------|------|------|
| **L0** | 「這個技能的路徑是什麼？」 | `curator find <bare-name>` — 裸名到完整定位路徑 |
| **L1** | 「我有哪些技能？」 | `curator scan` + `curator query "SELECT ..."` — 索引並探索你的冷池 |
| **L2** | 「我在 GitHub 上找到東西了」 | `curator add <locator>` + re-scan + tag — 種入你的收藏 |
| **L3** | 「我該採用嗎？」 | curator → arena 測試 → `curator tag --qa` → 有信心的推薦 |

**三層信任模型：**

| 層 | 來源 | 信任度 |
|-------|--------|-------|
| L1 | SKILL.md 描述 | 「賣家秀」——作者宣稱的 |
| L2 | Big V / 生態索引 | 社群驗證 |
| L3 | 私人 metadata + arena 結果 | 「買家秀」——對你真的有效的 |

**關鍵設計決策：**

- **不是探索引擎。** Curator 不包裝外部 API，也不實作 HTTP 適配器。Agent 使用 `gh search code`、WebSearch、WebFetch 進行探索。Curator 是讓探索更快的本機快取，以及記住所發現內容的豐富層。
- **Agent 豐富的 metadata。** L3 資料（niche 標籤、QA 訊號）來自 `curator tag`，而非 SKILL.md frontmatter。技能作者寫 L1（描述）。策展者寫 L3（分類 + 驗證）。這些是分離的資料層。重新掃描會保留 agent 寫入的標籤。
- **對帳式索引。** 一次 `curator scan` 將任何檔案系統狀態收斂到乾淨索引。重建前自動備份。`curator restore` 可回滾。
- **資料飛輪。** 更多使用 → 更多 QA 資料 → 更好的 curator → 更好的推薦 → 更有針對性的測試 → 更多 QA 資料。Curator 的價值隨時間複利增長，而 deck/arena 提供的是穩態價值。
- **QA 來源必須記錄。** 每個 QA 訊號都帶有 `source_type`、`source_name`、`signal_value`。無來源訊號會被拒收。事實查核使用多來源交叉比對，搭配結構化信心評級（HIGH / LOW / CONTRADICTED）。

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
