#!/usr/bin/env bun
/**
 * lythoskill-curator CLI — Skill Curator
 *
 * Read-only observer for skill cold pools.
 * Scans SKILL.md frontmatter, builds indices.
 *
 * DESIGN: Curator CLI only scans and produces structured data (REGISTRY.json).
 * Recommendation logic is performed by the agent (LLM) consuming the registry,
 * not by this CLI. See ADR-20260424000744041.
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync, appendFileSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { CatalogDb } from './catalog-db.js'
import YAML from 'yaml'
import { inferSource, extractQuotedPhrases, parseFrontmatter, buildSkillMeta, findSkillDirs, buildAddPlan, buildAdditionRecord, formatMarkdownTable, buildRefreshPlan, formatRefreshPlan } from './curator-core'
import { gitClone } from '@lythos/cold-pool'
import { validateInColdPool, isReadOnlyQuery, safeGit, safeRmSync } from './guard.js'

// ── Types ────────────────────────────────────────────────────

interface SkillMeta {
  name: string; description: string; type: string; version: string;
  path: string; managedDirs: string[]; niches: string[];
  triggerPhrases: string[]; hasScripts: boolean; hasExamples: boolean;
  bodyPreview: string;
  // Source provenance (inferred from cold-pool path, Go-mod style)
  source: string; // e.g. "github.com/anthropics/skills" or "localhost"
  // Agent Skills open-standard fields
  whenToUse: string;
  allowedTools: string[];
  author: string; // from frontmatter; may differ from source org
  userInvocable: boolean | null;
  tags: string[];
  // lythoskill governance extensions
  deckDependencies: Record<string, any>;
  deckSkillType: string | null; // combo | transient | fork | null
  // FSM tracking
  contentHash: string;
  status: string; // parsed | parse_error | incomplete
  parseError: string | null; // error message if YAML.parse threw
}

export interface CuratorIO {
  log?: (msg: string) => void
  error?: (msg: string) => void
  exit?: (code: number) => never
}

const defaultCuratorIO: Required<CuratorIO> = {
  log: console.log,
  error: console.error,
  exit: (code: number) => { process.exit(code) },
}


function toString(val: any): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(' ');
  return String(val || '');
}

function parseArrayField(val: any): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    // Inline array: [a, b] or single value
    const m = val.match(/\[(.*)\]/);
    if (m) return m[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    return val ? [val] : [];
  }
  return [];
}

export function extractQuotedPhrases(text: string): string[] {
  if (!text) return [];
  const triggers: string[] = [];
  // Match quoted phrases with length 2–60 chars to avoid greedy cross-paragraph matches.
  // Supports Chinese quotes (U+201C/U+201D), half-width quotes (U+0022), and apostrophe (U+0027).
  const patterns = [
    /\u201c([^\u201d]{3,60})\u201d/g,
    /"([^"]{3,60})"/g,
    /'([^']{3,60})'/g,
  ];
  for (const p of patterns) {
    for (const m of text.matchAll(p)) {
      triggers.push(m[1]);
    }
  }
  return [...new Set(triggers)];
}

export function scanSkill(path: string): SkillMeta | null {
  const skillMdPath = join(path, 'SKILL.md');
  if (!statSync(skillMdPath, { throwIfNoEntry: false })) return null;
  const text = readFileSync(skillMdPath, 'utf-8');
  const contentHash = createHash('sha256').update(text, 'utf-8').digest('hex');
  const { frontmatter: rawFm, body } = parseFrontmatter(text);

  let frontmatter: Record<string, unknown> = {}
  let parseError: string | null = null
  try {
    frontmatter = YAML.parse(rawFm._raw as string) || {}
  } catch (e) {
    // Frontmatter parse failed — use empty frontmatter, derive basics from path.
    // The skill still exists and has a path; basic metadata is derivable.
    parseError = e instanceof Error ? e.message : String(e)
  }

  const hasScripts = statSync(join(path, 'scripts'), { throwIfNoEntry: false })?.isDirectory() || false;
  const hasExamples = statSync(join(path, 'examples'), { throwIfNoEntry: false })?.isDirectory() || false;

  // Pure metadata transform
  const core = buildSkillMeta(frontmatter, path, body);

  // Structural validation: classify scan quality
  let status = 'parsed'
  if (parseError) {
    status = 'parse_error'
  } else if (!core.description) {
    // description is essential for discovery; without it the skill is effectively invisible
    status = 'incomplete'
  }

  // CLI-specific IO extras
  const managedDirs = frontmatter.deck_managed_dirs || frontmatter.managed_dirs || [];

  return {
    ...core,
    path,
    managedDirs: Array.isArray(managedDirs) ? managedDirs : [managedDirs].filter(Boolean),
    niches: [],  // Agent-enriched via 'tag', not extracted from frontmatter (ADR-20260518123403810)
    hasScripts, hasExamples,
    deckDependencies: frontmatter.deck_dependencies || {},
    // Ensure these match SkillMeta interface
    source: core.source || inferSource(path),
    allowedTools: core.allowedTools,
    name: core.name || basename(path),
    description: core.description.slice(0, 800),
    type: core.type,
    version: core.version,
    triggerPhrases: core.triggerPhrases,
    bodyPreview: body.slice(0, 500).replace(/\s+/g, ' '),
    whenToUse: (frontmatter.when_to_use ? String(frontmatter.when_to_use) : '').slice(0, 800),
    author: core.author || (core.source.split('/')[1] || 'unknown'),
    userInvocable: core.userInvocable,
    tags: core.tags,
    deckSkillType: core.deckSkillType,
    contentHash,
    status,
    parseError,
  };
}

// ── SQLite Catalog Writer (FSM-aware) ─────────────────────────

function writeCatalogDb(dbPath: string, poolPath: string, skills: SkillMeta[], force?: boolean) {
  const db = new CatalogDb(dbPath)
  const now = new Date().toISOString()

  for (const s of skills) {
    // Hash check: skip if content unchanged (unless force)
    if (!force) {
      const currentHash = db.getContentHash(s.path)
      if (currentHash === s.contentHash) {
        // Still valid — update last_seen via catalog_meta
        db.setMeta(`last_seen:${s.path}`, now)
        continue
      }
    }

    const isNew = db.getContentHash(s.path) === null

    // Preserve agent-enriched niches on re-scan (ADR-20260518123403810)
    const existingNiches = !isNew ? db.get<{ niches: string }>(
      `SELECT niches FROM skills WHERE path = $path`, { $path: s.path }
    ) : null
    const niches = existingNiches?.niches ?? '[]'

    db.insertSkill({
      $name: s.name,
      $description: s.description,
      $type: s.type,
      $version: s.version,
      $path: s.path,
      $niches: niches,
      $managed_dirs: JSON.stringify(s.managedDirs),
      $trigger_phrases: JSON.stringify(s.triggerPhrases),
      $has_scripts: s.hasScripts ? 1 : 0,
      $has_examples: s.hasExamples ? 1 : 0,
      $body_preview: s.bodyPreview,
      $source: s.source,
      $when_to_use: s.whenToUse,
      $allowed_tools: JSON.stringify(s.allowedTools),
      $author: s.author,
      $user_invocable: s.userInvocable != null ? (s.userInvocable ? 1 : 0) : null,
      $tags: JSON.stringify(s.tags),
      $deck_dependencies: JSON.stringify(s.deckDependencies),
      $deck_skill_type: s.deckSkillType,
      $content_hash: s.contentHash,
      $status: s.status,
      $indexed_at: isNew ? now : null,
      $last_parsed_at: now,
      $parse_error: s.parseError,
    })
  }

  const meta = db.query(`INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ($key, $value)`)
  meta.run({ $key: 'generated_at', $value: new Date().toISOString() })
  meta.run({ $key: 'last_scan_at', $value: String(Date.now()) })
  meta.run({ $key: 'total_skills', $value: String(skills.length) })
  meta.run({ $key: 'pool_path', $value: poolPath })

  // Prune stale entries — paths in DB that are no longer in the cold pool
  const currentPaths = new Set(skills.map(s => s.path))
  const dbPaths = db.all<{ path: string }>(`SELECT path FROM skills`)
  for (const row of dbPaths) {
    if (!currentPaths.has(row.path)) {
      db.run(`DELETE FROM skills WHERE path = $path`, { $path: row.path })
    }
  }

  db.close()
}

// ── CLI arg parser ───────────────────────────────────────────

function parseCuratorArgs(argv: string[]) {
  let poolPath = `${process.env.HOME}/.agents/skill-repos`;
  let outputDir: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      outputDir = argv[++i];
    } else if (!arg.startsWith('-')) {
      poolPath = arg;
    }
  }

  // Default output: co-located with pool (catalog follows pool).
  // Use --output for an alternative location (e.g. ~/.agents/lythoskill/curator/).
  if (!outputDir) {
    outputDir = `${poolPath}/.lythoskill-curator`
  }

  return { poolPath, outputDir };
}

// ── Main ─────────────────────────────────────────────────────

// ── Backup & Restore ─────────────────────────────────────────

export function backupIndex(outputDir: string, io: CuratorIO = defaultCuratorIO): { registryBak: string; dbBak: string } | null {
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const registryPath = join(outputDir, 'REGISTRY.json');
  const dbPath = join(outputDir, 'catalog.db');
  let registryBak: string | null = null;
  let dbBak: string | null = null;

  if (existsSync(registryPath)) {
    registryBak = `${registryPath}.bak.${timestamp}`;
    writeFileSync(registryBak, readFileSync(registryPath, 'utf-8'));
  }
  if (existsSync(dbPath)) {
    dbBak = `${dbPath}.bak.${timestamp}`;
    // SQLite backup: just copy the file
    writeFileSync(dbBak, readFileSync(dbPath));
  }

  if (registryBak || dbBak) {
    io.log!(`🛡️  Backup created:`);
    if (registryBak) io.log!(`   REGISTRY.json → ${basename(registryBak)}`);
    if (dbBak) io.log!(`   catalog.db → ${basename(dbBak)}`);
  }
  return registryBak || dbBak ? { registryBak: registryBak || '', dbBak: dbBak || '' } : null;
}

export function restoreIndex(outputDir: string, io: CuratorIO = defaultCuratorIO) {
  const registryPath = join(outputDir, 'REGISTRY.json');
  const dbPath = join(outputDir, 'catalog.db');

  // Find the most recent backup for each
  const entries = readdirSync(outputDir, { withFileTypes: true })
    .filter(e => e.isFile() && (e.name.startsWith('REGISTRY.json.bak.') || e.name.startsWith('catalog.db.bak.')))
    .map(e => ({ name: e.name, path: join(outputDir, e.name), mtime: statSync(join(outputDir, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const regBak = entries.find(e => e.name.startsWith('REGISTRY.json.bak.'));
  const dbBak = entries.find(e => e.name.startsWith('catalog.db.bak.'));

  if (!regBak && !dbBak) {
    io.error!('❌ No backup found to restore.');
    io.exit!(1);
  }

  if (regBak) {
    writeFileSync(registryPath, readFileSync(regBak.path, 'utf-8'));
    io.log!(`✅ Restored REGISTRY.json from ${regBak.name}`);
  }
  if (dbBak) {
    writeFileSync(dbPath, readFileSync(dbBak.path));
    io.log!(`✅ Restored catalog.db from ${dbBak.name}`);
  }
}

export function runCurator(argv: string[], io: CuratorIO = defaultCuratorIO) {
  const { poolPath, outputDir } = parseCuratorArgs(argv);

  const skillDirs = findSkillDirs(poolPath);

  const skills: SkillMeta[] = [];
  const skipped: { path: string; reason: string }[] = [];
  for (const path of skillDirs) {
    try {
      const s = scanSkill(path);
      if (s) { skills.push(s); }
      else { skipped.push({ path, reason: 'missing SKILL.md' }); }
    } catch (e) {
      skipped.push({ path, reason: `crash: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  const degraded = skills.filter(s => s.status !== 'parsed')
  io.log(`🧠 Skill Curator — Indexed ${skills.length} skills`);
  if (degraded.length > 0) {
    io.log(`⚠️  ${degraded.length} skill(s) indexed with degraded status:`);
    for (const s of degraded) {
      const tag = s.status === 'parse_error' ? 'YAML' : s.status === 'incomplete' ? 'MISSING' : s.status;
      io.log(`   [${tag}] ${s.path}${s.parseError ? ` — ${s.parseError}` : ''}`);
    }
  }
  if (skipped.length > 0) {
    io.log(`🚫 ${skipped.length} skill(s) skipped (unreadable):`);
    for (const s of skipped) io.log(`   [${s.reason}] ${s.path}`);
  }

  const byType: Record<string, SkillMeta[]> = {};
  const byManagedDir: Record<string, string[]> = {};
  const byNiche: Record<string, string[]> = {};
  const byDeckSkillType: Record<string, SkillMeta[]> = {};
  for (const s of skills) {
    byType[s.type] = byType[s.type] || []; byType[s.type].push(s);
    s.managedDirs.forEach(d => { byManagedDir[d] = byManagedDir[d] || []; byManagedDir[d].push(s.name); });
    s.niches.forEach(n => { byNiche[n] = byNiche[n] || []; byNiche[n].push(s.name); });
    if (s.deckSkillType) {
      byDeckSkillType[s.deckSkillType] = byDeckSkillType[s.deckSkillType] || [];
      byDeckSkillType[s.deckSkillType].push(s);
    }
  }
  io.log(`\n📊 Types: ${Object.entries(byType).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  if (Object.keys(byNiche).length > 0) {
    io.log(`\n🏷️  Niches: ${Object.entries(byNiche).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  }
  if (Object.keys(byDeckSkillType).length > 0) {
    io.log(`\n🔖 Deck skill types: ${Object.entries(byDeckSkillType).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  }
  io.log(`\n📂 Dir overlap:`);
  Object.entries(byManagedDir).filter(([_, n]) => n.length > 1).forEach(([d, n]) => io.log(`   ${d}: ${n.join(', ')}`));

  mkdirSync(outputDir, { recursive: true });

  // Backup before rebuild (reconciler hygiene: never destroy without backup)
  backupIndex(outputDir, io);

  const outPath = join(outputDir, 'REGISTRY.json');
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), poolPath, totalSkills: skills.length, skills, index: { byType, byManagedDir, byNiche, byDeckSkillType } }, null, 2));
  io.log(`\n💾 Registry: ${outPath}`);

  const dbPath = join(outputDir, 'catalog.db');
  writeCatalogDb(dbPath, poolPath, skills);
  io.log(`💾 Catalog DB: ${dbPath}`);
}

// ── Markdown table formatter ─────────────────────────────────

function formatMarkdownTable(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '*No results.*'
  const MAX_COL_WIDTH = 60
  const cols = Object.keys(rows[0])
  const normalize = (s: any) => String(s ?? '').replace(/\s+/g, ' ').trim()
  const widths = cols.map(c => Math.min(MAX_COL_WIDTH, Math.max(c.length, ...rows.map(r => normalize(r[c]).length))))
  const truncate = (s: string, width: number) => {
    if (s.length <= width) return s.padEnd(width)
    return s.slice(0, width - 1) + '…'
  }
  const sep = cols.map((_, i) => '-'.repeat(widths[i])).join(' | ')
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ')
  const lines = [header, sep]
  for (const row of rows) {
    lines.push(cols.map((c, i) => truncate(normalize(row[c]), widths[i])).join(' | '))
  }
  return lines.join('\n')
}

// ── Query subcommand ─────────────────────────────────────────

function printSchema(db: CatalogDb): string {
  const out: string[] = []
  out.push('## catalog.db schema\n')

  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]
  for (const { name } of tables) {
    out.push(`### Table: \`${name}\``)
    const cols = db.query(`PRAGMA table_info(${name})`).all() as { cid: number; name: string; type: string; notnull: number; dflt_value: any; pk: number }[]
    const rows = cols.map(c => ({
      column: c.name,
      type: c.type,
      nullable: c.notnull ? 'NOT NULL' : 'NULL',
      default: c.dflt_value ?? '',
      pk: c.pk ? 'PK' : '',
    }))
    out.push(formatMarkdownTable(rows))
    out.push('')
  }

  out.push('### Example queries')
  out.push('```bash')
  out.push('lythoskill-curator query "SELECT name, type FROM skills WHERE deck_skill_type = \'combo\'"')
  out.push('lythoskill-curator query "SELECT name, niches FROM skills WHERE niches LIKE \'%agent-tagged%\'"')
  out.push('lythoskill-curator query --db ./catalog.db "SELECT * FROM catalog_meta"')
  out.push('```')
  return out.join('\n')
}

function resolveDbPath(argv: string[]): string | undefined {
  let dbPath: string | undefined
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if ((arg === '--db' || arg === '-d') && argv[i + 1]) {
      dbPath = argv[++i]
    } else if (!arg.startsWith('-')) {
      positional.push(arg)
    }
  }

  if (dbPath) return dbPath

  // If first positional arg looks like a db path and exists, use it
  if (positional[0] && (positional[0].endsWith('.db') || positional[0].includes('/')) && existsSync(positional[0])) {
    return positional[0]
  }

  // Default: ./catalog.db
  if (existsSync('./catalog.db')) {
    return './catalog.db'
  }

  // Fallback: common locations. Catalog follows pool: pool-co-located first.
  const candidates = [
    `${process.env.HOME}/.agents/skill-repos/.lythoskill-curator/catalog.db`,  // default pool co-located
    `${process.env.HOME}/.agents/lythoskill/curator/catalog.db`,               // legacy global (ADR-20260511210000000)
    `${process.env.HOME}/.agents/lythos/skill-curator/catalog.db`,             // legacy (pre-0.9.51)
  ]
  let fallback: string | undefined
  for (const c of candidates) {
    if (!existsSync(c)) continue
    try {
      const testDb = new CatalogDb(c)
      const n = (testDb.query('SELECT COUNT(*) as n FROM skills').get() as { n: number } | null)?.n ?? 0
      testDb.close()
      if (n > 0) return c                               // first populated catalog wins
      if (!fallback) fallback = c
    } catch {
      if (!fallback) fallback = c
    }
  }
  if (fallback) return fallback

  return undefined
}

export function runQuery(argv: string[], io: CuratorIO = defaultCuratorIO) {
  const { log, error, exit } = { ...defaultCuratorIO, ...io }
  let sql: string | undefined
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if ((arg === '--db' || arg === '-d') && argv[i + 1]) {
      // consume but don't store here — resolveDbPath will handle it
      argv[++i]
    } else if (!arg.startsWith('-')) {
      positional.push(arg)
    }
  }

  // Heuristic: if first positional arg is a db file, skip it for sql
  let dbPath = resolveDbPath(argv)
  if (positional[0] && dbPath && positional[0] === dbPath) {
    sql = positional.slice(1).join(' ')
  } else {
    sql = positional.join(' ')
  }

  if (!sql || sql.trim() === '') {
    if (!dbPath || !existsSync(dbPath)) {
      error('Usage: lythoskill-curator query <SQL> [--db <path>]')
      error('')
      error('Examples:')
      error('  lythoskill-curator query "SELECT name, type FROM skills"')
      error('  lythoskill-curator query --db ./catalog.db "SELECT * FROM catalog_meta"')
      exit(1)
    }
    const db = new CatalogDb(dbPath)
    try {
      log(printSchema(db))
    } finally {
      db.close()
    }
    return
  }

  if (!dbPath || !existsSync(dbPath)) {
    error('❌ Catalog DB not found.')
    error('')
    if (dbPath) {
      error(`  Searched: ${dbPath}`)
    } else {
      error('  Searched default locations:')
      error('    ./catalog.db')
      error('    ~/.agents/skill-repos/.lythoskill-curator/catalog.db')
      error('    ~/.agents/lythoskill/curator/catalog.db')
      error('    ~/.agents/lythos/skill-curator/catalog.db')
    }
    error('')
    error('This usually means:')
    error('  1. You have not run curator scan yet')
    error('  2. The index was generated in a different location')
    error('')
    error('To fix:')
    error('  lythoskill-curator                          # scan default cold pool')
    error('  lythoskill-curator <pool> --output <dir>    # custom pool / output')
    error('')
    error('Or specify the exact db path:')
    error(`  lythoskill-curator query --db ./catalog.db "${sql || 'SELECT * FROM skills'}"`)
    exit(1)
  }

  const db = new CatalogDb(dbPath)
  try {
    // Show index freshness
    try {
      const generatedRow = db.query("SELECT value FROM catalog_meta WHERE key = 'generated_at'").get() as { value: string } | null
      if (generatedRow?.value) {
        const ageMs = Date.now() - new Date(generatedRow.value).getTime()
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        error(`ℹ️  Index generated at: ${generatedRow.value}`)
        if (ageDays > 7) {
          error(`⚠️  Index is ${Math.floor(ageDays)} days old. Consider refreshing:`)
          error('   lythoskill-curator')
        }
        error('')
      }
    } catch {
      // DB query for index freshness failed — non-fatal, index may be stale
    }

    if (!isReadOnlyQuery(sql)) {
      error('❌ Query rejected: only SELECT and PRAGMA statements are allowed.')
      error('   Use curator scan/audit for write operations.')
      exit(1)
    }
    const rows = db.query(sql).all() as Record<string, any>[]
    log(formatMarkdownTable(rows))
  } catch (e: any) {
    error(`❌ SQL error: ${e.message}`)
    error('')
    error('Hint: check available tables and columns:')
    error(`  lythoskill-curator query --db ${dbPath} "PRAGMA table_info(skills)"`)
    error(`  lythoskill-curator query --db ${dbPath} "SELECT name FROM sqlite_master WHERE type='table'"`)
    exit(1)
  } finally {
    db.close()
  }
}

// ── Find subcommand ──────────────────────────────────────────
// ADR-20260519225831495: bare name → full path lookup

export function runFind(argv: string[], io: CuratorIO = defaultCuratorIO) {
  // Parse --db flag
  let dbPath: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--db' || argv[i] === '-d') && argv[i + 1]) {
      dbPath = argv[++i]
    }
  }

  // If no explicit --db, search canonical first, then legacy fallbacks.
  // Prefer populated catalog over empty one (canonical may be empty if migration not done).
  if (!dbPath) {
    const candidates = [
      `${process.env.HOME}/.agents/skill-repos/.lythoskill-curator/catalog.db`,  // default pool co-located
      `${process.env.HOME}/.agents/lythoskill/curator/catalog.db`,               // legacy global
      `${process.env.HOME}/.agents/lythos/skill-curator/catalog.db`,             // legacy (pre-0.9.51)
    ]
    let foundPath: string | undefined
    for (const c of candidates) {
      if (!existsSync(c)) continue
      try {
        const testDb = new CatalogDb(c)
        const n = (testDb.query('SELECT COUNT(*) as n FROM skills').get() as { n: number } | null)?.n ?? 0
        testDb.close()
        if (n > 0) { foundPath = c; break }  // first populated catalog wins
        if (!foundPath) foundPath = c          // empty catalog as last resort
      } catch {
        if (!foundPath) foundPath = c
      }
    }
    dbPath = foundPath || candidates[0]
  }

  const bareName = argv.find(a => !a.startsWith('-'))
  if (!bareName) {
    io.error('Usage: lythoskill-curator find <bare-name> [--db <path>]')
    io.error('')
    io.error('Look up a skill by its bare name in the local cold pool index.')
    io.error('Returns full locator path + ready-to-use deck add command.')
    io.error('')
    io.error('Example:')
    io.error('  lythoskill-curator find fullstack-dev')
    io.exit(1)
  }

  if (!existsSync(dbPath)) {
    io.error('❌ Catalog DB not found.')
    io.error('')
    io.error('Run `lythoskill-curator` first to scan the cold pool:')
    io.error(`  lythoskill-curator ${process.env.HOME}/.agents/skill-repos`)
    io.exit(1)
  }

  const db = new CatalogDb(dbPath)
  try {
    // Read cold pool path from catalog meta to reconstruct locator paths
    const poolPath = db.getMeta('pool_path') || ''

    // Detect empty catalog (0 skills = scan was never run or ran against empty pool)
    const skillCount = (db.query('SELECT COUNT(*) as n FROM skills').get() as { n: number } | null)?.n ?? 0
    if (skillCount === 0) {
      io.error('⚠️  Catalog is empty (0 skills indexed).')
      io.error('')
      io.error('Run a full scan against your cold pool:')
      io.error(`  lythoskill-curator ${process.env.HOME}/.agents/skill-repos`)
      io.exit(1)
    }

    // Show index freshness
    const lastScan = db.getMeta('last_scan_at') || db.getMeta('generated_at')
    if (lastScan) {
      const age = Math.round((Date.now() - Number(lastScan)) / 86400000)
      if (age > 3) {
        io.error(`⚠️  Catalog last scanned ${age} days ago. Skills added since may not appear.`)
        io.error(`  Re-scan: lythoskill-curator ${process.env.HOME}/.agents/skill-repos`)
        io.error('')
      }
    }

    const matches = db.all<{ name: string; path: string; type: string; description: string; niches: string }>(
      `SELECT name, path, type, description, niches FROM skills WHERE name = $name`,
      { $name: bareName }
    )

    // Convert local filesystem paths to locator paths
    const toLocator = (localPath: string): string => {
      if (!poolPath) return localPath
      let rel = localPath
      if (rel.startsWith(poolPath + '/')) rel = rel.slice(poolPath.length + 1)
      else if (rel.startsWith(poolPath)) rel = rel.slice(poolPath.length)
      return rel
    }

    // Extract metadata tags for display (hub references, domain classification)
    const metaTags = (niches: string): string[] => {
      try {
        const parsed = JSON.parse(niches)
        if (!Array.isArray(parsed)) return []
        return parsed.filter((n: string) => n.startsWith('hub/') || n.startsWith('domain/'))
      } catch { return [] }
    }

    if (matches.length === 0) {
      io.log(`🔍 "${bareName}" not found in local cold pool.`)
      io.log('')
      io.log('To add it:')
      io.log(`  1. gh search code "${bareName}" --filename "SKILL.md"  ← find the repo`)
      io.log(`  2. curator add github.com/<owner>/<repo> --pool ~/.agents/skill-repos`)
      io.log(`  3. curator find ${bareName}  # then it will hit`)
      io.log('')
      io.log('Or ask your agent — it can gh search code → curator add → deck add in one flow.')
      io.exit(0)
    }

    if (matches.length > 1) {
      io.log(`⚠️  ${matches.length} skills share the name "${bareName}":`)
      io.log('')
      for (const m of matches) {
        const tags = metaTags(m.niches)
        const tagStr = tags.length > 0 ? `  🏷️  ${tags.join(', ')}` : ''
        io.log(`  ${m.name}  →  ${toLocator(m.path)}  (${m.type})${tagStr}`)
      }
      io.log('')
      io.log('Pick ONE and specify its full path with deck add:')
      io.log(`  bunx @lythos/skill-deck add ${matches[0].name} --path ${toLocator(matches[0].path)}`)
      if (matches.length > 2) {
        for (let i = 1; i < Math.min(matches.length, 4); i++) {
          io.log(`  # or: --path ${toLocator(matches[i].path)}`)
        }
      }
      io.log('')
      io.log('⚠️  deck link will fail if two skills have the same name. Choose one.')
      io.exit(0)
    }

    const skill = matches[0]
    const locatorPath = toLocator(skill.path)
    const tags = metaTags(skill.niches)
    io.log('')
    io.log(`  name: ${skill.name}`)
    io.log(`  path: ${locatorPath}`)
    io.log(`  type: ${skill.type}`)
    if (tags.length > 0) io.log(`  refs: ${tags.join(', ')}`)
    io.log('')
    io.log('  # deck add:')
    io.log(`  bunx @lythos/skill-deck add ${skill.name} \\`)
    io.log(`    --path ${locatorPath}`)
    io.log('')
    io.log('  # or add to skill-deck.toml:')
    io.log(`  [tool.skills.${skill.name}]`)
    io.log(`  path = "${locatorPath}"`)
    io.log('')
  } finally {
    db.close()
  }
}

// ── Audit subcommand ─────────────────────────────────────────

interface AuditCheck {
  title: string
  rows: Record<string, any>[]
  count: number
}

// Known deprecated patterns — mechanical detection, agent judges severity (ADR-20260518123403810)
const LEGACY_PATTERNS = [
  { pattern: /skills\.sh/i, message: 'references deprecated skills.sh marketplace; use agent WebSearch + curator add' },
  { pattern: /deck\s+status\s+sh/i, message: 'references removed deck status sh command' },
  { pattern: /HANDOFF\.md/i, message: 'references deprecated HANDOFF.md; use daily/YYYY-MM-DD.md (ADR-20260424125637347)' },
  { pattern: /deck\s+update/i, message: 'references deprecated deck update; use deck refresh' },
]

function checkLegacyPatterns(db: CatalogDb): { name: string; path: string; pattern: string }[] {
  const results: { name: string; path: string; pattern: string }[] = []
  const skills = db.all<{ name: string; path: string }>(`SELECT name, path FROM skills`)
  for (const s of skills) {
    const skillMdPath = join(s.path, 'SKILL.md')
    if (!existsSync(skillMdPath)) continue
    try {
      const body = readFileSync(skillMdPath, 'utf-8')
      for (const lp of LEGACY_PATTERNS) {
        if (lp.pattern.test(body)) {
          results.push({ name: s.name, path: s.path, pattern: lp.message })
        }
      }
    } catch {
      // unreadable SKILL.md — structural audit catches this separately
    }
  }
  return results
}

export function runAudit(argv: string[], io: CuratorIO = defaultCuratorIO) {
  const dbPath = resolveDbPath(argv)

  if (!dbPath || !existsSync(dbPath)) {
    io.error!('❌ Catalog DB not found.')
    io.error!('')
    io.error!('Searched:')
    io.error!('  ./catalog.db')
    io.error!('  ~/.agents/skill-repos/.lythoskill-curator/catalog.db')
    io.error!('  ~/.agents/lythoskill/curator/catalog.db')
    io.error!('  ~/.agents/lythos/skill-curator/catalog.db')
    io.error!('')
    io.error!('Run `lythoskill-curator` first to build the index.')
    io.exit!(1)
  }

  const db = new CatalogDb(dbPath)
  const checks: AuditCheck[] = []

  try {
    // 1. Missing frontmatter
    const missingFrontmatter = db.query(`
      SELECT name, path, version, description, when_to_use FROM skills
      WHERE version = '' OR version IS NULL OR version = 'unknown'
         OR description = '' OR description IS NULL
         OR when_to_use = '' OR when_to_use IS NULL
    `).all() as Record<string, any>[]
    checks.push({ title: 'Missing frontmatter (version, description, or when_to_use)', rows: missingFrontmatter, count: missingFrontmatter.length })

    // 2. Type anomalies
    const typeAnomalies = db.query(`
      SELECT name, path, type FROM skills
      WHERE type NOT IN ('standard', 'flow')
    `).all() as Record<string, any>[]
    checks.push({ title: 'Type anomalies (not standard or flow)', rows: typeAnomalies, count: typeAnomalies.length })

    // 3. Orphan scripts (has_scripts=1 but no scripts/ dir on disk)
    const scriptPaths = db.query(`
      SELECT name, path FROM skills WHERE has_scripts = 1
    `).all() as { name: string; path: string }[]
    const orphanScripts: Record<string, any>[] = []
    for (const s of scriptPaths) {
      if (!existsSync(join(s.path, 'scripts'))) {
        orphanScripts.push({ name: s.name, path: s.path, issue: 'scripts dir missing' })
      }
    }
    checks.push({ title: 'Orphan scripts (has_scripts=true but no scripts/ dir)', rows: orphanScripts, count: orphanScripts.length })

    // 4. dao_shu_qi_yong coverage (deck_skill_type)
    const coverage = db.query(`
      SELECT CASE WHEN deck_skill_type IS NULL OR deck_skill_type = '' THEN '(unset)' ELSE deck_skill_type END AS deck_skill_type, COUNT(*) AS count
      FROM skills
      GROUP BY CASE WHEN deck_skill_type IS NULL OR deck_skill_type = '' THEN '(unset)' ELSE deck_skill_type END
    `).all() as Record<string, any>[]
    checks.push({ title: 'dao_shu_qi_yong coverage (deck_skill_type)', rows: coverage, count: 0 })

    // 5. Legacy pattern check (mechanical detection, agent judges)
    const legacyIssues = checkLegacyPatterns(db)
    checks.push({ title: 'Legacy patterns (deprecated references in SKILL.md body)', rows: legacyIssues, count: legacyIssues.length })

    // Total skills
    const totalResult = db.query(`SELECT COUNT(*) AS total FROM skills`).get() as { total: number }
    const total = totalResult?.total || 0

    // Output report
    let totalIssues = 0
    for (const check of checks) {
      io.log!(`\n### ${check.title}: ${check.count} issue${check.count === 1 ? '' : 's'}`)
      if (check.rows.length > 0) {
        io.log!(formatMarkdownTable(check.rows))
      } else {
        io.log!('*None found.*')
      }
      if (!check.title.includes('coverage')) {
        totalIssues += check.count
      }
    }

    const score = Math.max(0, 100 - Math.round((totalIssues / Math.max(total, 1)) * 100))
    io.log!(`\n---`)
    io.log!(`**Summary:** ${total} skills scanned, ${totalIssues} issue${totalIssues === 1 ? '' : 's'} found.`)
    io.log!(`**Audit score:** ${score}/100`)

  } catch (e: any) {
    io.error!(`❌ Audit error: ${e.message}`)
    io.exit!(1)
  } finally {
    db.close()
  }
}

// ── Add: download to cold pool only (no deck.toml, no link) ──

/** Parse a named flag value: --flag <value> */
function getFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag)
  return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : undefined
}

/** Append a SkillAddition record to {outputDir}/additions.jsonl */
export function writeAddition(outputDir: string, record: ReturnType<typeof buildAdditionRecord>) {
  const metaDir = outputDir
  mkdirSync(metaDir, { recursive: true })
  const file = join(metaDir, 'additions.jsonl')
  appendFileSync(file, JSON.stringify(record) + '\n')
}


// ── refresh-plan + refresh-execute ────────────────────────────────

function getPoolPath(argv: string[]): string {
  return getFlag(argv, '--pool') || `${process.env.HOME}/.agents/skill-repos`
}

async function runRefreshPlan(argv: string[]) {
  const poolPath = getPoolPath(argv)
  const metaDir = join(poolPath, '.lythoskill-curator')
  mkdirSync(metaDir, { recursive: true })

  console.log(`🔍 Scanning cold pool for git repos...`)
  const plan = buildRefreshPlan(poolPath)
  console.log(`   Found ${plan.items.length} repo(s) in ${poolPath}`)

  // Fetch remotes to check behind counts (network IO)
  console.log(`\n📡 Checking upstreams...`)
  for (const item of plan.items) {
    try {
      safeGit(["-C", item.path, "remote", "update"], { timeout: 15000 })
      const count = safeGit(["-C", item.path, "rev-list", "HEAD...@{upstream}", "--count"], { timeout: 5000 })
      item.behind = count ? parseInt(count) : 0
    } catch {
      item.behind = -1 // unreachable
    }
    const status = item.behind > 0 ? `${item.behind} behind` : item.behind === 0 ? 'up to date' : 'unreachable'
    console.log(`   ${item.locator}: ${status}`)
  }

  // Write TODO file
  const planPath = join(metaDir, 'refresh-plan.md')
  writeFileSync(planPath, formatRefreshPlan(plan))
  const pending = plan.items.filter(i => i.behind > 0).length
  console.log(`\n📋 Refresh plan written: ${planPath}`)
  console.log(`   ${pending} repo(s) behind, ${plan.items.length - pending} up to date`)
  console.log(`\n💡 To execute: bunx @lythos/skill-curator refresh-execute --pool ${poolPath}`)
}

async function runRefreshExecute(argv: string[]) {
  const poolPath = getPoolPath(argv)
  const planPath = join(poolPath, '.lythoskill-curator', 'refresh-plan.md')

  if (!existsSync(planPath)) {
    console.error('No refresh plan found. Run refresh-plan first.')
    process.exit(1)
  }

  const plan = buildRefreshPlan(poolPath)

  // Check behind counts again (may have changed)
  for (const item of plan.items) {
    try {
      const count = safeGit(["-C", item.path, "rev-list", "HEAD...@{upstream}", "--count"], { timeout: 5000 })
      item.behind = count ? parseInt(count) : 0
    } catch {
      item.behind = -1
    }
  }

  const pending = plan.items.filter(i => i.behind > 0)
  if (pending.length === 0) {
    console.log('✅ All repos up to date.')
    return
  }

  console.log(`📦 ${pending.length} repo(s) to pull:\n`)
  for (const item of pending) {
    console.log(`   ${item.locator} (${item.behind} behind)`)
  }
  console.log()

  // Pull one by one, marking progress
  for (const item of pending) {
    try {
      console.log(`🔄 Pulling: ${item.locator}...`)
      safeGit(["-C", item.path, "pull", "--ff-only"], { stdio: 'inherit', timeout: 30000 })
      item.status = 'done'
      console.log(`   ✅ Done\n`)
    } catch {
      item.status = 'skip'
      console.log(`   ⚠️  Failed, skipped\n`)
    }
    // Rewrite plan after each pull (progress marker)
    writeFileSync(planPath, formatRefreshPlan(plan))
  }

  const done = plan.items.filter(i => i.status === 'done').length
  const skipped = plan.items.filter(i => i.status === 'skip').length
  console.log(`🎉 Refresh complete: ${done} pulled, ${skipped} skipped`)
}

export function runAdd(argv: string[], io: CuratorIO = defaultCuratorIO) {
  const locator = argv.find(a => !a.startsWith('-'))
  if (!locator) {
    io.error('Usage: lythoskill-curator add <github.com/owner/repo> --pool <dir> [--output <dir>] [--reason <text>] [--forked-from <locator>] [--branch <name>] [--full]')
    io.exit(1)
  }

  const poolPath = getFlag(argv, '--pool')
  if (!poolPath) {
    io.error('Error: --pool <dir> is required.')
    io.error('Usage: lythoskill-curator add <github.com/owner/repo> --pool <dir>')
    io.exit(1)
  }
  const outputDir = getFlag(argv, '--output') || `${poolPath}/.lythoskill-curator`

  const dryRun = argv.includes('--dry-run')
  const plan = buildAddPlan(locator, poolPath)

  if (dryRun) {
    io.log(`🔎 Dry-run: curator add ${locator}`)
    io.log(`   Pool:   ${poolPath}`)
    io.log(`   Output: ${outputDir}`)
    io.log(`   Repo:   ${plan.repoRoot}`)
    if (plan.skillPath) io.log(`   Skill:  ${plan.skillPath}`)
    io.log()

    // Checkpoint 1: Repo status
    if (existsSync(join(plan.repoPath, '.git'))) {
      io.log(`📂 Repo status: already cloned`)
      if (plan.skillPath) {
        const skillMd = join(plan.repoPath, plan.skillPath, 'SKILL.md')
        if (existsSync(skillMd)) {
          io.log(`📄 Skill path:  valid — ${plan.repoPath}/${plan.skillPath}/SKILL.md`)
        } else {
          io.log(`⚠️  Skill path:  NOT FOUND — ${plan.repoPath}/${plan.skillPath}/SKILL.md`)
          io.log(`\n💡 Check repo layout: ls ${plan.repoPath}/`)
        }
      }
    } else if (existsSync(plan.repoPath)) {
      io.log(`🧹 Repo status: partial clone residue (dir exists but no .git) — would auto-clean`)
      io.log(`📦 Would clone: https://${plan.repoRoot}.git`)
    } else {
      io.log(`📂 Repo status: not in cold pool`)
      io.log(`📦 Would clone: https://${plan.repoRoot}.git --depth 1`)
    }

    // Checkpoint 2: Addition record preview
    const reason = getFlag(argv, '--reason') || '(none)'
    const forkedFrom = getFlag(argv, '--forked-from')
    io.log(`\n📝 Would write additions record:`)
    io.log(`   reason:      ${reason}`)
    io.log(`   forkedFrom:  ${forkedFrom || '(none)'}`)
    io.log(`   status:      ${forkedFrom ? 'forked' : 'added'}`)
    io.log(`\n💡 Remove --dry-run to execute.`)
    return
  }

  // ── Checkpoint 1: Repo already in cold pool? ──────────────────────
  const repoExists = existsSync(join(plan.repoPath, '.git'))
  const repoDirExists = existsSync(plan.repoPath)

  if (repoExists) {
    // Repo is cloned. If this is a monorepo skill, verify its path.
    if (plan.skillPath) {
      if (existsSync(join(plan.repoPath, plan.skillPath, 'SKILL.md'))) {
        io.log(`✅ Skill already in cold pool: ${plan.relPath}`)
        io.log(`   Repo: ${plan.repoRoot}`)
        io.log(`   Skill: ${plan.skillPath}`)
        return
      }
      io.error(`❌ Repo exists (${plan.repoRoot}) but skill path not found:`)
      io.error(`   ${plan.repoPath}/${plan.skillPath}/SKILL.md`)
      io.error(`\n💡 The repo structure may have changed. Check the actual layout:`)
      io.error(`   ls ${plan.repoPath}/`)
      io.exit(1)
    }
    io.log(`✅ Repo already in cold pool: ${plan.relPath}`)
    return
  }

  if (repoDirExists) {
    // Directory exists but no .git — partial clone residue. Clean up.
    // Validate path stays within cold pool before rmSync (CWE-22)
    const safePath = validateInColdPool(plan.repoPath, poolPath)
    io.log(`🧹 Cleaning up partial clone: ${safePath}`)
    rmSync(safePath, { recursive: true, force: true })
  }

  // ── Checkpoint 2: Clone repo root (not skill-specific URL) ────────
  const reason = getFlag(argv, '--reason') || ''
  const forkedFrom = getFlag(argv, '--forked-from')
  const fullClone = argv.includes('--full')
  const branch = getFlag(argv, '--branch')
  const depthFlag = fullClone ? '' : '--depth 1'
  const branchFlag = branch ? `--branch ${branch}` : ''

  const cloneUrl = `https://${plan.repoRoot}.git`
  io.log(`📦 Cloning: ${cloneUrl}${fullClone ? '' : ' (--depth 1)'}`)
  if (plan.skillPath) {
    io.log(`   Skill path inside repo: ${plan.skillPath}`)
  }

  try {
    mkdirSync(plan.repoPath, { recursive: true })
    gitClone(cloneUrl, plan.repoPath, {
      depth: fullClone ? 0 : 1,
      ref: branch,
      stdio: 'inherit',
    })

    // Verify the skill path exists within the cloned repo
    if (plan.skillPath && !existsSync(join(plan.repoPath, plan.skillPath, 'SKILL.md'))) {
      io.error(`❌ Cloned ${plan.repoRoot} but skill path not found:`)
      io.error(`   ${plan.repoPath}/${plan.skillPath}/SKILL.md`)
      io.error(`\n💡 Check the actual repo structure:`)
      try { io.error(safeGit(["-C", plan.repoPath, "ls-files"], { timeout: 5000 })) } catch {}
      io.exit(1)
    }

    // Persist decision record
    const record = buildAdditionRecord(locator, plan.feed, reason, forkedFrom)
    writeAddition(outputDir, record)

    io.log(`✅ Skill added to cold pool: ${plan.relPath}`)
    io.log(`   Location: ${plan.targetPath}`)
    if (forkedFrom) io.log(`   Forked from: ${forkedFrom}`)
    if (reason) io.log(`   Reason: ${reason}`)
    io.log(`📝 Addition logged: ${join(outputDir, 'additions.jsonl')}`)

    // Write-through cache: index the new skill immediately (ADR-20260518123403810)
    // Curator scan is the reconciliation loop that fixes any drift later.
    let dbUpdated = false
    try {
      const skillDirs = findSkillDirs(plan.repoPath)
      if (skillDirs.length > 0) {
        mkdirSync(outputDir, { recursive: true })
        const dbPath = join(outputDir, 'catalog.db')

        // Scan new skills and write to existing index (merge, not rebuild)
        for (const skillDir of skillDirs) {
          const s = scanSkill(skillDir)
          if (s) {
            const db = new CatalogDb(dbPath)
            try {
              db.insertSkill({
                $name: s.name, $description: s.description, $type: s.type,
                $version: s.version, $path: s.path,
                $niches: JSON.stringify([]),
                $managed_dirs: JSON.stringify(s.managedDirs),
                $trigger_phrases: JSON.stringify(s.triggerPhrases),
                $has_scripts: s.hasScripts ? 1 : 0,
                $has_examples: s.hasExamples ? 1 : 0,
                $body_preview: s.bodyPreview,
                $source: s.source, $when_to_use: s.whenToUse,
                $allowed_tools: JSON.stringify(s.allowedTools),
                $author: s.author,
                $user_invocable: s.userInvocable != null ? (s.userInvocable ? 1 : 0) : null,
                $tags: JSON.stringify(s.tags),
                $deck_dependencies: JSON.stringify(s.deckDependencies),
                $deck_skill_type: s.deckSkillType,
                $content_hash: s.contentHash,
                $status: 'parsed',
                $indexed_at: new Date().toISOString(),
                $last_parsed_at: new Date().toISOString(),
                $parse_error: null,
              })
              io.log(`   📇 Indexed: ${s.name}`)
              dbUpdated = true
            } finally {
              db.close()
            }
          }
        }
      }
      if (dbUpdated) {
        io.log(`📇 Index updated:   ${join(outputDir, 'catalog.db')}`)
      }
    } catch {
      io.log(`   ⚠️  Index update skipped (will catch up on next scan)`)
    }

    io.log(`\n💡 To use this skill in a project, run:`)
    io.log(`   bunx @lythos/skill-deck add ${plan.relPath} --as <alias>`)
  } catch (e: any) {
    // Clean up empty directory left by failed clone
    try {
      if (existsSync(plan.repoPath) && readdirSync(plan.repoPath).length === 0) {
        safeRmSync(plan.repoPath, poolPath)
      }
    } catch {
      // cleanup is best-effort — non-critical if it fails
    }
    io.error(`❌ Failed to clone: ${e.message}`)
    io.exit(1)
  }
}

// ── Tag: agent-enriched metadata ──────────────────────────────

export function runTag(argv: string[], io: CuratorIO = defaultCuratorIO) {
  const skillName = argv.find(a => !a.startsWith('-'))
  if (!skillName) {
    io.error!('Usage: lythoskill-curator tag <skill-name> [--niche <value>] [--qa <json>] [--db <path>]')
    io.error!('')
    io.error!('Agent-enriched metadata layer. Writes curator\'s personal annotations')
    io.error!('(L3 买家秀) separate from skill author\'s frontmatter (L1 卖家秀).')
    io.error!('')
    io.error!('Options:')
    io.error!('  --niche <value>    Niche tag (repeatable)')
    io.error!('  --qa <json>        QA signal: {"source_type":"self/arena","signal_value":8,...}')
    io.error!('  --db, -d <path>    Database path')
    io.exit!(1)
  }

  const dbPath = resolveDbPath(argv)
  if (!dbPath || !existsSync(dbPath)) {
    io.error!('❌ Catalog DB not found. Run `lythoskill-curator` first.')
    io.exit!(1)
  }

  const niches: string[] = []
  const qaSignals: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--niche' && argv[i + 1]) {
      niches.push(argv[++i])
    } else if (argv[i] === '--qa' && argv[i + 1]) {
      qaSignals.push(argv[++i])
    }
  }

  if (niches.length === 0 && qaSignals.length === 0) {
    io.error!('❌ At least one --niche or --qa is required.')
    io.exit!(1)
  }

  const db = new CatalogDb(dbPath)
  try {
    const existing = db.get<{ niches: string }>(
      `SELECT niches FROM skills WHERE name = $name`,
      { $name: skillName }
    )
    if (!existing) {
      io.error!(`❌ Skill not found: ${skillName}`)
      io.error!('   Run `lythoskill-curator query "SELECT name FROM skills"` to list indexed skills.')
      io.exit!(1)
    }

    const currentNiches: string[] = (() => {
      try { return JSON.parse(existing.niches || '[]') } catch { return [] }
    })()

    // Merge: append new niches, deduplicate
    const merged = [...new Set([...currentNiches, ...niches])]
    // Append QA signals with qa: prefix
    for (const qa of qaSignals) {
      merged.push(`qa:${qa}`)
    }

    db.run(`UPDATE skills SET niches = $niches WHERE name = $name`, {
      $niches: JSON.stringify(merged),
      $name: skillName,
    })

    io.log!(`✅ Tagged ${skillName}`)
    if (niches.length > 0) io.log!(`   niches: ${niches.join(', ')}`)
    if (qaSignals.length > 0) io.log!(`   qa: ${qaSignals.length} signal(s)`)
    io.log!(`   total niches: ${merged.length}`)
  } finally {
    db.close()
  }
}

// ── Main Entry ───────────────────────────────────────────────

export function printHelp(io: CuratorIO = defaultCuratorIO) {
  io.log!('Usage: lythoskill-curator [pool-path] [--output <dir>]')
  io.log!('       lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>] [--branch <name>] [--full]')
  io.log!('       lythoskill-curator tag <skill-name> --niche <value> [--qa <json>]')
  io.log!('       lythoskill-curator refresh-plan [--pool <dir>]')
  io.log!('       lythoskill-curator refresh-execute [--pool <dir>]')
  io.log!('       lythoskill-curator query <SQL> [--db <path>]')
  io.log!('       lythoskill-curator audit [--db <path>]')
  io.log!('       lythoskill-curator find <bare-name> [--db <path>]')
  io.log!('       lythoskill-curator restore [--output <dir>]')
  io.log!('')
  io.log!('Commands:')
  io.log!('  (no args)             Scan cold pool and build REGISTRY.json + catalog.db')
  io.log!('  add <locator>         Download a skill to cold pool (no install, no deck.toml)')
  io.log!('                         --dry-run           Show plan without executing')
  io.log!('                         --output <dir>       Index output directory (default: ~/.agents/lythoskill/curator/)')
  io.log!('                         --reason <text>      Why this skill was added')
  io.log!('                         --forked-from <loc>  Original skill if this is a fork')
  io.log!('                         --branch <name>      Specific branch (default: default branch)')
  io.log!('                         --full              Full clone (default: --depth 1 shallow)')
  io.log!('  tag <skill-name>      Write agent-enriched metadata (niche + QA) to indexed skill')
  io.log!('                         --niche <value>      Niche tag (repeatable)')
  io.log!('                         --qa <json>          QA signal with provenance')
  io.log!('  refresh-plan          Scan cold pool for git repos, check upstreams, write TODO')
  io.log!('                         --pool <dir>        Cold pool path')
  io.log!('  refresh-execute       Pull behind repos one by one, marking progress in plan')
  io.log!('                         --pool <dir>        Cold pool path')
  io.log!('  query <SQL>           Query the catalog SQLite database (output: Markdown table)')
  io.log!('  audit                 Run structural + legacy checks and output an audit report')
  io.log!('  find <bare-name>      Look up a skill by bare name, return full path + deck add command')
  io.log!('                         --db <path>      Use a specific catalog database')
  io.log!('  restore               Roll back to the most recent backup')
  io.log!('')
  io.log!('Options:')
  io.log!('  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)')
  io.log!('  --pool <dir>          Cold pool path for add (default: ~/.agents/skill-repos)')
  io.log!('  --db, -d <path>       Database path for query/audit/tag (default: ./catalog.db)')
  io.exit!(0)
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === '--help' || cmd === '-h') {
    printHelp(defaultCuratorIO)
  }

  if (cmd === 'refresh-plan') {
    runRefreshPlan(args.slice(1))
  } else if (cmd === 'refresh-execute') {
    runRefreshExecute(args.slice(1))
  } else if (cmd === 'add') {
    runAdd(args.slice(1))
  } else if (cmd === 'tag') {
    runTag(args.slice(1))
  } else if (cmd === 'query') {
    runQuery(args.slice(1))
  } else if (cmd === 'audit') {
    runAudit(args.slice(1))
  } else if (cmd === 'find') {
    runFind(args.slice(1))
  } else if (cmd === 'restore') {
    const { outputDir } = parseCuratorArgs(args.slice(1));
    restoreIndex(outputDir, defaultCuratorIO);
  } else {
    runCurator(args)
  }
}
