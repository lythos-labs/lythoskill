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

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Database } from 'bun:sqlite'
import YAML from 'yaml'
import { inferSource, extractQuotedPhrases, parseFrontmatter, buildSkillMeta, buildAddPlan, buildAdditionRecord, formatMarkdownTable } from './curator-core'
import { createGitHubSearchAdapter, createLobeHubAdapter, createAgentSkillShAdapter } from './feed-adapters'
import { execSync } from 'node:child_process'

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

export function inferSource(path: string): string {
  // Cold-pool layout: <pool>/github.com/<org>/<repo>/.../<skill>/
  //                  <pool>/localhost/<skill>/
  const parts = path.split('/');
  const ghIdx = parts.indexOf('github.com');
  if (ghIdx >= 0 && parts.length > ghIdx + 2) {
    return `github.com/${parts[ghIdx + 1]}/${parts[ghIdx + 2]}`;
  }
  const localhostIdx = parts.indexOf('localhost');
  if (localhostIdx >= 0) return 'localhost';
  return 'unknown';
}

export function scanSkill(path: string): SkillMeta | null {
  const skillMdPath = join(path, 'SKILL.md');
  if (!statSync(skillMdPath, { throwIfNoEntry: false })) return null;
  const text = readFileSync(skillMdPath, 'utf-8');
  const { frontmatter: rawFm, body } = parseFrontmatter(text);
  const frontmatter = YAML.parse(rawFm._raw as string) || {};

  const hasScripts = statSync(join(path, 'scripts'), { throwIfNoEntry: false })?.isDirectory() || false;
  const hasExamples = statSync(join(path, 'examples'), { throwIfNoEntry: false })?.isDirectory() || false;

  // Pure metadata transform
  const core = buildSkillMeta(frontmatter, path, body);

  // CLI-specific IO extras
  const managedDirs = frontmatter.deck_managed_dirs || frontmatter.managed_dirs || [];
  const niches = frontmatter.deck_niche ? [frontmatter.deck_niche] : [];

  return {
    ...core,
    path,
    managedDirs: Array.isArray(managedDirs) ? managedDirs : [managedDirs].filter(Boolean),
    niches: Array.isArray(niches) ? niches : [niches].filter(Boolean),
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
  };
}

// ── SQLite Catalog Writer ────────────────────────────────────

function writeCatalogDb(dbPath: string, poolPath: string, skills: SkillMeta[]) {
  const db = new Database(dbPath, { create: true })
  db.run(`
    CREATE TABLE IF NOT EXISTS catalog_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      path TEXT PRIMARY KEY,
      description TEXT,
      type TEXT,
      version TEXT,
      name TEXT NOT NULL,
      niches TEXT,
      managed_dirs TEXT,
      trigger_phrases TEXT,
      has_scripts INTEGER,
      has_examples INTEGER,
      body_preview TEXT,
      source TEXT,
      when_to_use TEXT,
      allowed_tools TEXT,
      author TEXT,
      user_invocable INTEGER,
      tags TEXT,
      deck_dependencies TEXT,
      deck_skill_type TEXT
    )
  `)
  // Schema migration: add columns that may be missing from older indexes
  try { db.run(`ALTER TABLE skills ADD COLUMN deck_skill_type TEXT`); } catch {}
  db.run(`CREATE INDEX IF NOT EXISTS idx_skills_deck_skill_type ON skills(deck_skill_type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name)`)

  const insert = db.query(`
    INSERT OR REPLACE INTO skills
      (name, description, type, version, path, niches, managed_dirs, trigger_phrases, has_scripts, has_examples, body_preview,
       source, when_to_use, allowed_tools, author, user_invocable, tags, deck_dependencies, deck_skill_type)
    VALUES
      ($name, $description, $type, $version, $path, $niches, $managed_dirs, $trigger_phrases, $has_scripts, $has_examples, $body_preview,
       $source, $when_to_use, $allowed_tools, $author, $user_invocable, $tags, $deck_dependencies, $deck_skill_type)
  `)

  for (const s of skills) {
    insert.run({
      $name: s.name,
      $description: s.description,
      $type: s.type,
      $version: s.version,
      $path: s.path,
      $niches: JSON.stringify(s.niches),
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
    })
  }

  const meta = db.query(`INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ($key, $value)`)
  meta.run({ $key: 'generated_at', $value: new Date().toISOString() })
  meta.run({ $key: 'last_scan_at', $value: String(Date.now()) })
  meta.run({ $key: 'total_skills', $value: String(skills.length) })
  meta.run({ $key: 'pool_path', $value: poolPath })

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

  // Default: place index inside the cold pool (proximity principle)
  // e.g. ~/.agents/skill-repos/.lythoskill-curator/
  if (!outputDir) {
    outputDir = `${poolPath}/.lythoskill-curator`;
  }

  return { poolPath, outputDir };
}

// ── Main ─────────────────────────────────────────────────────

// ── Backup & Restore ─────────────────────────────────────────

function backupIndex(outputDir: string): { registryBak: string; dbBak: string } | null {
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
    console.log(`🛡️  Backup created:`);
    if (registryBak) console.log(`   REGISTRY.json → ${basename(registryBak)}`);
    if (dbBak) console.log(`   catalog.db → ${basename(dbBak)}`);
  }
  return registryBak || dbBak ? { registryBak: registryBak || '', dbBak: dbBak || '' } : null;
}

function restoreIndex(outputDir: string) {
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
    console.error('❌ No backup found to restore.');
    process.exit(1);
  }

  if (regBak) {
    writeFileSync(registryPath, readFileSync(regBak.path, 'utf-8'));
    console.log(`✅ Restored REGISTRY.json from ${regBak.name}`);
  }
  if (dbBak) {
    writeFileSync(dbPath, readFileSync(dbBak.path));
    console.log(`✅ Restored catalog.db from ${dbBak.name}`);
  }
}

// ── Skill Discovery ──────────────────────────────────────────

function findSkillDirs(root: string): string[] {
  const results: string[] = [];
  const skip = new Set(['node_modules', '.git', '.claude', '.cortex', '.lythoskill-curator', 'tmp', 'playground', 'dist', 'build']);

  function walk(dir: string, depth: number) {
    if (depth > 6) return; // safety limit
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (skip.has(entry.name)) continue;

        const full = join(dir, entry.name);
        if (existsSync(join(full, 'SKILL.md'))) {
          results.push(full);
          // Don't recurse into skill dirs — skills don't nest
          continue;
        }
        walk(full, depth + 1);
      }
    } catch {}
  }

  walk(root, 0);
  return results;
}

export function runCurator(argv: string[]) {
  const { poolPath, outputDir } = parseCuratorArgs(argv);

  const skillDirs = findSkillDirs(poolPath);

  const skills: SkillMeta[] = [];
  for (const path of skillDirs) { try { const s = scanSkill(path); if (s) skills.push(s); } catch {} }

  console.log(`🧠 Skill Curator — Indexed ${skills.length} skills`);

  const byType: Record<string, SkillMeta[]> = {};
  const byManagedDir: Record<string, string[]> = {};
  const byDeckSkillType: Record<string, SkillMeta[]> = {};
  for (const s of skills) {
    byType[s.type] = byType[s.type] || []; byType[s.type].push(s);
    s.managedDirs.forEach(d => { byManagedDir[d] = byManagedDir[d] || []; byManagedDir[d].push(s.name); });
    if (s.deckSkillType) {
      byDeckSkillType[s.deckSkillType] = byDeckSkillType[s.deckSkillType] || [];
      byDeckSkillType[s.deckSkillType].push(s);
    }
  }
  console.log(`\n📊 Types: ${Object.entries(byType).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  if (Object.keys(byDeckSkillType).length > 0) {
    console.log(`\n🔖 Deck skill types: ${Object.entries(byDeckSkillType).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  }
  console.log(`\n📂 Dir overlap:`);
  Object.entries(byManagedDir).filter(([_, n]) => n.length > 1).forEach(([d, n]) => console.log(`   ${d}: ${n.join(', ')}`));

  mkdirSync(outputDir, { recursive: true });

  // Backup before rebuild (reconciler hygiene: never destroy without backup)
  backupIndex(outputDir);

  const outPath = join(outputDir, 'REGISTRY.json');
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), poolPath, totalSkills: skills.length, skills, index: { byType, byManagedDir, byDeckSkillType } }, null, 2));
  console.log(`\n💾 Registry: ${outPath}`);

  const dbPath = join(outputDir, 'catalog.db');
  writeCatalogDb(dbPath, poolPath, skills);
  console.log(`💾 Catalog DB: ${dbPath}`);
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

function printSchema(db: Database) {
  console.log('## catalog.db schema\n')

  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]
  for (const { name } of tables) {
    console.log(`### Table: \`${name}\``)
    const cols = db.query(`PRAGMA table_info(${name})`).all() as { cid: number; name: string; type: string; notnull: number; dflt_value: any; pk: number }[]
    const rows = cols.map(c => ({
      column: c.name,
      type: c.type,
      nullable: c.notnull ? 'NOT NULL' : 'NULL',
      default: c.dflt_value ?? '',
      pk: c.pk ? 'PK' : '',
    }))
    console.log(formatMarkdownTable(rows))
    console.log('')
  }

  console.log('### Example queries')
  console.log('```bash')
  console.log('lythoskill-curator query "SELECT name, type FROM skills WHERE deck_skill_type = \'combo\'"')
  console.log('lythoskill-curator query "SELECT name, niches FROM skills WHERE niches LIKE \'%report%\'"')
  console.log('lythoskill-curator query --db ./catalog.db "SELECT * FROM catalog_meta"')
  console.log('```')
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

  // Fallback: common locations
  const candidates = [
    `${process.env.HOME}/.agents/skill-repos/.lythoskill-curator/catalog.db`,
    `${process.env.HOME}/.agents/lythos/skill-curator/catalog.db`,
  ]
  for (const c of candidates) {
    if (existsSync(c)) { return c }
  }

  return undefined
}

function runQuery(argv: string[]) {
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
      console.error('Usage: lythoskill-curator query <SQL> [--db <path>]')
      console.error('')
      console.error('Examples:')
      console.error('  lythoskill-curator query "SELECT name, type FROM skills"')
      console.error('  lythoskill-curator query --db ./catalog.db "SELECT * FROM catalog_meta"')
      process.exit(1)
    }
    const db = new Database(dbPath, { readonly: true })
    try {
      printSchema(db)
    } finally {
      db.close()
    }
    return
  }

  if (!dbPath || !existsSync(dbPath)) {
    console.error('❌ Catalog DB not found.')
    console.error('')
    if (dbPath) {
      console.error(`  Searched: ${dbPath}`)
    } else {
      console.error('  Searched default locations:')
      console.error('    ./catalog.db')
      console.error('    ~/.agents/skill-repos/.lythoskill-curator/catalog.db')
      console.error('    ~/.agents/lythos/skill-curator/catalog.db')
    }
    console.error('')
    console.error('This usually means:')
    console.error('  1. You have not run curator scan yet')
    console.error('  2. The index was generated in a different location')
    console.error('')
    console.error('To fix:')
    console.error('  lythoskill-curator                          # scan default cold pool')
    console.error('  lythoskill-curator <pool> --output <dir>    # custom pool / output')
    console.error('')
    console.error('Or specify the exact db path:')
    console.error(`  lythoskill-curator query --db ./catalog.db "${sql || 'SELECT * FROM skills'}"`)
    process.exit(1)
  }

  const db = new Database(dbPath, { readonly: true })
  try {
    // Show index freshness
    try {
      const generatedRow = db.query("SELECT value FROM catalog_meta WHERE key = 'generated_at'").get() as { value: string } | null
      if (generatedRow?.value) {
        const ageMs = Date.now() - new Date(generatedRow.value).getTime()
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        console.error(`ℹ️  Index generated at: ${generatedRow.value}`)
        if (ageDays > 7) {
          console.error(`⚠️  Index is ${Math.floor(ageDays)} days old. Consider refreshing:`)
          console.error('   lythoskill-curator')
        }
        console.error('')
      }
    } catch {}

    const rows = db.query(sql).all() as Record<string, any>[]
    console.log(formatMarkdownTable(rows))
  } catch (e: any) {
    console.error(`❌ SQL error: ${e.message}`)
    console.error('')
    console.error('Hint: check available tables and columns:')
    console.error(`  lythoskill-curator query --db ${dbPath} "PRAGMA table_info(skills)"`)
    console.error(`  lythoskill-curator query --db ${dbPath} "SELECT name FROM sqlite_master WHERE type='table'"`)
    process.exit(1)
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

function runAudit(argv: string[]) {
  const dbPath = resolveDbPath(argv)

  if (!dbPath || !existsSync(dbPath)) {
    console.error('❌ Catalog DB not found.')
    console.error('')
    console.error('Searched:')
    console.error('  ./catalog.db')
    console.error('  ~/.agents/skill-repos/.lythoskill-curator/catalog.db')
    console.error('  ~/.agents/lythos/skill-curator/catalog.db')
    console.error('')
    console.error('Run `lythoskill-curator` first to build the index.')
    process.exit(1)
  }

  const db = new Database(dbPath, { readonly: true })
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

    // 3. Empty niches
    const emptyNiches = db.query(`
      SELECT name, path, niches FROM skills
      WHERE niches = '[]' OR niches IS NULL OR niches = ''
    `).all() as Record<string, any>[]
    checks.push({ title: 'Empty niches', rows: emptyNiches, count: emptyNiches.length })

    // 4. Orphan scripts (has_scripts=1 but no scripts/ dir on disk)
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

    // 5. dao_shu_qi_yong coverage (deck_skill_type)
    const coverage = db.query(`
      SELECT CASE WHEN deck_skill_type IS NULL OR deck_skill_type = '' THEN '(unset)' ELSE deck_skill_type END AS deck_skill_type, COUNT(*) AS count
      FROM skills
      GROUP BY CASE WHEN deck_skill_type IS NULL OR deck_skill_type = '' THEN '(unset)' ELSE deck_skill_type END
    `).all() as Record<string, any>[]
    checks.push({ title: 'dao_shu_qi_yong coverage (deck_skill_type)', rows: coverage, count: 0 })

    // Total skills
    const totalResult = db.query(`SELECT COUNT(*) AS total FROM skills`).get() as { total: number }
    const total = totalResult?.total || 0

    // Output report
    let totalIssues = 0
    for (const check of checks) {
      console.log(`\n### ${check.title}: ${check.count} issue${check.count === 1 ? '' : 's'}`)
      if (check.rows.length > 0) {
        console.log(formatMarkdownTable(check.rows))
      } else {
        console.log('*None found.*')
      }
      if (!check.title.includes('coverage')) {
        totalIssues += check.count
      }
    }

    const score = Math.max(0, 100 - Math.round((totalIssues / Math.max(total, 1)) * 100))
    console.log(`\n---`)
    console.log(`**Summary:** ${total} skills scanned, ${totalIssues} issue${totalIssues === 1 ? '' : 's'} found.`)
    console.log(`**Audit score:** ${score}/100`)

  } catch (e: any) {
    console.error(`❌ Audit error: ${e.message}`)
    process.exit(1)
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

/** Append a SkillAddition record to {pool}/.lythoskill-curator/additions.jsonl */
function writeAddition(poolPath: string, record: ReturnType<typeof buildAdditionRecord>) {
  const metaDir = join(poolPath, '.lythoskill-curator')
  mkdirSync(metaDir, { recursive: true })
  const file = join(metaDir, 'additions.jsonl')
  appendFileSync(file, JSON.stringify(record) + '\n')
}

async function runDiscover(argv: string[]) {
  const poolIdx = argv.indexOf('--pool')
  const poolPath = poolIdx >= 0 ? argv[poolIdx + 1] : `${process.env.HOME}/.agents/skill-repos`

  // Cold pool is NOT a feed — it's the destination. discover only queries
  // remote feeds for NEW candidates. Use `curator scan` to see what's local.
  const feedArgIdx = argv.indexOf('--feeds')
  const feedNames = feedArgIdx >= 0 ? (argv[feedArgIdx + 1] || '').split(',').map(s => s.trim()) : ['github', 'agentskill']

  const adapters: ReturnType<typeof createGitHubSearchAdapter>[] = []
  for (const name of feedNames) {
    if (name === 'github') adapters.push(createGitHubSearchAdapter())
    if (name === 'lobehub') adapters.push(createLobeHubAdapter())
    if (name === 'agentskill') adapters.push(createAgentSkillShAdapter())
  }

  console.log(`🔍 Discovering skills...\n`)

  const allItems: { locator: string; name: string; description: string; source: string }[] = []
  for (const adapter of adapters) {
    const label = `${adapter.feed.label} (${adapter.feed.type})`
    console.log(`   Fetching: ${label}...`)
    const items = await adapter.discover()
    console.log(`   └─ ${items.length} result(s)`)
    for (const item of items) {
      allItems.push({
        locator: item.locator,
        name: item.name,
        description: (item.description || '').slice(0, 80),
        source: item.source,
      })
    }
  }

  if (allItems.length === 0) {
    console.log('\n📭 No skills discovered.')
    return
  }

  console.log(`\n📋 ${allItems.length} skill(s) discovered:\n`)
  console.log(formatMarkdownTable(allItems))

  // Dedup hint — same name from multiple sources
  const names = new Map<string, number>()
  for (const item of allItems) names.set(item.name, (names.get(item.name) || 0) + 1)
  const dupes = [...names.entries()].filter(([, c]) => c > 1)
  if (dupes.length > 0) {
    console.log(`\n⚠️  ${dupes.length} name(s) appear in multiple sources:`)
    for (const [name, count] of dupes) {
      console.log(`   - ${name} (${count} sources)`)
    }
  }

  console.log(`\n💡 To add a skill: bunx @lythos/skill-curator add <locator> --pool ${poolPath} --reason "<why>"`)
  console.log(`\n📋 To see what's already in cold pool: bunx @lythos/skill-curator ${poolPath}`)
}

export function runAdd(argv: string[]) {
  const locator = argv.find(a => !a.startsWith('-'))
  if (!locator) {
    console.error('Usage: lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>]')
    process.exit(1)
  }

  const poolPath = getFlag(argv, '--pool')
  if (!poolPath) {
    console.error('Error: --pool <dir> is required.')
    console.error('Usage: lythoskill-curator add <github.com/owner/repo> --pool <dir>')
    process.exit(1)
  }

  const plan = buildAddPlan(locator, poolPath)

  if (existsSync(plan.targetPath)) {
    console.log(`✅ Already in cold pool: ${plan.relPath}`)
    console.log(`   Location: ${plan.targetPath}`)
    return
  }

  const reason = getFlag(argv, '--reason') || ''
  const forkedFrom = getFlag(argv, '--forked-from')

  console.log(`📦 Cloning: https://${plan.relPath}`)
  try {
    mkdirSync(plan.targetPath, { recursive: true })
    execSync(`git clone https://${plan.relPath}.git "${plan.targetPath}"`, {
      stdio: 'inherit',
      timeout: 60000,
    })

    // Persist decision record
    const record = buildAdditionRecord(locator, plan.feed, reason, forkedFrom)
    writeAddition(poolPath, record)

    console.log(`✅ Skill added to cold pool: ${plan.relPath}`)
    console.log(`   Location: ${plan.targetPath}`)
    if (forkedFrom) console.log(`   Forked from: ${forkedFrom}`)
    if (reason) console.log(`   Reason: ${reason}`)
    console.log(`\n💡 To use this skill in a project, run:`)
    console.log(`   bunx @lythos/skill-deck add ${plan.relPath} --as <alias>`)
  } catch (e: any) {
    console.error(`❌ Failed to clone: ${e.message}`)
    process.exit(1)
  }
}

// ── Main Entry ───────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === '--help' || cmd === '-h') {
    console.log('Usage: lythoskill-curator [pool-path] [--output <dir>]')
    console.log('       lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>]')
    console.log('       lythoskill-curator query <SQL> [--db <path>]')
    console.log('       lythoskill-curator audit [--db <path>]')
    console.log('       lythoskill-curator restore [--output <dir>]')
    console.log('')
    console.log('Commands:')
    console.log('  (no args)             Scan cold pool and build REGISTRY.json + catalog.db')
    console.log('  add <locator>         Download a skill to cold pool (no install, no deck.toml)')
    console.log('                         --reason <text>      Why this skill was added')
    console.log('                         --forked-from <loc>  Original skill if this is a fork')
    console.log('  query <SQL>           Query the catalog SQLite database (output: Markdown table)')
    console.log('  discover              Discover new skills from remote feeds (GitHub, LobeHub, agentskill)')
    console.log('  audit                 Run predefined checks and output an audit report')
    console.log('  restore               Roll back to the most recent backup')
    console.log('')
    console.log('Options:')
    console.log('  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)')
    console.log('  --pool <dir>          Cold pool path for add (default: ~/.agents/skill-repos)')
    console.log('  --db, -d <path>       Database path for query/audit (default: ./catalog.db)')
    process.exit(0)
  }

  if (cmd === 'discover') {
    runDiscover(args.slice(1))
  } else if (cmd === 'add') {
    runAdd(args.slice(1))
  } else if (cmd === 'query') {
    runQuery(args.slice(1))
  } else if (cmd === 'audit') {
    runAudit(args.slice(1))
  } else if (cmd === 'restore') {
    const { outputDir } = parseCuratorArgs(args.slice(1));
    restoreIndex(outputDir);
  } else {
    runCurator(args)
  }
}
