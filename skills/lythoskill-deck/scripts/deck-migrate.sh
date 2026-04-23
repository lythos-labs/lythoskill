#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deck-migrate — 从默认 skills 目录迁移到声明式管理
# ============================================================
# 做什么：备份 → 移到冷池 → 清空 working set → 生成 toml 草稿
# 不做什么：不删除任何文件，不修改 skill 内容，不安装依赖
# 撤销：tar xf ~/.agents/skills-backup-<timestamp>.tar.gz -C ~/
# ============================================================

SKILLS_DIR="$HOME/.claude/skills"
COLD_POOL="$HOME/.agents/skill-repos"
BACKUP_DIR="$HOME/.agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/skills-backup-${TIMESTAMP}.tar.gz"

if [ ! -d "$SKILLS_DIR" ]; then
  echo "ℹ️  $SKILLS_DIR 不存在，无需迁移。"
  exit 0
fi

# 收集 skill 列表（跳过下划线前缀）
SKILL_NAMES=()
for dir in "$SKILLS_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  [[ "$name" == _* ]] && continue
  SKILL_NAMES+=("$name")
done

if [ ${#SKILL_NAMES[@]} -eq 0 ]; then
  echo "ℹ️  $SKILLS_DIR 里没有 skill，无需迁移。"
  exit 0
fi

echo "🔍 发现 ${#SKILL_NAMES[@]} 个 skill："
for name in "${SKILL_NAMES[@]}"; do
  printf "  %s\n" "$name"
done

echo ""
echo "📦 将执行："
echo "  1. 备份 → $BACKUP_FILE"
echo "  2. 移动 → $COLD_POOL/"
echo "  3. 清空 → $SKILLS_DIR/"
echo "  4. 生成 → ./skill-deck.toml 草稿"
echo ""
echo "  撤销: tar xf $BACKUP_FILE -C \$HOME"
echo ""
read -p "继续？(y/N) " confirm
[[ "$confirm" == [yY]* ]] || { echo "已取消。"; exit 0; }

# 备份
mkdir -p "$BACKUP_DIR"
echo ""
echo "📦 备份中..."
tar czf "$BACKUP_FILE" -C "$HOME" ".claude/skills"
echo "   ✅ $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 移动到冷池
mkdir -p "$COLD_POOL"
echo ""
echo "📁 移动到冷池..."
MOVED=0
for name in "${SKILL_NAMES[@]}"; do
  src="$SKILLS_DIR/$name"
  dest="$COLD_POOL/$name"

  if [ -d "$dest" ]; then
    echo "   ⏭️  $name（冷池已存在，跳过）"
    continue
  fi

  if [ -L "$src" ]; then
    real_src=$(readlink -f "$src" 2>/dev/null || echo "")
    if [ -n "$real_src" ] && [ -d "$real_src" ]; then
      cp -r "$real_src" "$dest"
      echo "   📎 $name（解析 symlink 后复制）"
    else
      echo "   ⚠️  $name（断链，跳过）"
      continue
    fi
  else
    mv "$src" "$dest"
    echo "   ✅ $name"
  fi
  MOVED=$((MOVED + 1))
done

# 清空 skills 目录（保留下划线前缀目录）
for name in "${SKILL_NAMES[@]}"; do
  rm -rf "$SKILLS_DIR/$name"
done
echo ""
echo "🧹 $SKILLS_DIR 已清空"

# 生成 toml 草稿
DECK_FILE="./skill-deck.toml"
if [ -f "$DECK_FILE" ]; then
  echo ""
  echo "ℹ️  $DECK_FILE 已存在，不覆盖。"
else
  {
    cat << 'TOML_HEAD'
# ============================================================
# Skill Deck — 项目级 Skill 声明
# ============================================================
# 操作：取消注释需要的 skill → 执行 deck-link → 完成
# 撤销迁移：tar xf ~/.agents/skills-backup-*.tar.gz -C ~/
# ============================================================

[deck]
working_set = ".claude/skills"
cold_pool   = "~/.agents/skill-repos"
max_cards   = 10

[innate]
skills = [
  # 常驻——无论什么任务都需要的放这里（大部分不属于此类）
]

[tool]
skills = [
TOML_HEAD
    for name in "${SKILL_NAMES[@]}"; do
      echo "  # \"$name\","
    done
    cat << 'TOML_TAIL'
]

[combo]
skills = []

# [transient.example-fix]
# path    = "./patches/example-fix"
# reason  = "描述 agent 在什么场景犯什么错"
# expires = "2026-07-01"
TOML_TAIL
  } > "$DECK_FILE"

  echo ""
  echo "📝 已生成 $DECK_FILE（${#SKILL_NAMES[@]} 个 skill 列为注释）"
fi

echo ""
echo "✅ 迁移完成"
echo "   下一步：编辑 skill-deck.toml → 取消注释 → 同步 working set"
