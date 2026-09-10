#!/usr/bin/env bun
/**
 * toml-splice.ts — 声明式 deck.toml 的**最小影响**写入(纯函数)
 *
 * 规则载体:**ADR-20260910152957509**(§规格 表是唯一规格)。本模块只实现那张表,
 * 不在这里复述理由 —— 但每个函数都注明它对应表里哪一行,便于对照与改表。
 *
 * 为什么不是 `parse → 改对象 → stringify`:`@iarna/toml` 的序列化器只认对象里的东西,
 * 注释不在对象里,所以 `deck add` / `deck remove` 会**删光整份文件的注释**并重排没让你改的键
 * (实测)。换任何同模型的对象序列化器都不改善 —— 问题在"用对象图重写整份文档"这个解法。
 * 这里反过来:**用 AST 定位,按文本区间 splice**,其余逐字不动。
 *
 * 两个贯穿全模块的纪律:
 *   - **单位**:AST 的 `range` 是 **UTF-16 code unit**(JS 字符串下标),**不是字节**。
 *     所以全程按字符串读写,**绝不**把文件读成 Buffer 再来切片(实测:本仓 deck 上两者差 12)。
 *   - **写入器的语法 = 读取器的语法**(ADR §规格 总则):读取侧认三种形状,写入侧就得都认,
 *     少一种就是**静默收窄语法**,表现是"昨天还能跑的 deck 今天报错"。
 */

import { parseTOML } from 'toml-eslint-parser'

/** 一次 splice 的结果。失败一律**报错而不退回整份重写**(ADR §规格「失败即不写」)。 */
export type SpliceResult =
  | { ok: true; src: string }
  | { ok: false; code: 'parse-error' | 'not-found' | 'unrepresentable'; message: string }

interface Node {
  type: string
  range: [number, number]
  key?: { range: [number, number] }
  value?: Node & { elements?: Node[]; value?: unknown }
  body?: Node[]
}

const keyText = (src: string, n: Node): string =>
  n.key ? src.slice(n.key.range[0], n.key.range[1]) : ''

/** 该段的行尾风格(ADR §规格:插入用的分隔符**复制文件自己的行尾**) */
function lineEndingAt(src: string, i: number): string {
  return src[i] === '\r' && src[i + 1] === '\n' ? '\r\n' : '\n'
}

/**
 * 节点之后**至多吞 2 个行尾序列**(ADR §规格「删除的区间」)。
 * 为什么按"序列"而不是只找 `\n`:CRLF 下节点后面紧接的是 `\r`,只找 `\n` 会一个都不吞,
 * 留下 `\r\n\r\n\r\n` 残渣。LF 下 2 个序列 = `\n\n`,CRLF 下 = `\r\n\r\n`,两者接缝都恰好留一行空行。
 */
function lineEndingRun(src: string, i: number): number {
  let n = 0
  for (let seq = 0; seq < 2; seq++) {
    if (src[i + n] === '\r' && src[i + n + 1] === '\n') n += 2
    else if (src[i + n] === '\n') n += 1
    else break
  }
  return n
}

/** 删掉 [s,e) 以及其后至多 2 个行尾序列 —— 删除类规则共用的落点 */
function cut(src: string, s: number, e: number): string {
  return src.slice(0, s) + src.slice(e + lineEndingRun(src, e))
}

function parse(src: string): Node[] | SpliceResult {
  try {
    const ast = parseTOML(src, { range: true }) as unknown as { body: Node[] }
    return ast.body?.[0]?.body ?? []
  } catch (err: any) {
    return { ok: false, code: 'parse-error', message: `${err?.message ?? err}` }
  }
}

const isErr = (x: unknown): x is SpliceResult => typeof x === 'object' && x !== null && 'ok' in x

/** 顶层 table 节点里 key 精确等于 `k` 的那个(ADR §规格「定位」按 key 文本匹配,不用行/正则) */
const tableByKey = (body: Node[], src: string, k: string): Node | undefined =>
  body.find(n => n.type === 'TOMLTable' && keyText(src, n) === k)

/** `[<section>]` 表里某个 key 的 key-value 节点 */
const kvInTable = (table: Node | undefined, src: string, k: string): Node | undefined =>
  table?.body?.find(n => n.type === 'TOMLKeyValue' && keyText(src, n) === k)

/** 某个 alias 在 `<section>.skills` 下的三种形状 —— 见 ADR §规格「定位」的 ①②③ */
interface Located {
  /** 要删掉的节点 */
  node: Node
  /** 连带要删的"容器"(规则②删空内联表、规则③删空数组时,容器本身也要走) */
  container?: Node
  /** true = 命中的是 legacy 数组里的元素(删除时要连一个相邻逗号一起走) */
  arrayElem?: boolean
}

function locate(body: Node[], src: string, section: string, alias: string): Located | undefined {
  // ① [<section>.skills.<alias>] —— 常态
  const asTable = tableByKey(body, src, `${section}.skills.${alias}`)
  if (asTable) return { node: asTable }

  // ② [<section>.skills>] 下的内联条目 `alias = { … }`
  const skillsTable = tableByKey(body, src, `${section}.skills`)
  const inline = kvInTable(skillsTable, src, alias)
  if (inline) {
    const isOnlyEntry = (skillsTable?.body?.length ?? 0) === 1
    return { node: inline, container: isOnlyEntry ? skillsTable : undefined }
  }

  // ③ legacy 数组 `[<section>] skills = [...]` 里的那个元素
  const sectionTable = tableByKey(body, src, section)
  const arr = kvInTable(sectionTable, src, 'skills')
  const elems = arr?.value?.elements
  if (arr && Array.isArray(elems)) {
    for (const el of elems) {
      const raw = src.slice(el.range[0], el.range[1])
      if (basename(stripQuotes(raw)) !== alias) continue
      // 单元素数组 → 整个 key-value 走;若该 section 表只剩这一个键 → 表头一起走
      // (与对象层 ``delete deck[section]`` 的空容器级联逐字对应,`remove.test.ts` C11.b 钉着)
      const isOnlyElement = elems.length === 1
      const sectionEmpties = (sectionTable?.body?.length ?? 0) === 1
      return {
        node: el,
        container: isOnlyElement ? (sectionEmpties ? sectionTable : arr) : undefined,
        arrayElem: !isOnlyElement,
      }
    }
  }
  return undefined
}

const stripQuotes = (s: string): string => s.replace(/^["']|["']$/g, '')

/** deck 的 alias 语义:路径末段(与 `parseDeck` 一致) */
export function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

/** 一个 map 在文中现存的"skills 形状" —— 决定插入侧能做什么(ADR §规格「插入(legacy 数组 section)」) */
type SkillsShape = 'tables' | 'inline' | 'legacy-array' | 'absent'

function skillsShape(body: Node[], src: string, section: string): { shape: SkillsShape; node?: Node } {
  const sectionTable = tableByKey(body, src, section)
  const arr = kvInTable(sectionTable, src, 'skills')
  if (arr?.value?.elements) return { shape: 'legacy-array', node: arr }
  if (tableByKey(body, src, `${section}.skills`)) return { shape: 'inline', node: sectionTable }
  if (body.some(n => n.type === 'TOMLTable' && keyText(src, n).startsWith(`${section}.skills.`)))
    return { shape: 'tables' }
  return { shape: 'absent', node: sectionTable }
}

/**
 * 删除一个技能声明。三种形状都支持(ADR §规格「定位(删除)」)。
 * 找不到 → `not-found` 并说明找了哪三种形状(不降级、不重写)。
 */
export function spliceRemoveSkill(src: string, section: string, alias: string): SpliceResult {
  const body = parse(src)
  if (isErr(body)) return body

  const hit = locate(body as Node[], src, section, alias)
  if (!hit) {
    return {
      ok: false,
      code: 'not-found',
      message:
        `no ${section}.skills.${alias} in the file: looked for ` +
        `[${section}.skills.${alias}] (table), a '${alias} = { … }' entry inside [${section}.skills], ` +
        `and a '${alias}' element of a legacy [${section}] skills = [...] array`,
    }
  }

  // ── ③ legacy 数组元素:元素 + **恰好一个**相邻逗号(及其后的空白)一起走 ──
  if (hit.arrayElem) {
    const el = hit.node
    const after = src.slice(el.range[1]).match(/^(\s*),/)
    if (after) {
      const commaEnd = el.range[1] + after[1].length + 1
      const ws = src.slice(commaEnd).match(/^[ \t]*/)?.[0].length ?? 0
      return { ok: true, src: cut(src, el.range[0], commaEnd + ws) }
    }
    const before = src.slice(0, el.range[0]).match(/,(\s*)$/)
    if (before) {
      // 末元素:连它**前面**那个逗号一起走(不重排其余元素,也不留双空格)
      return { ok: true, src: cut(src, el.range[0] - before[0].length, el.range[1]) }
    }
    // 单元素数组:整个 key-value 走(级联见下)
  }

  const target = hit.container ?? hit.node
  return { ok: true, src: cut(src, target.range[0], target.range[1]) }
}

export interface InsertEntry {
  path: string
  source?: string
}

/**
 * 新增一个技能声明。
 * - 常态(`tables` / `inline` / `absent`):插到**最后一个同前缀 table 之后**,分隔符 + 新块(块不带结尾换行)。
 * - legacy 数组段:能否追加取决于**这次操作是否携带字符串表达不了的东西**
 *   (额外字段如 `source`、或自定义 alias ≠ `basename(path)`)。表达不了 → `unrepresentable`,
 *   并点名 `deck migrate-schema`(唯一允许重写文件、且留 `.bak` 的路径)。**绝不在数组形态旁新增表**
 *   —— 实测那是 `Defining a key multiple times is invalid`,即把 deck 写坏。
 */
export function spliceInsertSkill(
  src: string,
  section: string,
  alias: string,
  entry: InsertEntry,
): SpliceResult {
  const body = parse(src)
  if (isErr(body)) return body
  const nodes = body as Node[]
  const eol = lineEndingAt(src, 0)
  const { shape } = skillsShape(nodes, src, section)

  if (shape === 'legacy-array') {
    const unrepresentable: string[] = []
    if (entry.source) unrepresentable.push(`a 'source' field`)
    if (alias !== basename(entry.path)) unrepresentable.push(`a custom alias '${alias}'`)
    if (unrepresentable.length > 0) {
      return {
        ok: false,
        code: 'unrepresentable',
        message:
          `[${section}] uses the legacy string-array form ('skills = [...]'), which cannot carry ` +
          `${unrepresentable.join(' and ')} (a string element carries only the path, and the alias ` +
          `is the TOML key — in an array it can only be the path's basename). ` +
          `Run 'deck migrate-schema' first (it rewrites the file and leaves a .bak), then re-run: ` +
          `the clone already landed in the cold pool, so this is not a re-download. ` +
          `locator: ${entry.path}`,
      }
    }
    // 能表达 → 往数组字面量里追加一个字符串元素(不重排,不动其他字节)
    const sectionTable = tableByKey(nodes, src, section)
    const arr = kvInTable(sectionTable, src, 'skills')!
    const close = arr.value!.range[1] - 1 // `]` 的下标
    // 插在 `]` 前**原有空白之前**:保留文件自己的收尾空格,不引入双空格
    const wsBefore = src.slice(arr.value!.range[0], close).match(/[ \t]*$/)?.[0].length ?? 0
    const at = close - wsBefore
    const isEmpty = (arr.value!.elements ?? []).length === 0
    const addition = `${isEmpty ? '' : ', '}"${entry.path}"`
    return { ok: true, src: src.slice(0, at) + addition + src.slice(at) }
  }

  const block = [`[${section}.skills.${alias}]`, `path = "${entry.path}"`]
  if (entry.source) block.push(`source = "${entry.source}"`)
  const text = block.join(eol)

  const lastTable = [...nodes]
    .reverse()
    .find(n => n.type === 'TOMLTable' && keyText(src, n).startsWith(`${section}.skills.`))
  if (lastTable) {
    const at = lastTable.range[1]
    return { ok: true, src: src.slice(0, at) + eol + eol + text + src.slice(at) }
  }
  // 没有同前缀 table:落到文件末尾(保持一行空行)
  const trimmed = src.replace(/[\r\n]+$/, '')
  const tail = src.slice(trimmed.length)
  return { ok: true, src: trimmed + (tail ? eol + eol : eol + eol) + text + tail }
}
