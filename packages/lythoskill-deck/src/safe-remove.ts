#!/usr/bin/env bun
/**
 * safe-remove.ts — symlink-aware removal guard
 *
 * Goose #11600 类危险的防线:删除工作集条目时,如果它是 symlink,
 * 必须只删链接本身,绝不 recursive 进目标(cold pool 真身)。
 *
 * 纪律:
 *   - lstat 判定(不跟随链接):symlink → rmSync(path, {force}) 无 recursive
 *   - 断链也要能删(existsSync 会跟随链接漏掉断链,所以不用它判定)
 *   - 真实目录的备份 + recursive 删除流程留在 link.ts reconcileTargetDir,
 *     不经由本函数(那是另一条有备份保护的路径)
 */

import { lstatSync, rmSync } from "node:fs";

/**
 * 安全删除一个 symlink(或已不存在的路径)。返回是否执行了删除。
 * 目标内容(cold pool)永不被触碰 — 这是 dormancy 测试守护的不变式。
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

/**
 * 重建链接前的清位:旧条目是 symlink → 只删链接;是真实目录(如旧 snapshot)
 * → recursive 删除(与历史行为一致,备份流程在 reconcileTargetDir 上层)。
 */
export function removeEntryForRelink(path: string): void {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return; // 不存在,无需清位
  }
  if (st.isSymbolicLink()) {
    rmSync(path, { force: true }); // 无 recursive:绝不递归进 cold pool
  } else {
    rmSync(path, { recursive: true, force: true });
  }
}
