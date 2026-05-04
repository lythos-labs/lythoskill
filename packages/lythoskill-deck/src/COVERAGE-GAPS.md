# Deck Package Coverage Gaps

> Generated from `bun test --coverage packages/lythoskill-deck/src/*.test.ts`
> Lines: 82.35% | Funcs: 73.81% | Date: 2026-05-04

## 策略声明

以下缺口是**故意保留**的。覆盖这些分支的意图已经看到，处理方式不是"为覆盖率改代码"，而是：

1. **提取行为后单测** — 如果某段逻辑值得验证，把它提取为纯函数，单独写 test
2. **直接说明不覆盖** — 如果分支是纯边界防护（`catch {}`、交互式确认、外部依赖），写明原因即可
3. **拒绝为覆盖率改写代码** — 不为了触发分支而拆散可读性高的连续逻辑

具体不追的类别：
- `catch {}` silent ignore（fs 边界错误，测了也是 mock，无业务意义）
- 需要 >1GB 文件才能触发的分支（formatSize GB）
- 依赖外部 network 的分支（git clone 真实失败、skills.sh backend）
- 交互式 CLI 分支（prune confirm()）
- 仅为凑分支覆盖率而进行的微重构（降低可读性）

---

## add.ts — 62.37% lines

| 行 | 代码 | 未覆盖原因 | 是否追 |
|----|------|-----------|--------|
| 44, 46–50 | `deckPath` resolve + `findDeckToml` 失败 | CLI 路径解析，可用 spawnSync 追但成本高 | ⬜ 低优先级 |
| 55–59 | cold pool mkdir | 正常路径已覆盖，异常分支为 `catch {}` | ❌ 不追 |
| 62–71 | `targetDir` exists 错误 | 需构造 cold pool 冲突，有意义但成本中等 | ⬜ 低优先级 |
| 87–89 | `skills.sh` / `vercel` backend | 依赖外部 `npx skills` 命令，无 mock 价值 | ❌ 不追 |
| 106–108 | auto-migrate string-array → dict | 有意义，但需 mock `git clone` 全流程 | ⬜ 低优先级 |
| 123–124, 127–131 | alias resolve / `nameParts.length` | shorthand path 分支，有意义 | ⬜ 低优先级 |
| 136–141 | invalid type rejection | **已覆盖** (C9) | ✅ |
| 143–154 | git clone 成功后的 `findSkillDir` | 正常路径已覆盖 | ✅ |
| 163–164 | `--as` alias | 正常路径已覆盖 | ✅ |
| 172–174, 182–183 | error handling (catch) | `catch {}` 无意义 | ❌ 不追 |
| 206, 210 | skills.sh 路径 | 外部依赖 | ❌ 不追 |
| 221–227 | `writeFileSync` / `linkDeck` | 正常路径已覆盖 | ✅ |
| 235–240 | catch final error | `catch {}` | ❌ 不追 |

## link.ts — 60.71% lines

link.ts 是 deck 包最大文件（~540 行）， uncovered 行最多。主要缺口：

| 行 | 代码 | 未覆盖原因 | 是否追 |
|----|------|-----------|--------|
| 103–111 | `parseSkillFrontmatter` 异常（SKILL.md 不存在/解析失败） | 有意义，需构造无 SKILL.md 的 fixture | ⬜ 低优先级 |
| 116, 119–123 | `calculateDirSize` 异常 / `readdirSync` 失败 | `catch {}` | ❌ 不追 |
| 131–142 | backup 逻辑（nonSymlink > 100MB tar） | 需构造大文件或 mock `tar`，成本高 | ❌ 不追 |
| 146–147 | backup 路径构造 | 同上 | ❌ 不追 |
| 162–171 | transient 过期警告（`days <= 14` / `days <= 0`） | 有意义，需调系统时间或 mock Date | ⬜ 低优先级 |
| 180 | managed_dirs 重叠检测 | 有意义，需构造父子目录冲突 | ⬜ 低优先级 |
| 206–211, 218–225 | `readdirSync` / `symlinkSync` 异常 | `catch {}` | ❌ 不追 |
| 237–239, 244–245 | 各种路径 resolve | 边界情况 | ❌ 不追 |
| 247–261 | `findSource` 多种匹配策略 | 部分已覆盖，剩余为罕见 fallback | ⬜ 低优先级 |
| 265–278 | budget exceeded 详细报告 | 正常路径已覆盖 | ✅ |
| 285–287, 298–300, 307–310 | 各种 `existsSync` / `lstatSync` 边界 | `catch {}` | ❌ 不追 |
| 326 | `content_hash` 计算 | 正常路径已覆盖 | ✅ |
| 334–372 | lock 文件 schema 校验 | 正常路径已覆盖 | ✅ |
| 407–408 | `readlinkSync` 异常 | `catch {}` | ❌ 不追 |
| 454–461 | `parseDeck` fallback | 正常路径已覆盖 | ✅ |
| 479–480, 488–490, 492–498 | `readdirSync` / `rmSync` 边界 | `catch {}` | ❌ 不追 |
| 524–525, 537 | 各种 cleanup / 路径 | 边界 | ❌ 不追 |

## parse-deck.ts — 92.45% lines

| 行 | 代码 | 未覆盖原因 | 是否追 |
|----|------|-----------|--------|
| 47–50 | legacy string-array `continue`（空 name） | 有意义但 trivial | ⬜ 低优先级 |

## prune.ts — 80.43% lines

| 行 | 代码 | 未覆盖原因 | 是否追 |
|----|------|-----------|--------|
| 25–27 | `formatSize` GB 分支 | 需 >1GB 文件 | ❌ 不追 |
| 74 | `calculateDirSize` catch | `catch {}` | ❌ 不追 |
| 81–87 | `scanColdPoolRepos` catch | `catch {}` | ❌ 不追 |
| 98–100 | empty cold pool | **已覆盖** (C17) | ✅ |
| 118–122 | all-referenced no-op | **已覆盖** (C16) | ✅ |
| 129–130 | failed > 0 exit(1) | 需构造删除失败（权限不足） | ❌ 不追 |
| 167 | formatSize MB 分支 | 正常路径已覆盖 | ✅ |
| 172–173 | 删除失败 catch | `catch {}` | ❌ 不追 |
| 185–186 | formatSize 边界 | 正常路径已覆盖 | ✅ |

## refresh.ts — 88.97% lines

| 行 | 代码 | 未覆盖原因 | 是否追 |
|----|------|-----------|--------|
| 43, 49 | deck 不存在 / `findDeckToml` 失败 | CLI 路径解析 | ⬜ 低优先级 |
| 70–71 | localhost skip | **已覆盖** (C15) | ✅ |
| 83–85 | not-git | **已覆盖** (C16) | ✅ |
| 101 | `result.error`（findSource 失败） | 有意义 | ⬜ 低优先级 |
| 109–110 | `gitRoot` null 后的 skip | **已覆盖** (C16) | ✅ |
| 125 | `pullResult.status === "failed"` | 需 mock `git pull` 返回错误 | ⬜ 低优先级 |
| 148–150 | `updated` / `upToDate` / `failed` 计数 | **已覆盖** (C12-C14) | ✅ |
| 199 | `failed > 0` exit(1) | 需构造 failed 状态 | ⬜ 低优先级 |

## remove.ts — 91.53% lines

| 行 | 代码 | 未覆盖原因 | 是否追 |
|----|------|-----------|--------|
| 22–24 | deck 不存在 error | CLI 路径解析 | ⬜ 低优先级 |
| 44 | legacy string-array filter | **已覆盖** (C11.b) | ✅ |

## schema.ts — 100.00%

全部覆盖 ✅

---

## 如果未来要推到 90%+

优先级排序：
1. **link.ts `parseSkillFrontmatter` 异常** — 有业务意义（broken SKILL.md），中等成本
2. **link.ts transient 过期警告** — 有业务意义，需 mock Date
3. **add.ts auto-migrate** — 有业务意义，需 mock git clone
4. **link.ts managed_dirs 重叠** — 有业务意义，需构造目录冲突
