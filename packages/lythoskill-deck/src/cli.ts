#!/usr/bin/env bun
import { linkDeck } from './link.js'
import { validateDeck } from './validate.js'
import { addSkill } from './add.js'
import { refreshDeck } from './refresh.js'
import { updateDeck } from './update.js'
import { migrateSchema } from './migrate-schema.js'
import { removeSkill } from './remove.js'
import { pruneDeck } from './prune.js'
import { formatHelp } from './help.js'

const args = process.argv.slice(2)
const command = args[0]

const deckFlagIdx = args.indexOf('--deck')
const workdirFlagIdx = args.indexOf('--workdir')
const aliasFlagIdx = args.indexOf('--alias')
const typeFlagIdx = args.indexOf('--type')

const deckPath = deckFlagIdx >= 0 ? args[deckFlagIdx + 1] : undefined
const workdir = workdirFlagIdx >= 0 ? args[workdirFlagIdx + 1] : undefined
const alias = aliasFlagIdx >= 0 ? args[aliasFlagIdx + 1] : undefined
const type = typeFlagIdx >= 0 ? args[typeFlagIdx + 1] : undefined
const noBackup = args.includes('--no-backup')
const yes = args.includes('--yes')
const dryRun = args.includes('--dry-run')

const HELP_CONFIG = {
  binName: 'lythoskill-deck',
  description: 'Declarative skill deck governance — cold pool, working set, deny-by-default',
  commands: [
    { name: 'link', description: 'Sync working set with skill-deck.toml' },
    { name: 'add', description: 'Download skill to cold pool and add to deck', args: '<locator>' },
    { name: 'refresh', description: 'Pull latest versions of declared skills from upstream', args: '[<fq|alias>]' },
    { name: 'validate', description: 'Validate deck configuration', args: '[deck.toml]' },
    { name: 'remove', description: 'Remove a skill from deck.toml and working set', args: '<fq|alias>' },
    { name: 'prune', description: 'GC cold pool repos no longer referenced by any deck', args: '[--yes]' },
    { name: 'migrate-schema', description: 'Convert string-array deck.toml to alias-as-key dict', args: '[--dry-run]' },
  ],
  options: [
    { flag: '--deck <path>', description: 'Specify skill-deck.toml path (default: find upward from cwd)' },
    { flag: '--workdir <dir>', description: 'Specify working directory (default: cwd)' },
    { flag: '--no-backup', description: 'Skip tar backup when removing non-symlink entries' },

    { flag: '--alias <name>', description: 'Explicit alias for the skill (default: basename of path)' },
    { flag: '--type <type>', description: 'Target section: innate | tool | combo (default: tool)' },
    { flag: '--dry-run', description: 'Show plan without executing (add, prune)' },
    { flag: '--yes', description: 'Skip interactive confirmation (for prune)' },
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
    await addSkill(locator, { deck: deckPath, workdir, alias, type, dryRun })
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
  case 'remove': {
    const removeTarget = args[1] && !args[1].startsWith('-') ? args[1] : undefined
    if (!removeTarget) {
      console.error('❌ Missing target. Usage: deck remove <fq|alias>')
      process.exit(1)
    }
    removeSkill(removeTarget, deckPath, workdir)
    break
  }
  case 'prune': {
    await pruneDeck(deckPath, workdir, yes)
    break
  }
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
