#!/usr/bin/env bun
import { linkDeck } from './link.js'
import { validateDeck } from './validate.js'
import { addSkill } from './add.js'
import { refreshDeck } from './refresh.js'
import { updateDeck } from './update.js'
import { migrateSchema } from './migrate-schema.js'
import { removeSkill } from './remove.js'
import { toSymlinkSkill, toSnapshotSkill } from './to-symlink-snapshot.js'
import { resolveDeckPathSync, fetchDeckUrl, isUrl } from './resolve-deck.js'
import { formatHelp } from './help.js'

const args = process.argv.slice(2)
const command = args[0]

// Argument helpers — accept both `--flag value` and `--flag=value` forms.
function flagValue(name: string): string | undefined {
  const direct = args.find((a) => a.startsWith(name + '='))
  if (direct) return direct.slice(name.length + 1)
  const idx = args.indexOf(name)
  return idx >= 0 ? args[idx + 1] : undefined
}

const cliDeck = flagValue('--deck')
// URL deck: fetch first at the CLI dispatch layer, then pass local path to commands.
// Commands stay sync; URL I/O is handled once here.
let deckPath: string | undefined
if (cliDeck && isUrl(cliDeck)) {
  try {
    deckPath = await fetchDeckUrl(cliDeck)
  } catch (e: any) {
    console.error(`❌ Failed to fetch deck from URL: ${e.message}`)
    console.error('')
    console.error('The deck URL may be unreachable or require authentication.')
    console.error('To fix:')
    console.error('  - Verify the URL is correct and publicly accessible')
    console.error('  - Use a local deck file instead: deck <command> --deck ./skill-deck.toml')
    process.exit(1)
  }
} else if (cliDeck) {
  deckPath = resolveDeckPathSync(cliDeck).path
} else {
  deckPath = undefined
}
const workdir = flagValue('--workdir')
const alias = flagValue('--alias')
const type = flagValue('--type')
const format = flagValue('--format')
const noBackup = args.includes('--no-backup')
const dryRun = args.includes('--dry-run')
const remote = args.includes('--remote')
const mode = flagValue('--mode') as 'symlink' | 'snapshot' | undefined

const HELP_CONFIG = {
  binName: 'lythoskill-deck',
  description: 'Declarative skill deck governance — cold pool, working set, deny-by-default',
  commands: [
    { name: 'link', description: 'Sync working set with skill-deck.toml' },
    { name: 'add', description: 'Download skill to cold pool and add to deck', args: '<locator>' },
    { name: 'refresh', description: 'Pull latest versions of declared skills from upstream', args: '[<fq|alias>]' },
    { name: 'validate', description: 'Validate deck configuration', args: '[deck.toml]' },
    { name: 'remove', description: 'Remove a skill from deck.toml and working set', args: '<fq|alias>' },
    { name: 'to-symlink', description: 'Switch a skill to symlink mode (live link, follows cold pool)', args: '<alias>' },
    { name: 'to-snapshot', description: 'Switch a skill to snapshot mode (pinned cp of current HEAD)', args: '<alias>' },
    { name: 'migrate-schema', description: 'Convert string-array deck.toml to alias-as-key dict', args: '[--dry-run]' },
  ],
  options: [
    { flag: '--deck <path>', description: 'Specify skill-deck.toml path (default: find upward from cwd)' },
    { flag: '--workdir <dir>', description: 'Specify working directory (default: cwd)' },
    { flag: '--mode <symlink|snapshot>', description: 'Link mode: symlink (default) or snapshot (cp)' },
    { flag: '--no-backup', description: 'Skip tar backup when removing non-symlink entries' },

    { flag: '--alias <name>', description: 'Explicit alias for the skill (default: basename of path)' },
    { flag: '--type <type>', description: 'Target section: innate | tool | combo (default: tool)' },
    { flag: '--dry-run', description: 'Show plan without executing (add)' },
    { flag: '--yes', description: 'Skip interactive confirmation' },
    { flag: '--remote', description: 'For validate: probe each FQ locator against api.github.com' },
    { flag: '--format <text|json>', description: 'For validate: output format (default: text)' },
  ],
}

switch (command) {
  case '--help':
  case '-h':
    console.log(formatHelp(HELP_CONFIG))
    process.exit(0)
  case 'link':
    await linkDeck(deckPath, workdir, { noBackup, mode })
    break
  case 'add': {
    const locator = args[1]
    if (!locator) {
      console.error('❌ Missing locator. Usage: deck add <github.com/owner/repo[/skill]>')
      process.exit(1)
    }
    await addSkill(locator, { deck: deckPath, workdir, alias, type, dryRun, mode })
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
    await validateDeck(deckPath, workdir, {
      remote,
      format: format === 'json' ? 'json' : 'text',
    })
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
  case 'to-symlink': {
    const target = args[1] && !args[1].startsWith('-') ? args[1] : undefined
    if (!target) {
      console.error('❌ Missing target. Usage: deck to-symlink <alias>')
      process.exit(1)
    }
    toSymlinkSkill(target, deckPath, workdir)
    break
  }
  case 'to-snapshot': {
    const target = args[1] && !args[1].startsWith('-') ? args[1] : undefined
    if (!target) {
      console.error('❌ Missing target. Usage: deck to-snapshot <alias>')
      process.exit(1)
    }
    toSnapshotSkill(target, deckPath, workdir)
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
