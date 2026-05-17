# ADR-20260513011442965: Network proxy auto-discovery for resilient connectivity

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-13 | Created |
| accepted | 2026-05-17 | Accepted |

## 背景

`probeConnectivity` (TASK-20260513010246527) 实现了并发网络探测，可以检测目标服务的连通性。但探测失败后的恢复手段目前只有两条：

1. 重试已知公共 mirror（ghfast.top, ghproxy.com, mirror.ghproxy.com）
2. 用户手动设置 `LYTHOSKILL_GH_MIRROR` 或 `HTTPS_PROXY`

许多开发者的本地环境已经配置了代理工具（用于各种网络场景），但 lythoskill 无法自动发现这些已存在的网络出口。手动配置对临时使用场景不够友好。

## 决策驱动

- UX: 网络探测失败后，工具应自动尝试发现用户已有的网络配置，而非要求用户手动查找端口
- 零侵入: 不建立新通道，不复现协议，只检测并使用现有配置
- 用完即走: 不持久化，不修改用户环境变量

## 选项

### 方案A: 轻量代理自动发现（检测 + 借用，不自建）

扫描常见本地端口（1080, 7890, 7891, 10808），用 TCP connect 检测端口开放，然后通过该端口发一个测试 HTTP 请求（Bun fetch 的 `proxy` 选项支持 `socks5://`）。如果请求成功，记录代理地址供后续 git clone / fetch 使用。

**优点**:
- 零配置，即开即用
- 不复现 SOCKS 协议，不建 tunnel，不管理生命周期
- 复用用户已有的网络工具（各类代理客户端、ssh -D 等）

**缺点**:
- 如果用户没有运行代理服务，还是需要手动处理
- 端口列表需要维护

### 方案B: 保持现状（仅 mirror 重试）

不做代理发现，继续依赖 public mirror + 用户手动配置。

**优点**:
- 最简单，无额外代码

**缺点**:
- mirror 不可用时无法恢复
- 用户已有的网络配置能力被浪费

## 决策

**选择**: 方案A。

**原因**:
- 只做"检测 + 借用"，不做 SOCKS 协议实现或 tunnel 建立。外部网络通道的准备是用户环境的事，我们只负责发现并使用已存在的配置。
- Bun fetch 原生支持 `proxy: "socks5://127.0.0.1:1080"`，git 支持 `-c http.proxy=socks5://...`，零额外依赖。
- 大多数开发者的本地环境已经运行着代理服务，只是 lythoskill 不知道它的存在。

## 影响

- 正面:
  - 网络不通时自动恢复连通性
  - 零配置体验
  - 复用用户已有的网络基础设施
- 负面:
  - 端口扫描可能触发本地安全软件的询问（仅 localhost）
  - 需要维护常见端口列表
- 后续:
  - 如果方案A 覆盖不足，再评估其他恢复手段
  - 考虑把检测到的代理信息输出到日志，方便用户排查

## 相关

- 关联 ADR: ADR-20260512191438745 (LYTHOS_MIRROR env var for transparent GitHub proxy)
- 关联 Epic: EPIC-20260513010237904 (Popular third-party skills end-to-end with network probe UX)
- 关联 Task: TASK-20260513010246527 (probeConnectivity implementation)
