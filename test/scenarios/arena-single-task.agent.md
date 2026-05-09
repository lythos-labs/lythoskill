---
name: Arena single-task smoke test
description: Verify single --task can run a .agent.md scenario that produces files and runs bun test.
timeout: 120000
---

## Given
- Working directory with no existing files
- bun is available for running tests

## When
Create a TypeScript file `greet.ts` that exports a function:
```ts
export function greet(name: string): string {
  return `Hello, ${name}!`
}
```

Then create a test file `greet.test.ts`:
```ts
import { expect, test } from "bun:test"
import { greet } from "./greet"

test("greet returns Hello with name", () => {
  expect(greet("World")).toBe("Hello, World!")
})

test("greet handles empty string", () => {
  expect(greet("")).toBe("Hello, !")
})
```

Run `bun test` to verify the tests pass. Write the test output summary (pass/fail counts) to `result.txt`.

## Then
- `greet.ts` exists with the greet function
- `greet.test.ts` exists with 2 test cases
- `result.txt` shows test results
- All tests pass

## Judge
Evaluate the agent's output on:
- correctness: Does greet.ts implement the correct function signature and logic?
- completeness: Are both test files created with the specified test cases?
- execution: Did the agent run `bun test` successfully and write results to `result.txt`?
- quality: Is the code clean, well-typed, and idiomatic TypeScript?
