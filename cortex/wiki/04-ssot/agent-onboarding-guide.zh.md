---
last_consolidated: 2026-05-28
sources: ["cortex/wiki/04-ssot/agent-onboarding-guide.md", "AGENTS.md", "cortex/wiki/04-ssot/*"]
zk_validated: false
---

# Agent 到職指南——實戰上手

> 這不是參考手冊。這是心智模型。先讀這篇，再深入 SSOT。

## 0. 開始之前

你正要進入一個累積了上千次 commit、八十多份 ADR、五十多篇 wiki pattern、二十多份 daily handoff 的專案。**不要 scan。** 這個專案之所以有預建索引，正是因為 raw scan → 憑空瞎編是這裡最常見的失敗模式。

你的閱讀順序：
1. 本指南（五分鐘）——建立心智模型
2. `AGENTS.md` 的 Index 表格（兩分鐘）——知道什麼東西在哪裡
3. `cortex/wiki/01-patterns/INDEX.md`（兩分鐘）——所有 pattern 的 P0/P1/P2 分層地圖；掃描單篇 pattern 之前先看它
4. `weekly/` 最新兩份（五分鐘）——知道最近發生了什麼
5. `cortex/wiki/04-ssot/key-decisions.md` 的 ZK Agent Alert 段落（兩分鐘）——知道什麼不能碰
6. 現在可以開始工作了

## 1. 這個專案是什麼

lythoskill 是 AI agent 技能的**治理層**。不是技能集合，不是 marketplace，不是 orchestrator。

核心概念：你在 `skill-deck.toml` 裡宣告哪些技能是 active 的。未宣告的技能在 agent 的視野裡物理上不存在。這就是 deny-by-default——和防火牆同樣的預設拒絕原則。

三個支柱在此基礎上運作：
- **Deck**——宣告與對帳（治理）
- **Arena**——測試與比較（驗證）
- **Curator**——掃描、索引、標記（發現）

這個 repo 自己的 `skill-deck.toml` 掛了 14 個技能和 2 個 combo。讀它，你就能理解這個專案用了哪些工具。

## 2. 架構（一段話）

冷池（cold pool）儲存所有技能，就像 `node_modules/`。工作集（working set）只暴露被宣告的那些，就像 `package.json` 啟動了哪些。Deck link 負責對帳兩者。這裡沒有中心化的 orchestrator——協調是按重量分散的：combo prompt（輕量，宣告式）、SKILL.md（中量，agent 導向）、CLI（重量，確定性操作）。Agent 本身就是 orchestrator。CLI 輸出遵循 HATEOAS 原則：錯誤訊息告訴 agent 下一步該做什麼，不只是哪裡出錯了。Shell stdout 就是 hypermedia 文件。

## 3. 前十鐘該做的事

```bash
# 1. 確認你在對的地方
git status && git log --oneline -5

# 2. 檢查 deck 健康狀態
bun packages/lythoskill-deck/src/cli.ts validate --deck skill-deck.toml

# 3. 檢查治理狀態
bun packages/lythoskill-project-cortex/src/cli.ts probe

# 4. 閱讀最新的 daily handoff
cat daily/$(ls daily/ | sort | tail -1)
```

## 4. 工作方式

**Task 生命週期**：`cortex task "title"` → backlog → start → 工作 → commit 時帶上 `Closes: TASK-xxx` trailer → post-commit hook 自動移到 completed。

**做完前 deck validate**：每個新增或修改的 deck example 都必須通過 `deck validate --deck <path>`。

**指令簡稱規則**：AGENTS.md 正文裡寫 `deck link` 是可以的。Site 的 code block 裡必須是 `bunx @lythos/skill-deck link`。Repo 內開發：`bun packages/lythoskill-deck/src/cli.ts link`。

**ZK 驗證文件**：如果你產出了文件，請 spawn 一個零知識 subagent 去讀它，讓它自我報告理解狀況。被誤解的段落需要 revision。重要文件要升級到跨模型驗證（`arena single --player kimi`）。

**Weekly prep**：永遠不要憑記憶寫 weekly。先收集（daily + git + cortex + ADR timeline）→ 揭露異常 → 模擬退火排名 → prep report → 使用者確認 → 撰寫 → ZK 驗證（至少兩輪獨立 pass）。

## 5. 什麼不能碰（先讀 key-decisions.md § ZK Agent Alert）

四件事看起來像 bug，但其實是深思熟慮的設計：

| 如果你看到... | 不要 |
|---------------|------|
| source 裡是 `workspace:*`，npm 上是 `^0.15.4` | 不要把 `workspace:*`「修正」成固定版本——publish.sh 在發佈時會 rewrite |
| deck.toml 裡是 `working_set`（不是 `skills`） | 不要改名——改過一次，當天就 revert 了（和 build output 目錄衝突） |
| `skills/` 目錄被 commit 進 git | 不要 gitignore——那是 committed build output，不是 cache |
| 用 `bun packages/.../cli.ts` 而不是 `bunx` | 不要替換——repo 內開發用 source，外部使用者用 `bunx` |

另外：不要從 git history 裡復活被刻意殺掉的組件。三次 build-then-reject（feed-adapters、allowed-tools、leetcode-harness）都是刻意處決。

## 6. SSOT 套件（你的參考層）

| 文件 | 何時讀 |
|------|--------|
| `architecture.md` | 需要理解系統如何組合在一起 |
| `key-decisions.md` | 準備改動前，確認這件事是否已經被決定過 |
| `conventions.md` | 準備寫程式或文件前，需要知道規則 |
| `pitfalls.md` | 出問題了，需要確認是否是已知的失敗模式 |
| `reproduce-sh-bdd.md` | 正在處理 arena 或 BDD 場景 |

## 7. 關鍵認知轉換（不要帶這些假設進來）

**這裡沒有 orchestrator。** 如果你正在找一個中心化的控制器，停下來。協調是按重量分散的。

**CLI 不是給人用的。** CLI 輸出以 agent 為目標讀者。HATEOAS 告訴 agent 下一步該做什麼。

**Deny-by-default 不是偏好。** 它是從實際損害中學到的教訓（2026 年 5 月 7 日，一個沒有 deck 的 agent 未經請求地寫了三十多輪 debug 並修改了原始碼）。

**Fork over compose。** 複雜的 pipeline 用 fork 一個訂製 skill 來處理，比用 combo 組合多個 skill 更清晰。

**Weekly prep 是強制的。** 舊方法（憑記憶寫）產出的 weekly 每週漏掉 7 到 15 個重大事件。

**ZK 驗證是我們對 OpenClaw 的創新。** 沒有 ZK 驗證的 dreaming 只保證自洽，不保證外部可讀。

## 8. Combo 意識

這個 repo 的 `skill-deck.toml` 有兩個 combo。當你使用**任何** deck 時，務必讀取它的 `[combo.<name>]` 段落。那是編排劇本——不是可選的 metadata。

- `weekly-retro`：收集 → 撰寫 → ZK 驗證 weekly
- `dream-consolidate`：掃描 weekly chain → 整合 SSOT → ZK 驗證 → 跨模型

## 9. 卡住了怎麼辦

1. 讀最新的 daily handoff——裡面有 ground truth、pitfalls、下一步
2. 讀最新的 weekly——裡面有經過重要性排名的敘事
3. 跑 `cortex probe`——它會抓到狀態漂移
4. Spawn 一個 ZK agent 去讀 SSOT 並自我報告——如果它搞混了，文件就需要修
5. 問使用者。「我不知道」比憑空瞎編好。
