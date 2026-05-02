#!/usr/bin/env bun
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { init } from './init.js'
import { build } from './build.js'
import { addSkill } from './add-skill.js'
import { align } from './align.js'
import { bump } from './bump.js'

const [command, ...args] = process.argv.slice(2)

switch (command) {
  case 'init':
    if (!args[0]) {
      console.error('Usage: lythoskill init <project-name>')
      process.exit(1)
    }
    await init(args[0])
    break

  case 'build':
    if (!args[0]) {
      console.error('Usage: lythoskill build <skill-name>|--all')
      process.exit(1)
    }
    if (args[0] === '--all') {
      const root = process.cwd()
      const packagesDir = join(root, 'packages')
      const skills = readdirSync(packagesDir).filter((name) =>
        name.startsWith('lythoskill-') && existsSync(join(packagesDir, name, 'skill'))
      )
      for (const skill of skills) {
        console.log(`\n=== Building ${skill} ===`)
        await build(skill)
      }
      console.log(`\n✅ Built ${skills.length} skill(s)`)
    } else {
      await build(args[0])
    }
    break

  case 'add-skill':
    if (!args[0]) {
      console.error('Usage: lythoskill add-skill <skill-name>')
      process.exit(1)
    }
    await addSkill(args[0])
    break

  case 'align':
    await align(args.includes('--fix'))
    break

  case 'bump': {
    const positional = args.filter((a) => !a.startsWith('-'))
    if (!positional[0]) {
      console.error('Usage: lythoskill bump <patch|minor|major|X.Y.Z> [--dry-run]')
      process.exit(1)
    }
    await bump({
      target: positional[0],
      dryRun: args.includes('--dry-run'),
    })
    break
  }

  case '--help':
  case '-h':
  default:
    console.log(`@lythos/skill-creator -- thin skill scaffolder

Commands:
  init <name>       Create a new lythoskill project
  add-skill <name>  Add a new skill to an existing monorepo
  build <skill>     Build a skill for distribution
  build --all       Build all skills in packages/lythoskill-*/
  align             Audit project against current conventions
  align --fix       Auto-apply missing conventions
  bump <target>     Lock-step bump all package versions (patch|minor|major|X.Y.Z)
  bump --dry-run    Preview the bump without writing files

Examples:
  bunx @lythos/skill-creator init my-tool
  bunx @lythos/skill-creator add-skill my-new-skill
  bunx @lythos/skill-creator build example
  bunx @lythos/skill-creator align
  bunx @lythos/skill-creator align --fix
  bunx @lythos/skill-creator bump patch
  bunx @lythos/skill-creator bump 1.0.0 --dry-run
`)
    if (command !== '--help' && command !== '-h') process.exit(1)
}
