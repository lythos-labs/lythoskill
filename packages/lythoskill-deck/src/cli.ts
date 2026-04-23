#!/usr/bin/env bun
/**
 * lythoskill-deck CLI
 * Thin skill router — delegates to deck governance modules.
 */

import { linkDeck } from './link.js'
import { showStatus } from './status.js'

function printHelp(): void {
  console.log(`
📋 lythoskill-deck — Skill Deck governance CLI

Commands:
  link [path/to/skill-deck.toml]   Sync toml → working set symlinks
  status [project-dir]             Diagnostic report (read-only)

Examples:
  lythoskill-deck link
  lythoskill-deck link ./my-deck.toml
  lythoskill-deck status
  lythoskill-deck status ./my-project
`)
}

function main(): void {
  const command = process.argv[2]
  const arg = process.argv[3]

  switch (command) {
    case 'link':
      linkDeck(arg)
      break

    case 'status':
      showStatus(arg || '.')
      break

    default:
      printHelp()
  }
}

if (import.meta.main) {
  main()
}
