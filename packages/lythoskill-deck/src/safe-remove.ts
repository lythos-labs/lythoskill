#!/usr/bin/env bun
/**
 * safe-remove.ts — 删除守卫:所有权判定 + symlink 感知的移除
 *
 * 两道防线,第二道是本模块存在的理由:
 *
 *  1. **只删链接不删内容**(Goose #11600 类):条目是 symlink 时只 unlink 本身,
 *     绝不 recursive 进目标(cold pool 真身)。
 *  2. **只删自己认领的东西**(k8s ownerReferences,TASK-20260910111600389):
 *     删除的安全边界是**所有权**,不是目录包含关系。
 *     deck 只删它能证明是自己建的两类条目:
 *       (a) 指向本 deck cold pool 的 symlink —— symlink 模式建的就是这个形状;
 *       (b) 记录在 state `managed_dests` 里的条目 —— snapshot 模式建的真实目录。
 *     两者都不满足 = 外来条目(用户手写的 skill、别的项目的链接、别的 CLI 的配置)
 *     → **永不删除**,由调用方报告。
 *
 * 为什么包含关系不算所有权:fan-out 目标可以是 `~/.config/goose/skills`、
 * 也可以是**别的项目**的 `.claude/skills`。"它在我写过的目录里" ≠ "它是我建的"。
 * 前一道防线在文件系统层面没做错什么 —— 它删的确实是"非 symlink 条目" ——
 * 错的是它把"非 symlink"当成了"我的旧快照"。这两件事不等价。
 *
 * 纪律:
 *   - lstat 判定(不跟随链接):symlink 与真实目录走不同分支
 *   - 断链也要能删(existsSync 会跟随链接漏掉断链,所以不用它判定)
 *     → 见 safe-remove.test.ts 的实测断言,不引 Node 文档语义
 *   - 判定(deckOwnsEntry)与执行(remove*)分离:判据不删东西,删除不猜归属
 */

import { lstatSync, readlinkSync, rmSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

// ── 所有权判定 ──────────────────────────────────────────────

/**
 * 判定所需的全部输入。`managedDests` 由调用方从 state 拼好
 * (`state.skills[].dest` ∪ `state.skills[].managed_dests`,均已 resolve 为绝对路径)。
 *
 * 刻意只收一个集合、不收整个 state:判定只该看到一个输入,给它整个 state
 * 就是把"哪些字段算什么"的判断权又散回各调用点。
 */
export interface OwnershipContext {
  /** 本 deck 的 cold pool 绝对路径 */
  coldPool: string;
  /** 本 deck 在 state 里记录过、自己创建的绝对路径集合 */
  managedDests: ReadonlySet<string>;
}

export type OwnershipVerdict =
  | { owned: true; present: true; via: "symlink-into-coldpool" | "state-record" }
  | { owned: false; present: false; reason: string }
  | { owned: false; present: true; reason: string };

/**
 * deck 是否拥有这个条目 —— **只回答归属,不删任何东西**。
 *
 * `present: false` = 路径本来就不存在(调用方照常往下走);
 * `present: true` = 有个东西在那儿(是 deck 的,或不是 deck 的但占着位置)。
 *
 * `present` 在**三个**变体里都存在,是刻意的:少一个,调用方写
 * `if (!verdict.present)` 就会在 owned 分支上恒真 —— 那条分支会静默地把
 * "这是 deck 的"读成"这儿什么都没有"。判别式的字段要完整,不能靠调用方记得
 * 哪个变体缺哪个键。
 */
export function deckOwnsEntry(entryPath: string, ctx: OwnershipContext): OwnershipVerdict {
  let st;
  try {
    st = lstatSync(entryPath);
  } catch (err: any) {
    // ENOENT = 本来就没有;EACCES 等 = 看不懂,一律按"不存在"处理并说明
    return { owned: false, present: false, reason: err?.code ?? "not stat-able" };
  }

  if (st.isSymbolicLink()) {
    let target: string;
    try {
      target = readlinkSync(entryPath);
    } catch (err: any) {
      return {
        owned: false,
        present: true,
        reason: `symlink target unreadable (${err?.code ?? err?.message})`,
      };
    }
    // 相对 symlink 按链接所在目录解析(与 shell/node 一致)
    const abs = resolve(dirname(entryPath), target);
    const pool = resolve(ctx.coldPool);
    if (abs === pool || abs.startsWith(pool + sep)) {
      return { owned: true, present: true, via: "symlink-into-coldpool" };
    }
    return {
      owned: false,
      present: true,
      reason: `symlink points outside this deck's cold pool → ${abs}`,
    };
  }

  if (ctx.managedDests.has(resolve(entryPath))) {
    return { owned: true, present: true, via: "state-record" };
  }
  return {
    owned: false,
    present: true,
    reason: "real entry not recorded in skill-deck.state — deck cannot prove it created it",
  };
}

// ── 执行 ────────────────────────────────────────────────────

/**
 * 安全删除一个 symlink(或已不存在的路径)。返回是否执行了删除。
 * 目标内容(cold pool)永不被触碰 — 这是 dormancy 测试守护的不变式。
 *
 * 这是最底层原语,**不做归属判断**:调用方要先过 `deckOwnsEntry`。
 * 它的安全性来自"只 unlink、不 recursive",不是来自"我知道这是谁的"。
 */
export function removeSymlinkOnly(path: string): boolean {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return false; // 不存在(或父目录不可读)——无事可做
  }
  if (!st.isSymbolicLink()) return false; // 真实目录不走这条路
  rmSync(path, { force: true }); // 无 recursive:只删链接本身
  return true;
}

export type RemoveOutcome =
  | { removed: true; via: "symlink-into-coldpool" | "state-record" }
  /** 本来就没有 —— 调用方照常往下写 */
  | { removed: false; present: false }
  /** 有个东西在那儿,但不是 deck 的 —— 调用方报告,不要往下写 */
  | { removed: false; present: true; reason: string };

/**
 * 重建链接前的清位:**先判归属,再决定删不删**。
 *
 * 三态返回是刻意的 —— 调用方必须能区分"本来就没有"(接着写)和"拒绝"(停下报错)。
 * 只返回布尔会逼调用方靠 reason 字符串猜,那正是这条防线要消灭的形态。
 */
export function removeEntryForRelink(path: string, ctx: OwnershipContext): RemoveOutcome {
  const verdict = deckOwnsEntry(path, ctx);
  if (!verdict.owned) {
    return verdict.present
      ? { removed: false, present: true, reason: verdict.reason }
      : { removed: false, present: false };
  }

  if (verdict.via === "symlink-into-coldpool") {
    rmSync(path, { force: true }); // 无 recursive:绝不递归进 cold pool
  } else {
    // state 记录在案 = deck 自己建的 snapshot,删它是回收自己的东西
    rmSync(path, { recursive: true, force: true });
  }
  return { removed: true, via: verdict.via };
}
