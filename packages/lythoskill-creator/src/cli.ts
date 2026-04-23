#!/usr/bin/env bun
import { init } from './init'
import { build } from './build'
import { addSkill } from './add-skill'

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
      console.error('Usage: lythoskill build <skill-name>')
      process.exit(1)
    }
    await build(args[0])
    break

  case 'add-skill':
    if (!args[0]) {
      console.error('Usage: lythoskill add-skill <skill-name>')
      process.exit(1)
    }
    await addSkill(args[0])
    break

  default:
    console.log(`lythoskill -- thin skill scaffolder

Commands:
  init <name>       Create a new lythoskill project
  add-skill <name>  Add a new skill to an existing monorepo
  build <skill>     Build a skill for distribution

Examples:
  bunx lythoskill init my-tool
  bunx lythoskill add-skill my-new-skill
  bunx lythoskill build example
`)
}
