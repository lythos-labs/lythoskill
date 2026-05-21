---
layout: home

hero:
  name: "lythoskill"
  text: "可分享、可重現的技能集合"
  tagline: 就像給 AI agent 工具箱用的 gist。一個檔案、一個指令，跨專案跨團隊。
  actions:
    - theme: brand
      text: 快速開始
      link: /zh/guide/
    - theme: alt
      text: 如何運作
      link: /zh/architecture

features:
  - icon: 🃏
    title: Deck 牌組
    details: 用一個 TOML 檔案宣告你的技能。分享它、版本它、一個指令切換脈絡。
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
    title: Combo 組合
    details: 用 [combo.&lt;name&gt;] 把技能組合成管線。Prompt 指揮，agent 執行。零新程式碼。
    link: /zh/architecture#組合認識論

---

## 你收集技能。然後呢？

你有技能。可能來自 GitHub、來自 Superpowers、來自同事的 repo。不同的專案需要不同的組合，想跟團隊共享設定，也需要知道哪些真的能用。

這是大家目前的做法——以及每種做法在哪裡會碰到天花板：

| 做法 | 直到... |
|----------|---------------|
| **全域 `~/.claude/skills/`** — 全部裝進去，讓 agent 看到所有東西 | ...context window 爆了、trigger 衝突、行為無法預測 |
| **每個專案 `cp -R`** — 手動把技能複製到每個專案 | ...你有 10 個專案、20 個技能。保持同步本身就是一份工作。 |
| **Shell 腳本 / `npx` 安裝** — 用腳本解決問題 | ...你需要分享、版本化、重現一個設定。腳本會爛掉，牌組不會。 |
| **插件市集** — 只用一家廠商策展的集合 | ...你需要來自多個來源的技能。市集是有圍牆的花園。 |

**Deck 就是答案。** 一個 deck（`skill-deck.toml`）是單一檔案，宣告哪些技能是 active——可攜、可分享、可重現。把它想像成給 AI agent 工具箱用的 gist。

```toml
# skill-deck.toml — 分享它、版本化它、重現它
[deck]
max_cards = 10

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnose]
path = "github.com/mattpocock/skills/skills/engineering/diagnose"
```

執行 `deck link`。工作集與宣告完全吻合。把這個檔案給隊友——同樣的設定。換另一個專案就切換另一個牌組——一個指令。不用手動清理、不留殘留、不會有「我忘了裝過那個」。

## 如何運作

你有兩個需求，但預設工具把它們塞進同一個目錄：**儲存**（一個放所有你可能會用的技能的地方）和**選擇**（*這個*專案哪些技能該 active）。當一個目錄同時承擔兩個角色，你收集過的每一個技能都會載入到每個 session——context window 被塞滿、trigger 互相衝突、行為變得不可預測。

Lythoskill 將它們分開：

- **冷池**是技能住的地方——一個放 git clone repo 的目錄。儲存一切。這裡的東西不會自動 active。
- **牌組**（`skill-deck.toml`）宣告哪些技能 active。`deck link` 將**工作集**（`.claude/skills/`）對帳到完全吻合——未宣告的技能會被移除。

```
冷池                          牌組                        工作集
(git repos)        →    (skill-deck.toml)    →    (.claude/skills/)
儲存一切                   選擇哪些 active              只有宣告的才存在
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

這不是噱頭，是治理模型的證明：如果 agent 無法用自己提供的工具可靠地建構和維護這個專案，那工具就是壞的。

## 被 Agent 驗證，不只是我們自己的

一個零知識的 Kimi agent 獨立跑完整個 quick start：安裝 bun、建立牌組、用 frontend-design 執行 arena single-deck 測試、完成 4 次多牌組切換。乾淨安裝，乾淨結果。沒有先前脈絡，沒有人手把手。

[讀取 agent 的 handoff →](https://rfdk364izj6ca.ok.kimi.link/)

> "deny-by-default 和防火墙默认拒绝策略一样——安全来自最小权限" — Kimi agent, 2026-05-20

## 從這裡開始

1. **[快速開始](/zh/guide/)** — 六級旅程：從第一副牌組到規模化治理
2. **[架構](/zh/architecture)** — Deck、Arena、Curator，三大支柱
3. **[生態](/zh/ecosystem)** — Web SEO 重演、組合經濟、零知識代理
4. **[哲學](/zh/philosophy)** — 給已經在使用的人：設計決策與理念

::: tip 網站之外
技術細節在 [`cortex/wiki/`](https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki)：架構決策、模式、經驗教訓、競爭分析。網站是敘事層；wiki 是參考層。
:::
