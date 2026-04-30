#!/usr/bin/env bun
/**
 * templates-self-test.ts — Bootstrap check: do init templates match actual project conventions?
 *
 * Run: bun packages/lythoskill-creator/src/templates-self-test.ts
 *
 * This is a reconciler, not a unit test. It compares the hardcoded templates
 * against the current project's own files. When the project evolves, this test
 * fails — prompting a template update.
 */

import {
  starterPackageJson,
  starterTsconfig,
  starterCli,
  exampleSkillMd,
  gitignore,
} from './templates.js'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PKG_ROOT = join(import.meta.dirname, '..', '..', '..')

const groundTruth = {
  tsconfig: JSON.parse(readFileSync(join(PKG_ROOT, 'packages', 'lythoskill-deck', 'tsconfig.json'), 'utf-8')),
  packageJson: JSON.parse(readFileSync(join(PKG_ROOT, 'packages', 'lythoskill-deck', 'package.json'), 'utf-8')),
  cliTs: readFileSync(join(PKG_ROOT, 'packages', 'lythoskill-deck', 'src', 'cli.ts'), 'utf-8'),
  skillMd: readFileSync(join(PKG_ROOT, 'packages', 'lythoskill-deck', 'skill', 'SKILL.md'), 'utf-8'),
  gitignore: readFileSync(join(PKG_ROOT, '.gitignore'), 'utf-8'),
}

const generated = {
  packageJson: JSON.parse(starterPackageJson('test')),
  tsconfig: JSON.parse(starterTsconfig()),
  cliTs: starterCli('test'),
  skillMd: exampleSkillMd('test', 'test'),
  gitignore: gitignore(),
}

const failures: string[] = []

function assert(label: string, condition: boolean, detail?: string) {
  if (!condition) {
    failures.push(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    console.log(`  ✅ ${label}`)
  }
}

console.log('\n=== Template Bootstrap Check ===\n')

// ── tsconfig ───────────────────────────────────────────────
console.log('tsconfig.json:')
assert('moduleResolution is "bundler"', generated.tsconfig.compilerOptions?.moduleResolution === 'bundler')
assert('has esModuleInterop', generated.tsconfig.compilerOptions?.esModuleInterop === true)
assert('has skipLibCheck', generated.tsconfig.compilerOptions?.skipLibCheck === true)
assert('types include bun-types', generated.tsconfig.compilerOptions?.types?.includes('bun-types'))
assert('include glob covers subdirs', generated.tsconfig.include?.some((p: string) => p.includes('**')))

// ── package.json ───────────────────────────────────────────
console.log('\nstarter package.json:')
assert('has license field', !!generated.packageJson.license)
assert('has publishConfig.access', generated.packageJson.publishConfig?.access === 'public')
assert('files include README.md', generated.packageJson.files?.includes('README.md'))
assert('files include LICENSE', generated.packageJson.files?.includes('LICENSE'))
assert('type is "module"', generated.packageJson.type === 'module')

// ── cli.ts ─────────────────────────────────────────────────
console.log('\ncli.ts template:')
const hasJsSuffix = generated.cliTs.match(/from\s+['"]\.\/[^'"]+\.js['"]/)
assert('ESM imports use .js suffix', !!hasJsSuffix)
assert('has shebang', generated.cliTs.startsWith('#!/usr/bin/env bun'))

// ── SKILL.md frontmatter ───────────────────────────────────
console.log('\nSKILL.md frontmatter:')
assert('has version field', generated.skillMd.includes('version:'))
assert('has when_to_use field', generated.skillMd.includes('when_to_use:'))
assert('starts with ---', generated.skillMd.startsWith('---'))

// ── .gitignore ─────────────────────────────────────────────
console.log('\n.gitignore:')
assert('has .npm-access', generated.gitignore.includes('.npm-access'))
assert('has skill-deck.lock', generated.gitignore.includes('skill-deck.lock'))
assert('has .private/', generated.gitignore.includes('.private/'))

// ── Ground-truth drift detection ───────────────────────────
console.log('\nGround-truth drift (project vs template):')
assert(
  'tsconfig compilerOptions keys match ground truth',
  JSON.stringify(Object.keys(generated.tsconfig.compilerOptions).sort()) ===
    JSON.stringify(Object.keys(groundTruth.tsconfig.compilerOptions).sort()),
  `template: ${Object.keys(generated.tsconfig.compilerOptions).join(', ')}; ` +
  `project: ${Object.keys(groundTruth.tsconfig.compilerOptions).join(', ')}`
)

// ── Report ─────────────────────────────────────────────────
console.log('')
if (failures.length > 0) {
  console.error(`❌ ${failures.length} failure(s):`)
  for (const f of failures) console.error(f)
  console.error('\n→ Update packages/lythoskill-creator/src/templates.ts to match current conventions.')
  process.exit(1)
} else {
  console.log('✅ All checks passed. Templates are in sync with project conventions.')
}
