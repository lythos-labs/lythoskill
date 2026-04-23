#!/usr/bin/env bun
/**
 * lythoskill-curator CLI — Skill Curator v0.3.2 (lythos-adapted)
 *
 * Read-only observer for skill cold pools.
 * Scans SKILL.md frontmatter, builds indices, scores by query, discovers combos.
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'

// ── Types ────────────────────────────────────────────────────

interface SkillMeta {
  name: string; description: string; type: string; version: string;
  path: string; managedDirs: string[]; niches: string[];
  triggerPhrases: string[]; hasScripts: boolean; hasExamples: boolean;
  bodyPreview: string;
}

interface ScoredSkill extends SkillMeta {
  score: number; reasons: string[]; penalties: string[];
}

interface Combo {
  pattern: string; skills: string[]; logic: string; confidence: number;
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
  const managedDirs = metadata.sm_managed_dirs || metadata.managed_dirs || [];
  const niches = metadata.sm_niche ? [metadata.sm_niche] : [];
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

// ── Scoring ──────────────────────────────────────────────────

const DOMAIN_BOOSTS: Record<string, { keywords: string[]; weight: number }[]> = {
  'lythoskill-project-cortex': [{ keywords: ['adr','epic','task','workflow','plan','document','governance','decision'], weight: 20 }],
  'lythoskill-creator': [{ keywords: ['scaffold','init','build','skill','create','generate'], weight: 20 }],
  'lythoskill-deck': [{ keywords: ['deck','link','governance','manage','compose','orchestrate'], weight: 20 }],
  'lythoskill-arena': [{ keywords: ['arena','evaluat','test','compare','benchmark'], weight: 15 }, { keywords: ['review','assess'], weight: 5 }],
  'lythoskill-curator': [{ keywords: ['scan','index','discover','curat','pool','deck'], weight: 15 }],
  'repomix-handoff': [{ keywords: ['packag','handoff','review','scan','security','sanitize','context'], weight: 20 }, { keywords: ['code','repo','project','file'], weight: 5 }],
  'design-doc-mermaid': [{ keywords: ['diagram','mermaid','sequence','visual','chart','architecture'], weight: 20 }, { keywords: ['design','doc','document'], weight: 5 }],
  'project-scribe': [{ keywords: ['document','scribe','write','record','log','note'], weight: 10 }],
};

const DEV_TASK_SUPPRESS = ['docx','xlsx','pptx','pdf','finance','gift-evaluator','Podcast Generate'];

function scoreSkill(skill: SkillMeta, query: string): ScoredSkill {
  const q = query.toLowerCase();
  const desc = skill.description.toLowerCase();
  const body = skill.bodyPreview.toLowerCase();
  const triggers = skill.triggerPhrases.join(' ').toLowerCase();
  const allText = `${desc} ${body} ${triggers}`;
  let score = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  if (DEV_TASK_SUPPRESS.includes(skill.name) && (q.includes('code') || q.includes('project') || q.includes('feature') || q.includes('adr'))) {
    score -= 50; penalties.push('suppressed: office/content tool for dev task (-50)');
  }

  const boosts = DOMAIN_BOOSTS[skill.name];
  if (boosts) {
    for (const { keywords, weight } of boosts) {
      for (const kw of keywords) {
        if (q.includes(kw) || allText.includes(kw)) { score += weight; reasons.push(`domain: ${kw} (+${weight})`); break; }
      }
    }
  }

  for (const phrase of skill.triggerPhrases) {
    const pl = phrase.toLowerCase();
    if (q.includes(pl) || pl.includes(q)) { score += 12; reasons.push(`trigger: "${phrase}" (+12)`); }
  }

  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  for (let i = 0; i < qWords.length - 1; i++) {
    const bigram = `${qWords[i]} ${qWords[i+1]}`;
    if (allText.includes(bigram)) { score += 6; reasons.push(`phrase: "${bigram}" (+6)`); }
    if (i < qWords.length - 2) {
      const trigram = `${qWords[i]} ${qWords[i+1]} ${qWords[i+2]}`;
      if (allText.includes(trigram)) { score += 9; reasons.push(`phrase: "${trigram}" (+9)`); }
    }
  }

  for (const word of qWords) { if (word.length >= 4 && allText.includes(word)) score += 1; }
  if (skill.hasScripts) { score += 1; reasons.push('has scripts (+1)'); }
  if (skill.hasExamples) { score += 1; reasons.push('has examples (+1)'); }

  return { ...skill, score: Math.max(0, score), reasons, penalties };
}

// ── Combo Discovery ──────────────────────────────────────────

function discoverCombos(skills: ScoredSkill[], verbose: boolean): Combo[] {
  const combos: Combo[] = [];
  const topSkills = skills.slice(0, 12);

  // 1. Directory Synergy
  const dirToSkills: Record<string, string[]> = {};
  for (const s of topSkills) {
    for (const d of s.managedDirs) {
      const base = d.replace(/\*\/?$/, '');
      dirToSkills[base] = dirToSkills[base] || [];
      dirToSkills[base].push(s.name);
    }
  }
  for (const [dir, names] of Object.entries(dirToSkills)) {
    if (names.length >= 2) {
      combos.push({ pattern: 'Directory Synergy', skills: names,
        logic: `All manage "${dir}" — co-located artifacts need co-located skills`,
        confidence: Math.min(0.9, 0.5 + names.length * 0.1) });
    }
  }

  // 2. Modality Stack
  const textSkills = topSkills.filter(s =>
    /\b(document|adr|epic|task|write|markdown|record|note|report|consolidat|summar)\b/i.test(s.description) &&
    !/\b(diagram|mermaid|chart|image|screenshot|draw|vision|speech|audio|test|browser)\b/i.test(s.description)
  );
  const visualSkills = topSkills.filter(s =>
    /\b(diagram|mermaid|chart|draw|screenshot)\b/i.test(s.description) &&
    !/\b(adr|epic|task|test|browser|speech|audio|chat)\b/i.test(s.description)
  );
  if (verbose) {
    console.log(`   [combo-debug] textSkills: ${textSkills.map(s => s.name).join(', ')}`);
    console.log(`   [combo-debug] visualSkills: ${visualSkills.map(s => s.name).join(', ')}`);
  }
  for (const t of textSkills.slice(0, 2)) {
    for (const v of visualSkills.slice(0, 2)) {
      if (t.name !== v.name) {
        combos.push({ pattern: 'Modality Stack', skills: [t.name, v.name],
          logic: `${t.name} produces text; ${v.name} produces visuals. Complementary output planes.`,
          confidence: 0.85 });
      }
    }
  }

  // 3. Pipeline
  const producers = topSkills.filter(s => /\b(adr|epic|task|workflow|decision|plan)\b/i.test(s.description));
  const consumers = topSkills.filter(s => /\b(packag|handoff|deliver|export|render)\b/i.test(s.description) && s.type !== 'flow');
  if (verbose) {
    console.log(`   [combo-debug] producers: ${producers.map(s => s.name).join(', ')}`);
    console.log(`   [combo-debug] consumers: ${consumers.map(s => s.name).join(', ')}`);
  }
  for (const p of producers.slice(0, 2)) {
    for (const c of consumers.slice(0, 2)) {
      if (p.name !== c.name) {
        combos.push({ pattern: 'Pipeline', skills: [p.name, c.name],
          logic: `${p.name} produces structured decisions; ${c.name} consumes them for delivery.`,
          confidence: 0.9 });
      }
    }
  }

  // 4. Orchestrator-Engine
  const orchestrators = topSkills.filter(s => s.niches.some(n => n.includes('meta.')) || s.type === 'flow');
  const engines = topSkills.filter(s => s.niches.some(n => !n.includes('meta.')) && s.type === 'standard');
  if (verbose) {
    console.log(`   [combo-debug] orchestrators: ${orchestrators.map(s => s.name).join(', ')}`);
    console.log(`   [combo-debug] engines: ${engines.map(s => s.name).join(', ')}`);
  }
  for (const o of orchestrators.slice(0, 1)) {
    for (const e of engines.slice(0, 3)) {
      if (o.name !== e.name) {
        combos.push({ pattern: 'Orchestrator-Engine', skills: [o.name, e.name],
          logic: `${o.name} discovers/orchestrates; ${e.name} executes. Meta-level delegation.`,
          confidence: 0.8 });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return combos.filter(c => { const key = c.skills.sort().join('+'); if (seen.has(key)) return false; seen.add(key); return true; });
}

// ── Verbose Reporter ─────────────────────────────────────────

function reportVerbose(skills: ScoredSkill[], combos: Combo[], query: string) {
  console.log(`\n══════════════════════════════════════════════════════════════════`);
  console.log(`📋 CURATOR REVIEW LOG — "${query}"`);
  console.log(`══════════════════════════════════════════════════════════════════`);

  console.log(`\n🔍 SCORING DETAIL (${skills.length} skills evaluated):\n`);
  for (const s of skills.slice(0, 15)) {
    const tier = s.score >= 20 ? '🔴' : s.score >= 10 ? '🟡' : s.score > 0 ? '🟢' : '⚪';
    console.log(`${tier} ${s.name}: ${s.score} pts`);
    for (const r of s.reasons) console.log(`   + ${r}`);
    for (const p of s.penalties) console.log(`   ${p}`);
    if (s.score === 0) console.log(`   (no match)`);
    console.log('');
  }

  const suppressed = skills.filter(s => s.penalties.length > 0);
  if (suppressed.length > 0) {
    console.log(`\n🚫 SUPPRESSED SKILLS (${suppressed.length}):`);
    for (const s of suppressed) console.log(`   • ${s.name}: ${s.penalties.join('; ')}`);
  }

  if (combos.length > 0) {
    console.log(`\n🔗 DISCOVERED COMBOS (${combos.length}):\n`);
    for (const c of combos.sort((a, b) => b.confidence - a.confidence)) {
      console.log(`   [${c.pattern}] ${c.skills.join(' + ')}`);
      console.log(`   confidence: ${Math.round(c.confidence * 100)}% | ${c.logic}`);
      console.log('');
    }
  }

  const core = skills.filter(s => s.score >= 20).slice(0, 4);
  const multi = skills.filter(s => s.score >= 10 && s.score < 20).slice(0, 3);
  console.log(`══════════════════════════════════════════════════════════════════`);
  console.log(`🎯 FINAL RECOMMENDATION:`);
  console.log(`   Core (${core.length}):        ${core.map(s => s.name).join(', ') || '(none)'}`);
  console.log(`   Force-mult (${multi.length}): ${multi.map(s => s.name).join(', ') || '(none)'}`);
  console.log(`   Total: ${core.length + multi.length} skills`);
  console.log(`══════════════════════════════════════════════════════════════════\n`);
}

// ── CLI arg parser ───────────────────────────────────────────

function parseCuratorArgs(argv: string[]) {
  let poolPath = `${process.env.HOME}/.agents/skill-repos`;
  let recommend = '';
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--recommend') {
      recommend = argv[++i] || '';
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (!arg.startsWith('-')) {
      poolPath = arg;
    }
  }

  return { poolPath, recommend, verbose };
}

// ── Main ─────────────────────────────────────────────────────

export function runCurator(argv: string[]) {
  const { poolPath, recommend, verbose } = parseCuratorArgs(argv);

  const entries = readdirSync(poolPath, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.includes('node_modules'))
    .map(e => join(poolPath, e.name));

  const skills: SkillMeta[] = [];
  for (const path of entries) { try { const s = scanSkill(path); if (s) skills.push(s); } catch {} }

  console.log(`🧠 Skill Curator — Indexed ${skills.length} skills`);

  if (recommend) {
    const scored = skills.map(s => scoreSkill(s, recommend));
    scored.sort((a, b) => b.score - a.score);
    const relevant = scored.filter(s => s.score > 0);
    const combos = discoverCombos(relevant, verbose);

    if (verbose) {
      reportVerbose(relevant, combos, recommend);
    } else {
      const tier1 = relevant.filter(s => s.score >= 20);
      const tier2 = relevant.filter(s => s.score >= 10 && s.score < 20);
      const tier3 = relevant.filter(s => s.score > 0 && s.score < 10);

      console.log(`\n🎯 RECOMMENDATIONS: "${recommend}"`);
      console.log(`   ${relevant.length} relevant of ${skills.length} total\n`);

      if (tier1.length > 0) { console.log(`🔴 Core:`); tier1.slice(0, 4).forEach(s => console.log(`   ${s.name} (${s.score})`)); }
      if (tier2.length > 0) { console.log(`\n🟡 Force Multipliers:`); tier2.slice(0, 3).forEach(s => console.log(`   ${s.name} (${s.score})`)); }
      if (tier3.length > 0 && !verbose) { console.log(`\n🟢 Optional: ${tier3.slice(0, 3).map(s => s.name).join(', ')}`); }

      if (combos.length > 0) {
        console.log(`\n🔗 Combos:`);
        combos.slice(0, 4).forEach(c => console.log(`   [${c.pattern}] ${c.skills.join('+')} (${Math.round(c.confidence * 100)}%)`));
      }

      const core = tier1.slice(0, 4).map(s => s.name);
      const mult = tier2.slice(0, 3).map(s => s.name);
      console.log(`\n💡 Deck: ${core.join(', ')}${mult.length ? ' + ' + mult.join(', ') : ''}`);
    }

    const recJson = {
      version: '0.3.2', query: recommend, generatedAt: new Date().toISOString(),
      skillsEvaluated: skills.length, skillsRelevant: relevant.length,
      recommendations: relevant.slice(0, 15).map(s => ({ name: s.name, score: s.score, reasons: s.reasons, penalties: s.penalties, type: s.type, niches: s.niches, managedDirs: s.managedDirs })),
      combos: combos.map(c => ({ pattern: c.pattern, skills: c.skills, logic: c.logic, confidence: c.confidence })),
    };
    const recDir = join(poolPath, '.cortex', 'skill-curator');
    mkdirSync(recDir, { recursive: true });
    writeFileSync(join(recDir, 'RECOMMENDATIONS.json'), JSON.stringify(recJson, null, 2));
    console.log(`\n💾 ${verbose ? 'Verbose log' : 'Recommendations'}: ${join(recDir, 'RECOMMENDATIONS.json')}`);
    return;
  }

  const byType: Record<string, SkillMeta[]> = {};
  const byManagedDir: Record<string, string[]> = {};
  for (const s of skills) {
    byType[s.type] = byType[s.type] || []; byType[s.type].push(s);
    s.managedDirs.forEach(d => { byManagedDir[d] = byManagedDir[d] || []; byManagedDir[d].push(s.name); });
  }
  console.log(`\n📊 Types: ${Object.entries(byType).map(([t, i]) => `${t}:${i.length}`).join(', ')}`);
  console.log(`\n📂 Dir overlap:`);
  Object.entries(byManagedDir).filter(([_, n]) => n.length > 1).forEach(([d, n]) => console.log(`   ${d}: ${n.join(', ')}`));

  const regDir = join(poolPath, '.cortex', 'skill-curator');
  mkdirSync(regDir, { recursive: true });
  const outPath = join(regDir, 'REGISTRY.json');
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), poolPath, totalSkills: skills.length, skills, index: { byType, byManagedDir } }, null, 2));
  console.log(`\n💾 Registry: ${outPath}`);
}

if (import.meta.main) {
  runCurator(process.argv.slice(2));
}
