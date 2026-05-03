#!/usr/bin/env bun
import { linkDeck } from './link.js'
import { validateDeck } from './validate.js'
import { addSkill } from './add.js'
import { refreshDeck } from './refresh.js'
import { updateDeck } from './update.js'
import { migrateSchema } from './migrate-schema.js'
import { formatHelp } from './help.js'

const args = process.argv.slice(2)
const command = args[0]

const deckFlagIdx = args.indexOf('--deck')
const workdirFlagIdx = args.indexOf('--workdir')
const viaFlagIdx = args.indexOf('--via')
const asFlagIdx = args.indexOf('--as')
const typeFlagIdx = args.indexOf('--type')

const deckPath = deckFlagIdx >= 0 ? args[deckFlagIdx + 1] : undefined
const workdir = workdirFlagIdx >= 0 ? args[workdirFlagIdx + 1] : undefined
const via = viaFlagIdx >= 0 ? args[viaFlagIdx + 1] : undefined
const as = asFlagIdx >= 0 ? args[asFlagIdx + 1] : undefined
const type = typeFlagIdx >= 0 ? args[typeFlagIdx + 1] : undefined
const noBackup = args.includes('--no-backup')

const HELP_CONFIG = {
  binName: 'lythoskill-deck',
  description: 'Declarative skill deck governance — cold pool, working set, deny-by-default',
  commands: [
    { name: 'link', description: 'Sync working set with skill-deck.toml' },
    { name: 'add', description: 'Download skill to cold pool and add to deck', args: '<locator>' },
    { name: 'refresh', description: 'Pull latest versions of declared skills from upstream', args: '[<fq|alias>]' },
    { name: 'validate', description: 'Validate deck configuration', args: '[deck.toml]' },
    { name: 'migrate-schema', description: 'Convert string-array deck.toml to alias-as-key dict', args: '[--dry-run]' },
  ],
  options: [
    { flag: '--deck <path>', description: 'Specify skill-deck.toml path (default: find upward from cwd)' },
    { flag: '--workdir <dir>', description: 'Specify working directory (default: cwd)' },
    { flag: '--no-backup', description: 'Skip tar backup when removing non-symlink entries' },
    { flag: '--via <backend>', description: 'Download backend: git (default) | skills.sh' },
    { flag: '--as <alias>', description: 'Explicit alias for the skill (default: basename of path)' },
    { flag: '--type <type>', description: 'Target section: innate | tool | combo (default: tool)' },
  ],
}

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
    await addSkill(locator, { via, deck: deckPath, workdir, as, type })
    break
  }
  case 'refresh': {
    const refreshTarget = args[1] && !args[1].startsWith('-') ? args[1] : undefined
    refreshDeck(deckPath, workdir, refreshTarget)
    break
  }
  case 'update': {
    const updateTarget = args[1] && !args[1].startsWith('-') ? args[1] : undefined
    updateDeck(deckPath, workdir, updateTarget)
    break
  }
  case 'validate':
    validateDeck(deckPath, workdir)
    break
  case 'migrate-schema': {
    const dryRun = args.includes('--dry-run')
    const targetPath = deckPath || 'skill-deck.toml'
    const result = migrateSchema(targetPath, dryRun)
    if (result.diff) {
      console.log(result.message)
      console.log('---')
      console.log(result.diff)
    } else {
      console.log(result.message)
    }
    if (!result.migrated) process.exit(0)
    break
  }
  default:
    console.error(formatHelp(HELP_CONFIG))
    process.exit(1)
}
