import {
  existsSync, mkdirSync, rmSync, cpSync,
  readFileSync, readdirSync, statSync, writeFileSync,
} from 'node:fs'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'
import { findProjectRoot } from './util.js'

const IGNORE_NAMES = new Set(['__tests__', 'node_modules', '.DS_Store'])
const IGNORE_SUFFIXES = ['.test.ts', '.test.js', '.spec.ts', '.spec.js']

export async function build(skillName: string) {
  const root = findProjectRoot(process.cwd()) || process.cwd()
  const src = join(root, 'packages', skillName, 'skill')
  const dest = join(root, 'skills', skillName)

  if (!existsSync(src)) {
    console.error(`Not found: packages/${skillName}/skill/`)
    process.exit(1)
  }

  if (existsSync(dest)) rmSync(dest, { recursive: true })
  copyFiltered(src, dest)

  const pkgJsonPath = join(root, 'packages', skillName, 'package.json')
  if (existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
    const vars = extractVars(pkg)
    if (Object.keys(vars).length > 0) {
      substituteVars(dest, vars)
    }
  }

  // Build-time help capture: run `bun src/cli.ts --help` and write to references/COMMANDS.md
  // Only overwrites if the file is absent or marked with <!-- AUTO-GENERATED -->,
  // preserving hand-maintained references.
  const cliPath = join(root, 'packages', skillName, 'src', 'cli.ts')
  if (existsSync(cliPath)) {
    try {
      const stdout = execSync(`bun ${cliPath} --help`, {
        cwd: join(root, 'packages', skillName),
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      const refDir = join(dest, 'references')
      mkdirSync(refDir, { recursive: true })
      const commandsMdPath = join(refDir, 'COMMANDS.md')
      const marker = '<!-- AUTO-GENERATED -->'
      if (!existsSync(commandsMdPath) || readFileSync(commandsMdPath, 'utf-8').includes(marker)) {
        writeFileSync(commandsMdPath, marker + '\n' + stdout)
      }
    } catch {
      // Graceful degradation: if --help fails, skip references generation
    }
  }

  const mdPath = join(dest, 'SKILL.md')
  if (!existsSync(mdPath)) {
    console.error(`Missing SKILL.md in skills/${skillName}/`)
    process.exit(1)
  }

  const md = readFileSync(mdPath, 'utf-8')
  if (!md.startsWith('---')) {
    console.error(`SKILL.md must start with YAML frontmatter (---)`)
    process.exit(1)
  }

  const files = walk(dest).map((f) => relative(dest, f))
  console.log(`Built packages/${skillName}/skill/ -> skills/${skillName}/`)
  console.log(`   ${files.length} file(s):`)
  for (const f of files) console.log(`   - ${f}`)

  console.log(`
Next steps:
  git add skills/${skillName}/
  git commit -m "feat(${skillName}): initial skill"

Use your skill (no install needed):
  bunx @lythos/skill-creator build ${skillName}   # rebuild after edits

Publish to npm (optional):
  cd packages/${skillName}
  npm publish --access public
`)
}

function extractVars(pkg: Record<string, unknown>): Record<string, string> {
  const vars: Record<string, string> = {}
  if (pkg.name) vars['{{PACKAGE_NAME}}'] = String(pkg.name)
  if (pkg.version) vars['{{PACKAGE_VERSION}}'] = String(pkg.version)
  if (pkg.description) vars['{{PACKAGE_DESCRIPTION}}'] = String(pkg.description)

  const bin = pkg.bin as Record<string, string> | undefined
  if (bin) {
    const entries = Object.entries(bin)
    if (entries.length > 0) {
      vars['{{BIN_NAME}}'] = entries[0][0]
      vars['{{BIN_ENTRY}}'] = entries[0][1]
    }
  }
  return vars
}

function substituteVars(dir: string, vars: Record<string, string>) {
  for (const f of walk(dir)) {
    const content = readFileSync(f, 'utf-8')
    let replaced = content
    for (const [key, val] of Object.entries(vars)) {
      replaced = replaced.split(key).join(val)
    }
    if (replaced !== content) {
      writeFileSync(f, replaced)
    }
  }
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
