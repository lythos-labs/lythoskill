#!/usr/bin/env bun
/**
 * per-run.ts — per-run 集合切换渲染(zero-projection path)
 *
 * 从 deck 状态渲染 CLI 调用,让 skills 在"本次运行"可见 — 不写任何符号
 * 链接、不动工作集。形态来自 adapter-registry 的 perRunSwitch 数据:
 *   - kimi:  --skills-dir <dir>(可重复)| 持久化 extra_skill_dirs = [...]
 *   - crush: option skill-path <dir>(单路径)
 *   - 其余 flag/config adapter 按数据泛化渲染;role/none → 明确拒绝
 *
 * 用途:side-deck 派发(arena phase-switch 的零投影替代)、避免为一次性
 * 任务 relink 主工作集。
 */

import { parse as parseToml } from "@iarna/toml";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { adapterById, ADAPTER_REGISTRY } from "./adapter-registry.js";
import { findDeckToml, expandHome, parseAlsoLinkTo } from "./link.js";

export interface PerRunResult {
  cli: string;
  /** flag 形态:拼在 CLI 后面的参数 */
  argv: string[];
  /** config 形态:持久化配置行 */
  configLines: string[];
  notes: string[];
  /** 不支持时给出原因 */
  error?: string;
}

function supportedIds(): string[] {
  // 数据驱动:kind 为 flag/config 的 adapter 可渲染
  return ADAPTER_REGISTRY.filter(
    a => a.perRunSwitch.kind === "flag" || a.perRunSwitch.kind === "config"
  ).map(a => a.id);
}

export function renderPerRun(cliId: string, targets: string[]): PerRunResult {
  const adapter = adapterById(cliId);
  if (!adapter) {
    return {
      cli: cliId, argv: [], configLines: [], notes: [],
      error: `Unknown CLI "${cliId}". Supported: ${supportedIds().join(", ")}`,
    };
  }
  const sw = adapter.perRunSwitch;
  const result: PerRunResult = { cli: adapter.name, argv: [], configLines: [], notes: [] };

  if (sw.kind === "flag") {
    if (sw.repeatable) {
      for (const t of targets) result.argv.push(sw.primary, t);
    } else {
      result.argv.push(sw.primary, targets[0] ?? "");
      if (targets.length > 1) {
        result.notes.push(`${adapter.name} ${sw.primary} takes one dir; first target used, per-run invocation needed per dir`);
      }
    }
    if (sw.configKey) {
      result.configLines.push(`${sw.configKey} = ${JSON.stringify(targets)}`);
      result.notes.push(`persistent form: ${sw.configKey} in ${adapter.name} config`);
    }
    return result;
  }

  if (sw.kind === "config") {
    if (targets.length <= 1) {
      result.configLines.push(`option ${sw.primary} ${targets[0] ?? "<dir>"}`);
    } else {
      for (const t of targets) result.configLines.push(`option ${sw.primary} ${t}`);
      result.notes.push(
        sw.repeatable
          ? `${adapter.name} ${sw.primary} is a repeatable list option — one line per dir`
          : `${adapter.name} ${sw.primary} is single-path — one option line per dir`
      );
    }
    result.notes.push("config form: run inside the CLI, or place in its config file");
    return result;
  }

  if (sw.kind === "role") {
    result.error =
      `${adapter.name} switches role/mode, not skill sets (perRunSwitch.kind = role) — ` +
      `per-run rendering not applicable. Supported: ${supportedIds().join(", ")}`;
    return result;
  }

  result.error =
    `${adapter.name} has no per-run skill-dir mechanism` +
    (sw.note ? ` (${sw.note})` : "") +
    `. Supported: ${supportedIds().join(", ")}`;
  return result;
}

// ── CLI 入口 ─────────────────────────────────────────────────

export interface PerRunIO {
  error: (msg: string) => void;
  exit: (code?: number) => void;
  log: (msg: string) => void;
}

const defaultIO: PerRunIO = {
  error: (m) => console.error(m),
  exit: (c) => process.exit(c ?? 0),
  log: (m) => console.log(m),
};

/**
 * deck per-run <cli> [--deck ...] [--workdir ...]
 * 读 deck 的 working_set + also_link_to(resolved 绝对路径),渲染 per-run 调用。
 * 零副作用:不创建/删除/修改任何文件。
 */
export function perRun(cliId: string, cliDeckPath?: string, cliWorkdir?: string, io: PerRunIO = defaultIO): void {
  const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");
  const DECK_PATH = cliDeck
    ? resolve(cliDeck)
    : findDeckToml(process.cwd()) || resolve("skill-deck.toml");

  if (!existsSync(DECK_PATH)) {
    io.error(`❌ skill-deck.toml not found in ${process.cwd()}`);
    io.exit(1);
    return;
  }

  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH);
  const deck = parseToml(readFileSync(DECK_PATH, "utf-8")) as any;
  const workingSet = expandHome(deck.deck?.working_set || ".claude/skills", PROJECT_DIR);
  const { targets: also } = parseAlsoLinkTo(deck.deck?.also_link_to, PROJECT_DIR);
  const targets = [resolve(workingSet), ...also.map(t => resolve(t))];

  const result = renderPerRun(cliId, targets);
  if (result.error) {
    io.error(`❌ ${result.error}`);
    io.exit(1);
    return;
  }

  io.log(`🚀 per-run for ${result.cli} — zero-projection: nothing linked, nothing written`);
  if (result.argv.length > 0) {
    io.log(`   ${cliId} ${result.argv.join(" ")}`);
  }
  for (const line of result.configLines) io.log(`   # ${line}`);
  for (const n of result.notes) io.log(`   💡 ${n}`);
}
