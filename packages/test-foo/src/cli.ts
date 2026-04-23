#!/usr/bin/env bun
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
      'test-foo -- your skill starter\n' +
      '\n' +
      'Commands:\n' +
      '  hello    Say hello\n' +
      '  version  Show version'
    )
}
