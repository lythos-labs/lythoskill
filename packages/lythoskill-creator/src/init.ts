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
    [join(root, 'skill-deck.toml'),                       t.skillDeckToml(name)],
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

Structure:
  packages/${name}/        <- starter package (implementation + CLI)
  packages/${name}/skill/  <- skill layer (SKILL.md + thin scripts)
  skills/${name}/          <- built output (commit this to git)

Next steps:
  cd ${name}
  pnpm install

Edit your skill:
  packages/${name}/skill/SKILL.md    <- describe what this skill does
  packages/${name}/src/cli.ts        <- implement the CLI
  packages/${name}/src/index.ts      <- implement core logic

Build for distribution:
  bunx @lythos/skill-creator build ${name}
  # Output goes to skills/${name}/ — commit this directory

Add more skills later:
  bunx @lythos/skill-creator add-skill <another-skill>
`)
}
