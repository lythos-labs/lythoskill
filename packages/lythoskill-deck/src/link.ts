#!/usr/bin/env bun
/**
 * deck-link.ts — Skill Deck reconciler
 *
 * 读取 skill-deck.toml → 计算期望状态 → 收束 working set → 写 lock。
 * 职责：ln -s、预算检查、过期检查、managed_dirs 重叠检测。
 * 不做：语义分析、智能推荐、niche 冲突仲裁。
 */

import { parse as parseToml } from "@iarna/toml";
import YAML from "yaml";
import { createHash } from "node:crypto";
import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  symlinkSync, lstatSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname, join, basename, relative } from "node:path";
import { homedir } from "node:os";
import {
  SkillDeckLockSchema,
  type SkillDeckLock, type LinkedSkill, type ConstraintReport,
} from "./schema.js";

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

export function findSource(name: string, coldPool: string, projectDir: string): FindSourceResult {
  // 0. Fully-qualified path: host.tld/owner/repo/skill
  //    → cold_pool/host.tld/owner/repo/skills/skill
  //    Also handles host.tld/owner/repo (standalone skill without skills/ subdir)
  const fqMatch = name.match(/^[a-z0-9-]+\.[a-z0-9-]+\//);
  if (fqMatch) {
    const parts = name.split("/");
    const host = parts[0];      // github.com
    const owner = parts[1];     // lythos-labs
    const repo = parts[2];      // lythoskill
    const skill = parts.slice(3).join("/"); // lythoskill-deck

    if (skill) {
      const fqPath = join(coldPool, host, owner, repo, "skills", skill);
      if (existsSync(join(fqPath, "SKILL.md"))) return { path: fqPath };
    }
    // fallback: standalone skill at repo root
    const directPath = join(coldPool, host, owner, repo);
    if (existsSync(join(directPath, "SKILL.md"))) return { path: directPath };
  }

  // 1. 直接路径
  const direct = resolve(coldPool, name);
  if (existsSync(join(direct, "SKILL.md"))) return { path: direct };

  // 2. Monorepo: repo/skill → cold_pool/repo/skills/skill
  if (name.includes("/")) {
    const [repo, ...rest] = name.split("/");
    const mono = join(coldPool, repo, "skills", rest.join("/"));
    if (existsSync(join(mono, "SKILL.md"))) return { path: mono };
  }

  // 3. 项目本地: <project>/skills/<name>（build 输出目录，优先级高于扁平扫描）
  const local = resolve(projectDir, "skills", name);
  if (existsSync(join(local, "SKILL.md"))) return { path: local };

  // 4. 扁平扫描: cold_pool/<any-repo>/<name> 或 <any-repo>/skills/<name>
  //    跳过隐藏目录（agent working set、git、配置等）和 node_modules，
  //    避免把 .claude/skills/ 里的 symlink 误判为有效 cold-pool 源
  const matches: string[] = [];
  try {
    for (const entry of readdirSync(coldPool, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;
      const base = join(coldPool, entry.name);
      for (const sub of [join(base, name), join(base, "skills", name)]) {
        if (existsSync(join(sub, "SKILL.md"))) {
          matches.push(sub);
        }
      }
    }
  } catch {}

  if (matches.length === 1) {
    return { path: matches[0] };
  }
  if (matches.length > 1) {
    const candidates = matches.map(m => relative(coldPool, m)).join(', ');
    return {
      path: null,
      error: `Ambiguous skill name "${name}": found ${matches.length} matches (${candidates}). Use fully-qualified name (e.g., github.com/owner/repo/${name})`,
    };
  }

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

// ── 主流程 ──────────────────────────────────────────────────

export function linkDeck(cliDeckPath?: string, cliWorkdir?: string, noBackup?: boolean): void {
const cliDeck = cliDeckPath || process.argv.find((_, i, a) => a[i - 1] === "--deck");
const DECK_PATH = cliDeck
  ? resolve(cliDeck)
  : findDeckToml(process.cwd()) || resolve("skill-deck.toml");

if (!existsSync(DECK_PATH)) {
  console.error(`❌ skill-deck.toml not found in ${process.cwd()}`);
  console.error(`\nCreate one:`);
  console.error(`  cat > skill-deck.toml <<'EOF'`);
  console.error(`  [deck]`);
  console.error(`  max_cards = 10`);
  console.error(`  \n  [tool]`);
  console.error(`  skills = ["github.com/lythos-labs/lythoskill/lythoskill-deck"]`);
  console.error(`  EOF`);
  console.error(`\nOr specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`);
  process.exit(1);
}

const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH);
const deckRaw = readFileSync(DECK_PATH, "utf-8");
const deckHash = hashContent(deckRaw);
const deck = parseToml(deckRaw) as any;

const WORKING_SET_RAW = deck.deck?.working_set || ".claude/skills";
const COLD_POOL_RAW = deck.deck?.cold_pool || "~/.agents/skill-repos";
const WORKING_SET = expandHome(WORKING_SET_RAW, PROJECT_DIR);
const COLD_POOL = expandHome(COLD_POOL_RAW, PROJECT_DIR);
const MAX_CARDS = Number(deck.deck?.max_cards || 10);

// ── 收集声明 ────────────────────────────────────────────────

interface DeclaredSkill {
  name: string;
  type: "innate" | "tool" | "combo" | "transient";
  sourcePath: string;
  expires?: string;
}

const declared: DeclaredSkill[] = [];
const errors: string[] = [];

for (const section of ["innate", "tool", "combo"] as const) {
  for (const name of (deck[section]?.skills || [])) {
    if (!name || typeof name !== "string") continue;
    const result = findSource(name, COLD_POOL, PROJECT_DIR);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    if (!result.path) {
      errors.push(`Skill not found: ${name}`);
      continue;
    }
    declared.push({ name, type: section, sourcePath: result.path });
  }
}

// transient: sub-tables with path field
for (const [key, value] of Object.entries(deck.transient || {})) {
  const t = value as any;
  if (!t?.path) continue;
  const src = resolve(PROJECT_DIR, t.path);
  if (!existsSync(src)) {
    errors.push(`Transient path does not exist: ${key} → ${src}`);
    continue;
  }
  declared.push({ name: key, type: "transient", sourcePath: src, expires: t.expires });
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

// ── 收束 working set ────────────────────────────────────────

mkdirSync(WORKING_SET, { recursive: true });

// Pre-flight: 备份并清理非 symlink 实体（真实目录/文件）
const nonSymlinks: string[] = [];
try {
  for (const entry of readdirSync(WORKING_SET)) {
    if (entry.startsWith("_") || entry.startsWith(".")) continue;
    const entryPath = join(WORKING_SET, entry);
    try {
      const st = lstatSync(entryPath);
      if (!st.isSymbolicLink()) {
        nonSymlinks.push(entry);
      }
    } catch { continue; }
  }
} catch {}

if (nonSymlinks.length > 0) {
  // 计算总大小
  let totalSize = 0;
  for (const e of nonSymlinks) {
    totalSize += calculateDirSize(join(WORKING_SET, e));
  }

  if (!noBackup && totalSize > BACKUP_SIZE_THRESHOLD) {
    console.error(`❌ Found ${nonSymlinks.length} real directories in ${relative(PROJECT_DIR, WORKING_SET)} (> 100MB total).`);
    console.error(`   Manual review required: ${nonSymlinks.join(", ")}`);
    console.error(`   Use --no-backup to skip backup (removes without saving), or clean up manually.`);
    process.exit(1);
  }

  if (!noBackup) {
    const bakName = `skills.bak.${formatBackupDate(new Date())}.tar.gz`;
    const bakPath = join(PROJECT_DIR, ".claude", bakName);
    mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });

    const tarArgs = [
      "czf", bakPath,
      ...nonSymlinks.map(e => relative(PROJECT_DIR, join(WORKING_SET, e))),
    ];
    try {
      execSync("tar " + tarArgs.map(a => a.includes(" ") ? `"${a}"` : a).join(" "), {
        cwd: PROJECT_DIR,
        stdio: "pipe",
      });
      console.log(`📦 Backed up ${nonSymlinks.length} entr${nonSymlinks.length === 1 ? "y" : "ies"} to .claude/${bakName}`);
    } catch (err: any) {
      console.error(`❌ Backup failed: ${err.message || err}`);
      console.error(`   Use --no-backup to skip backup, or fix the issue and retry.`);
      process.exit(1);
    }
  } else {
    console.log(`⚠️  --no-backup: removing ${nonSymlinks.length} entr${nonSymlinks.length === 1 ? "y" : "ies"} without backup`);
  }

  for (const e of nonSymlinks) {
    rmSync(join(WORKING_SET, e), { recursive: true, force: true });
  }
}

// 清理未声明的 symlink
const declaredNames = new Set(declared.map(d => d.name.split("/")[0]));
try {
  for (const entry of readdirSync(WORKING_SET)) {
    if (entry.startsWith("_") || entry.startsWith(".")) continue;
    if (!declaredNames.has(entry)) {
      const entryPath = join(WORKING_SET, entry);
      try {
        const st = lstatSync(entryPath);
        if (!st.isSymbolicLink()) continue; // 已在上文处理
      } catch { continue; }
      rmSync(entryPath, { recursive: true, force: true });
      console.log(`  🗑️  Removed: ${entry}`);
    }
  }
} catch {}

// 创建 symlink
const linkedSkills: LinkedSkill[] = [];

for (const item of declared) {
  const dest = join(WORKING_SET, item.name);

  // 幂等：已存在则删除重建（lstat 不跟随 symlink，能处理断链/自引用 symlink）
  try {
    lstatSync(dest);
    rmSync(dest, { recursive: true, force: true });
  } catch {}

  try {
    mkdirSync(dirname(dest), { recursive: true });
    symlinkSync(item.sourcePath, dest);
  } catch (err: any) {
    console.error(`❌ Link failed: ${item.name}: ${err.message}`);
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
    deck_niche: niche,
    type: item.type,
    source: sourceRel,
    dest: relative(PROJECT_DIR, dest),
    content_hash: contentHash,
    linked_at: new Date().toISOString(),
    ...(item.expires ? { expires: item.expires } : {}),
    deck_managed_dirs: managedDirs,
  });

  console.log(`  🔗 ${item.name}`);
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

// ── 生成 lock ───────────────────────────────────────────────

const constraints: ConstraintReport = {
  total_cards: linkedSkills.length,
  max_cards: MAX_CARDS,
  within_budget: linkedSkills.length <= MAX_CARDS,
  transient_warnings: transientWarnings,
  dir_overlaps: dirOverlaps,
};

const lock: SkillDeckLock = {
  version: "1.0.0",
  generated_at: new Date().toISOString(),
  deck_source: { path: relative(PROJECT_DIR, DECK_PATH), content_hash: deckHash },
  working_set: WORKING_SET_RAW,
  cold_pool: COLD_POOL_RAW,
  skills: linkedSkills,
  constraints,
};

const parsed = SkillDeckLockSchema.safeParse(lock);
if (!parsed.success) {
  console.error("❌ Lock schema validation failed:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const LOCK_PATH = resolve(PROJECT_DIR, "skill-deck.lock");
writeFileSync(LOCK_PATH, JSON.stringify(parsed.data, null, 2) + "\n");

// ── 报告 ────────────────────────────────────────────────────

console.log("");
console.log(`✅ Sync complete: ${linkedSkills.length} skill(s) linked (max_cards: ${MAX_CARDS})`);
console.log(`   lock: ${LOCK_PATH}`);
if (dirOverlaps.length > 0) {
  console.log(`   ⚠️  ${dirOverlaps.length} directory overlap(s) (see warnings above)`);
}
}

if (import.meta.main) {
  linkDeck();
}
