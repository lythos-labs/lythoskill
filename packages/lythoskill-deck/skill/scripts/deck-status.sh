#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deck-status — 一致性诊断（只读）
# ============================================================
# 检查 toml / lock / symlink / 冷池四层一致性。
# 不修改任何文件。Skills 是用户资产，status 只看不碰。
# ============================================================

PROJECT_DIR="${1:-.}"
PROJECT_DIR=$(cd "$PROJECT_DIR" && pwd)

# 颜色
if [ -t 1 ]; then
  G='\033[32m' Y='\033[33m' R='\033[31m' D='\033[90m' B='\033[1m' N='\033[0m'
else
  G='' Y='' R='' D='' B='' N=''
fi

ISSUES=()
issue() { ISSUES+=("$1|$2|$3"); }

# ── toml ─────────────────────────────────────────────────────
DECK="$PROJECT_DIR/skill-deck.toml"
TOML_OK=false
WS="" CP="" MC=10

if [ -f "$DECK" ]; then
  TOML_OK=true
  WS=$(grep -E '^\s*working_set' "$DECK" | head -1 | sed 's/.*"\(.*\)".*/\1/')
  CP=$(grep -E '^\s*cold_pool' "$DECK" | head -1 | sed 's/.*"\(.*\)".*/\1/')
  MC=$(grep -E '^\s*max_cards' "$DECK" | head -1 | sed 's/.*=\s*\([0-9]*\).*/\1/')

  # 展开路径
  [[ "$WS" == .* ]] && WS="$PROJECT_DIR/$WS"
  [[ "$CP" == '~/'* ]] && CP="$HOME/${CP:2}"
  [ -z "$WS" ] && WS="$PROJECT_DIR/.claude/skills"
  [ -z "$CP" ] && CP="$HOME/.agents/skill-repos"
  MC=${MC:-10}

  # 提取声明的 skill
  DECLARED=()
  while IFS= read -r line; do
    for n in $(echo "$line" | grep -o '"[^"]*"' | tr -d '"'); do
      [ -n "$n" ] && [[ "$n" != ~* ]] && [[ "$n" != .* ]] && DECLARED+=("$n")
    done
  done < <(grep -v '^\s*#' "$DECK")
else
  issue "error" "toml 不存在" "运行 deck-migrate.sh 或手动创建"
fi

# ── working set ──────────────────────────────────────────────
ACTUAL=()
LINKED=0

if [ -d "$WS" ]; then
  for entry in "$WS"/*/; do
    [ -d "$entry" ] || continue
    name=$(basename "$entry")
    [[ "$name" == _* ]] && continue
    ACTUAL+=("$name")
    LINKED=$((LINKED + 1))

    # 检查 symlink 健康度
    ep="${entry%/}"
    if [ -L "$ep" ]; then
      target=$(readlink -f "$ep" 2>/dev/null || echo "")
      [ -z "$target" ] || [ ! -d "$target" ] && \
        issue "error" "断链: $name" "执行 deck-link 重新同步"
    fi

    # 检查 SKILL.md 存在
    [ ! -f "${entry}SKILL.md" ] && \
      issue "warn" "$name 缺少 SKILL.md" "检查冷池中该 skill 的完整性"
  done
fi

# ── 交叉检查 ─────────────────────────────────────────────────
if $TOML_OK; then
  # 幽灵：在 working set 但不在 toml
  for a in "${ACTUAL[@]:-}"; do
    [ -z "$a" ] && continue
    found=false
    for d in "${DECLARED[@]:-}"; do [ "$a" = "$d" ] && found=true && break; done
    $found || issue "warn" "幽灵: ${a}（已链接但未声明）" "添加到 toml 或执行 deck-link 清除"
  done

  # 缺失：在 toml 但不在 working set
  for d in "${DECLARED[@]:-}"; do
    [ -z "$d" ] && continue
    found=false
    for a in "${ACTUAL[@]:-}"; do [ "$d" = "$a" ] && found=true && break; done
    $found || issue "warn" "未链接: ${d}（已声明但无 symlink）" "执行 deck-link 同步"
  done

  # 预算
  [ "$LINKED" -gt "$MC" ] && \
    issue "error" "超出预算: $LINKED/$MC" "减少声明或调整 max_cards"
fi

# ── lock 新鲜度 ──────────────────────────────────────────────
LOCK="$PROJECT_DIR/skill-deck.lock"
LOCK_OK=false

if [ -f "$LOCK" ]; then
  LOCK_OK=true
  if $TOML_OK; then
    TOML_MT=$(stat -c %Y "$DECK" 2>/dev/null || stat -f %m "$DECK" 2>/dev/null || echo 0)
    LOCK_MT=$(stat -c %Y "$LOCK" 2>/dev/null || stat -f %m "$LOCK" 2>/dev/null || echo 0)
    [ "$TOML_MT" -gt "$LOCK_MT" ] && \
      issue "warn" "toml 比 lock 新（声明变更后未同步）" "执行 deck-link 重新同步"
  fi
else
  $TOML_OK && [ "${#DECLARED[@]}" -gt 0 ] && \
    issue "info" "lock 文件不存在" "执行 deck-link 生成"
fi

# ── managed_dirs 重叠（从 lock 读取）─────────────────────────
if $LOCK_OK && command -v python3 &>/dev/null; then
  overlaps=$(python3 -c "
import json, sys
try:
    lock = json.load(open('$LOCK'))
    dirs = {}
    for s in lock.get('skills', []):
        for d in s.get('sm_managed_dirs', []):
            d = d.rstrip('/')
            dirs.setdefault(d, []).append(s['name'])
    for d, owners in dirs.items():
        if len(owners) > 1:
            print(d + ': ' + ', '.join(owners))
except: pass
" 2>/dev/null)
  [ -n "$overlaps" ] && while IFS= read -r line; do
    issue "warn" "目录重叠: $line" "检查相关 skill 的 sm_managed_dirs 声明"
  done <<< "$overlaps"
fi

# ── 冷池统计 ─────────────────────────────────────────────────
POOL_COUNT=0
if [ -d "$CP" ]; then
  for d in "$CP"/*/; do [ -d "$d" ] && POOL_COUNT=$((POOL_COUNT + 1)); done
fi

# ── 备份统计 ─────────────────────────────────────────────────
BACKUP_COUNT=0
LATEST_BACKUP=""
for bf in "$HOME/.agents"/skills-backup-*.tar.gz; do
  [ -f "$bf" ] || continue
  BACKUP_COUNT=$((BACKUP_COUNT + 1))
  LATEST_BACKUP=$(basename "$bf")
done

# ── 输出 ─────────────────────────────────────────────────────
echo ""
echo -e "${B}══ Skill Deck Status ═══════════════════════════════${N}"
echo ""

printf "  %-22s" "skill-deck.toml"
$TOML_OK && echo -e "${G}✓${N}" || echo -e "${R}✗${N}"

printf "  %-22s" "skill-deck.lock"
$LOCK_OK && echo -e "${G}✓${N}" || echo -e "${D}—${N}"

printf "  %-22s" "声明 / 链接 / 上限"
if [ "$LINKED" -gt "$MC" ]; then
  echo -e "${R}${#DECLARED[@]} / $LINKED / $MC ← 超${N}"
else
  echo -e "${G}${#DECLARED[@]} / $LINKED / $MC${N}"
fi

printf "  %-22s%s\n" "冷池 skill 数" "$POOL_COUNT"
printf "  %-22s" "备份"
[ "$BACKUP_COUNT" -gt 0 ] && echo -e "${G}${BACKUP_COUNT} 份${N} ${D}($LATEST_BACKUP)${N}" || echo -e "${D}无${N}"

# working set 清单
if [ "$LINKED" -gt 0 ]; then
  echo ""
  echo -e "  ${B}Working Set:${N}"
  for entry in "$WS"/*/; do
    [ -d "$entry" ] || continue
    name=$(basename "$entry")
    [[ "$name" == _* ]] && continue
    ep="${entry%/}"
    if [ -L "$ep" ]; then
      target=$(readlink "$ep" 2>/dev/null || echo "?")
      if [ -d "$(readlink -f "$ep" 2>/dev/null || echo "")" ]; then
        printf "    ${G}✓${N} %-24s ${D}→ %s${N}\n" "$name" "$target"
      else
        printf "    ${R}✗${N} %-24s ${R}断链 → %s${N}\n" "$name" "$target"
      fi
    else
      printf "    ${Y}?${N} %-24s ${Y}(非 symlink)${N}\n" "$name"
    fi
  done
fi

# 问题
echo ""
if [ ${#ISSUES[@]} -eq 0 ]; then
  echo -e "  ${G}${B}一切正常。${N}"
else
  for item in "${ISSUES[@]}"; do
    IFS='|' read -r sev msg rec <<< "$item"
    case "$sev" in
      error) icon="${R}✗${N}" ;;
      warn)  icon="${Y}⚠${N}" ;;
      *)     icon="${D}ℹ${N}" ;;
    esac
    echo -e "  $icon $msg"
    echo -e "    ${D}→ $rec${N}"
  done
fi

echo ""
echo -e "${D}──────────────────────────────────────────────────${N}"
echo "  同步: bunx lythoskill-deck link"
echo "  诊断: bash scripts/deck-status.sh"
echo -e "${D}──────────────────────────────────────────────────${N}"
echo ""
