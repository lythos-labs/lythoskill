import { mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import * as t from './templates'

export async function init(name: string) {
  const root = name

  // directories
  for (const dir of [
    join(root, 'packages', name, 'src'),
    join(root, 'packages', name, 'skill', 'scripts'),
  ]) {
    mkdirSync(dir, { recursive: true })
  }

  // files
  const files: [string, string][] = [
    // workspace
    [join(root, 'package.json'),                          t.rootPackageJson(name)],
    [join(root, 'pnpm-workspace.yaml'),                   t.pnpmWorkspace()],
    [join(root, '.gitignore'),                            t.gitignore()],
    // starter
    [join(root, 'packages', name, 'package.json'),        t.starterPackageJson(name)],
    [join(root, 'packages', name, 'tsconfig.json'),       t.starterTsconfig()],
    [join(root, 'packages', name, 'src', 'cli.ts'),       t.starterCli(name)],
    [join(root, 'packages', name, 'src', 'index.ts'),     t.starterIndex(name)],
    // skill layer
    [join(root, 'packages', name, 'skill', 'SKILL.md'),         t.exampleSkillMd(name, name)],
    [join(root, 'packages', name, 'skill', 'scripts', 'run.sh'), t.skillScript(name, 'hello')],
  ]

  for (const [path, content] of files) {
    writeFileSync(path, content)
  }

  chmodSync(join(root, 'packages', name, 'skill', 'scripts', 'run.sh'), 0o755)

  console.log(`
Created lythoskill project: ${name}

  cd ${name}
  pnpm install
  pnpm exec ${name} hello

Structure:
  packages/${name}/        <- your starter (npm publish this)
  packages/${name}/skill/  <- skill source (SKILL.md + scripts)
  skills/${name}/          <- built skill output (submit this to git)
`)
}
