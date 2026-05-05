import { expect, test } from "bun:test"
import { greet } from "./greet"

test("greet returns Hello with name", () => {
  expect(greet("World")).toBe("Hello, World!")
})

test("greet handles empty string", () => {
  expect(greet("")).toBe("Hello, !")
})
