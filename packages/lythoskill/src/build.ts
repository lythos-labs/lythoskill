import {
  existsSync, mkdirSync, rmSync, cpSync,
  readFileSync, readdirSync, statSync,
} from 'node:fs'
import { join, relative } from 'node:path'

const IGNORE_NAMES = new Set(['__tests__', 'node_modules', '.DS_Store'])
const IGNORE_SUFFIXES = ['.test.ts', '.test.js', '.spec.ts', '.spec.js']

export async function build(skillName: string) {
  const root = process.cwd()
  const src = join(root, 'skills', skillName)
  const dest = join(root, 'dist', skillName)

  // -- validate -------------------------------------
  if (!existsSync(src)) {
    console.error(`Not found: skills/${skillName}/`)
    process.exit(1)
  }

  const mdPath = join(src, 'SKILL.md')
  if (!existsSync(mdPath)) {
    console.error(`Missing SKILL.md in skills/${skillName}/`)
    process.exit(1)
  }

  const md = readFileSync(mdPath, 'utf-8')
  if (!md.startsWith('---')) {
    console.error(`SKILL.md must start with YAML frontmatter (---)`)
    process.exit(1)
  }

  // -- clean & copy ---------------------------------
  if (existsSync(dest)) rmSync(dest, { recursive: true })
  copyFiltered(src, dest)

  // -- report ---------------------------------------
  const files = walk(dest).map((f) => relative(dest, f))
  console.log(`Built skills/${skillName}/ -> dist/${skillName}/`)
  console.log(`   ${files.length} file(s):`)
  for (const f of files) console.log(`   - ${f}`)
}

function copyFiltered(src: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    if (IGNORE_NAMES.has(entry)) continue
    if (IGNORE_SUFFIXES.some((s) => entry.endsWith(s))) continue

    const s = join(src, entry)
    const d = join(dest, entry)

    if (statSync(s).isDirectory()) {
      copyFiltered(s, d)
    } else {
      // cpSync copies single files; directories handled above via recursion
      cpSync(s, d)
    }
  }
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    statSync(full).isDirectory() ? out.push(...walk(full)) : out.push(full)
  }
  return out
}
