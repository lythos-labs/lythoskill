#!/usr/bin/env bun
/**
 * lythoskill-arena CLI — Skill Arena 编排器
 *
 * 创建标准化的 arena 目录结构，为每个被测 skill 生成控制变量 deck。
 */

import {
  existsSync, mkdirSync, writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

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
    criteria: 'syntax,context,logic,token',
    control: 'project-scribe',
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

  const SKILLS = (options.skills || '').split(',').map(s => s.trim()).filter(Boolean)
  if (SKILLS.length < 2) {
    console.error('❌ 至少需要 2 个 skill 才能进行 arena')
    process.exit(1)
  }
  if (SKILLS.length > 5) {
    console.error('❌ 一次 arena 最多 5 个 skill')
    process.exit(1)
  }

  const CRITERIA = (options.criteria || 'syntax,context,logic,token')
    .split(',').map(s => s.trim()).filter(Boolean)

  const CONTROL_SKILLS = (options.control || 'lythoskill-project-cortex')
    .split(',').map(s => s.trim()).filter(Boolean)

  const PROJECT_DIR = resolve(options.project!)
  const ARENA_SLUG = slugify(TASK)
  const ARENA_ID = `arena-${timestamp()}-${ARENA_SLUG.slice(0, 30)}`
  const ARENA_DIR = resolve(PROJECT_DIR, options.dir!, ARENA_ID)

  // ── 创建目录结构 ────────────────────────────────────────────
  mkdirSync(join(ARENA_DIR, 'decks'), { recursive: true })
  mkdirSync(join(ARENA_DIR, 'runs'), { recursive: true })

  // ── 生成参与者与 deck ───────────────────────────────────────
  const participants = SKILLS.map((skill, i) => {
    const id = `run-${String(i + 1).padStart(2, '0')}`
    return {
      id,
      name: skill,
      skill_name: skill,
      deck_path: join(ARENA_DIR, 'decks', `arena-${id}.toml`),
    }
  })

  const criteria = CRITERIA.map((c) => ({
    name: c,
    label: c,
    weight: 1,
  }))

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
  "${p.skill_name}",
${CONTROL_SKILLS.map(s => `  "${s}",`).join('\n')}
]
`
    writeFileSync(p.deck_path, deckContent)
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
  你是一个中立的技能评测员。对比所有 subagent 的输出，
  按 evaluation_criteria 给出 1-5 分评分，最终给出 Winner 和选型建议。
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
bunx @lythos/skill-deck link --deck "${p.deck_path}"
# 然后执行任务，输出写入 "${join(ARENA_DIR, 'runs', `${p.id}.md`)}"
bunx @lythos/skill-deck link --deck "${join(PROJECT_DIR, 'skill-deck.toml')}"
\`\`\`
`).join('')}

### Judge
\`\`\`bash
cd "${PROJECT_DIR}"
bunx @lythos/skill-deck link --deck "${join(PROJECT_DIR, 'skill-deck.toml')}"
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
参与者:    ${SKILLS.join(', ')}
控制变量:  ${CONTROL_SKILLS.join(', ')}
评测维度:  ${CRITERIA.join(', ')}

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

if (import.meta.main) {
  runArena(process.argv.slice(2))
}
