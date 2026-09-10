#!/usr/bin/env bun
/**
 * deck-remove.ts — Remove a skill from the declaration layer
 *
 * Deletes the entry from skill-deck.toml and removes the working-set symlink.
 * Does NOT touch the cold pool (use `deck prune` for material-layer GC).
 */

import { spliceRemoveSkill } from "./toml-splice.js";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { findDeckToml, expandHome, parseAlsoLinkTo } from "./link.js";
import { parseDeck, readDeckOrExplain } from "./parse-deck.js";
import { ColdPool } from "@lythos/cold-pool";
import { validateAlias } from "./path-guard.js";
import { removeSymlinkOnly, deckOwnsEntry, type OwnershipContext } from "./safe-remove.js";
import { ownershipContextFor } from "./state-file.js";

/**
 * 删除工作集条目。两道防线:
 *
 *  1. Goose #11600:是 symlink 就只删链接本身(无 recursive,cold pool 真身
 *     永不被触碰)。不用 existsSync 判定 — 它跟随链接,会漏掉断链。
 *  2. 所有权(k8s ownerReferences,TASK-20260910111600389):**先判归属再删**。
 *     真实目录只有 state 记录在案(deck 自己建的 snapshot)才删;别的东西占了
 *     这个 alias → 报错留在原地,不删。fan-out 目标可能是别的项目的
 *     `.claude/skills`,往里 recursive 删不是 deck 的权限。
 *
 * 该点的失败**不污染其余动作**:返回值只用于报告,deck.toml 条目与其余链接照删。
 */
function removeLinkedEntry(
  linkPath: string,
  io: DeckIO,
  label: string,
  ownership: OwnershipContext,
): void {
  const verdict = deckOwnsEntry(linkPath, ownership);

  if (!verdict.present) {
    io.log(`  ⚠️  ${label} not found: ${linkPath}`);
    return;
  }
  if (!verdict.owned) {
    io.error(`❌ Not removing ${label} — ${linkPath} is not deck's`);
    io.error(`   why:  ${verdict.reason}`);
    io.error(`   fix:  move or remove it yourself if it is stale; the deck entry and other links are still removed`);
    return;
  }

  if (verdict.via === "symlink-into-coldpool") {
    removeSymlinkOnly(linkPath);
    io.log(`  🗑️  Removed ${label}: ${linkPath}`);
  } else {
    rmSync(linkPath, { recursive: true, force: true });
    io.log(`  🗑️  Removed ${label} (deck's snapshot): ${linkPath}`);
  }
}

export interface DeckIO {
  error: (msg: string) => void;
  exit: (code?: number) => never;
  warn: (msg: string) => void;
  log: (msg: string) => void;
}

const defaultIO: DeckIO = {
  error: (msg: string) => console.error(msg),
  exit: (code?: number) => process.exit(code ?? 0),
  warn: (msg: string) => console.warn(msg),
  log: (msg: string) => console.log(msg),
};

export function removeSkill(target: string, cliDeckPath?: string, cliWorkdir?: string, io: DeckIO = defaultIO): void {
  const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");
  const DECK_PATH = cliDeck
    ? resolve(cliDeck)
    : findDeckToml(process.cwd()) || resolve("skill-deck.toml");

  if (!existsSync(DECK_PATH)) {
    io.error(`❌ skill-deck.toml not found in ${process.cwd()}`);
    io.error(`\nCreate one or specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`);
    io.exit(1);
  }

  const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH);
  const deckRaw = readFileSync(DECK_PATH, "utf-8");
  // 读不了就说清楚(是什么/为什么/怎么修),不把 iarna 的 parser 栈甩给用户 ——
  // 这条读法与 deck add 的写回路径共用(parse-deck.ts:readDeckOrExplain)。
  const deckRead = readDeckOrExplain(deckRaw, DECK_PATH);
  if (!deckRead.ok) {
    for (const line of deckRead.lines) io.error(line);
    io.exit(1);
  }
  const deck = deckRead.doc;

  const WORKING_SET = expandHome(deck.deck?.working_set || ".claude/skills", PROJECT_DIR);

  const ALSO_LINK_TO_RESULT = parseAlsoLinkTo(deck.deck?.also_link_to, PROJECT_DIR);
  const ALSO_LINK_TO = ALSO_LINK_TO_RESULT.targets;
  if (ALSO_LINK_TO_RESULT.deprecated) {
    io.warn('⚠️  Deprecation: also_link_to as comma-separated string is deprecated. Use TOML array: also_link_to = [".agents/skills"]');
  }

  const COLD_POOL = expandHome(deck.deck?.cold_pool || "~/.agents/skill-repos", PROJECT_DIR);
  // 归属判定输入装配一次,两个删除点共用(见 removeLinkedEntry 的第 2 道防线)
  const OWNERSHIP = ownershipContextFor(COLD_POOL, PROJECT_DIR);

  // ── 定位目标 ────────────────────────────────────────────────

  const { entries: parsedEntries } = parseDeck(deckRaw);

  // Match by alias first, then by path
  const match = parsedEntries.find(e => e.alias === target || e.path === target);

  if (!match) {
    io.error(`❌ Skill not found in deck: ${target}`);
    const aliases = parsedEntries.map(e => e.alias);
    if (aliases.length > 0) {
      io.error(`   Declared aliases: ${aliases.join(", ")}`);
    }
    io.exit(1);
  }

  // ── 删 deck.toml 条目 ───────────────────────────────────────

  const section = match.type;
  const alias = match.alias;

  // Validate alias before using as path component (CWE-22)
  try { validateAlias(alias) } catch (e: any) {
    io.error(`❌ Invalid alias in deck.toml: ${e.message}`)
    io.error(`   Fix skill-deck.toml before re-running.`)
    io.exit(1)
  }

  // ── 写回:AST 定位 + 文本区间 splice(ADR-20260910152957509 §规格)──
  // 这里**不再**改对象再 stringify:那条路会删光整份文件的注释、并重排没让改的键。
  // 三种形状(table / [section.skills] 内联条目 / legacy 数组)与空容器级联都在 splice 里,
  // 定位不到或解析失败一律报错退出,**绝不**退回整份重写。
  const src = readFileSync(DECK_PATH, "utf-8");
  const spliced = spliceRemoveSkill(src, section, alias);
  if (!spliced.ok) {
    io.error(`❌ Cannot remove "${alias}" from skill-deck.toml`);
    io.error(`   why:  ${spliced.message}`);
    io.error(`   fix:  the file was NOT modified — fix the deck by hand or report this shape`);
    io.exit(1);
    return;
  }
  if (spliced.src !== src) writeFileSync(DECK_PATH, spliced.src);
  io.log(`📝 Removed "${alias}" from [${section}.skills] in ${DECK_PATH}`);

  // ── 删 working set symlink ──────────────────────────────────

  removeLinkedEntry(join(WORKING_SET, alias), io, "symlink", OWNERSHIP);

  // ── 删 also_link_to symlinks ─────────────────────────────────

  for (const target of ALSO_LINK_TO) {
    removeLinkedEntry(join(target, alias), io, "also_link_to symlink", OWNERSHIP);
  }

  // ── Metadata cleanup ────────────────────────────────────────

  try {
    const pool = new ColdPool(COLD_POOL);
    pool.metadata.removeReference(match.path, DECK_PATH);
  } catch (e: any) {
    io.warn(`⚠️  Metadata cleanup skipped: ${e.message}`);
  }

  io.log(`\n💡 Cold pool untouched. Run 'bunx @lythos/cold-pool prune' to GC unreferenced repos.`);
}
