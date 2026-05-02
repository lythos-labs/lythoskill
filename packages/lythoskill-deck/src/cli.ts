#!/usr/bin/env bun
import { linkDeck } from './link.js'
import { validateDeck } from './validate.js'
import { addSkill } from './add.js'
import { updateDeck } from './update.js'
import { formatHelp } from './help.js'

const HELP_CONFIG = {
  binName: 'lythoskill-deck',
  description: 'Declarative skill deck governance — cold pool, working set, deny-by-default',
  commands: [
    { name: 'link', description: 'Sync working set with skill-deck.toml' },
    { name: 'add', description: 'Download skill to cold pool and add to deck', args: '<locator>' },
    { name: 'update', description: 'Pull latest versions of declared skills from upstream' },
    { name: 'validate', description: 'Validate deck configuration', args: '[deck.toml]' },
  ],
  options: [
    { flag: '--deck <path>', description: 'Specify skill-deck.toml path (default: find upward from cwd)' },
    { flag: '--workdir <dir>', description: 'Specify working directory (default: cwd)' },
    { flag: '--no-backup', description: 'Skip tar backup when removing non-symlink entries' },
    { flag: '--via <backend>', description: 'Download backend: git (default) | skills.sh' },
  ],
}

const args = process.argv.slice(2)
const command = args[0]

const deckFlagIdx = args.indexOf('--deck')
const workdirFlagIdx = args.indexOf('--workdir')
const viaFlagIdx = args.indexOf('--via')

const deckPath = deckFlagIdx >= 0 ? args[deckFlagIdx + 1] : undefined
const workdir = workdirFlagIdx >= 0 ? args[workdirFlagIdx + 1] : undefined
const via = viaFlagIdx >= 0 ? args[viaFlagIdx + 1] : undefined
const noBackup = args.includes('--no-backup')

switch (command) {
  case '--help':
  case '-h':
    console.log(formatHelp(HELP_CONFIG))
    process.exit(0)
  case 'link':
    linkDeck(deckPath, workdir, noBackup)
    break
  case 'add': {
    const locator = args[1]
    if (!locator) {
      console.error('❌ Missing locator. Usage: deck add <github.com/owner/repo[/skill]>')
      process.exit(1)
    }
    await addSkill(locator, { via, deck: deckPath, workdir })
    break
  }
  case 'update':
    updateDeck(deckPath, workdir)
    break
  case 'validate':
    validateDeck(deckPath, workdir)
    break
  default:
    console.error(formatHelp(HELP_CONFIG))
    process.exit(1)
}
