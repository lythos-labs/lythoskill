import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import * as t from './templates'

export async function addSkill(name: string) {
  const root = process.cwd()

  // Verify we're in a monorepo
  if (!existsSync(join(root, 'package.json'))) {
    console.error('No package.json found in current directory. Run this from a lythoskill monorepo root.')
    process.exit(1)
  }

  if (!existsSync(join(root, 'pnpm-workspace.yaml'))) {
    console.error('No pnpm-workspace.yaml found in current directory. Run this from a lythoskill monorepo root.')
    process.exit(1)
  }

  const pkgDir = join(root, 'packages', name)
  const srcDir = join(pkgDir, 'src')
  const skillDir = join(pkgDir, 'skill', 'scripts')

  const files: [string, string][] = [
    [join(pkgDir, 'package.json'),        t.starterPackageJson(name)],
    [join(pkgDir, 'tsconfig.json'),       t.starterTsconfig()],
    [join(srcDir, 'cli.ts'),              t.starterCli(name)],
    [join(srcDir, 'index.ts'),            t.starterIndex(name)],
    [join(pkgDir, 'skill', 'SKILL.md'),         t.exampleSkillMd(name, name)],
    [join(pkgDir, 'skill', 'scripts', 'run.sh'), t.skillScript(name, 'hello')],
  ]

  let skipped = 0
  for (const [path] of files) {
    if (existsSync(path)) {
      skipped++
    }
  }

  if (skipped === files.length) {
    console.log(`Skill "${name}" already exists at packages/${name}/. No files modified.`)
    return
  }

  // Create directories
  for (const dir of [srcDir, skillDir]) {
    mkdirSync(dir, { recursive: true })
  }

  // Write files (skip existing)
  for (const [path, content] of files) {
    if (!existsSync(path)) {
      writeFileSync(path, content)
    }
  }

  const runShPath = join(pkgDir, 'skill', 'scripts', 'run.sh')
  if (!existsSync(runShPath)) {
    chmodSync(runShPath, 0o755)
  } else {
    chmodSync(runShPath, 0o755)
  }

  console.log(`
Added skill: ${name}

Structure:
  packages/${name}/        <- starter package
  packages/${name}/skill/  <- skill source

Next steps:
  Edit packages/${name}/skill/SKILL.md    <- describe intent
  Edit packages/${name}/src/cli.ts        <- implement commands

Build when ready:
  bunx lythoskill build ${name}
  # Output goes to skills/${name}/ — commit this directory
`)
}
