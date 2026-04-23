const fence = '`'.repeat(3)

// -- workspace root --------------------------------
export const rootPackageJson = (name: string) =>
  JSON.stringify(
    { name: `${name}-workspace`, private: true, workspaces: ['packages/*'] },
    null,
    2
  ) + '\n'

export const pnpmWorkspace = () =>
`packages:
  - 'packages/*'
`

export const gitignore = () =>
`node_modules/
*.tsbuildinfo
.DS_Store
playground/
`

// -- starter package --------------------------------
export const starterPackageJson = (name: string) =>
  JSON.stringify(
    {
      name,
      version: '0.1.0',
      type: 'module',
      bin: { [name]: './src/cli.ts' },
      files: ['src'],
    },
    null,
    2
  ) + '\n'

export const starterTsconfig = () =>
  JSON.stringify(
    {
      compilerOptions: {
        target: 'esnext',
        module: 'esnext',
        moduleResolution: 'bundler',
        strict: true,
        types: ['bun-types'],
      },
      include: ['src'],
    },
    null,
    2
  ) + '\n'

export const starterCli = (name: string) =>
`#!/usr/bin/env bun
import { hello } from './index'
import pkg from '../package.json' with { type: 'json' }
const [command, ...args] = process.argv.slice(2)

switch (command) {
  case 'hello':
    console.log(hello())
    break
  case 'version':
    console.log(pkg.version)
    break
  default:
    console.log(
      '${name} -- your skill starter\\n' +
      '\\n' +
      'Commands:\\n' +
      '  hello    Say hello\\n' +
      '  version  Show version'
    )
}
`

export const starterIndex = (name: string) =>
`export function hello(): string {
  return 'Hello from ${name}!'
}
`

// -- example skill ----------------------------------
export const exampleSkillMd = (skillName: string, starterName: string) =>
`---
name: ${skillName}
description: TODO -- describe what this skill does
---

# ${skillName}

## Scripts

### run

Run the hello command.

${fence}bash
bunx ${starterName} hello
${fence}
`

export const skillScript = (starterName: string, command: string) =>
`#!/bin/bash
bunx ${starterName} ${command} "$@"
`
