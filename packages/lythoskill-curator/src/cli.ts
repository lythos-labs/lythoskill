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

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Database } from 'bun:sqlite'

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
}

// ── Frontmatter Parser (fixed for multiline) ─────────────────

function parseFrontmatter(text: string): { frontmatter: Record<string, any>; body: string } {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text };

  const fm: Record<string, any> = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const keyVal = line.match(/^(\w+):\s*(.*)$/);

    if (!keyVal) { i++; continue; }

    const key = keyVal[1];
    const val = keyVal[2].trim();

    // Multiline string: key: |
    if (val === '|') {
      i++;
      const parts: string[] = [];
      let baseIndent = Infinity;
      let j = i;
      while (j < lines.length) {
        if (lines[j].trim() === '') { j++; continue; }
        const indent = lines[j].match(/^(\s*)/)?.[1].length || 0;
        if (indent === 0 && lines[j].match(/^\w+:/)) break;
        baseIndent = Math.min(baseIndent, indent);
        j++;
      }
      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrim = nextLine.trim();
        const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;
        if (nextIndent === 0 && nextLine.match(/^\w+:\s*/)) break;
        if (nextTrim === '') {
          parts.push('');
        } else if (nextIndent >= baseIndent) {
          parts.push(nextLine.slice(baseIndent));
        }
        i++;
      }
      fm[key] = parts.join('\n');
      continue;
    }

    // Inline array: key: [a, b]
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      i++;
      continue;
    }

    // Empty value — might be a list or object below
    if (val === '') {
      i++;
      const items: string[] = [];
      let obj: Record<string, any> = {};
      let isObject = false;

      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrim = nextLine.trim();
        const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;

        if (nextIndent === 0) { i--; break; }

        if (nextTrim.startsWith('- ')) {
          items.push(nextTrim.slice(2).trim().replace(/^["']|["']$/g, ''));
        } else if (nextLine.match(/^\s+\w+:\s*/)) {
          isObject = true;
          const ok = nextLine.match(/^\s+(\w+):\s*(.*)$/);
          if (ok) {
            obj[ok[1]] = ok[2].trim().replace(/^["']|["']$/g, '');
          }
        }
        i++;
      }

      if (isObject) fm[key] = obj;
      else if (items.length > 0) fm[key] = items;
      else fm[key] = '';
      i++;
      continue;
    }

    // Simple scalar
    fm[key] = val.replace(/^["']|["']$/g, '');
    i++;
  }

  return { frontmatter: fm, body: match[2].trim() };
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

function extractTriggers(description: string): string[] {
  const desc = toString(description);
  const triggers: string[] = [];
  const lines = desc.split('\n');
  let inTriggers = false;
  for (const line of lines) {
    if (line.match(/trigger|使用场景|when to use/i)) inTriggers = true;
    if (inTriggers) {
      const m = line.match(/["""']([^"""']+)["""']/);
      if (m) triggers.push(m[1]);
      if (line.match(/^\s*$/)) inTriggers = false;
    }
  }
  if (triggers.length === 0) {
    const allQuotes = desc.matchAll(/["""']([^"""']{5,})["""']/g);
    for (const m of allQuotes) triggers.push(m[1]);
  }
  return [...new Set(triggers)];
}

function inferSource(path: string): string {
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

function scanSkill(path: string): SkillMeta | null {
  const skillMdPath = join(path, 'SKILL.md');
  if (!statSync(skillMdPath, { throwIfNoEntry: false })) return null;
  const text = readFileSync(skillMdPath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(text);
  const hasScripts = statSync(join(path, 'scripts'), { throwIfNoEntry: false })?.isDirectory() || false;
  const hasExamples = statSync(join(path, 'examples'), { throwIfNoEntry: false })?.isDirectory() || false;
  const desc = toString(frontmatter.description);

  // lythoskill governance extensions (top-level frontmatter, not nested in metadata)
  const managedDirs = frontmatter.deck_managed_dirs || frontmatter.managed_dirs || [];
  const niches = frontmatter.deck_niche ? [frontmatter.deck_niche] : [];

  // allowed-tools can be inline array or list
  const allowedTools = parseArrayField(frontmatter['allowed-tools']);
  const tags = parseArrayField(frontmatter.tags);

  const source = inferSource(path);
  const fmAuthor = toString(frontmatter.author);

  return {
    name: toString(frontmatter.name) || basename(path),
    description: desc.slice(0, 800),
    type: toString(frontmatter.type) || 'standard',
    version: toString(frontmatter.version) || 'unknown',
    path,
    managedDirs: Array.isArray(managedDirs) ? managedDirs : [managedDirs].filter(Boolean),
    niches: Array.isArray(niches) ? niches : [niches].filter(Boolean),
    triggerPhrases: extractTriggers(frontmatter.description),
    hasScripts, hasExamples,
    bodyPreview: body.slice(0, 500).replace(/\s+/g, ' '),
    source,
    // Open-standard fields
    whenToUse: toString(frontmatter.when_to_use).slice(0, 800),
    allowedTools,
    author: fmAuthor || source.split('/')[1] || 'unknown', // fallback to org from source
    userInvocable: frontmatter['user-invocable'] != null ? Boolean(frontmatter['user-invocable']) : null,
    tags,
    // lythoskill extensions
    deckDependencies: frontmatter.deck_dependencies || {},
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
      name TEXT PRIMARY KEY,
      description TEXT,
      type TEXT,
      version TEXT,
      path TEXT NOT NULL,
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
      deck_dependencies TEXT
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type)`)

  const insert = db.query(`
    INSERT OR REPLACE INTO skills
      (name, description, type, version, path, niches, managed_dirs, trigger_phrases, has_scripts, has_examples, body_preview,
       source, when_to_use, allowed_tools, author, user_invocable, tags, deck_dependencies)
    VALUES
      ($name, $description, $type, $version, $path, $niches, $managed_dirs, $trigger_phrases, $has_scripts, $has_examples, $body_preview,
       $source, $when_to_use, $allowed_tools, $author, $user_invocable, $tags, $deck_dependencies)
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
  for (const s of skills) {
    byType[s.type] = byType[s.type] || []; byType[s.type].push(s);
    s.managedDirs.forEach(d => { byManagedDir[d] = byManagedDir[d] || []; byManagedDir[d].push(s.name); });
  }
  console.log(`\n📊 Types: ${Object.entries(byType).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  console.log(`\n📂 Dir overlap:`);
  Object.entries(byManagedDir).filter(([_, n]) => n.length > 1).forEach(([d, n]) => console.log(`   ${d}: ${n.join(', ')}`));

  mkdirSync(outputDir, { recursive: true });

  const outPath = join(outputDir, 'REGISTRY.json');
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), poolPath, totalSkills: skills.length, skills, index: { byType, byManagedDir } }, null, 2));
  console.log(`\n💾 Registry: ${outPath}`);

  const dbPath = join(outputDir, 'catalog.db');
  writeCatalogDb(dbPath, poolPath, skills);
  console.log(`💾 Catalog DB: ${dbPath}`);
}

// ── Query subcommand ─────────────────────────────────────────

function runQuery(argv: string[]) {
  let dbPath: string | undefined;
  let sql: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--db' || arg === '-d') && argv[i + 1]) {
      dbPath = argv[++i];
    } else if (!arg.startsWith('-')) {
      sql = arg;
    }
  }

  if (!sql) {
    console.error('Usage: lythoskill-curator query <SQL> [--db <path>]')
    console.error('')
    console.error('Examples:')
    console.error('  lythoskill-curator query "SELECT name, type FROM skills"')
    console.error('  lythoskill-curator query --db ./catalog.db "SELECT * FROM catalog_meta"')
    process.exit(1)
  }

  if (!dbPath) {
    // Default: find the most recently generated catalog.db in common locations
    const candidates = [
      `${process.env.HOME}/.agents/skill-repos/.lythoskill-curator/catalog.db`,
      `${process.env.HOME}/.agents/lythos/skill-curator/catalog.db`,
    ]
    for (const c of candidates) {
      if (existsSync(c)) { dbPath = c; break; }
    }
  }

  if (!dbPath || !existsSync(dbPath)) {
    console.error('❌ Catalog DB not found.')
    console.error('')
    if (dbPath) {
      console.error(`  Searched: ${dbPath}`)
    } else {
      console.error('  Searched default locations:')
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
    // Show index freshness (stderr so JSON output on stdout stays clean)
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

    const rows = db.query(sql).all()
    console.log(JSON.stringify(rows, null, 2))
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

// ── Main Entry ───────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === '--help' || cmd === '-h') {
    console.log('Usage: lythoskill-curator [pool-path] [--output <dir>]')
    console.log('       lythoskill-curator query <SQL> [--db <path>]')
    console.log('')
    console.log('Commands:')
    console.log('  (no args)             Scan cold pool and build REGISTRY.json + catalog.db')
    console.log('  query <SQL>           Query the catalog SQLite database')
    console.log('')
    console.log('Options:')
    console.log('  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)')
    console.log('  --db, -d <path>       Database path for query subcommand')
    process.exit(0)
  }

  if (cmd === 'query') {
    runQuery(args.slice(1))
  } else {
    runCurator(args)
  }
}
