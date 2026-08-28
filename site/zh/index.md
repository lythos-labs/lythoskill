---
layout: home

hero:
  name: "lythoskill"
  text: "AI agent 技能的宣告式治理層"
  tagline: 一個檔案宣告哪些技能 active。未宣告的技能不可見。像 agent 工具箱的 gist——分享、版本化、切換。
  actions:
    - theme: brand
      text: 快速開始
      link: /zh/guide/
    - theme: alt
      text: 如何運作
      link: /zh/architecture

features:
  - title: Deck 牌組
    details: 用一個 TOML 檔案宣告你的技能。分享它、版本它、一個指令切換脈絡。
    link: /zh/architecture#deck-宣告式治理
  - title: Arena 驗證
    details: 在真實任務上 A/B 測試技能。零知識子代理，裁判評分。不靠信仰。
    link: /zh/architecture#arena-實證驗證
  - title: Curator 探索
    details: "掃描冷池、索引 metadata、SQL 查詢。三層信任：描述 &gt; 生態 &gt; 你的實測結果。"
    link: /zh/architecture#curator-帶信任的探索

---

## 發現的樂趣

你在 GitHub 上找到一個技能。可能是 [anthropics/skills](https://github.com/anthropics/skills) 裡的 `frontend-design` — 放進 agent 的 skills 目錄就有了。可能是同事 gist 裡的 TDD 工作流。你試一個 prompt，它成功了。你很開心。

然後你又找到一個。再一個。你的收藏慢慢成長——這裡一個 PDF 閱讀器，那裡一個研究管線，同事 repo 裡一個文件格式化工具。每一個都能用。每一個都讓你的 agent 更聰明。

**這是好事。** 收集技能不是一個待解決的問題，而是一個該被鼓勵的行為。整個生態系——Anthropic 的內建安裝器、Vercel 的 `skills add`、不斷湧現的技能中心——都在收斂到同一個洞察：技能有價值，所以安裝應該零摩擦。大家都在努力把技能安裝變成一鍵完成。這是對的。

但零摩擦安裝只會加速真正的瓶頸：**治理**。當你可以一鍵安裝任何技能，問題就從「怎麼拿到技能」變成「怎麼管理我擁有的東西」。

## 你收集技能。然後呢？

每個收集者都會碰到同樣的組織挑戰。這是大家目前的做法——以及每種做法在哪裡會碰到它的自然極限：

| 做法 | 直到... |
|------|---------|
| **全域 `~/.agents/skills/`** — 最自然的起點。每個 Claude Code 使用者都從這裡開始。全部裝進去，讓 agent 看到所有東西。 | ...你的收藏增長到超出 context 能舒適容納的範圍。不同專案需要不同技能，但一個目錄只能保存一種狀態。 |
| **每個專案 `cp -R`** — 當你開始想重複使用時，自然就會複製。挑選需要的技能，放進專案目錄。 | ...你想跟隊友分享設定，或在 10 個專案間保持技能更新。手動複製沒問題——直到它有問題為止。 |
| **Shell 腳本 / `npx` 安裝** — 你可能已經在這樣做了。把 `npx skills add a && npx skills add b` 丟進一個腳本。**你已經在用牌組的思維方式思考了**——你宣告了哪些該 active，只是還沒把它正名成一個檔案。 | ...你需要版本控制、團隊共享、或在不同脈絡間切換而不修改腳本。一個 shell 腳本就是一個等待被正名的牌組。 |
| **插件市集** — 策展過、方便、一鍵安裝。降低安裝門檻是有價值的工作。 | ...你在 GitHub 上找到完美的技能，但它不在任何市集裡。大多數技能存在於開放 repo 中，而非有圍牆的花園。你需要技能，不管它們來自哪裡。 |

## 給 AI 工具箱的 Gist

試試看？一個 deck（`skill-deck.toml`）是單一檔案，宣告哪些技能是 active——可攜、可分享、可重現。

```bash
cat > skill-deck.toml << 'EOF'
[deck]
max_cards = 10
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"

[tool.skills.diagnosing-bugs]
path = "github.com/mattpocock/skills/skills/engineering/diagnosing-bugs"
EOF

bunx @lythos/skill-deck@latest link
```

不是用 Claude Code？把 `working_set` 改成 `.agents/skills`(Codex 及 14+ 種 agent）或 `.cursor/skills`(Cursor)——只差這一行。（一個注意事項：`link` 只對帳牌組裡指定的那個工作集；如果你把既有專案切到新的工作集，舊目錄會原樣留下——`link` 會印出警告並附上確切的 `rm` 清理指令；如果你同時用兩種 agent 就保留。）也可以直接抓這個牌組檔案：[quick-start.toml](https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/quick-start.toml)——它在 CI 裡有遠端驗證，本頁每個 locator 都有。

就這樣。複製、貼上、執行。`cold_pool` 欄位告訴系統你的技能放在哪裡——一個放 git clone repo 的目錄。`working_set` 欄位告訴系統你的 agent 去哪裡找。`bunx @lythos/skill-deck link` 把工作集對帳到與宣告完全吻合——未宣告的技能會被移除，已宣告的技能會被連結。這個檔案自我描述——不需要外部說明就能看懂它在做什麼。

把這個檔案給隊友——同樣的設定。換另一個專案就切換另一個牌組——一個指令。在宣告的工作集內：不用手動清理、不留殘留、不會有「我忘了裝過那個」。（把專案切到*另一個*工作集時，舊目錄會留下——`link` 會印出警告和清理指令。）

## 如何運作

你有兩個需求，但預設工具把它們塞進同一個目錄：**儲存**（一個放所有你可能會用的技能的地方）和**選擇**（*這個*專案哪些技能該 active）。當一個目錄同時承擔兩個角色，你收集過的每一個技能都會載入到每個 session——context window 被塞滿、trigger 互相衝突、行為變得不可預測。

Lythoskill 將它們分開：

- **冷池**是技能住的地方——一個放 git clone repo 的目錄。儲存一切。這裡的東西不會自動 active。
- **牌組**（`skill-deck.toml`）宣告哪些技能 active。`bunx @lythos/skill-deck link` 將**工作集**（預設 `.claude/skills/`，可依平台設定）對帳到完全吻合——未宣告的技能會被移除。

```
冷池                          牌組                        工作集
(git repos)        ->    (skill-deck.toml)    ->    (.<agent>/skills/)
儲存一切                   選擇哪些 active              只有宣告的才存在
```

**三大支柱**在此基礎上運作：

| 支柱 | 問題 | 工具 |
|------|------|------|
| **Deck** | 哪些是 active？ | `bunx @lythos/skill-deck link` 對帳工作集 |
| **Arena** | 它真的能用嗎？ | `bunx @lythos/skill-arena vs` 執行 A/B 測試並評分 |
| **Curator** | 外面有什麼？ | `bunx @lythos/skill-curator find` 查詢已索引的冷池 |

[完整架構 ->](/zh/architecture)

## 真實牌組，真實專案

這些是來自 [examples 目錄](https://github.com/lythos-labs/lythoskill/tree/main/examples/decks) 的工作配置——{{DECK_COUNT}} 副牌組且持續成長中。每一副都是一個你可以直接拿來用的單一檔案：

- **Engineering** — TDD + PRD + 架構圖，紀律化的開發流程
- **Design Studio** — 前端品味、主題工廠、品牌指南。消滅 AI 塑膠感。
- **Deep Research** — 結構化研究管線：大綱 -> 平行深度 agent -> 報告
- **Documents** — PDF 和 DOCX 讀寫，零設計負擔
- **Scout** — 在決定採用前先探查一個 repo

每個檔案都是自我描述的：檔頭的註解告訴你它是做什麼的、怎麼拿、怎麼 link。不需要說明書。牌組就是文件。

```bash
# 現在就試一副：
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/engineering.toml > skill-deck.toml
bunx @lythos/skill-deck@latest link
```

[瀏覽全部 {{DECK_COUNT}} 副範例牌組 ->](https://github.com/lythos-labs/lythoskill/tree/main/examples/decks)

## 由 AI Agent 打造

零人工程式碼。每一行程式碼，包含 {{PACKAGE_COUNT}} 個套件、600+ 測試、所有 CLI 工具、所有 SKILL.md 檔案，由 AI agent 在人類指導下產出。我們 dogfood 自己的治理：lythoskill 的開發使用 lythoskill-deck 來管理打造 lythoskill 的技能。

這不是噱頭，是治理模型的證明：如果 agent 無法用自己提供的工具可靠地建構和維護這個專案，那工具就是壞的。

## 被 Agent 驗證，不只是我們自己的

一個零知識的 Kimi agent 獨立跑完整個 quick start：安裝 bun、建立牌組、用 frontend-design 執行 arena single-deck 測試、完成 4 次多牌組切換。乾淨安裝，乾淨結果。沒有先前脈絡，沒有人手把手。

[讀取 agent 的 handoff ->](https://rfdk364izj6ca.ok.kimi.link/)

> "deny-by-default 和防火墙默认拒绝策略一样——安全来自最小权限" — Kimi agent, 2026-05-20

## 從這裡開始

1. **[快速開始](/zh/guide/)** — 六級旅程：從第一副牌組到規模化治理
2. **[架構](/zh/architecture)** — Deck、Arena、Curator，三大支柱
3. **[生態](/zh/ecosystem)** — Web SEO 重演、組合經濟、零知識代理
4. **[哲學](/zh/philosophy)** — 給已經在使用的人：設計決策與理念

::: tip 網站之外
技術細節在 [`cortex/wiki/`](https://github.com/lythos-labs/lythoskill/tree/main/cortex/wiki)：架構決策、模式、經驗教訓、競爭分析。網站是敘事層；wiki 是參考層。
:::
