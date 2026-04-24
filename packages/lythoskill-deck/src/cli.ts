#!/usr/bin/env bun
import { linkDeck } from './link.js'

const command = process.argv[2]
const deckFlagIdx = process.argv.indexOf('--deck')
const workdirFlagIdx = process.argv.indexOf('--workdir')
const deckPath = deckFlagIdx >= 0 ? process.argv[deckFlagIdx + 1] : undefined
const workdir = workdirFlagIdx >= 0 ? process.argv[workdirFlagIdx + 1] : undefined

switch (command) {
  case 'link':
    linkDeck(deckPath, workdir)
    break
  default:
    console.error('Usage: lythoskill-deck link [--deck <path>] [--workdir <dir>]')
    process.exit(1)
}
