# Pattern: Fence Variable for Nested Backticks

## Problem

在 TypeScript 模板字符串中生成包含代码块（含反引号）的文件内容时，反引号嵌套会导致解析错误或难以阅读的转义。

## Solution

```typescript
const fence = '`'.repeat(3)
// fence === '```'

const markdown = `${fence}bash
bunx ${starterName} hello
${fence}`
```

## Why This Works

- `` '`'.repeat(3) `` 在运行时构造三个反引号，不是字面量
- 模板字符串内部不需要转义
- 生成的文件中恰好是 ``` 代码块标记

## When NOT to Use

- 生成不含反引号的文件（直接写模板字符串即可）
- 只有单个反引号时（直接用 `\`` 转义更清晰）
