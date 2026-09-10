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
  | { ok: false; code: 'parse-error' | 'not-found' | 'unrepresentable' | 'would-corrupt'; message: string }

interface Node {
  type: string
  range: [number, number]
  key?: { range: [number, number] }
  value?: Node & { elements?: Node[]; value?: unknown }
  body?: Node[]
}

const keyText = (src: string, n: Node): string =>
  n.key ? src.slice(n.key.range[0], n.key.range[1]) : ''

/**
 * 一个 key 节点的**分段**(H2):`[tool.skills."alpha"]` 与 `[tool . skills . alpha]`
 * 在读取侧都是同一个 `tool.skills.alpha`,所以只比较裸文本会把它们判成"不存在" ——
 * 那就是**静默收窄语法**(`validate` 通过、`remove` 报错)。带引号/带空格的写法必须认。
 */
function keySegments(n: Node | undefined): string[] {
  const parts = (n as any)?.key?.keys ?? (n as any)?.keys
  if (Array.isArray(parts)) {
    return parts.map((p: any) => (typeof p.name === 'string' ? p.name : p.value ?? ''))
  }
  return []
}
const keyIs = (n: Node | undefined, want: string[]): boolean => {
  const got = keySegments(n)
  return got.length === want.length && got.every((g, i) => g === want[i])
}

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

/**
 * **结果的护栏**(ADR §规格「失败即不写」用在**输出**上):
 * 拼出来的文本必须能被解析,否则报错而不写。
 *
 * 这条是**结构性**的,不是又一个形状规则:任何"我以为我认识、其实读侧另有写法"的形状
 * (scalar `skills`、点号键、以后新增的)在这里被一次拦住 —— 而不是靠我把形状枚举全。
 * 实测反例:deck 里 `[tool] skills = "oops"` 能通过 `validate` 并正常 link,
 * 但按"追加一个表"的常规路径写下去会让文件**不可解析**,且**另一个 section 的已声明技能
 * 会从所有读取者眼里消失**。枚举挡不住它,这一条能。
 */
function finalize(original: string, next: string): SpliceResult {
  if (next === original) return { ok: true, src: next }
  try {
    parseTOML(next, { range: true })
  } catch (err: any) {
    return {
      ok: false,
      code: 'would-corrupt',
      message:
        `the spliced result would not parse (${err?.message ?? err}) — refusing to write. ` +
        `This deck uses a shape this writer does not model; the file is byte-identical to before.`,
    }
  }
  return { ok: true, src: next }
}

/** `[<section>]` 表节点(内联表形态的容器) */
const sectionTable0 = (body: Node[], src: string, section: string): Node | undefined =>
  tableByKey(body, src, section)

/** 顶层 table 节点里 key 分段等于 `want` 的那个(ADR §规格「定位」:按 key 匹配,不用行/正则) */
const tableByKey = (body: Node[], _src: string, k: string): Node | undefined => {
  const want = k.split('.')
  return body.find(n => n.type === 'TOMLTable' && keyIs(n, want))
}

/** 某个表体里 key 分段等于 `k` 的 key-value 节点 */
const kvInTable = (table: Node | undefined, _src: string, k: string): Node | undefined => {
  const want = k.split('.')
  return table?.body?.find(n => n.type === 'TOMLKeyValue' && keyIs(n, want))
}

/** 某个 alias 在 `<section>.skills` 下的三种形状 —— 见 ADR §规格「定位」的 ①②③ */
interface Located {
  /** 要删掉的节点 */
  node: Node
  /** 连带要删的"容器"(规则②删空内联表、规则③删空数组时,容器本身也要走) */
  container?: Node
  /** true = 命中的是 legacy 数组里的元素(删除时要连一个相邻逗号一起走) */
  arrayElem?: boolean
  /** true = 命中的是内联表里的条目(删除时同样要连一个相邻逗号走) */
  mapEntry?: boolean
  /** 点号键家族:一次删除可能涉及多条 key-value(R2-H3) */
  group?: Node[]
  /** 一次剪掉的**整段**(用于"连空表头一起走"的级联:两个相邻节点合成一个区间) */
  range?: [number, number]
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
    if (!isOnlyEntry) return { node: inline }
    // 级联:这张表空了 → 连表头一起走;若 `[<section>]` 表体本来就空 → 一级也不留(R2-H1)
    const secTable = tableByKey(body, src, section)
    const secEmpty =
      secTable !== undefined &&
      secTable !== skillsTable &&
      (secTable.body?.length ?? 0) === 0 &&
      isAdjacent(src, secTable, skillsTable!)
    // 两个相邻节点合成一个区间:单次剪掉"空 section 头 + 这张表"(级联要走到底)
    return secEmpty
      ? { node: inline, range: [secTable!.range[0], skillsTable!.range[1]] }
      : { node: inline, container: skillsTable }
  }

  // ④ `[<section>] skills = { alias = { … } }` 内联表里的那个条目(H1:读取侧认它,写入侧就得认)
  const map = kvInTable(sectionTable0(body, src, section), src, 'skills')
  const mapBody = (map?.value as any)?.body
  if (Array.isArray(mapBody)) {
    const entry = mapBody.find((kv: Node) => keyIs(kv, [alias]))
    if (entry) {
      const sectionEmpties = (sectionTable0(body, src, section)?.body?.length ?? 0) === 1
      const isOnlyEntry = mapBody.length === 1
      return {
        node: entry,
        container: isOnlyEntry ? (sectionEmpties ? sectionTable0(body, src, section) : map) : undefined,
        arrayElem: !isOnlyEntry,
        mapEntry: true,
      }
    }
  }

  // ③ legacy 数组 `[<section>] skills = [...]` 里的那个元素
  const sectionTable = sectionTable0(body, src, section)
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
  // ⑤ 点号键家族(R2-H3):`[tool] skills.alpha.path = …` / `[tool.skills] alpha.path = …` /
  //    `[tool] skills.alpha = { … }` 等 —— 读取侧全认(`validate` 通过),写入侧也必须认。
  //    做法是**通用**的:走全树算每个 key-value 的完整路径,取等于或前缀于目标的那些
  //    (点号字段可能拆成多条 kv,所以是"一组"而不是"一个")。
  const wantFull = `${section}.skills.${alias}`
  const hits: Node[] = []
  walkKv(body, [], (kv, path) => {
    const full = path.join('.')
    if (full === wantFull || full.startsWith(`${wantFull}.`)) hits.push(kv)
  })
  if (hits.length > 0) {
    // **折叠嵌套命中,只留最外层**(R3-H1):内联表的**内层字段**也是命中
    // (`skills.alpha = { path = …, source = … }` 里的 path/source 路径同样以 `<alias>.` 为前缀),
    // 若不折叠,先剪内层会让外层的 end 偏移失效 —— 剪裁会**越界吃掉后面的注释与 section**,
    // 而且结果往往仍可解析,所以结果护栏救不了它。
    const outer = hits.filter(h => !hits.some(o => o !== h && o.range[0] <= h.range[0] && o.range[1] >= h.range[1]))
    const owner = tableByKey(body, src, `${section}.skills`) ?? tableByKey(body, src, section)
    const ownerBody = owner?.body ?? []
    const clearsOwner = owner !== undefined && ownerBody.length === outer.length && outer.every(h => ownerBody.includes(h))
    if (clearsOwner) {
      const secTable = tableByKey(body, src, section)
      const extend =
        secTable && secTable !== owner && (secTable.body?.length ?? 0) === 0 && isAdjacent(src, secTable, owner!)
          ? secTable.range[0]
          : owner!.range[0]
      return { node: outer[0], group: outer, range: [extend, owner!.range[1]] }
    }
    return { node: outer[0], group: outer }
  }

  return undefined
}

/** 全树遍历:回调拿到每个 key-value 及其**完整路径**(含所在表的点号段) */
function walkKv(nodes: Node[], prefix: string[], cb: (kv: Node, path: string[]) => void): void {
  for (const n of nodes) {
    if (n.type === 'TOMLTable' && n.body) {
      walkKv(n.body, [...prefix, ...keySegments(n)], cb)
    } else if (n.type === 'TOMLKeyValue') {
      const path = [...prefix, ...keySegments(n)]
      cb(n, path)
      const inner = (n.value as any)?.body
      if (Array.isArray(inner)) walkKv(inner, path, cb) // 内联表体(如 skills = { alpha.path = … })
    }
  }
}

/** 解析失败返回 undefined(用在"剪完再看一眼"的场合,不抛) */
function parseTOMLLoose(src: string): Node[] | undefined {
  try {
    const ast = parseTOML(src, { range: true }) as unknown as { body: Node[] }
    return ast.body?.[0]?.body ?? []
  } catch {
    return undefined
  }
}

/** 找到某 section 下**已被清空**的 `skills = { }` 键(用于把残渣一并剪掉) */
function findEmptySkillsMap(src: string, body: Node[], section: string): Node | undefined {
  const secT = tableByKey(body, src, section)
  const kv = kvInTable(secT, src, 'skills')
  const inner = (kv?.value as any)?.body
  return kv && Array.isArray(inner) && inner.length === 0 ? kv : undefined
}

/** 两个节点之间只有空白(用于"相邻才连表头一起删"的判断) */
function isAdjacent(src: string, a: Node, b: Node): boolean {
  const [first, second] = a.range[0] < b.range[0] ? [a, b] : [b, a]
  return /^[\s]*$/.test(src.slice(first.range[1], second.range[0]))
}

const stripQuotes = (s: string): string => s.replace(/^["']|["']$/g, '')

/** deck 的 alias 语义:路径末段(与 `parseDeck` 一致) */
export function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

/** 一个 map 在文中现存的"skills 形状" —— 决定插入侧能做什么(ADR §规格「插入(legacy 数组 section)」) */
type SkillsShape = 'tables' | 'inline' | 'legacy-array' | 'inline-map' | 'absent'

function skillsShape(body: Node[], src: string, section: string): { shape: SkillsShape; node?: Node } {
  const sectionTable = tableByKey(body, src, section)
  const arr = kvInTable(sectionTable, src, 'skills')
  if (arr?.value?.elements) return { shape: 'legacy-array', node: arr }
  if (Array.isArray((arr?.value as any)?.body)) return { shape: 'inline-map', node: arr }
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

  // ── ⑤ 点号键家族:一组 key-value 逐个剪掉(从后往前,避免下标失效)──
  if (hit.range) return finalize(src, cut(src, hit.range[0], hit.range[1]))
  if (hit.group) {
    // R4-H1:组内命中若在**内联表内部**(`skills = { alpha.path = …, beta.path = … }`),
    // 每条都是"条目",必须像数组元素一样**连一个相邻逗号**一起剪 —— 否则会留下悬挂逗号
    // (首/中字段则直接变成非法,被结果护栏拦下 = 用户被挡住)。
    const inInline = (n: Node) => /\{[^}]*$/.test(src.slice(Math.max(0, n.range[0] - 400), n.range[0]))
    const cutOne = (n: Node): [number, number] => {
      if (!inInline(n)) return [n.range[0], n.range[1] + lineEndingRun(src, n.range[1])]
      const after = src.slice(n.range[1]).match(/^(\s*),/)
      if (after) {
        const commaEnd = n.range[1] + after[1].length + 1
        const ws = src.slice(commaEnd).match(/^[ \t]*/)?.[0].length ?? 0
        return [n.range[0], commaEnd + ws]
      }
      const before = src.slice(0, n.range[0]).match(/,(\s*)$/)
      if (before) return [n.range[0] - before[0].length, n.range[1]]
      return [n.range[0], n.range[1]]
    }
    const ranges = hit.group.map(cutOne).sort((x, y) => y[0] - x[0])
    let out = src
    for (const [rs, re] of ranges) out = out.slice(0, rs) + out.slice(re)
    // 内联 map 被清空 → 连 map 的键一起走(否则留 `skills = {  }` 残渣);
    // section 随之空 → 表头一并走(与对象层级联一致)
    const parsed2 = parseTOMLLoose(out)
    if (parsed2) {
      const mapKv = findEmptySkillsMap(out, parsed2, section)
      if (mapKv) {
        const secT = tableByKey(parsed2, out, section)
        const wholeAt = secT && (secT.body?.length ?? 0) === 1 && isAdjacent(out, secT, mapKv) ? secT.range[0] : mapKv.range[0]
        out = cut(out, wholeAt, mapKv.range[1])
      }
    }
    return finalize(src, out)
  }

  // ── ③④ 数组元素 / 内联表条目:元素 + **恰好一个**相邻逗号(及其后的空白)一起走 ──
  if (hit.arrayElem) {
    const el = hit.node
    const after = src.slice(el.range[1]).match(/^(\s*),/)
    if (after) {
      const commaEnd = el.range[1] + after[1].length + 1
      const ws = src.slice(commaEnd).match(/^[ \t]*/)?.[0].length ?? 0
      return finalize(src, cut(src, el.range[0], commaEnd + ws))
    }
    const before = src.slice(0, el.range[0]).match(/,(\s*)$/)
    if (before) {
      // 末元素:连它**前面**那个逗号一起走(不重排其余元素,也不留双空格)
      return finalize(src, cut(src, el.range[0] - before[0].length, el.range[1]))
    }
    // 单元素数组:整个 key-value 走(级联见下)
  }

  const target = hit.container ?? hit.node
  return finalize(src, cut(src, target.range[0], target.range[1]))
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
    return finalize(src, src.slice(0, at) + addition + src.slice(at))
  }

  if (shape === 'inline-map') {
    // `[<section>] skills = { alpha = { … } }`:能表达 alias(**它就是键**)与 `source`(字段),
    // 所以**不需要拒绝**;但**绝不**在旁边新增 `[<section>.skills.x]` 表 ——
    // 那会让 TOML 抛 `Defining a key multiple times is invalid`(H1:把 deck 写坏)。
    const map = kvInTable(tableByKey(nodes, src, section), src, 'skills')!
    const lit = map.value!.range
    const close = lit[1] - 1 // `}`
    const wsBefore = src.slice(lit[0], close).match(/[ \t]*$/)?.[0].length ?? 0
    const at = close - wsBefore
    const fields = [`path = "${entry.path}"`]
    if (entry.source) fields.push(`source = "${entry.source}"`)
    const isEmpty = ((map.value as any).body ?? []).length === 0
    const addition = `${isEmpty ? '' : ', '}${alias} = { ${fields.join(', ')} }`
    return finalize(src, src.slice(0, at) + addition + src.slice(at))
  }

  const block = [`[${section}.skills.${alias}]`, `path = "${entry.path}"`]
  if (entry.source) block.push(`source = "${entry.source}"`)
  const text = block.join('\n')

  const want = `${section}.skills.`
  const lastTable = [...nodes]
    .reverse()
    .find(n => n.type === 'TOMLTable' && keySegments(n).join('.').startsWith(want))
  if (lastTable) {
    const at = lastTable.range[1]
    const eol = lineEndingAt(src, at) // H3:按**插入点**判行尾,不是 offset 0
    return finalize(src, src.slice(0, at) + eol + eol + text.replace(/\n/g, eol) + src.slice(at))
  }
  // 没有同前缀 table:落到文件末尾(保持一行空行)
  const trimmed = src.replace(/[\r\n]+$/, '')
  const tail = src.slice(trimmed.length)
  // R4-LOW:判据就是**插入点本身**(与 lastTable 路径同一条),不扫全文、也不猜前一个换行 ——
  // 那两个版本各错一个方向(多行字符串里的另一种行尾会把它带偏)。
  const eol = lineEndingAt(src, trimmed.length)
  return finalize(src, trimmed + eol + eol + text.replace(/\n/g, eol) + tail)
}
