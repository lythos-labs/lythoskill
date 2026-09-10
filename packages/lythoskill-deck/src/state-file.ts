#!/usr/bin/env bun
/**
 * state-file.ts — skill-deck.state 的读写 + 归属判定的输入装配
 *
 * 为什么单独一个模块:归属判定(k8s ownerReferences)的输入必须**只有一处装配**。
 * 之前 link.ts / to-symlink-snapshot.ts / validate.ts 各有一份 `readState`,
 * 再让每个删除点各自从 state 里挑字段拼上下文,就等于把"哪些字段算什么"的判断权
 * 散回各个调用点 —— 那正是 `triggerDirs` 漏报(只认一份清单、另一份漂了)的成因。
 * 判定本身在 `safe-remove.ts`(`deckOwnsEntry`),这里只负责把它要的输入准备好。
 *
 * 语义与理由见 TASK-20260910111600389。
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SkillDeckState } from "./schema.js";
import type { OwnershipContext } from "./safe-remove.js";

const STATE_FILENAME = "skill-deck.state";

/**
 * 读 state。**刻意不在这里做 zod 校验** —— 历史行为是"读不动就当没有"
 * (`JSON.parse` 失败返回 null),加校验会把既有的容错路径改成硬失败。
 * 校验发生在写入侧(`SkillDeckStateSchema.safeParse`)。
 */
export function readStateFile(projectDir: string): SkillDeckState | null {
  const statePath = join(projectDir, STATE_FILENAME);
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  } catch {
    return null;
  }
}

export function writeStateFile(projectDir: string, state: SkillDeckState): void {
  writeFileSync(join(projectDir, STATE_FILENAME), JSON.stringify(state, null, 2) + "\n");
}

/**
 * deck 认领过的全部绝对路径 = `dest`(工作集那一个)∪ `managed_dests`(全部,
 * 含每个 fan-out 目标)。移除判定的白名单就是它。
 *
 * `dest` 保留在并集里是**刻意的向后兼容**:老 state 文件没有 `managed_dests`,
 * 只靠 `dest` 仍能证明工作集那一条归 deck 管。代价是历史 fan-out snapshot
 * 会一次性变成"外来"并被拒绝 —— 这是安全侧倒的取舍(见卡面 Technical Approach)。
 */
export function ownershipContextFrom(
  state: SkillDeckState | null,
  coldPool: string,
  projectDir: string,
): OwnershipContext {
  return { coldPool: resolve(coldPool), managedDests: collectManagedDests(state, projectDir) };
}

/** `dest` ∪ `managed_dests`,全部 resolve 成绝对路径。并集的**唯一**一处实现。 */
function collectManagedDests(state: SkillDeckState | null, projectDir: string): Set<string> {
  const managedDests = new Set<string>();
  for (const s of state?.skills ?? []) {
    if (s.dest) managedDests.add(resolve(projectDir, s.dest));
    for (const d of s.managed_dests ?? []) managedDests.add(resolve(projectDir, d));
  }
  return managedDests;
}

/** 读 state 并直接装配判定输入 —— 调用的常见形态。 */
export function ownershipContextFor(coldPool: string, projectDir: string): OwnershipContext {
  return ownershipContextFrom(readStateFile(projectDir), coldPool, projectDir);
}

/**
 * 认领账本 —— 判定输入 + 一个**即时**的认领口。
 *
 * 为什么需要它(实测踩到):`link` 一次运行里,同一个 dest 会被创建两次 ——
 * `reconcileTargetDir` 先建(收束/扇出),`linkedSkills` 元数据循环再建一次。
 * 第二次的清位调用要判定"这个真实目录是不是 deck 的",而它正是**本次运行**
 * 几毫秒前建的。若判定输入只是期初从 state 读来的快照,本次运行就证明不了
 * 自己的产物 → 拒绝替换 → 该 skill 永远进不了 linkedSkills → state.skills
 * 空数组(实测:`snapshot mode` 用例 0 skill(s) linked)。
 *
 * 所以认领是**即时的**:创建成功就登记,不等下一次运行。这与 k8s 一致 ——
 * ownerReferences 是创建时写上的,不是事后扫出来的。
 */
export interface OwnershipLedger {
  /** 交给 `deckOwnsEntry` 的判定输入 */
  readonly ctx: OwnershipContext;
  /** 登记"本次运行创建了这个路径"。只该在创建**成功之后**调用。 */
  claim(absPath: string): void;
}

export function ownershipLedgerFrom(
  state: SkillDeckState | null,
  coldPool: string,
  projectDir: string,
): OwnershipLedger {
  const managedDests = collectManagedDests(state, projectDir);
  return {
    ctx: { coldPool: resolve(coldPool), managedDests },
    claim(absPath: string): void {
      managedDests.add(resolve(absPath));
    },
  };
}
