import { mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import * as t from './templates'

export async function init(name: string) {
  const root = name

  // directories
  for (const dir of [
    join(root, 'packages', name, 'src'),
    join(root, 'skills', 'example', 'scripts'),
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
    // example skill
    [join(root, 'skills', 'example', 'SKILL.md'),         t.exampleSkillMd('example', name)],
    [join(root, 'skills', 'example', 'scripts', 'run.sh'), t.skillScript(name, 'hello')],
  ]

  for (const [path, content] of files) {
    writeFileSync(path, content)
  }

  chmodSync(join(root, 'skills', 'example', 'scripts', 'run.sh'), 0o755)

  console.log(`
Created lythoskill project: ${name}

  cd ${name}
  pnpm install
  pnpm exec ${name} hello

Structure:
  packages/${name}/     <- your starter (npm publish this)
  skills/example/       <- your first skill
  dist/                 <- bunx lythoskill build example
`)
}
