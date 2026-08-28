#!/usr/bin/env bun
/**
 * deck-link.ts — Skill Deck reconciler
 *
 * 读取 skill-deck.toml → 计算期望状态 → 收束 working set → 写 lock + state。
 * 职责：ln -s、预算检查、过期检查、managed_dirs 重叠检测。
 * 不做：语义分析、智能推荐、niche 冲突仲裁。
 */

import { parse as parseToml } from "@iarna/toml";
import YAML from "yaml";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  symlinkSync, cpSync, lstatSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, join, basename, relative } from "node:path";
import { homedir } from "node:os";
import { ColdPool, parseLocator } from "@lythos/cold-pool";
import {
  SkillDeckLockSchema,
  SkillDeckStateSchema,
  type SkillDeckLock, type SkillDeckState, type LinkedSkill, type ConstraintReport,
  type LockSkill, type StateSkill,
} from "./schema.js";
import { parseDeck } from "./parse-deck.js";
import { resolveDeckPathSync, fetchDeckUrl, isUrl } from "./resolve-deck.js";
import { safeResolveInDir } from "./path-guard.js";

// ── 路径工具 ────────────────────────────────────────────────

export function findDeckToml(from: string): string | null {
  const p = join(from, "skill-deck.toml");
  if (existsSync(p)) return p;
  return null;
}

export function expandHome(p: string, base: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return resolve(base, p);
}

export function parseAlsoLinkTo(raw: any, projectDir: string): { targets: string[], deprecated: boolean } {
  if (Array.isArray(raw)) {
    return {
      targets: raw.filter((v: any) => typeof v === 'string').map(p => expandHome(p, projectDir)),
      deprecated: false,
    };
  }
  if (typeof raw === 'string' && raw.trim()) {
    const targets = raw.split(',').map(s => s.trim()).filter(Boolean).map(p => expandHome(p, projectDir));
    return { targets, deprecated: true };
  }
  return { targets: [], deprecated: false };
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
// ── Front matter 提取 ───────────────────────────────────────

function parseSkillFrontmatter(skillMdPath: string): Record<string, any> {
  try {
    const c = readFileSync(skillMdPath, "utf-8");
    const match = c.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!match) return {};
    return YAML.parse(match[1]) || {};
  } catch { return {}; }
}


// ── 冷池查找 ────────────────────────────────────────────────

export interface FindSourceResult {
  path: string | null;
  error?: string;
}

/**
 * Resolve a deck-declared locator to its physical SKILL.md directory in
 * the cold pool. Per ADR-20260502012643244, locators are FQ-only — bare
 * names and shorthand `owner/repo` are rejected. Internally delegates to
 * `@lythos/cold-pool` for parsing and pool path computation.
 *
 * `projectDir` is currently unused (legacy parameter from the deprecated
 * project-local fallback strategy). Kept for caller compatibility; will
 * be removed in 0.10.x cleanup.
 */
export function findSource(name: string, coldPool: string, _projectDir: string): FindSourceResult {
  const locator = parseLocator(name);
  if (!locator) {
    return {
      path: null,
      error: `Locator "${name}" is not FQ. Expected: host.tld/owner/repo[/skill] or localhost/me/<skill>. Bare names rejected per ADR-20260502012643244.`,
    };
  }

  const pool = new ColdPool(coldPool);
  const baseDir = pool.resolveDir(locator);

  // localhost: baseDir is the skill dir itself
  if (locator.isLocalhost) {
    if (existsSync(join(baseDir, "SKILL.md"))) return { path: baseDir };
    return { path: null };
  }

  // Remote with skill subpath: SKILL.md sits inside the subpath
  if (locator.skill) {
    const skillDir = join(baseDir, locator.skill);
    if (existsSync(join(skillDir, "SKILL.md"))) return { path: skillDir };
    return { path: null };
  }

  // Standalone repo: SKILL.md is at repo root
  if (existsSync(join(baseDir, "SKILL.md"))) return { path: baseDir };
  return { path: null };
}

// ── 备份工具 ────────────────────────────────────────────────

function calculateDirSize(dir: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        total += calculateDirSize(p);
      } else if (entry.isFile()) {
        total += statSync(p).size;
      }
    }
  } catch {}
  return total;
}

function formatBackupDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const BACKUP_SIZE_THRESHOLD = 100 * 1024 * 1024; // 100MB

// ── Lock/State 读写工具 ─────────────────────────────────────

function readLock(projectDir: string): SkillDeckLock | null {
  const lockPath = join(projectDir, "skill-deck.lock");
  if (!existsSync(lockPath)) return null;
  try {
    return JSON.parse(readFileSync(lockPath, "utf-8"));
  } catch { return null; }
}

function writeLock(projectDir: string, lock: SkillDeckLock): void {
  const lockPath = join(projectDir, "skill-deck.lock");
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
}

function readState(projectDir: string): SkillDeckState | null {
  const statePath = join(projectDir, "skill-deck.state");
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch { return null; }
}

function writeState(projectDir: string, state: SkillDeckState): void {
  const statePath = join(projectDir, "skill-deck.state");
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

/**
 * Migration: on first run, if .state is missing but .lock exists (old format),
 * read the old .lock and split fields into both files.
 */
function migrateOldLock(projectDir: string): void {
  const lockPath = join(projectDir, "skill-deck.lock");
  const statePath = join(projectDir, "skill-deck.state");
  if (existsSync(statePath) || !existsSync(lockPath)) return;

  try {
    const oldLock = JSON.parse(readFileSync(lockPath, "utf-8"));
    if (!oldLock.skills || !Array.isArray(oldLock.skills)) return;

    // Check if old lock has operational fields (linked_at, dest, mode on skills)
    const hasOperationalFields = oldLock.skills.some((s: any) => s.linked_at || s.dest || s.mode);
    if (!hasOperationalFields) return;

    // Split: lock keeps declarative fields, state gets operational fields
    const newLockSkills: LockSkill[] = oldLock.skills.map((s: any) => ({
      name: s.name,
      alias: s.alias,
      deck_niche: s.deck_niche || "",
      type: s.type,
      source: s.source,
      content_hash: s.content_hash,
    }));

    const newLock: SkillDeckLock = {
      version: "1.0.0",
      deck_source: oldLock.deck_source || { path: "skill-deck.toml", content_hash: "" },
      deck_config: {
        max_cards: oldLock.constraints?.max_cards || 10,
        working_set: oldLock.working_set || ".claude/skills",
        cold_pool: oldLock.cold_pool || "~/.agents/skill-repos",
        also_link_to: [],
      },
      skills: newLockSkills,
    };

    const newStateSkills: StateSkill[] = oldLock.skills.map((s: any) => ({
      alias: s.alias,
      linked_at: s.linked_at || new Date().toISOString(),
      dest: s.dest || "",
      mode: s.mode || "symlink",
      deck_managed_dirs: s.deck_managed_dirs || [],
    }));

    const newState: SkillDeckState = {
      version: "1.0.0",
      generated_at: oldLock.generated_at || new Date().toISOString(),
      resolved_paths: {
        working_set: "",
        cold_pool: "",
        also_link_to: [],
      },
      skills: newStateSkills,
      constraints: oldLock.constraints || {
        total_cards: newStateSkills.length,
        max_cards: 10,
        within_budget: true,
        transient_warnings: [],
        dir_overlaps: [],
      },
    };

    writeLock(projectDir, newLock);
    writeState(projectDir, newState);
    console.log(`🔄 Migrated old skill-deck.lock → skill-deck.lock + skill-deck.state`);
  } catch {
    // Migration best-effort; if it fails, let normal flow proceed
  }
}

/**
 * Compare two lock objects by their content-deterministic fields.
 * Returns true if the declarative content is identical (skill set, sources, content hashes).
 */
function locksContentEqual(a: SkillDeckLock, b: SkillDeckLock): boolean {
  if (a.skills.length !== b.skills.length) return false;
  const aSkills = new Map(a.skills.map(s => [s.alias, s]));
  for (const bSkill of b.skills) {
    const aSkill = aSkills.get(bSkill.alias);
    if (!aSkill) return false;
    if (aSkill.name !== bSkill.name) return false;
    if (aSkill.type !== bSkill.type) return false;
    if (aSkill.source !== bSkill.source) return false;
    if (aSkill.content_hash !== bSkill.content_hash) return false;
  }
  if (a.deck_source.content_hash !== b.deck_source.content_hash) return false;
  return true;
}

// ── 主流程 ──────────────────────────────────────────────────

export async function linkDeck(cliDeckPath?: string, cliWorkdir?: string, opts?: { noBackup?: boolean; mode?: 'symlink' | 'snapshot'; skipHealthFetch?: boolean }): Promise<void> {
const MODE = opts?.mode ?? 'symlink'
const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");

  // URL deck: fetch first, then proceed as local
  let DECK_PATH: string
  if (cliDeck && isUrl(cliDeck)) {
    try {
      DECK_PATH = await fetchDeckUrl(cliDeck)
    } catch (e: any) {
      console.error(`❌ ${e.message}`)
      process.exit(1)
    }
  } else {
    DECK_PATH = resolveDeckPathSync(cliDeck).path
  }


if (!existsSync(DECK_PATH)) {
  console.error(`❌ skill-deck.toml not found in ${process.cwd()}`);
  console.error(`\nCreate one:`);
  console.error(`  cat > skill-deck.toml <<'EOF'`);
  console.error(`  [deck]`);
  console.error(`  max_cards = 10`);
  console.error(`  cold_pool = "~/.agents/skill-repos"`);
  console.error(`  working_set = ".claude/skills"`);
  console.error(`  \n  [innate.skills.lythoskill-deck]`);
  console.error(`  path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"`);
  console.error(`  EOF`);
  console.error(`\nOr specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`);
  process.exit(1);
}

// --workdir always wins. --deck (explicit) defaults to cwd: user expects
// "work here" when pointing to a deck outside the current directory.
// Default (no flags): deck file's directory (99% of cases = project root).
const PROJECT_DIR = cliWorkdir
  ? resolve(cliWorkdir)
  : cliDeck
    ? process.cwd()
    : dirname(DECK_PATH);

// ── Migration: split old .lock on first run ─────────────────
migrateOldLock(PROJECT_DIR);

const deckRaw = readFileSync(DECK_PATH, "utf-8");
const deckHash = hashContent(deckRaw);

const { entries: parsedEntries, deprecated: isDeprecated, errors: parseErrors } = parseDeck(deckRaw);
if (isDeprecated) {
  console.warn("⚠️  Deprecation: string-array skill entries are deprecated. Run `deck migrate-schema` to upgrade.");
}

const parsedToml = parseToml(deckRaw) as any;
const WORKING_SET_RAW = parsedToml.deck?.working_set || ".claude/skills";
const COLD_POOL_RAW = parsedToml.deck?.cold_pool || "~/.agents/skill-repos";
const WORKING_SET = expandHome(WORKING_SET_RAW, PROJECT_DIR);
const COLD_POOL = expandHome(COLD_POOL_RAW, PROJECT_DIR);
const MAX_CARDS = Number(parsedToml.deck?.max_cards || 10);
const ALSO_LINK_TO_RESULT = parseAlsoLinkTo(parsedToml.deck?.also_link_to, PROJECT_DIR);
const ALSO_LINK_TO = ALSO_LINK_TO_RESULT.targets;
if (ALSO_LINK_TO_RESULT.deprecated) {
  console.warn('⚠️  Deprecation: also_link_to as comma-separated string is deprecated. Use TOML array: also_link_to = [".agents/skills"]');
}

// ── 收集声明 ────────────────────────────────────────────────

interface DeclaredSkill {
  name: string;        // original path/name (for lock.source backward-compat)
  alias: string;       // working-set flat symlink name
  type: "innate" | "tool" | "transient";
  sourcePath: string;
  mode?: 'symlink' | 'snapshot';
  expires?: string;
}

const declared: DeclaredSkill[] = [];
const errors: string[] = [...parseErrors];

for (const entry of parsedEntries) {
  const result = findSource(entry.path, COLD_POOL, PROJECT_DIR);
  if (result.error) {
    errors.push(result.error);
    continue;
  }
  if (!result.path) {
    // For localhost skills, create a placeholder so the user can fill it in
    if (entry.path.startsWith('localhost/')) {
      const skill = entry.path.slice('localhost/'.length)
      let localPath: string
      try {
        localPath = safeResolveInDir(COLD_POOL, skill)
      } catch (e: any) {
        errors.push(`Invalid localhost path "${entry.path}": ${e.message}`)
        continue
      }
      if (!existsSync(join(localPath, 'SKILL.md'))) {
        const now = new Date().toISOString().slice(0, 10)
        const placeholder = [
          '---', `name: ${skill}`, 'description: TODO — add description', 'type: standard', '---',
          '', `# ${skill}`,
          '', '> ⚠️ Placeholder — declared in skill-deck.toml but not yet implemented.',
          '', '## TODO',
          '- [ ] Define what this skill does',
          '- [ ] Add usage instructions',
          '- [ ] Run `deck link` to activate',
          '', `Created: ${now}`, '',
        ].join('\n')
        mkdirSync(localPath, { recursive: true })
        writeFileSync(join(localPath, 'SKILL.md'), placeholder)
        console.log(`📝 Created placeholder: localhost/${skill} → ${localPath}/SKILL.md`)
        result.path = localPath
      }
    }
    if (!result.path) {
      errors.push(`Skill not found: ${entry.path}`)
      continue
    }
  }
  const entryMode = (entry as any).mode as 'symlink' | 'snapshot' | undefined;
  declared.push({ name: entry.path, alias: entry.alias, type: entry.type, sourcePath: result.path, mode: entryMode });
}

// transient: sub-tables with path field (kept backward-compat; future ADR may unify)
for (const [key, value] of Object.entries(parsedToml.transient || {})) {
  const t = value as any;
  if (!t?.path) continue;
  const src = resolve(PROJECT_DIR, t.path);
  if (!existsSync(src)) {
    errors.push(`Transient path does not exist: ${key} → ${src}`);
    continue;
  }
  declared.push({ name: key, alias: key, type: "transient", sourcePath: src, expires: t.expires });
}

// ── 跨 type alias collision 检测 ──────────────────────────────
const aliasToTypes = new Map<string, string[]>();
for (const d of declared) {
  const types = aliasToTypes.get(d.alias) || [];
  types.push(d.type);
  aliasToTypes.set(d.alias, types);
}
for (const [alias, types] of aliasToTypes) {
  if (types.length > 1) {
    errors.push(
      `Alias collision: "${alias}" appears in [${types.join('], [')}]. Use --alias to specify different aliases.`
    );
  }
}

if (errors.length > 0) {
  for (const e of errors) {
    console.error(`❌ ${e}`);
    // 智能引导：如果 skill 在工作集中以真实目录存在，提示移到冷池
    const match = e.match(/^Skill not found: (.+)$/);
    if (match) {
      const skillName = match[1];
      const wsEntry = join(WORKING_SET, skillName);
      if (existsSync(wsEntry)) {
        const st = lstatSync(wsEntry);
        if (st.isDirectory() && !st.isSymbolicLink()) {
          console.error(`   → Found a real directory at ${relative(PROJECT_DIR, wsEntry)}`);
          const cpRel = relative(PROJECT_DIR, COLD_POOL);
          const cpHint = cpRel === "" ? `skills/${skillName}` : `${cpRel}/${skillName}`;
          console.error(`     Move it to your cold pool (${cpHint}) and retry.`);
        }
      }
    }
  }
  // 继续执行已找到的 skill，不因个别缺失中断全部

  // fatal errors: alias collision must block
  const fatalErrors = errors.filter(e => e.includes('Alias collision'));
  if (fatalErrors.length > 0) {
    process.exit(1);
  }

  // 引导：如果 cold pool 为空，给出更明确的指引
  const hasSkills = existsSync(COLD_POOL) && readdirSync(COLD_POOL).filter(e => !e.startsWith('.')).length > 0;
  if (!hasSkills) {
    console.error(`\n💡 Cold pool is empty. To add skills:`);
    console.error(`   bunx @lythos/skill-deck add github.com/owner/repo/skill`);
    console.error(`   # or manually: git clone <repo> ~/.agents/skill-repos/github.com/owner/repo`);
  } else {
    console.error(`\n💡 To install missing skills:`);
    console.error(`   bunx @lythos/skill-deck add github.com/owner/repo/skill`);
  }
}

// ── 预算检查（硬约束，链接前检查）──────────────────────────

if (declared.length > MAX_CARDS) {
  console.error(`❌ Budget exceeded: declared ${declared.length}, max ${MAX_CARDS}`);
  console.error(`   Reduce declarations in skill-deck.toml or increase max_cards`);
  process.exit(1);
}

// ── 工作目录安全 guard ──────────────────────────────────────

const resolvedWorkingSet = resolve(WORKING_SET);
const resolvedHome = resolve(homedir());
const resolvedCwd = resolve(process.cwd());
const resolvedColdPool = resolve(COLD_POOL);

if (resolvedWorkingSet === resolvedHome || resolvedWorkingSet === "/") {
  console.error(`❌ Refusing operation: working_set resolves to home or root directory (${resolvedWorkingSet})`);
  console.error(`   Check working_set in skill-deck.toml`);
  process.exit(1);
}

const relWs = relative(resolvedColdPool, resolvedWorkingSet);
if (
  resolvedWorkingSet.startsWith(resolvedColdPool + "/") &&
  !relWs.split("/").some(p => p.startsWith("."))
) {
  console.warn(`⚠️  working_set is inside cold_pool and not hidden — may be picked up by cold-pool scans`);
  console.warn(`   working_set: ${resolvedWorkingSet}`);
  console.warn(`   cold_pool:   ${resolvedColdPool}`);
}

// ── 目录收束（复用于 working_set 和 also_link_to）────────
function reconcileTargetDir(
  targetDir: string,
  declared: DeclaredSkill[],
  declaredNames: Set<string>,
  noBackup: boolean | undefined,
  mode: 'symlink' | 'snapshot',
  PROJECT_DIR: string,
): void {
  mkdirSync(targetDir, { recursive: true });

  const nonSymlinks: string[] = [];
  try {
    for (const entry of readdirSync(targetDir)) {
      if (entry.startsWith("_") || entry.startsWith(".")) continue;
      const entryPath = join(targetDir, entry);
      try {
        const st = lstatSync(entryPath);
        if (!st.isSymbolicLink()) nonSymlinks.push(entry);
      } catch { continue; }
    }
  } catch {}

  if (nonSymlinks.length > 0) {
    let totalSize = 0;
    for (const e of nonSymlinks) totalSize += calculateDirSize(join(targetDir, e));

    if (!noBackup && totalSize > BACKUP_SIZE_THRESHOLD) {
      console.error(`❌ Found ${nonSymlinks.length} real directories in ${relative(PROJECT_DIR, targetDir)} (> 100MB total).`);
      console.error(`   Manual review required: ${nonSymlinks.join(", ")}`);
      console.error("   Use --no-backup to skip backup, or clean up manually.");
      process.exit(1);
    }

    if (!noBackup) {
      const bakName = `skills.bak.${formatBackupDate(new Date())}.tar.gz`;
      const bakPath = join(PROJECT_DIR, ".claude", bakName);
      mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });
      const tarArgs = ["czf", bakPath, "--", ...nonSymlinks.map(e => "./" + relative(PROJECT_DIR, join(targetDir, e)))];
      try {
        execFileSync("tar", tarArgs, { cwd: PROJECT_DIR, stdio: "pipe" });
        console.log(`📦 Backed up ${nonSymlinks.length} entr${nonSymlinks.length === 1 ? "y" : "ies"} to .claude/${bakName}`);
      } catch (err: any) {
        console.error(`❌ Backup failed: ${err.message || err}`);
        console.error("   Use --no-backup to skip backup, or fix the issue and retry.");
        process.exit(1);
      }
    } else {
      console.log(`⚠️  --no-backup: removing ${nonSymlinks.length} entr${nonSymlinks.length === 1 ? "y" : "ies"} without backup`);
    }

    for (const e of nonSymlinks) rmSync(join(targetDir, e), { recursive: true, force: true });
  }

  try {
    for (const entry of readdirSync(targetDir)) {
      if (entry.startsWith("_") || entry.startsWith(".")) continue;
      if (!declaredNames.has(entry)) {
        const entryPath = join(targetDir, entry);
        try {
          const st = lstatSync(entryPath);
          if (!st.isSymbolicLink()) continue;
        } catch { continue; }
        rmSync(entryPath, { recursive: true, force: true });
        console.log(`  🗑️  Removed: ${entry}`);
      }
    }
  } catch {}

  for (const item of declared) {
    const dest = join(targetDir, item.alias);
    try { lstatSync(dest); rmSync(dest, { recursive: true, force: true }); } catch {}
    try {
      mkdirSync(dirname(dest), { recursive: true });
      const linkMode = item.mode ?? mode;
      if (linkMode === 'snapshot') cpSync(item.sourcePath, dest, { recursive: true });
      else symlinkSync(item.sourcePath, dest);
    } catch (err: any) {
      console.error(`❌ Link failed: ${item.alias}: ${err.message || err}`);
      continue;
    }
    console.log(`  🔗 ${item.alias}`);
  }
}

// ── working_set 切换检测（只警告，从不自动删除）──────────────
// state 已记录上一次 resolved_paths.working_set（ADR-20260616000939948）。
// 若与本次不同且旧目录仍存在 link 自己创建的 symlink（state.skills 里的
// alias），打印 HATEOAS 警告：旧目录可能属于另一个仍在使用的 agent，
// 所以给出精确的 rm 提示，由用户决定是否清理。

const prevState = readState(PROJECT_DIR);
const prevWorkingSet = prevState?.resolved_paths?.working_set;
if (prevWorkingSet && resolve(prevWorkingSet) !== resolvedWorkingSet) {
  const leftovers: string[] = [];
  for (const s of prevState?.skills || []) {
    const p = join(prevWorkingSet, s.alias);
    try {
      if (lstatSync(p).isSymbolicLink()) leftovers.push(p);
    } catch {}
  }
  if (leftovers.length > 0) {
    console.warn(`⚠️  Previous working set still has ${leftovers.length} link-created symlink(s)`);
    console.warn(`   what: ${prevWorkingSet} contains symlinks from the previous working_set: ${leftovers.map(p => basename(p)).join(", ")}`);
    console.warn(`   why:  working_set switched ${relative(PROJECT_DIR, prevWorkingSet)} → ${relative(PROJECT_DIR, resolvedWorkingSet)}. Leftovers may be intentional — another agent may still use that directory — so link never deletes them automatically.`);
    console.warn(`   fix:  rm ${leftovers.join(" ")}`);
  }
}

// ── 收束 working set ────────────────────────────────────────

const declaredNames = new Set(declared.map(d => d.alias));
console.log('📁 working_set: ' + relative(PROJECT_DIR, WORKING_SET));
	reconcileTargetDir(WORKING_SET, declared, declaredNames, opts?.noBackup, MODE, PROJECT_DIR);

// also_link_to fan-out (POSSE pattern, ADR-20260517152850372)
for (const target of ALSO_LINK_TO) {
  console.log('');
  console.log('📋 also_link_to: ' + relative(PROJECT_DIR, target));
  reconcileTargetDir(target, declared, declaredNames, opts?.noBackup, MODE, PROJECT_DIR);
}

// ── 收集元数据 ──────────────────────────────────────────────

	const linkedSkills: LinkedSkill[] = [];

	for (const item of declared) {
  const dest = join(WORKING_SET, item.alias);

  // 幂等：已存在则删除重建（lstat 不跟随 symlink，能处理断链/自引用 symlink）
  try {
    lstatSync(dest);
    rmSync(dest, { recursive: true, force: true });
  } catch {}

  try {
    mkdirSync(dirname(dest), { recursive: true });
    const linkMode = item.mode ?? MODE;
	    if (linkMode === 'snapshot') {
      cpSync(item.sourcePath, dest, { recursive: true });
    } else {
      symlinkSync(item.sourcePath, dest);
    }
  } catch (err: any) {
    console.error(`❌ Link failed: ${item.alias}: ${err.message}`);
    continue;
  }

  // 提取元数据
  const skillMdPath = join(item.sourcePath, "SKILL.md");
  const fm = parseSkillFrontmatter(skillMdPath);
  const niche = String(fm["deck_niche"] || "");
  const managedDirs = Array.isArray(fm["deck_managed_dirs"])
    ? fm["deck_managed_dirs"].map(String)
    : fm["deck_managed_dirs"]
      ? [String(fm["deck_managed_dirs"])]
      : [];
  let contentHash: string | undefined;
  try {
    contentHash = hashContent(readFileSync(skillMdPath, "utf-8"));
  } catch {}

  // source: relative to cold_pool (non-transient) or project dir (transient)
  const sourceRel = item.type === "transient"
    ? relative(PROJECT_DIR, item.sourcePath)
    : relative(COLD_POOL, item.sourcePath);

  linkedSkills.push({
    name: item.name,
    alias: item.alias,
    deck_niche: niche,
    type: item.type,
    source: sourceRel,
    dest: relative(PROJECT_DIR, dest),
    mode: item.mode ?? MODE,
    content_hash: contentHash,
    linked_at: new Date().toISOString(),
    ...(item.expires ? { expires: item.expires } : {}),
    deck_managed_dirs: managedDirs,
  });
}

// ── Transient 过期检查 ──────────────────────────────────────

const now = Date.now();
const transientWarnings: { name: string; expires: string; days_remaining: number }[] = [];

for (const s of linkedSkills) {
  if (s.type !== "transient" || !s.expires) continue;
  const exp = new Date(s.expires).getTime();
  const days = Math.ceil((exp - now) / 86400000);
  transientWarnings.push({ name: s.name, expires: s.expires, days_remaining: days });
  if (days <= 0) {
    console.warn(`⚠️  Expired: ${s.name} (expires ${s.expires}) — evaluate if still needed`);
  } else if (days <= 14) {
    console.warn(`⏰ Expiring soon: ${s.name} (${days} days remaining)`);
  }
}

// ── managed_dirs 重叠检测 ───────────────────────────────────

const dirOwners = new Map<string, string[]>();
for (const s of linkedSkills) {
  for (const d of s.deck_managed_dirs) {
    const norm = d.replace(/\/+$/, ""); // 去尾斜杠
    const owners = dirOwners.get(norm) || [];
    owners.push(s.name);
    dirOwners.set(norm, owners);
  }
}

const dirOverlaps: { dir: string; skills: string[] }[] = [];
for (const [dir, owners] of dirOwners) {
  if (owners.length > 1) {
    dirOverlaps.push({ dir, skills: owners });
    console.warn(`⚠️  Directory overlap: ${dir} ← ${owners.join(", ")}`);
  }
}

// 父子目录重叠检测
const allDirs = [...dirOwners.keys()].sort();
for (let i = 0; i < allDirs.length; i++) {
  for (let j = i + 1; j < allDirs.length; j++) {
    if (allDirs[j].startsWith(allDirs[i] + "/")) {
      const parentOwners = dirOwners.get(allDirs[i]) || [];
      const childOwners = dirOwners.get(allDirs[j]) || [];
      // 只在不同 skill 之间报告
      const cross = parentOwners.filter(o => !childOwners.includes(o));
      if (cross.length > 0) {
        const msg = `${allDirs[i]} (${parentOwners.join(",")}) 包含 ${allDirs[j]} (${childOwners.join(",")})`;
        console.warn(`⚠️  Directory containment: ${msg}`);
        dirOverlaps.push({ dir: `${allDirs[i]} ⊃ ${allDirs[j]}`, skills: [...new Set([...parentOwners, ...childOwners])] });
      }
    }
  }
}

// ── 生成 lock (declarative, idempotent) ─────────────────────

const constraints: ConstraintReport = {
  total_cards: linkedSkills.length,
  max_cards: MAX_CARDS,
  within_budget: linkedSkills.length <= MAX_CARDS,
  transient_warnings: transientWarnings,
  dir_overlaps: dirOverlaps,
};

const newLock: SkillDeckLock = {
  version: "1.0.0",
  deck_source: { path: relative(PROJECT_DIR, DECK_PATH), content_hash: deckHash },
  deck_config: {
    max_cards: MAX_CARDS,
    working_set: WORKING_SET_RAW,
    cold_pool: COLD_POOL_RAW,
    also_link_to: parsedToml.deck?.also_link_to
      ? (Array.isArray(parsedToml.deck.also_link_to) ? parsedToml.deck.also_link_to : [parsedToml.deck.also_link_to])
      : [],
  },
  skills: linkedSkills.map(s => ({
    name: s.name,
    alias: s.alias,
    deck_niche: s.deck_niche,
    type: s.type,
    source: s.source,
    content_hash: s.content_hash,
  })),
};

const parsedLock = SkillDeckLockSchema.safeParse(newLock);
if (!parsedLock.success) {
  console.error("❌ Lock schema validation failed:", JSON.stringify(parsedLock.error.format(), null, 2));
  process.exit(1);
}

// Only write .lock if content has changed (idempotent)
const existingLock = readLock(PROJECT_DIR);
const shouldWriteLock = !existingLock || !locksContentEqual(existingLock, newLock);

if (shouldWriteLock) {
  writeLock(PROJECT_DIR, newLock);
}

// ── 生成 state (operational, always written) ──────────────────

const newState: SkillDeckState = {
  version: "1.0.0",
  generated_at: new Date().toISOString(),
  resolved_paths: {
    working_set: resolvedWorkingSet,
    cold_pool: resolvedColdPool,
    also_link_to: ALSO_LINK_TO,
  },
  skills: linkedSkills.map(s => ({
    alias: s.alias,
    linked_at: s.linked_at,
    dest: resolve(PROJECT_DIR, s.dest),
    mode: s.mode,
    deck_managed_dirs: s.deck_managed_dirs,
  })),
  constraints,
};

const parsedState = SkillDeckStateSchema.safeParse(newState);
if (!parsedState.success) {
  console.error("❌ State schema validation failed:", JSON.stringify(parsedState.error.format(), null, 2));
  process.exit(1);
}

writeState(PROJECT_DIR, newState);

// ── Metadata reconcile ──────────────────────────────────────

try {
  const pool = new ColdPool(COLD_POOL);
  const declaredSkills = parsedEntries
    .filter(e => e.type !== 'transient')
    .map(e => ({ locator: e.path, alias: e.alias }));
  pool.metadata.reconcileDeckReferences(DECK_PATH, declaredSkills);
} catch (e: any) {
  console.warn(`⚠️  Metadata reconcile skipped: ${e.message}`);
}

// ── 报告 ────────────────────────────────────────────────────

console.log("");
console.log(`📋 deck:      ${DECK_PATH}`);
console.log(`📁 working_set: ${resolvedWorkingSet}`);
console.log(`🗄️  cold_pool:   ${COLD_POOL}`);
if (!cliWorkdir && cliDeck && dirname(DECK_PATH) !== process.cwd()) {
  console.log(`💡 working_set 相对于当前目录。若期望跟随 deck 文件位置，使用 --workdir <dir>`);
}
console.log(`✅ Sync complete: ${linkedSkills.length} skill(s) linked (max_cards: ${MAX_CARDS})`);
console.log(`   lock: ${resolve(PROJECT_DIR, "skill-deck.lock")}${shouldWriteLock ? '' : ' (unchanged)'}`);
console.log(`   state: ${resolve(PROJECT_DIR, "skill-deck.state")}`);

// ── Cold pool health (best-effort drift detection — never blocks link) ──
// Boot runs `deck link` every session; this is the one step that already
// runs, so it is where cold-pool drift (behind origin / dirty cache / wrong
// branch) gets surfaced. Dynamic import avoids the link ↔ refresh-plan
// module cycle. Any failure here must not break the link report.
try {
  const { buildRefreshPlan } = await import("./refresh-plan.js");
  const { checkColdPoolHealth, formatHealthWarnings } = await import("./cold-pool-health.js");
  const roots = [...new Set(
    buildRefreshPlan(deckRaw, { deckPath: DECK_PATH, workdir: PROJECT_DIR, coldPool: COLD_POOL })
      .targets.filter(t => t.type === 'git' && t.gitRoot)
      .map(t => t.gitRoot!)
  )];
  // skipFetch on the nested refresh --exec → link path: the pull just fetched.
  const health = await checkColdPoolHealth(roots, { skipFetch: opts?.skipHealthFetch });
  for (const w of formatHealthWarnings(health)) console.log(w);
} catch (e) {
  // best-effort only — but a broken probe must be discoverable on demand (R4)
  if (process.env.LYTHOS_DEBUG) console.error('🔍 cold-pool health probe error:', e)
}
if (dirOverlaps.length > 0) {
  console.log(`   ⚠️  ${dirOverlaps.length} directory overlap(s) (see warnings above)`);
}
}

if (import.meta.main) {
  linkDeck();
}
