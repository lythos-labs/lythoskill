# ADR-20260513144000000: No hard-coded third-party mirror list — trust boundary belongs to user

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-13 | Created |
| accepted | 2026-05-13 | Accepted |

## 背景

ADR-20260512191438745 introduced `LYTHOSKILL_GH_MIRROR` for transparent GitHub proxy/mirror
support. The implementation included a hard-coded list of third-party mirror services
(`ghfast.top`, `ghproxy.com`, `mirror.ghproxy.com`) as an auto-fallback layer:

```typescript
const KNOWN_MIRRORS = [
  'https://ghfast.top',
  'https://ghproxy.com',
  'https://mirror.ghproxy.com',
]
```

These services were tried automatically when direct GitHub access failed. The intent was
convenience: users in restricted networks would "just work" without manual configuration.

## 问题分析

This convenience crossed a trust boundary that should belong to the user.

**Attack surface**: When the tool auto-rewrites `github.com/<owner>/<repo>` to
`https://<third-party>/github.com/<owner>/<repo>`, the entire git communication is
delegated to an external service. That service can:

- Return tampered `AGENTS.md` / skill file content
- Inject malicious instructions into cloned files (especially dangerous because skill
  files are designed to be read and executed by AI agents)
- Silently replace commit SHAs, bypassing any hash-based integrity verification

For lythoskill specifically, the consequences are more severe than for conventional
package managers. A tampered skill file doesn't just introduce buggy code — it can
manipulate agent behavior, alter decision-making, or exfiltrate data.

**Comparison with npm/cargo**: registry is configurable, but the tool does not auto-switch
to a "helpful" third-party registry when the official one is unreachable. The user must
explicitly declare which registry to trust.

## 决策驱动

- **Tool must not decide trust for the user** — which third party to delegate git/skill
  content to is a security decision. The tool can provide the mechanism; the user must
  provide the destination.
- **LYTHOSKILL_GH_MIRROR remains** — user explicitly declares a mirror via env var. Trust
  and responsibility are on the user.
- **LYTHOS_SOCKS_PROXY remains** — user's own infrastructure (VPN, corporate proxy,
  self-hosted relay). The tool only passes the connection through; no content delegation.
- **No named third parties in source** — the tool must not appear to endorse or implicitly
  trust any specific external service.

## 选项

### 方案A: Keep hard-coded list with warnings

Retain `KNOWN_MIRRORS` but add log warnings when auto-fallback activates.

**优点**: minimal code change.

**缺点**: warning fatigue — users ignore warnings. The fundamental problem remains:
the tool made a trust decision the user never consented to. Warning does not equal consent.

### 方案B: Remove hard-coded list, keep user-controlled env var only

`mirrorUrls()` returns only the user-specified `LYTHOSKILL_GH_MIRROR` (or empty array).
No auto-fallback. `probeConnectivity()` races direct + user mirror only.

**优点**:
- Clear trust boundary: user decides, tool executes
- No implicit endorsement of any third party
- Aligns with npm/cargo registry design
- Minimal code surface: `mirrorUrls()` is now a thin wrapper around env var

**缺点**:
- Users in restricted networks must set `LYTHOSKILL_GH_MIRROR` explicitly
- One-time setup cost (mitigated: error messages include the env var hint)

### 方案C: Remove all mirror support

Delete `LYTHOSKILL_GH_MIRROR`, `mirrorUrls()`, and related code entirely. Only standard
`HTTPS_PROXY` / `HTTP_PROXY` remain.

**优点**: simplest, no URL rewriting at all.

**缺点**: URL-rewriting mirrors (e.g. `ghproxy.com` style) cannot be used at all,
even when the user explicitly wants to. Overly restrictive — the mechanism is not the
problem; the auto-fallback is.

## 决策

**选择**: 方案B — remove hard-coded list, keep user-controlled env var only.

**原因**:

1. **Trust boundary belongs to the user** — the mechanism (URL rewriting) is safe when
   the user explicitly opts in. The danger was the auto-fallback making that choice silently.
2. **Aligns with established package manager design** — npm/cargo allow registry
   configuration but do not auto-fallback to third-party registries.
3. **SOCKS proxy is different** — `LYTHOS_SOCKS_PROXY` passes through user-owned
   infrastructure; it does not delegate content to a third party. Both mechanisms can
   coexist.
4. **No named third parties remain in source** — the project does not endorse or appear
   to trust any specific external mirror service.

## Implementation

Files changed:
- `packages/lythoskill-cold-pool/src/mirror.ts` — remove `KNOWN_MIRRORS`, update
  `mirrorUrls()` and `probeConnectivity()`
- `packages/lythoskill-cold-pool/src/mirror.test.ts` — update tests (no hard-coded
  domains; use env-var-specified mirror)
- `packages/lythoskill-deck/src/resolve-deck.ts` — update error message
- `packages/lythoskill-arena/src/cli.ts` — update error message
- `packages/lythoskill-deck/skill/SKILL.md` — remove `ghproxy` reference

The `LYTHOSKILL_GH_MIRROR` env var continues to work exactly as before. Only the
auto-fallback layer is removed.

## 影响

- 正面:
  - Clear security boundary — no silent trust delegation
  - Aligns with industry standard (npm/cargo registry model)
  - No named third-party services in source code

- 负面:
  - Users who relied on auto-fallback must now set `LYTHOSKILL_GH_MIRROR` explicitly
  - Error messages now say "Set LYTHOSKILL_GH_MIRROR" instead of auto-trying mirrors

- 后续:
  - Document `LYTHOSKILL_GH_MIRROR` usage in README (already present)
  - Consider adding integrity verification (content hash, commit SHA pinning) as a
    future hardening measure independent of mirror choice

## 相关

- 修正 ADR: ADR-20260512191438745 (added `KNOWN_MIRRORS` auto-fallback — now superseded)
- 关联文件: `packages/lythoskill-cold-pool/src/mirror.ts`
