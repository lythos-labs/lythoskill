#!/usr/bin/env bun
/**
 * adapter-policy.ts — fan-out 策略检查(registry 数据 → agent-facing 警告)
 *
 * 两条显式检查,都在默认 deck(.claude/skills + .agents/skills)上休眠:
 *   1) duplicate-scan:同一 adapter 扫描 ≥2 个 fan-out 目标 → 重名 WARN 类
 *      (opencode #46327;任何 adapter 都查,ref 取该 adapter 的 duplicate hazard)
 *   2) data-loss hazard:fan-out 目标命中 hazard.triggerDirs(如 .goose/skills
 *      激活 Goose #11600 递归删除警告;共享目录不激活,见 registry 注释)
 *
 * 纯函数:输入 raw 目标串,输出警告列表。link.ts 负责打印。
 */

import { adaptersScanning, dirMatches, type CliAdapter, type AdapterHazard } from "./adapter-registry.js";

export interface FanOutWarning {
  severity: "data-loss" | "warning";
  message: string;
  ref: string;
}

function duplicateHazardRef(adapter: CliAdapter): string {
  const dup = adapter.hazards.find(h => h.id.includes("duplicate"));
  return dup?.ref ?? adapter.source;
}

function isDataLossHazard(h: AdapterHazard): boolean {
  return h.severity === "data-loss";
}

/** 命中 hazard.triggerDirs 的 data-loss 警告(按 hazard id 去重) */
function collectTriggerHazards(targets: string[], warnings: FanOutWarning[]): void {
  const seen = new Set<string>();
  for (const t of targets) {
    for (const adapter of adaptersScanning(t)) {
      for (const h of adapter.hazards) {
        if (!isDataLossHazard(h)) continue;
        if (!h.triggerDirs || !h.triggerDirs.some(td => dirMatches(t, td))) continue;
        if (seen.has(h.id)) continue;
        seen.add(h.id);
        warnings.push({ severity: "data-loss", message: `${adapter.name}: ${h.note}`, ref: h.ref });
      }
    }
  }
}

/** 同一 adapter 扫描 ≥2 个 fan-out 目标 → duplicate-name 警告 */
function collectDuplicateScans(targets: string[], warnings: FanOutWarning[]): void {
  const scannedBy = new Map<string, { adapter: CliAdapter; targets: string[] }>();
  for (const t of targets) {
    for (const adapter of adaptersScanning(t)) {
      const entry = scannedBy.get(adapter.id) ?? { adapter, targets: [] };
      if (!entry.targets.includes(t)) entry.targets.push(t);
      scannedBy.set(adapter.id, entry);
    }
  }
  for (const { adapter, targets: ts } of scannedBy.values()) {
    if (ts.length < 2) continue;
    warnings.push({
      severity: "warning",
      message:
        `${adapter.name} scans ${ts.length} fan-out dirs (${ts.join(", ")}) — same-name skills ` +
        `discovered via two roots trigger duplicate warnings. Fan to one dir per CLI, or use per-run mode.`,
      ref: duplicateHazardRef(adapter),
    });
  }
}

export function collectFanOutWarnings(targets: string[]): FanOutWarning[] {
  const warnings: FanOutWarning[] = [];
  collectDuplicateScans(targets, warnings);
  collectTriggerHazards(targets, warnings);
  return warnings;
}
