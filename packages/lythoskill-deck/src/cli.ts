#!/usr/bin/env bun
import { linkDeck } from './link.js'
import { validateDeck } from './validate.js'
import { formatHelp } from './help.js'

const HELP_CONFIG = {
  binName: 'lythoskill-deck',
  description: 'Declarative skill deck governance — cold pool, working set, deny-by-default',
  commands: [
    { name: 'link', description: 'Sync working set with skill-deck.toml' },
    { name: 'validate', description: 'Validate deck configuration', args: '[deck.toml]' },
  ],
  options: [
    { flag: '--deck <path>', description: 'Specify skill-deck.toml path (default: find upward from cwd)' },
    { flag: '--workdir <dir>', description: 'Specify working directory (default: cwd)' },
  ],
}

const command = process.argv[2]
const deckFlagIdx = process.argv.indexOf('--deck')
const workdirFlagIdx = process.argv.indexOf('--workdir')
const deckPath = deckFlagIdx >= 0 ? process.argv[deckFlagIdx + 1] : undefined
const workdir = workdirFlagIdx >= 0 ? process.argv[workdirFlagIdx + 1] : undefined

switch (command) {
  case '--help':
  case '-h':
    console.log(formatHelp(HELP_CONFIG))
    process.exit(0)
  case 'link':
    linkDeck(deckPath, workdir)
    break
  case 'validate':
    validateDeck(deckPath, workdir)
    break
  default:
    console.error(formatHelp(HELP_CONFIG))
    process.exit(1)
}
