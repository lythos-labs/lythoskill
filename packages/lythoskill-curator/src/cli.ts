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

function scanSkill(path: string): SkillMeta | null {
  const skillMdPath = join(path, 'SKILL.md');
  if (!statSync(skillMdPath, { throwIfNoEntry: false })) return null;
  const text = readFileSync(skillMdPath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(text);
  const metadata = frontmatter.metadata || {};
  const managedDirs = metadata.lyth_managed_dirs || metadata.managed_dirs || [];
  const niches = metadata.lyth_niche ? [metadata.lyth_niche] : [];
  const hasScripts = statSync(join(path, 'scripts'), { throwIfNoEntry: false })?.isDirectory() || false;
  const hasExamples = statSync(join(path, 'examples'), { throwIfNoEntry: false })?.isDirectory() || false;
  const desc = toString(frontmatter.description);
  return {
    name: toString(frontmatter.name) || basename(path),
    description: desc.slice(0, 800), type: toString(frontmatter.type) || 'standard',
    version: toString(frontmatter.version) || 'unknown', path,
    managedDirs: Array.isArray(managedDirs) ? managedDirs : [managedDirs].filter(Boolean),
    niches: Array.isArray(niches) ? niches : [niches].filter(Boolean),
    triggerPhrases: extractTriggers(frontmatter.description),
    hasScripts, hasExamples,
    bodyPreview: body.slice(0, 500).replace(/\s+/g, ' '),
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
      body_preview TEXT
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type)`)

  const insert = db.query(`
    INSERT OR REPLACE INTO skills
      (name, description, type, version, path, niches, managed_dirs, trigger_phrases, has_scripts, has_examples, body_preview)
    VALUES
      ($name, $description, $type, $version, $path, $niches, $managed_dirs, $trigger_phrases, $has_scripts, $has_examples, $body_preview)
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
    })
  }

  const meta = db.query(`INSERT OR REPLACE INTO catalog_meta (key, value) VALUES ($key, $value)`)
  meta.run({ $key: 'generated_at', $value: new Date().toISOString() })
  meta.run({ $key: 'total_skills', $value: String(skills.length) })
  meta.run({ $key: 'pool_path', $value: poolPath })

  db.close()
}

// ── CLI arg parser ───────────────────────────────────────────

function parseCuratorArgs(argv: string[]) {
  let poolPath = `${process.env.HOME}/.agents/skill-repos`;
  let outputDir = `${process.env.HOME}/.agents/lythos/skill-curator`;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      outputDir = argv[++i];
    } else if (!arg.startsWith('-')) {
      poolPath = arg;
    }
  }

  return { poolPath, outputDir };
}

// ── Main ─────────────────────────────────────────────────────

function findSkillDirs(root: string): string[] {
  const results: string[] = [];
  const skip = new Set(['node_modules', '.git', '.claude', '.cortex', 'tmp', 'playground', 'dist', 'build']);

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

if (import.meta.main) {
  runCurator(process.argv.slice(2));
}
