#!/usr/bin/env bun
/**
 * help.ts — Declarative help text formatter
 *
 * Commands and options are defined as data (HelpConfig).
 * formatHelp() produces aligned usage output.
 * This is the SSOT: build pipeline captures `bun cli.ts --help`
 * and writes it to skill/references/COMMANDS.md.
 */

export interface CommandDef {
  name: string
  description: string
  args?: string
}

export interface OptionDef {
  flag: string
  description: string
}

export interface HelpConfig {
  binName: string
  description?: string
  commands: CommandDef[]
  options?: OptionDef[]
}

export function formatHelp(config: HelpConfig): string {
  const lines: string[] = []

  if (config.description) {
    lines.push(`${config.binName} -- ${config.description}`)
    lines.push('')
  }

  // Usage line
  const usages = config.commands.map(
    (c) => `${config.binName} ${c.name}${c.args ? ' ' + c.args : ''}`
  )
  lines.push(`Usage: ${usages.join(' | ')}`)
  lines.push('')

  // Commands
  lines.push('Commands:')
  const cmdWidth = Math.max(
    ...config.commands.map((c) => c.name.length + (c.args ? c.args.length + 1 : 0))
  )
  for (const cmd of config.commands) {
    const left = `  ${cmd.name}${cmd.args ? ' ' + cmd.args : ''}`
    const pad = ' '.repeat(Math.max(cmdWidth - left.length + 4, 2))
    lines.push(`${left}${pad}${cmd.description}`)
  }

  // Options
  if (config.options && config.options.length > 0) {
    lines.push('')
    lines.push('Options:')
    const optWidth = Math.max(...config.options.map((o) => o.flag.length))
    for (const opt of config.options) {
      const left = `  ${opt.flag}`
      const pad = ' '.repeat(Math.max(optWidth - left.length + 4, 2))
      lines.push(`${left}${pad}${opt.description}`)
    }
  }

  return lines.join('\n')
}
