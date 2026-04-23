#!/usr/bin/env bun
import { linkDeck } from './link.js'

const command = process.argv[2]
const deckFlagIdx = process.argv.indexOf('--deck')
const deckPath = deckFlagIdx >= 0 ? process.argv[deckFlagIdx + 1] : undefined

switch (command) {
  case 'link':
    linkDeck(deckPath)
    break
  default:
    console.error('Usage: lythoskill-deck link [--deck <path>]')
    process.exit(1)
}
