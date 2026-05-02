# ADR-20260502010100000: deck link backup strategy for non-symlink entries

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | Created — pending implementation |
| accepted | 2026-05-02 | Implemented in link.ts, cli.ts, help.ts, SKILL.md |

## 背景

当前 `deck link` 的 deny-by-default 实现有一个 gap：

- 文档说 "undeclared skills are physically removed"
- 实际实现：只删除 symlink，**真实目录被跳过并警告**

这导致两个对立的问题：
1. **用户困惑**："removes everything else" 的承诺不兑现，幽灵 skill（真实目录）依然存在
2. **安全隐患**：如果 link 真的删除真实目录，可能误删用户数据

Stability test 中 3/3 subagent 都遇到了这个问题：它们看到 "removes everything" 的文档描述，执行 link，发现真实目录还在，然后不得不手动 `rm -rf`。

## 决策驱动

- **承诺一致性**：文档说 remove，就应该 remove
- **数据安全**：不能无条件删除用户可能珍视的数据
- **agent 体验**：agent 不应该在 "link 之后还要手动 rm" 和 "link 不兑现承诺" 之间做选择
- **可恢复性**：被移除的内容应该能找回来

## 选项

### 方案 A：保持现状（ symlink-only 删除）

**优点**：
- 零误删风险
- 实现最简单

**缺点**：
- 文档与行为不一致（"removes everything" 是虚假宣传）
- agent 困惑，需要二次手动清理
- deny-by-default 不彻底——真实目录仍然污染 working set

### 方案 B：自动 tar 备份 + 删除（Selected 倾向）

`link` 执行前做 pre-flight check：

```
if .claude/skills/ contains non-symlink entries:
  1. Create .claude/skills.bak.20260502-120304.tar.gz
  2. Remove non-symlink entries
  3. Continue normal symlink reconciliation
  4. Report: "Backed up 3 real directories to .claude/skills.bak.20260502-120304.tar.gz"
```

**优点**：
- 真正兑现 "removes everything" 的承诺
- 用户有退路（tar 可恢复）
- agent 无需二次手动清理
- 备份是 opt-out（默认行为），不是 opt-in

**缺点**：
- 备份可能很大（如果 .claude/skills/ 下有很多真实文件）
- 长期积累备份文件占用磁盘空间
- tar 操作增加 link 时间（但通常 < 1 秒）

### 方案 C：交互式确认

```
⚠️  Found 3 real directories in .claude/skills/:
   - ghost-skill-a
   - ghost-skill-b
   - random-plugin

   Backup and remove? [Y/n]
```

**优点**：
- 用户有控制权

**缺点**：
- agent 场景下交互困难（subagent 不一定能处理交互 prompt）
- 打断自动化流程
- `--yes` 标志可以绕过，但增加了 API 复杂度

### 方案 D：Trash 目录（软删除）

被移除的内容移到 `.claude/skills.trash/` 而不是删除：

```
.claude/skills.trash/
├── 2026-05-02-120304/
│   ├── ghost-skill-a/
│   └── ghost-skill-b/
```

**优点**：
- 比 tar 更直观，用户可以直接查看被移除了什么
- 恢复比 tar 更简单（直接 mv 回来）

**缺点**：
- 占用磁盘空间，需要定期清理机制
- `.claude/skills.trash/` 本身可能被 agent 扫描到（需要下划线前缀或隐藏）

## 暂定决策

**倾向方案 B（自动 tar 备份 + 删除）**，但有一些调整：

1. **只备份，不保留长期**：tar 放在 `.claude/skills.bak.YYYYMMDDHHMMSS.tar.gz`，用户自己决定是否保留
2. **提供 `--no-backup` 选项**：高级用户或 CI 场景可以跳过备份
3. **备份前检查大小**：如果 .claude/skills/ 下真实目录总大小 > 100MB，改为提示用户而非自动备份（防呆）

## 与现有机制的衔接

当前 CLI 已经输出：
```
⚠️  Skipping non-symlink entry: ghost-skill-a
   → ghost-skill-a is a real directory, not a symlink. Deck only manages symlinks.
```

改为：
```
⚠️  Found 3 real directories in .claude/skills/ (not managed by deck):
   - ghost-skill-a
   - ghost-skill-b
   - random-plugin

   Backing up to .claude/skills.bak.20260502-120304.tar.gz ... ✅
   Removing untracked directories ... ✅
```

## 影响

### 正面
- `link` 真正兑现 deny-by-default 承诺
- 用户无需手动清理 ghost skills
- 有退路（tar 备份），不担心误删

### 负面
- 增加 link 执行时间（tar 压缩）
- 可能产生大量备份文件（如果用户频繁运行 link）
- 100MB+ 目录的边界情况需要额外处理

### 风险
- **tar 失败**：如果磁盘空间不足，tar 可能失败。需要优雅降级为"跳过并警告"。
- **权限问题**：某些目录可能无写权限导致 rm 失败。需要处理并报告。

## 实施

### Phase 1：Pre-flight check

在 `link.ts` 的收束逻辑前增加：

```typescript
// Pre-flight: 备份并清理非 symlink 实体（真实目录/文件）
const nonSymlinks: string[] = [];
try {
  for (const entry of readdirSync(WORKING_SET)) {
    if (entry.startsWith("_") || entry.startsWith(".")) continue;
    const entryPath = join(WORKING_SET, entry);
    try {
      const st = lstatSync(entryPath);
      if (!st.isSymbolicLink()) {
        nonSymlinks.push(entry);
      }
    } catch { continue; }
  }
} catch {}

if (nonSymlinks.length > 0) {
  // Calculate total size
  let totalSize = 0;
  for (const e of nonSymlinks) {
    totalSize += calculateDirSize(join(WORKING_SET, e));
  }

  if (!noBackup && totalSize > BACKUP_SIZE_THRESHOLD) {
    console.error(`❌ Found ${nonSymlinks.length} real directories in ... (> 100MB total).`);
    console.error(`   Manual review required: ${nonSymlinks.join(", ")}`);
    console.error(`   Use --no-backup to skip backup (removes without saving), or clean up manually.`);
    process.exit(1);
  }

  if (!noBackup) {
    const bakName = `skills.bak.${formatBackupDate(new Date())}.tar.gz`;
    const bakPath = join(PROJECT_DIR, ".claude", bakName);
    mkdirSync(join(PROJECT_DIR, ".claude"), { recursive: true });

    const tarArgs = [
      "czf", bakPath,
      ...nonSymlinks.map(e => relative(PROJECT_DIR, join(WORKING_SET, e))),
    ];
    execSync("tar " + tarArgs.map(a => a.includes(" ") ? `"${a}"` : a).join(" "), {
      cwd: PROJECT_DIR,
      stdio: "pipe",
    });
    console.log(`📦 Backed up ${nonSymlinks.length} entr${nonSymlinks.length === 1 ? "y" : "ies"} to .claude/${bakName}`);
  } else {
    console.log(`⚠️  --no-backup: removing ${nonSymlinks.length} entr${nonSymlinks.length === 1 ? "y" : "ies"} without backup`);
  }

  for (const e of nonSymlinks) {
    rmSync(join(WORKING_SET, e), { recursive: true, force: true });
  }
}
```

### Phase 2：更新文档

SKILL.md 中更新 Constraints：
```markdown
- **link removes undeclared entries** — symlinks are unlinked, real directories are
  backed up to `.claude/skills.bak.YYYYMMDD-HHMMSS.tar.gz` then removed.
```

### Phase 3：ADR-check 规则

`scripts/adr-check.sh` 中增加检查：确保 SKILL.md 不再出现 "Deck only manages symlinks" 这种与方案 B 矛盾的描述。

## 相关

- `packages/lythoskill-deck/src/link.ts` — reconciler implementation
- `packages/lythoskill-deck/skill/SKILL.md` — documentation to update
- `playground/deck-stability-test/results.md` — subagent feedback that motivated this ADR
- ADR-20260501160000000 — skill-deck.toml section semantics
