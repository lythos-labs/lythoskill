# TASK-20260519224838606: 实现 curator add --output 对齐与副作用显式声明

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| in-progress | 2026-05-19 | Started |
| review | 2026-05-19 | Deliverables committed |
| completed | 2026-05-19 | Done |

## 背景与目标
`curator add` 在 clone skill 到 cold pool 后，会隐式执行两项全局副作用：写 `additions.jsonl` 和 write-through cache 到 `catalog.db`。这两项操作的写入路径在源码中硬编码，不跟随 `scan --output`，且 write-through cache 失败完全静默。

本任务目标：修改 `packages/lythoskill-curator/src/cli.ts`，让 `add` 支持 `--output` 对齐，副作用显式声明，静默失败改为降级提示。

## 需求详情
- [ ] `curator add` 新增 `--output <dir>` 参数
  - 不传时保持现有默认：`~/.agents/lythoskill/curator/`
  - 传入时，`additions.jsonl` 和 write-through cache 均落到该目录
- [ ] `writeAddition` 函数不再忽略 poolPath，改为接收 `outputDir` 参数
- [ ] write-through cache 区块的异常处理从空 catch 改为打印降级提示
- [ ] `add` 成功后 stdout 显式打印 additions.jsonl 和 catalog.db 的写入路径
- [ ] SKILL.md 中 `add` 命令示例更新，说明 `--output` 用法

## 技术方案
修改文件：`packages/lythoskill-curator/src/cli.ts`

1. **`parseCuratorArgs` 复用**：`runAdd` 中复用已有的参数解析逻辑，提取 `--output`（如果不传则 fallback 到默认路径）。
2. **`writeAddition` 签名调整**：
   ```ts
   function writeAddition(outputDir: string, record: ...)
   ```
   内部 `metaDir = outputDir`，不再硬编码 home 路径。
3. **write-through cache 区块**：
   ```ts
   } catch {
     console.log(`   ⚠️  Index update skipped (will catch up on next scan)`)
   }
   ```
4. **成功分支追加输出**：
   ```ts
   console.log(`📝 Addition logged: ${join(outputDir, 'additions.jsonl')}`)
   console.log(`📇 Index updated:   ${join(outputDir, 'catalog.db')}`)
   ```
5. **测试**：在 `cli.test.ts` 中新增测试用例覆盖 `--output` 场景和降级提示场景。

## 验收标准
- [ ] `bunx @lythos/skill-curator add github.com/owner/repo --pool /tmp/pool --output /tmp/index` 后，`/tmp/index/additions.jsonl` 和 `/tmp/index/catalog.db` 存在且包含新 skill
- [ ] 不传 `--output` 时，行为与修改前完全一致（写到默认目录）
- [ ] 模拟 catalog.db 不可写时，stdout 包含 `Index update skipped` 提示
- [ ] 成功后 stdout 包含 `Addition logged:` 和 `Index updated:` 路径声明
- [ ] `bun --filter='*' run test` 通过

## 进度记录
- 2026-05-19: 修改 `cli.ts` — `writeAddition` 改为接收 `outputDir`，`runAdd` 新增 `--output` 参数解析、dry-run 输出声明、成功时副作用路径显式打印、write-through cache 降级提示
- 2026-05-19: 修改 `cli.test.ts` — 新增 `writeAddition` 单元测试（C7-C8），新增 `runAdd` BDD 场景 C5（dry-run --output 解析）和 C6（already-in-pool 兼容）
- 2026-05-19: 修改 `skill/SKILL.md` — add 命令文档增加 `--output` 示例和说明
- 2026-05-19: 全量测试通过（53 pass / 0 fail）

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts`
- 修改: `packages/lythoskill-curator/src/cli.test.ts`
- 修改: `packages/lythoskill-curator/skill/SKILL.md`

## Git 提交信息建议
```
feat(curator): add --output alignment and transparent side-effects (TASK-20260519224838606)

- add --output flag to curator add for index location alignment
- writeAddition now respects outputDir instead of hardcoded path
- write-through cache failures print downgrade hint instead of silent skip
- success stdout now declares additions.jsonl and catalog.db paths
```

## 备注
- 默认行为不变，向后兼容
- 关联 ADR: ADR-20260519224555402
- 关联 Epic: EPIC-20260519224747755
