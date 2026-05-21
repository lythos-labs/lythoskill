---
layout: home

hero:
  name: "lythoskill"
  text: "技能治理，而非技能收藏"
  tagline: 宣告式牌組管理 · Arena 驗證 · Curator 探索 · K8s 風格對帳
  actions:
    - theme: brand
      text: 閱讀哲學
      link: /zh/philosophy
    - theme: alt
      text: 實戰指南
      link: /zh/guide/

features:
  - icon: 🃏
    title: 牌組治理
    details: 宣告專案使用哪些技能。未宣告 = 物理不存在。預設拒絕。
    link: /zh/architecture#deck-宣告式治理
  - icon: ⚔️
    title: Arena 驗證
    details: 在真實任務上 A/B 測試技能。零知識子代理，裁判評分。不靠信仰。
    link: /zh/architecture#arena-實證驗證
  - icon: 📚
    title: Curator 探索
    details: 掃描冷池、索引 metadata、SQL 查詢。三層信任：描述 &gt; 生態 &gt; 你的實測結果。
    link: /zh/architecture#curator-帶信任的探索
  - icon: 🔗
    title: 管線組合
    details: 用 [combo.&lt;name&gt;] 把技能組合成工作流。Prompt 指揮，agent 執行。零新程式碼。
    link: /zh/architecture#組合認識論

---

## 問題

你把技能從 GitHub 裝進來。又從 Superpowers 裝。再手動 `cp -R` 幾個。工作集膨脹到 50+ 個技能。有些是舊工具的 symlink，有些壞了，有些默默衝突。**你的 agent 看到一切**，行為因此不一致——沒人在治理哪些技能該是 active 的。

[為什麼治理勝過安裝 →](/zh/philosophy)

## Lythoskill 如何運作

**冷池**是放 skill repo 的目錄，git clone 到本地、檔案系統原生。**牌組**是一份 `skill-deck.toml`，宣告哪些技能 active。`deck link` 將**工作集**對帳到完全吻合：未宣告的技能會被移除。

```
冷池                          牌組                        工作集
(git repos)        →    (skill-deck.toml)    →    (.claude/skills/)
所有技能都存在             選擇哪些 active              只有宣告的才存在
```

**三大支柱**在此基礎上運作：

| 支柱 | 問題 | 工具 |
|--------|----------|------|
| **Deck** | 哪些是 active？ | `deck link` 對帳工作集 |
| **Arena** | 它真的能用嗎？ | `arena vs` 執行 A/B 測試並評分 |
| **Curator** | 外面有什麼？ | `curator find` 查詢已索引的冷池 |

[完整架構 →](/zh/architecture)

## 由 AI Agent 打造

零人工程式碼。每一行程式碼，包含 13 個套件、600+ 測試、所有 CLI 工具、所有 SKILL.md 檔案，由 AI agent 在人類指導下產出。我們 dogfood 自己的治理：lythoskill 的開發使用 lythoskill-deck 來管理打造 lythoskill 的技能。

這驗證了治理模型本身：如果 agent 無法用自己提供的工具可靠地建構和維護這個專案，那工具就是壞的。

## 被 Agent 驗證，不只是我們自己的

一個零知識的 Kimi agent 獨立跑完整個 quick start：安裝 bun、建立牌組、用 frontend-design 執行 arena single-deck 測試、完成 4 次多牌組切換。乾淨安裝，乾淨結果。沒有先前脈絡，沒有人手把手。

[讀取 agent 的 handoff →](https://rfdk364izj6ca.ok.kimi.link/)

> "deny-by-default 和防火牆預設拒絕策略一樣——安全來自最小權限" — Kimi agent, 2026-05-20

## 從這裡開始

1. **[哲學](/zh/philosophy)**：為什麼宣告式治理存在
2. **[架構](/zh/architecture)**：Deck、Arena、Curator，三大支柱
3. **[實戰指南](/zh/guide/)**：從混亂到治理的六級旅程
4. **[生態](/zh/ecosystem)**：Web SEO 重演、組合經濟、零知識代理

::: tip 網站之外
技術細節在 [`cortex/wiki/`](https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki)：架構決策、模式、經驗教訓、競爭分析。網站是敘事層；wiki 是參考層。
:::
