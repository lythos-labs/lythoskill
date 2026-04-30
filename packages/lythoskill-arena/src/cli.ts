#!/usr/bin/env bun
/**
 * lythoskill-arena CLI — Skill Arena 编排器
 *
 * 创建标准化的 arena 目录结构，为每个被测 skill 生成控制变量 deck。
 */

import {
  existsSync, mkdirSync, writeFileSync, readFileSync,
} from 'node:fs'
import { join, resolve, basename } from 'node:path'

// ── 简单的 slugify ──────────────────────────────────────────
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function timestamp(): string {
  const d = new Date()
  return d.toISOString().replace(/[-:T.Z]/g, '').slice(0, 17) // yyyyMMddHHmmssSSS
}

// ── 解析参数（简单 slice 风格）──────────────────────────────
function parseArgs(argv: string[]) {
  const options: Record<string, string | undefined> = {
    task: undefined,
    skills: undefined,
    decks: undefined,
    criteria: 'syntax,context,logic,token',
    control: 'lythoskill-project-scribe',
    dir: 'tmp',
    project: '.',
  }
  const positionals: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--task' || arg === '-t') {
      options.task = argv[++i]
    } else if (arg === '--skills' || arg === '-s') {
      options.skills = argv[++i]
    } else if (arg === '--decks') {
      options.decks = argv[++i]
    } else if (arg === '--criteria' || arg === '-c') {
      options.criteria = argv[++i]
    } else if (arg === '--control') {
      options.control = argv[++i]
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = argv[++i]
    } else if (arg === '--project' || arg === '-p') {
      options.project = argv[++i]
    } else if (!arg.startsWith('-')) {
      positionals.push(arg)
    }
  }
  return { options, positionals }
}

// ── 主流程 ──────────────────────────────────────────────────
export function runArena(argv: string[]) {
  const { options, positionals } = parseArgs(argv)

  const TASK = options.task || positionals.join(' ') || ''
  if (!TASK) {
    console.error('❌ 请提供 --task 或位置参数')
    process.exit(1)
  }

  const HAS_DECKS = !!options.decks
  const HAS_SKILLS = !!options.skills

  if (!HAS_DECKS && !HAS_SKILLS) {
    console.error('❌ 请提供 --skills 或 --decks')
    process.exit(1)
  }
  if (HAS_DECKS && HAS_SKILLS) {
    console.error('❌ --skills 和 --decks 不能同时使用')
    process.exit(1)
  }

  const DECK_PATHS = HAS_DECKS
    ? (options.decks || '').split(',').map(s => s.trim()).filter(Boolean)
    : []

  const SKILLS = HAS_SKILLS
    ? (options.skills || '').split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (HAS_SKILLS && SKILLS.length < 2) {
    console.error('❌ 至少需要 2 个 skill 才能进行 arena')
    process.exit(1)
  }
  if (HAS_SKILLS && SKILLS.length > 5) {
    console.error('❌ 一次 arena 最多 5 个 skill')
    process.exit(1)
  }
  if (HAS_DECKS && DECK_PATHS.length < 2) {
    console.error('❌ 至少需要 2 个 deck 才能进行 arena')
    process.exit(1)
  }
  if (HAS_DECKS && DECK_PATHS.length > 5) {
    console.error('❌ 一次 arena 最多 5 个 deck')
    process.exit(1)
  }

  const CRITERIA = (options.criteria || 'syntax,context,logic,token')
    .split(',').map(s => s.trim()).filter(Boolean)

  const CONTROL_SKILLS = (options.control || 'lythoskill-project-scribe')
    .split(',').map(s => s.trim()).filter(Boolean)

  const PROJECT_DIR = resolve(options.project!)
  const ARENA_SLUG = slugify(TASK)
  const ARENA_ID = `arena-${timestamp()}-${ARENA_SLUG.slice(0, 30)}`
  const ARENA_DIR = resolve(PROJECT_DIR, options.dir!, ARENA_ID)

  // ── 创建目录结构 ────────────────────────────────────────────
  mkdirSync(join(ARENA_DIR, 'decks'), { recursive: true })
  mkdirSync(join(ARENA_DIR, 'runs'), { recursive: true })

  // ── 生成参与者与 deck ───────────────────────────────────────
  let participants: { id: string; name: string; skill_name: string; deck_path: string }[]
  let mode: 'single-skill' | 'full-deck'

  if (HAS_DECKS) {
    mode = 'full-deck'
    participants = DECK_PATHS.map((deckPath, i) => {
      const id = `run-${String(i + 1).padStart(2, '0')}`
      const name = basename(deckPath).replace(/\.toml$/, '')
      const destPath = join(ARENA_DIR, 'decks', `arena-${id}.toml`)
      // Copy the provided deck to arena directory
      if (existsSync(deckPath)) {
        const content = readFileSync(deckPath, 'utf-8')
        writeFileSync(destPath, content)
      } else {
        console.error(`❌ Deck 文件不存在: ${deckPath}`)
        process.exit(1)
      }
      return { id, name, skill_name: name, deck_path: destPath }
    })
  } else {
    mode = 'single-skill'
    participants = SKILLS.map((skill, i) => {
      const id = `run-${String(i + 1).padStart(2, '0')}`
      return {
        id,
        name: skill,
        skill_name: skill,
        deck_path: join(ARENA_DIR, 'decks', `arena-${id}.toml`),
      }
    })
  }

  const criteria = CRITERIA.map((c) => ({
    name: c,
    label: c,
    weight: 1,
  }))

  if (mode === 'single-skill') {
    for (const p of participants) {
      const deckContent = `# ============================================================
# Arena Deck: ${p.id} — ${p.name}
# ============================================================
# 变量：${p.name}
# 控制变量：${CONTROL_SKILLS.join(', ')}
# ============================================================

[deck]
working_set = ".claude/skills"
cold_pool   = "~/.agents/skill-repos"
max_cards   = 10

[tool]
skills = [
${[...new Set([p.skill_name, ...CONTROL_SKILLS])].map(s => `  "${s}",`).join('\n')}
]
`
      writeFileSync(p.deck_path, deckContent)
    }
  }

  // ── 生成 arena.json ─────────────────────────────────────────
  const arenaJson = {
    version: '1.0.0',
    metadata: {
      id: ARENA_ID,
      slug: ARENA_SLUG,
      created_at: new Date().toISOString(),
      task_description: TASK,
      participants,
      criteria,
      working_dir: ARENA_DIR,
    },
    status: 'setup',
    runs: participants.map(p => ({
      participant_id: p.id,
      output_path: join(ARENA_DIR, 'runs', `${p.id}.md`),
    })),
  }

  writeFileSync(join(ARENA_DIR, 'arena.json'), JSON.stringify(arenaJson, null, 2) + '\n')

  // ── 生成 Task Card 模板 ─────────────────────────────────────
  const taskCardPath = join(ARENA_DIR, 'TASK-arena.md')
  const relArenaDir = ARENA_DIR.replace(PROJECT_DIR, '.')
  const taskCardContent = `---
type: arena
objective: |
  ${TASK}
evaluation_criteria:
${criteria.map(c => `  - ${c.label}`).join('\n')}
arena_decks:
${participants.map(p => `  - ${p.deck_path.replace(PROJECT_DIR, '.')}`).join('\n')}
judge_persona: |
  ${mode === 'full-deck'
    ? `你是一个多目标优化分析师。不要选 Winner。
  对每个 deck 配置，按 evaluation_criteria 输出评分向量（1-5 分）。
  识别 Pareto 非支配解集——没有"最强"，只有"在不同维度上的最优权衡"。
  对被支配的解，说明它被谁支配、在哪个维度上劣势。
  如果发现任何涌现 combo（多个 skill 组合产生 1+1>2 的效果），单独标注。`
    : `你是一个中立的技能评测员。对比所有 subagent 的输出，
  按 evaluation_criteria 给出 1-5 分评分，最终给出 Winner 和选型建议。`}
acceptance:
${participants.map(p => `  - Subagent ${p.id} 使用 ${p.deck_path.replace(PROJECT_DIR, '.')} 完成任务并写入 runs/${p.id}.md`).join('\n')}
  - Judge 读取所有 run 文件并生成 report.md
  - 所有 subagent 完成后恢复父 deck
managed_dirs:
  - ${relArenaDir}/
---

# Arena Task: ${TASK}

## Subagent 指令

${participants.map(p => `### ${p.id} (${p.name})
\`\`\`bash
cd "${PROJECT_DIR}"
bunx @lythos/skill-deck link --deck "${p.deck_path}" --workdir "${PROJECT_DIR}"
# 然后执行任务，输出写入 "${join(ARENA_DIR, 'runs', `${p.id}.md`)}"
bunx @lythos/skill-deck link --deck "${join(PROJECT_DIR, 'skill-deck.toml')}" --workdir "${PROJECT_DIR}"
\`\`\`
`).join('')}

### Judge
\`\`\`bash
cd "${PROJECT_DIR}"
bunx @lythos/skill-deck link --deck "${join(PROJECT_DIR, 'skill-deck.toml')}" --workdir "${PROJECT_DIR}"
# 读取所有 run 文件，生成 "${join(ARENA_DIR, 'report.md')}"
\`\`\`
`

  writeFileSync(taskCardPath, taskCardContent)

  // ── 报告 ────────────────────────────────────────────────────
  console.log(`
🎮 Skill Arena 初始化完成

ID:        ${ARENA_ID}
任务:      ${TASK}
目录:      ${ARENA_DIR}
模式:      ${mode === 'full-deck' ? '完整 deck 配置对比' : '单 skill 对比'}
参与者:    ${participants.map(p => p.name).join(', ')}
${mode === 'single-skill' ? `控制变量:  ${CONTROL_SKILLS.join(', ')}\n` : ''}评测维度:  ${CRITERIA.join(', ')}

生成文件:
  📋 ${join(ARENA_DIR, 'arena.json')}
  🎴 ${participants.length} 个 arena deck → ${join(ARENA_DIR, 'decks')}
  📝 Task Card → ${taskCardPath}

下一步:
  1. 阅读 Task Card: cat "${taskCardPath}"
  2. 按指令逐个/并行启动 subagent
  3. Judge 生成 report.md
`)
}

// ── Viz: Report Visualizer ─────────────────────────────────

interface ScoreRow {
  checkpoint: string
  scores: Record<string, number>
  notes: string
  maxScore: number
}

function parseReportMd(reportPath: string): { title: string; rows: ScoreRow[]; summary?: Record<string, number> } | null {
  if (!existsSync(reportPath)) return null
  const text = readFileSync(reportPath, 'utf-8')

  // Extract title
  const titleMatch = text.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : 'Arena Report'

  const lines = text.split('\n')
  const rows: ScoreRow[] = []
  const summaries: Record<string, number> = {}

  let currentSection = ''
  let inTable = false
  let headers: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect section headers like "### Memory Condition" or "### Control Condition"
    const sectionMatch = trimmed.match(/^#{2,4}\s+(.*Condition.*|.*Variable.*|.*Group.*)/i)
    if (sectionMatch) {
      currentSection = sectionMatch[1].replace(/[()]/g, '').trim()
      inTable = false
      continue
    }

    // Table header row
    if (trimmed.startsWith('|') && trimmed.includes('Checkpoint') && !trimmed.includes('---')) {
      inTable = true
      const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean)
      headers = parts.slice(1)
      continue
    }

    // Table separator
    if (inTable && trimmed.startsWith('|') && trimmed.includes('---')) continue

    // Table data row
    if (inTable && trimmed.startsWith('|')) {
      const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const firstCell = parts[0]
        const checkpoint = firstCell.replace(/\*\*/g, '').trim()

        // Skip "Total" rows — handle them as summary
        if (/^total/i.test(checkpoint)) {
          for (let i = 1; i < parts.length && i <= headers.length; i++) {
            const num = parseFloat(parts[i])
            if (!isNaN(num)) {
              const key = currentSection
                ? `${currentSection} ${headers[i - 1]}`.trim()
                : headers[i - 1]
              summaries[key] = num
            }
          }
          continue
        }

        // Skip non-numeric rows (section headers inside table)
        const secondCell = parts[1]
        if (isNaN(parseFloat(secondCell))) continue

        const scores: Record<string, number> = {}
        let maxScore = 0
        for (let i = 1; i < parts.length && i <= headers.length; i++) {
          const header = headers[i - 1]
          if (/notes?/i.test(header)) continue // Skip notes column
          const val = parts[i]
          const num = parseFloat(val)
          if (!isNaN(num)) {
            // Prefix with section name if multiple condition tables exist
            const key = currentSection && headers.length <= 2
              ? `${currentSection} Score`
              : header
            scores[key] = num
            maxScore = Math.max(maxScore, num)
          }
        }

        const notes = parts[parts.length - 1] || ''
        if (Object.keys(scores).length > 0) {
          rows.push({ checkpoint, scores, notes, maxScore })
        }
      }
      continue
    }

    // End of table
    if (inTable && !trimmed.startsWith('|') && trimmed !== '') {
      inTable = false
      currentSection = ''
    }
  }

  return { title, rows, summary: Object.keys(summaries).length > 0 ? summaries : undefined }
}

function renderBar(value: number, max: number, width = 30): string {
  const filled = Math.round((value / max) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

function renderAsciiChart(report: NonNullable<ReturnType<typeof parseReportMd>>): string {
  const { title, rows, summary } = report
  const participants = rows.length > 0 ? Object.keys(rows[0].scores) : []
  const maxVal = rows.reduce((m, r) => Math.max(m, r.maxScore), 0) || 10

  let out = `\n╔══════════════════════════════════════════════════════════════════════╗\n`
  out += `║  🏆 ${title.slice(0, 58).padEnd(58)} ║\n`
  out += `╚══════════════════════════════════════════════════════════════════════╝\n\n`

  // Per-checkpoint bars
  for (const row of rows) {
    out += `📋 ${row.checkpoint}\n`
    for (const [name, score] of Object.entries(row.scores)) {
      const bar = renderBar(score, maxVal)
      out += `   ${name.padEnd(12)} ${bar} ${score}/${maxVal}\n`
    }
    if (row.notes) {
      out += `   💡 ${row.notes.slice(0, 80)}${row.notes.length > 80 ? '...' : ''}\n`
    }
    out += '\n'
  }

  // Summary totals
  if (summary) {
    out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    out += `📊 TOTAL SCORES\n`
    for (const [name, score] of Object.entries(summary)) {
      const bar = renderBar(score, maxVal * rows.length)
      out += `   ${name.padEnd(12)} ${bar} ${score}\n`
    }
    out += '\n'
  }

  return out
}

function renderRadarChart(report: NonNullable<ReturnType<typeof parseReportMd>>): string {
  const { rows } = report
  if (rows.length === 0) return ''

  const participants = Object.keys(rows[0].scores)
  if (participants.length < 2) return ''

  // Use checkpoint names as axes
  const axes = rows.map(r => r.checkpoint.slice(0, 12))
  const maxVal = rows.reduce((m, r) => Math.max(m, ...Object.values(r.scores)), 0) || 10

  // Simple ASCII radar: concentric circles with labels
  const size = 16
  const center = size / 2
  let out = `\n🕸️  RADAR CHART (MOO Scoring)\n\n`

  // For each participant, show a compact radar representation
  const symbols = ['■', '●', '▲', '◆', '★']
  for (let pi = 0; pi < participants.length; pi++) {
    const p = participants[pi]
    const sym = symbols[pi % symbols.length]
    out += `  ${sym} ${p}\n`
  }
  out += '\n'

  // Per-axis score table (more readable than pure ASCII art)
  out += `  Axis          `
  for (const p of participants) out += `${p.slice(0, 8).padStart(8)} `
  out += '\n'
  out += `  ${'─'.repeat(14 + participants.length * 9)}\n`

  for (let i = 0; i < rows.length; i++) {
    const axis = axes[i].padEnd(12)
    out += `  ${axis} `
    for (const p of participants) {
      const score = rows[i].scores[p] ?? 0
      out += `${String(score).padStart(8)} `
    }
    out += '\n'
  }

  return out
}

function runViz(argv: string[]) {
  const arenaDir = argv.find(a => !a.startsWith('-')) || '.'
  const resolvedDir = resolve(arenaDir)

  const arenaJsonPath = join(resolvedDir, 'arena.json')
  const reportPath = join(resolvedDir, 'report.md')

  if (!existsSync(arenaJsonPath)) {
    console.error(`❌ 找不到 arena.json: ${arenaJsonPath}`)
    process.exit(1)
  }

  const arenaJson = JSON.parse(readFileSync(arenaJsonPath, 'utf-8'))
  const meta = arenaJson.metadata

  console.log(`\n🎮 Arena Viz: ${meta.id}`)
  console.log(`   任务: ${meta.task_description}`)
  console.log(`   参与者: ${meta.participants.map((p: any) => p.name).join(', ')}`)

  if (!existsSync(reportPath)) {
    console.log(`\n⏳ report.md 尚未生成，请先运行 Judge`)
    return
  }

  const report = parseReportMd(reportPath)
  if (!report || report.rows.length === 0) {
    console.log(`\n⚠️  无法从 report.md 解析评分数据`)
    return
  }

  console.log(renderAsciiChart(report))
  console.log(renderRadarChart(report))
}

// ── Main Entry ───────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (cmd === 'viz') {
    runViz(args.slice(1))
  } else {
    runArena(args)
  }
}
