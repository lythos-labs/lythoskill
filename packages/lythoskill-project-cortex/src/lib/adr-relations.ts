#!/usr/bin/env bun
/**
 * adr-relations.ts — ADR 的「取代关系」写成 **frontmatter**(机器可读),不是散文
 *
 * 为什么要有这个模块:一个 ADR 被取代之后,**读它的人(人或 agent)必须能立刻知道
 * "该去读哪一份"**。此前这条信息只活在 `## Status History` 的一句散文里
 * (`| superseded | 2026-09-10 | Superseded by ADR-xxx |`),而真实事故是:
 * 外部 reviewer 读到一份**已被整条取代**的 ADR,照着它描述了已经不存在的实现
 * (2026-09-10,deck 的 tar 备份 ADR)。
 *
 * 所以关系写在文件顶部,两侧都写:
 *   - 旧:`superseded_by: <id>`  ← **最新的看什么**;<id> 可以是**任何 cortex id**
 *     (实测有一份的后继是 EPIC —— 照实写,别留 `null`:null 会被读成"没被取代")
 *   - 新:`supersedes: [ADR-xxx]`   ← 反向,便于审计"这份替代了谁"
 *
 * 纯函数(字符串进、字符串出),不碰文件系统 —— 与 `toml-splice.ts` 同一纪律:
 * 能纯测的逻辑不放进入口。
 */

export interface AdrRelations {
  supersedes: string[]
  supersededBy: string | null
  /** 本 ADR 挂靠的 epic(`## Related` 里的 `Related Epic` 的机器可读版) */
  epic: string | null
  /** 与本 ADR 相关的 task:来源 / 实现 / follow-up */
  tasks: string[]
}

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/

/** 读现有关系;没有 frontmatter / 没有字段 → 空关系(不抛) */
export function parseRelations(src: string): AdrRelations {
  const m = src.match(FM)
  if (!m) return { supersedes: [], supersededBy: null, epic: null, tasks: [] }
  const body = m[1]
  const list = body.match(/^supersedes:\s*\[(.*)\]\s*$/m)
  const single = body.match(/^superseded_by:\s*(.+?)\s*$/m)
  const supersedes = list && list[1].trim()
    ? list[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : []
  const raw = single?.[1]?.trim()
  const supersededBy = !raw || raw === 'null' || raw === '~' ? null : raw.replace(/^["']|["']$/g, '')
  const epicM = body.match(/^epic:\s*(.+?)\s*$/m)
  const epicRaw = epicM?.[1]?.trim()
  const epic = !epicRaw || epicRaw === 'null' || epicRaw === '~' ? null : epicRaw.replace(/^["']|["']$/g, '')
  const tasksM = body.match(/^tasks:\s*\[(.*)\]\s*$/m)
  const tasks = tasksM && tasksM[1].trim()
    ? tasksM[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : []
  return { supersedes, supersededBy, epic, tasks }
}

function render(rel: AdrRelations): string {
  return (
    `---\n` +
    `supersedes: [${rel.supersedes.join(', ')}]\n` +
    `superseded_by: ${rel.supersededBy ?? 'null'}\n` +
    `epic: ${rel.epic ?? 'null'}\n` +
    `tasks: [${rel.tasks.join(', ')}]\n` +
    `---\n`
  )
}

/** 确保文件有 frontmatter —— **必须在文件最顶端**(与 epic 模板同形;`^` 锚定也依赖这一点) */
function withFrontmatter(src: string, rel: AdrRelations): string {
  if (FM.test(src)) return src.replace(FM, render(rel))
  return render(rel) + '\n' + src
}

/** 标记「本 ADR 被 `by` 取代」(旧那一侧) */
export function setSupersededBy(src: string, by: string): string {
  return withFrontmatter(src, { ...parseRelations(src), supersededBy: by })
}

/** 记录「本 ADR 取代了 `id`」(新那一侧);重复调用不产生重复项 */
export function addSupersedes(src: string, id: string): string {
  const rel = parseRelations(src)
  const supersedes = rel.supersedes.includes(id) ? rel.supersedes : [...rel.supersedes, id]
  return withFrontmatter(src, { ...rel, supersedes })
}
