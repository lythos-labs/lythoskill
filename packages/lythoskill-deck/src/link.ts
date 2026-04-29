#!/usr/bin/env bun
/**
 * deck-link.ts — Skill Deck reconciler
 *
 * 读取 skill-deck.toml → 计算期望状态 → 收束 working set → 写 lock。
 * 职责：ln -s、预算检查、过期检查、managed_dirs 重叠检测。
 * 不做：语义分析、智能推荐、niche 冲突仲裁。
 */

import { parse as parseToml } from "@iarna/toml";
import { createHash } from "crypto";
import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  symlinkSync, lstatSync, rmSync, writeFileSync,
} from "fs";
import { resolve, dirname, join } from "path";
import { homedir } from "os";
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

function getFrontMatter(skillMdPath: string): string {
  try {
    const c = readFileSync(skillMdPath, "utf-8");
    if (!c.startsWith("---")) return "";
    const parts = c.split("---");
    return parts.length >= 3 ? parts[1] : "";
  } catch { return ""; }
}

function extractField(fm: string, field: string): string {
  const m = fm.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : "";
}

function extractArrayField(fm: string, field: string): string[] {
  const lines = fm.split("\n");
  const results: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (line.match(new RegExp(`^${field}:\\s*$`))) {
      collecting = true;
      continue;
    }
    if (line.match(new RegExp(`^${field}:\\s*\\[`))) {
      const inline = line.match(/\[(.+)\]/);
      if (inline) return inline[1].split(",").map(s => s.trim().replace(/^["']|["']$/g, ""));
      collecting = true;
      continue;
    }
    if (collecting) {
      const item = line.match(/^\s+-\s+(.+)/);
      if (item) {
        results.push(item[1].trim().replace(/^["']|["']$/g, ""));
      } else if (line.trim() !== "" && !line.match(/^\s*#/)) {
        break;
      }
    }
  }
  return results;
}

// ── 冷池查找 ────────────────────────────────────────────────

export function findSource(name: string, coldPool: string, projectDir: string): string | null {
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
      if (existsSync(join(fqPath, "SKILL.md"))) return fqPath;
    }
    // fallback: standalone skill at repo root
    const directPath = join(coldPool, host, owner, repo);
    if (existsSync(join(directPath, "SKILL.md"))) return directPath;
  }

  // 1. 直接路径
  const direct = resolve(coldPool, name);
  if (existsSync(join(direct, "SKILL.md"))) return direct;

  // 2. Monorepo: repo/skill → cold_pool/repo/skills/skill
  if (name.includes("/")) {
    const [repo, ...rest] = name.split("/");
    const mono = join(coldPool, repo, "skills", rest.join("/"));
    if (existsSync(join(mono, "SKILL.md"))) return mono;
  }

  // 3. 项目本地: <project>/skills/<name>（build 输出目录，优先级高于扁平扫描）
  const local = resolve(projectDir, "skills", name);
  if (existsSync(join(local, "SKILL.md"))) return local;

  // 4. 扁平扫描: cold_pool/<any-repo>/<name> 或 <any-repo>/skills/<name>
  //    跳过隐藏目录（agent working set、git、配置等）和 node_modules，
  //    避免把 .claude/skills/ 里的 symlink 误判为有效 cold-pool 源
  try {
    for (const entry of readdirSync(coldPool, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules') continue;
      const base = join(coldPool, entry.name);
      for (const sub of [join(base, name), join(base, "skills", name)]) {
        if (existsSync(join(sub, "SKILL.md"))) return sub;
      }
    }
  } catch {}

  return null;
}

// ── 主流程 ──────────────────────────────────────────────────

export function linkDeck(cliDeckPath?: string, cliWorkdir?: string): void {
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
  console.error(`  skills = ["lythoskill-deck"]`);
  console.error(`  EOF`);
  console.error(`\nOr specify a path: bunx @lythos/skill-deck link --deck /path/to/deck.toml`);
  process.exit(1);
}

const PROJECT_DIR = cliWorkdir ? resolve(cliWorkdir) : dirname(DECK_PATH);
const deckRaw = readFileSync(DECK_PATH, "utf-8");
const deckHash = hashContent(deckRaw);
const deck = parseToml(deckRaw) as any;

const WORKING_SET = expandHome(deck.deck?.working_set || ".claude/skills", PROJECT_DIR);
const COLD_POOL = expandHome(deck.deck?.cold_pool || "~/.agents/skill-repos", PROJECT_DIR);
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
    const src = findSource(name, COLD_POOL, PROJECT_DIR);
    if (!src) {
      errors.push(`skill 未找到: ${name}`);
      continue;
    }
    declared.push({ name, type: section, sourcePath: src });
  }
}

// transient: sub-tables with path field
for (const [key, value] of Object.entries(deck.transient || {})) {
  const t = value as any;
  if (!t?.path) continue;
  const src = resolve(PROJECT_DIR, t.path);
  if (!existsSync(src)) {
    errors.push(`transient 路径不存在: ${key} → ${src}`);
    continue;
  }
  declared.push({ name: key, type: "transient", sourcePath: src, expires: t.expires });
}

if (errors.length > 0) {
  for (const e of errors) console.error(`❌ ${e}`);
  // 继续执行已找到的 skill，不因个别缺失中断全部
}

// ── 预算检查（硬约束，链接前检查）──────────────────────────

if (declared.length > MAX_CARDS) {
  console.error(`❌ 超出预算: 声明 ${declared.length} 个，上限 ${MAX_CARDS}`);
  console.error(`   减少 skill-deck.toml 中的声明，或调整 max_cards`);
  process.exit(1);
}

// ── 收束 working set ────────────────────────────────────────

mkdirSync(WORKING_SET, { recursive: true });

// 清理未声明的条目
const declaredNames = new Set(declared.map(d => d.name.split("/")[0]));
try {
  for (const entry of readdirSync(WORKING_SET)) {
    if (entry.startsWith("_")) continue;
    if (!declaredNames.has(entry)) {
      rmSync(join(WORKING_SET, entry), { recursive: true, force: true });
      console.log(`  🗑️  移除: ${entry}`);
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
    console.error(`❌ 链接失败: ${item.name}: ${err.message}`);
    continue;
  }

  // 提取元数据
  const skillMdPath = join(item.sourcePath, "SKILL.md");
  const fm = getFrontMatter(skillMdPath);
  const niche = extractField(fm, "deck_niche");
  const managedDirs = extractArrayField(fm, "deck_managed_dirs");
  let contentHash: string | undefined;
  try {
    contentHash = hashContent(readFileSync(skillMdPath, "utf-8"));
  } catch {}

  linkedSkills.push({
    name: item.name,
    deck_niche: niche,
    type: item.type,
    source: item.sourcePath,
    dest,
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
    console.warn(`⚠️  过期: ${s.name}（到期 ${s.expires}）— 评估是否仍需要`);
  } else if (days <= 14) {
    console.warn(`⏰ 即将过期: ${s.name}（剩余 ${days} 天）`);
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
    console.warn(`⚠️  目录重叠: ${dir} ← ${owners.join(", ")}`);
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
        console.warn(`⚠️  目录包含关系: ${msg}`);
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
  deck_source: { path: DECK_PATH, content_hash: deckHash },
  working_set: WORKING_SET,
  cold_pool: COLD_POOL,
  skills: linkedSkills,
  constraints,
};

const parsed = SkillDeckLockSchema.safeParse(lock);
if (!parsed.success) {
  console.error("❌ Lock schema 校验失败:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

const LOCK_PATH = resolve(PROJECT_DIR, "skill-deck.lock");
writeFileSync(LOCK_PATH, JSON.stringify(parsed.data, null, 2) + "\n");

// ── 报告 ────────────────────────────────────────────────────

console.log("");
console.log(`✅ 同步完成: ${linkedSkills.length}/${MAX_CARDS} skill`);
console.log(`   lock: ${LOCK_PATH}`);
if (dirOverlaps.length > 0) {
  console.log(`   ⚠️  ${dirOverlaps.length} 个目录重叠（详见上方警告）`);
}
}

if (import.meta.main) {
  linkDeck();
}
