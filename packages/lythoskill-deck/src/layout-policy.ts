#!/usr/bin/env bun
/**
 * layout-policy.ts — fan-out 策略检查(CLI-layout 数据 → agent-facing 警告)
 *
 * 三条显式检查,都在默认 deck(.claude/skills + .agents/skills)上休眠:
 *   1) duplicate-scan:同一 CLI 扫描 ≥2 个 fan-out 目标 → 重名 WARN 类
 *      (opencode #46327;任何 CLI 都查,ref 取该行的 duplicate hazard)
 *   2) data-loss hazard:fan-out 目标命中 hazard.triggerDirs(如 .goose/skills
 *      激活 Goose #11600 递归删除警告;共享目录不激活,见 cli-layout.ts 注释)
 *   3) 名单外目标 info:没有 layout 数据 ≠ 查过且安全。默认发声,除非
 *      `acknowledged_unlisted` 显式豁免(B18 / ADR-20260910120047122)
 *
 * 纯函数:输入 raw 目标串,输出警告列表。link.ts 负责打印。
 */

import { layoutsScanning, dirMatches, type CliLayout, type Hazard } from "./cli-layout.js";

export type FanOutSeverity = "data-loss" | "warning" | "info";

export interface FanOutWarning {
  severity: FanOutSeverity;
  message: string;
  ref: string;
}

export interface FanOutOptions {
  /**
   * 已显式声明「此处无 layout 数据是已知的」的目标(gitignore 式:声明即静默)。
   * 匹配判据同 dirMatches(归一化后相等,或以 "/<pattern>" 结尾),所以
   * `.some-cli/skills` 同时匹配相对与绝对写法。来源:skill-deck.toml 的
   * `acknowledged_unlisted`。缺省 = 无豁免。
   */
  acknowledgedUnlisted?: string[];
}

/** 名单外 info 行指向的处置说明(agent-facing:是什么 / 能做什么 / 怎么消音) */
const UNLISTED_REF =
  "packages/lythoskill-deck/README.md#safety-guards — " +
  "若你确知该目标没有 layout 数据,把它加进 skill-deck.toml 的 acknowledged_unlisted"

function duplicateHazardRef(layout: CliLayout): string {
  const dup = layout.hazards.find(h => h.id.includes("duplicate"));
  return dup?.ref ?? layout.source;
}

function isDataLossHazard(h: Hazard): boolean {
  return h.severity === "data-loss";
}

/** 命中 hazard.triggerDirs 的 data-loss 警告(按 hazard id 去重) */
function collectTriggerHazards(targets: string[], warnings: FanOutWarning[]): void {
  const seen = new Set<string>();
  for (const t of targets) {
    for (const layout of layoutsScanning(t)) {
      for (const h of layout.hazards) {
        if (!isDataLossHazard(h)) continue;
        if (!h.triggerDirs || !h.triggerDirs.some(td => dirMatches(t, td))) continue;
        if (seen.has(h.id)) continue;
        seen.add(h.id);
        warnings.push({ severity: "data-loss", message: `${layout.name}: ${h.note}`, ref: h.ref });
      }
    }
  }
}

/** 同一 CLI 扫描 ≥2 个 fan-out 目标 → duplicate-name 警告 */
function collectDuplicateScans(targets: string[], warnings: FanOutWarning[]): void {
  const scannedBy = new Map<string, { layout: CliLayout; targets: string[] }>();
  for (const t of targets) {
    for (const layout of layoutsScanning(t)) {
      const entry = scannedBy.get(layout.id) ?? { layout, targets: [] };
      if (!entry.targets.includes(t)) entry.targets.push(t);
      scannedBy.set(layout.id, entry);
    }
  }
  for (const { layout, targets: ts } of scannedBy.values()) {
    if (ts.length < 2) continue;
    warnings.push({
      severity: "warning",
      message:
        `${layout.name} scans ${ts.length} fan-out dirs (${ts.join(", ")}) — same-name skills ` +
        `discovered via two roots trigger duplicate warnings. Drop one of these roots from also_link_to ` +
        `(keep the single dir this CLI scans), or use per-run mode.`,
      ref: duplicateHazardRef(layout),
    });
  }
}

/**
 * 名单外目标:没有任何 layout 扫描它 → 前两条检查都空转 → 零输出。
 * 零输出与「查过且安全」在人/agent 眼里同形,所以这里出声。
 *
 * 静默是**挣来的**:目标被 `acknowledged_unlisted` 声明过才静默,声明本身
 * 在 git-tracked 的 skill-deck.toml 里,是这份静默的出处(no-source-no-rule)。
 */
function collectUnlistedTargets(
  targets: string[],
  acknowledged: string[],
  warnings: FanOutWarning[],
): void {
  for (const t of targets) {
    if (layoutsScanning(t).length > 0) continue;
    if (acknowledged.some(p => dirMatches(t, p))) continue;
    warnings.push({
      severity: "info",
      message: `${t}: no layout data — hazards unknown`,
      ref: UNLISTED_REF,
    });
  }
}

export function collectFanOutWarnings(
  targets: string[],
  options: FanOutOptions = {},
): FanOutWarning[] {
  const warnings: FanOutWarning[] = [];
  collectDuplicateScans(targets, warnings);
  collectTriggerHazards(targets, warnings);
  collectUnlistedTargets(targets, options.acknowledgedUnlisted ?? [], warnings);
  return warnings;
}
