#!/usr/bin/env bun
/**
 * layout-policy.ts — fan-out 策略检查(CLI-layout 数据 → agent-facing 警告)
 *
 * 两条显式检查,都在默认 deck(.claude/skills + .agents/skills)上休眠:
 *   1) duplicate-scan:同一 CLI 扫描 ≥2 个 fan-out 目标 → 重名 WARN 类
 *      (opencode #46327;任何 CLI 都查,ref 取该行的 duplicate hazard)
 *   2) data-loss hazard:fan-out 目标命中 hazard.triggerDirs(如 .goose/skills
 *      激活 Goose #11600 递归删除警告;共享目录不激活,见 cli-layout.ts 注释)
 *
 * 纯函数:输入 raw 目标串,输出警告列表。link.ts 负责打印。
 */

import { layoutsScanning, dirMatches, type CliLayout, type Hazard } from "./cli-layout.js";

export interface FanOutWarning {
  severity: "data-loss" | "warning";
  message: string;
  ref: string;
}

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

export function collectFanOutWarnings(targets: string[]): FanOutWarning[] {
  const warnings: FanOutWarning[] = [];
  collectDuplicateScans(targets, warnings);
  collectTriggerHazards(targets, warnings);
  return warnings;
}
