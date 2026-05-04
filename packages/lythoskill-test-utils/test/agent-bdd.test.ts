import { describe, test, expect } from 'bun:test'
import { parseAgentMd } from '../src/agent-bdd'

describe('parseAgentMd', () => {
  test('parses frontmatter fields (name, description, timeout)', () => {
    const content = `---
name: "Test scenario"
description: A sample scenario
timeout: 120000
---

## When
Do something useful.
`
    const result = parseAgentMd(content)
    expect(result.name).toBe('Test scenario')
    expect(result.description).toBe('A sample scenario')
    expect(result.timeout).toBe(120000)
    expect(result.when).toBe('Do something useful.')
  })

  test('defaults for missing frontmatter fields', () => {
    const content = `---
---

## When
Just do it.
`
    const result = parseAgentMd(content)
    expect(result.name).toBe('unnamed agent scenario')
    expect(result.description).toBe('')
    expect(result.timeout).toBe(30000)
  })

  test('throws on missing frontmatter', () => {
    expect(() => parseAgentMd('# Not frontmatter\n\n## When\n')).toThrow('Invalid .agent.md: missing frontmatter')
  })

  test('throws on unclosed frontmatter', () => {
    expect(() => parseAgentMd('---\nname: test\n## When\n')).toThrow('Invalid .agent.md: frontmatter not closed')
  })

  test('throws on missing ## When section', () => {
    const content = `---
name: test
---

## Given
Some setup
`
    expect(() => parseAgentMd(content)).toThrow('Invalid .agent.md: missing ## When')
  })

  test('parses ## Judge section when present', () => {
    const content = `---
name: Judged scenario
---

## Given
- tool skills: skill-a, skill-b

## When
Run a command.

## Then
- Result should be correct

## Judge
Verify the output is correct.
`
    const result = parseAgentMd(content)
    expect(result.judge).toBe('Verify the output is correct.')
    expect(result.then).toEqual(['Result should be correct'])
  })

  test('empty judge when no ## Judge section', () => {
    const content = `---
name: No judge
---

## When
Just run it.
`
    const result = parseAgentMd(content)
    expect(result.judge).toBe('')
    expect(result.then).toEqual([])
  })

  test('parses tool skills from ## Given with alias (localhost) syntax', () => {
    const content = `---
name: Localhost test
---

## Given
- tool skills: my-skill (localhost), other-skill

## When
Do stuff.
`
    const result = parseAgentMd(content)
    expect(result.given.deck.tool).toBeDefined()
    const tool = result.given.deck.tool!
    expect(Object.keys(tool)).toHaveLength(2)
    expect(tool['my-skill']).toEqual({ path: 'localhost/my-skill' })
    expect(tool['other-skill']).toEqual({ path: 'github.com/foo/bar/other-skill' })
  })

  test('parses tool skills from ## Given without alias', () => {
    const content = `---
name: Simple test
---

## Given
- tool skills: skill-a, skill-b, skill-c

## When
Execute.
`
    const result = parseAgentMd(content)
    const tool = result.given.deck.tool!
    expect(Object.keys(tool)).toHaveLength(3)
    expect(tool['skill-a']).toEqual({ path: 'github.com/foo/bar/skill-a' })
  })
})
