#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deck-migrate — 从默认 skills 目录迁移到声明式管理
# ============================================================
# 做什么:备份 → 移到冷池 → 清空 working set → 生成 toml 草稿
# 不做什么:不删除任何文件,不修改 skill 内容,不安装依赖
# 撤销:tar xf ~/.agents/skills-backup-<timestamp>.tar.gz -C ~/
# ============================================================

# ── 默认配置 ─────────────────────────────────────────────────
SOURCE_DIR=""
COLD_POOL="$HOME/.agents/skill-repos"
BACKUP_DIR="$HOME/.agents"
DECK_FILE="./skill-deck.toml"
SCAN_BRANDS=false
SKIP_CONFIRM=false
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/skills-backup-${TIMESTAMP}.tar.gz"

# ── 参数解析 ─────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-dir)
      SOURCE_DIR="$2"
      shift 2
      ;;
    --cold-pool)
      COLD_POOL="$2"
      shift 2
      ;;
    --deck)
      DECK_FILE="$2"
      shift 2
      ;;
    --scan-brands)
      SCAN_BRANDS=true
      shift
      ;;
    --yes)
      SKIP_CONFIRM=true
      shift
      ;;
    --help)
      cat << 'HELP'
Usage: deck-migrate.sh [options]

Options:
  --source-dir <dir>   Source skills directory (default: $HOME/.claude/skills)
  --cold-pool <dir>    Target cold pool (default: $HOME/.agents/skill-repos)
  --deck <file>        Output deck file (default: ./skill-deck.toml)
  --scan-brands        Scan ~/.kimi/skills, ~/.claude/skills, ~/.codex/skills
  --yes                Skip confirmation prompt
  --help               Show this help

Examples:
  # Migrate global Claude skills (default)
  bash deck-migrate.sh

  # Migrate project-local skills
  bash deck-migrate.sh --source-dir ./.claude/skills --cold-pool ./skills

  # Scan all brand directories and merge
  bash deck-migrate.sh --scan-brands
HELP
      exit 0
      ;;
    *)
      echo "Unknown option: $1 (use --help for usage)" >&2
      exit 1
      ;;
  esac
done

# ── 确定源目录 ───────────────────────────────────────────────
if $SCAN_BRANDS; then
  BRAND_DIRS=(
    "$HOME/.kimi/skills"
    "$HOME/.claude/skills"
    "$HOME/.codex/skills"
  )
else
  # 未指定 source-dir 时默认用 Claude 目录
  if [[ -z "$SOURCE_DIR" ]]; then
    SOURCE_DIR="$HOME/.claude/skills"
  fi
  BRAND_DIRS=("$SOURCE_DIR")
fi

# ── 收集 skill 列表 ──────────────────────────────────────────
# 用关联数组去重(bash 4+)
declare -A SKILL_MAP
SKILL_SOURCES=()   # 有序列表,保持发现顺序

for dir in "${BRAND_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  for subdir in "$dir"/*/; do
    [ -d "$subdir" ] || continue
    name=$(basename "$subdir")
    [[ "$name" == _* ]] && continue
    if [[ -z "${SKILL_MAP[$name]:-}" ]]; then
      SKILL_MAP[$name]="$subdir"
      SKILL_SOURCES+=("$name")
    fi
  done
done

if [ ${#SKILL_SOURCES[@]} -eq 0 ]; then
  if $SCAN_BRANDS; then
    echo "ℹ️  未在任何 brand 目录 (~/.kimi/skills, ~/.claude/skills, ~/.codex/skills) 中发现 skill,无需迁移."
  else
    echo "ℹ️  $SOURCE_DIR 不存在或没有 skill,无需迁移."
  fi
  exit 0
fi

# ── 展示发现 ─────────────────────────────────────────────────
source_label=""
if $SCAN_BRANDS; then
  source_label="多个 brand 目录"
else
  source_label="$SOURCE_DIR"
fi

echo "🔍 从 ${source_label} 发现 ${#SKILL_SOURCES[@]} 个 skill:"
for name in "${SKILL_SOURCES[@]}"; do
  printf "  %s\n" "$name"
done

echo ""
echo "📦 将执行:"
echo "  1. 备份 → $BACKUP_FILE"
echo "  2. 移动 → $COLD_POOL/"
echo "  3. 清空源 working set"
echo "  4. 生成 → $DECK_FILE 草稿"
echo ""
echo "  撤销: tar xf $BACKUP_FILE -C \$HOME"
echo ""

if ! $SKIP_CONFIRM; then
  read -p "继续？(y/N) " confirm
  [[ "$confirm" == [yY]* ]] || { echo "已取消."; exit 0; }
fi

# ── 备份 ─────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
echo ""
echo "📦 备份中..."

# 备份所有受影响的 brand 目录
for dir in "${BRAND_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  rel=${dir#$HOME/}
  if [[ -n "$rel" && "$rel" != "$dir" ]]; then
    tar czf "$BACKUP_FILE" -C "$HOME" "$rel" 2>/dev/null || true
  fi
done

if [ -f "$BACKUP_FILE" ]; then
  echo "   ✅ $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
  echo "   ⚠️  备份文件未生成(源目录可能为空或不可读)"
fi

# ── 移动到冷池 ───────────────────────────────────────────────
mkdir -p "$COLD_POOL"
echo ""
echo "📁 移动到冷池..."
MOVED=0

for name in "${SKILL_SOURCES[@]}"; do
  src="${SKILL_MAP[$name]}"
  dest="$COLD_POOL/$name"

  if [ -d "$dest" ]; then
    echo "   ⏭️  $name(冷池已存在,跳过)"
    continue
  fi

  if [ -L "$src" ]; then
    real_src=$(readlink -f "$src" 2>/dev/null || echo "")
    if [ -n "$real_src" ] && [ -d "$real_src" ]; then
      cp -r "$real_src" "$dest"
      echo "   📎 $name(解析 symlink 后复制)"
    else
      echo "   ⚠️  $name(断链,跳过)"
      continue
    fi
  else
    mv "$src" "$dest"
    echo "   ✅ $name"
  fi
  MOVED=$((MOVED + 1))
done

# ── 清空源 working set ──────────────────────────────────────
for dir in "${BRAND_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  for name in "${SKILL_SOURCES[@]}"; do
    src="$dir/$name"
    [ -e "$src" ] && rm -rf "$src"
  done
done
echo ""
echo "🧹 源 working set 已清空"

# ── 生成 toml 草稿 ──────────────────────────────────────────
if [ -f "$DECK_FILE" ]; then
  echo ""
  echo "ℹ️  $DECK_FILE 已存在,不覆盖."
else
  # 计算相对路径(如果冷池在项目内)
  cold_pool_display="$COLD_POOL"
  if [[ "$COLD_POOL" == "$PWD"* ]] || [[ "$COLD_POOL" == ./* ]]; then
    cold_pool_display="$COLD_POOL"
  elif [[ "$COLD_POOL" == "$HOME"* ]]; then
    cold_pool_display="~${COLD_POOL#$HOME}"
  fi

  {
    cat << 'TOML_HEAD'
# ============================================================
# Skill Deck — 项目级 Skill 声明
# ============================================================
# 操作:取消注释需要的 skill → 执行 deck-link → 完成
# 撤销迁移:tar xf ~/.agents/skills-backup-*.tar.gz -C ~/
# ============================================================

[deck]
working_set = ".claude/skills"
max_cards   = 10

TOML_HEAD
    echo "cold_pool   = \"$cold_pool_display\""
    cat << 'TOML_MID'

[innate]
skills = [
  # 常驻——无论什么任务都需要的放这里(大部分不属于此类)
]

[tool]
skills = [
TOML_MID
    for name in "${SKILL_SOURCES[@]}"; do
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
  echo "📝 已生成 $DECK_FILE(${#SKILL_SOURCES[@]} 个 skill 列为注释)"
fi

echo ""
echo "✅ 迁移完成"
echo "   下一步:编辑 $DECK_FILE → 取消注释 → 同步 working set"
