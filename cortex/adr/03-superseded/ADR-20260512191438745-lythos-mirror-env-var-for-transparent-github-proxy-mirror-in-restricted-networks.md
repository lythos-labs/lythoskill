# ADR-20260512191438745: LYTHOS_MIRROR env var for transparent GitHub proxy/mirror in restricted networks

## Status History

| Status | Date | Note |
|--------|------|------|
| superseded | 2026-05-13 | Superseded by ADR-20260513144000000 — no hard-coded mirrors
| proposed | 2026-05-12 | Created |
| accepted | 2026-05-12 | Accepted |
| superseded | 2026-05-13 | Auto-fallback `KNOWN_MIRRORS` removed per ADR-20260513144000000. `LYTHOSKILL_GH_MIRROR` env var remains. |

## 背景

lythoskill's entire supply chain depends on GitHub reachability:

| Operation | Endpoint | Blocking? |
|-----------|----------|-----------|
| `git clone` skill repos | `https://github.com/owner/repo.git` | ✅ deck add, refresh |
| fetch deck.toml from URL | `https://raw.githubusercontent.com/...` | ✅ arena, deck link --url |
| GitHub API (tree listing) | `https://api.github.com/repos/...` | ✅ curator discover |
| `bun install` packages | npm registry (separate concern) | ✅ CI, local dev |

In regions where GitHub access is unreliable, the entire toolchain fails. Users resort to
manual proxy config (`git config --global http.proxy`, `HTTPS_PROXY`, `/etc/hosts` hacks),
each touching a different layer with different syntax.

Current tools like `ghproxy.com` and `mirror.ghproxy.com` provide transparent GitHub mirrors
but require users to manually rewrite URLs in each context.

## 决策驱动

- **One env var, not six configs** — user sets `LYTHOS_MIRROR=https://ghproxy.com/https://github.com`
  once, all lythoskill operations transparently use it.
- **Not a VPN/proxy** — this is URL rewriting, not transport-level proxying. No system config needed.
- **Bun/npm is separate** — `bun install` goes to npm registry, not GitHub. Document the bun mirror
  separately (`bun config set registry`), don't conflate.
- **Fail safe** — if mirror is unreachable, error message must include the rewritten URL so user
  can verify the mirror is correct.

## 选项

### 方案A: Document manual proxy config per tool

Document `git config --global http.proxy`, `HTTPS_PROXY`, `bun config set registry`, etc.

**优点**: no code changes.

**缺点**: user must configure 3+ systems with different syntax. Easy to miss one.
Fragile — each tool has its own proxy semantics. Not "one command to start."

### 方案B: Single `LYTHOS_MIRROR` env var with URL rewriting

```bash
LYTHOS_MIRROR=https://ghproxy.com/https://github.com bunx @lythos/skill-deck add ...
```

All GitHub URLs constructed by lythoskill go through `rewriteUrl(url, process.env.LYTHOS_MIRROR)`.

**优点**:
- One env var. Zero config per tool.
- Transparent — user doesn't see rewritten URLs unless they need to debug.
- Mirror-agnostic — works with ghproxy.com, mirror.ghproxy.com, self-hosted mirrors.
- Graceful degradation — if unset, no rewriting, no overhead.

**缺点**:
- URL rewriting is fragile if mirror format changes.
- Doesn't cover `git` subprocesses directly — needs to construct the rewritten URL before
  passing to `git clone`.

### 方案C: Full proxy support (HTTP_PROXY/HTTPS_PROXY)

Use standard `HTTPS_PROXY` env var for all outbound connections.

**优点**: industry standard, tools already support it.

**缺点**: requires a proxy server, not a mirror. Different infrastructure.
Most users in restricted regions use mirrors (ghproxy.com), not proxies.

## 决策

**选择**: 方案B — single `LYTHOS_MIRROR` env var

**原因**:

1. **Mirrors are the reality in restricted regions** — ghproxy.com and similar services
   are URL-rewriting mirrors, not HTTP proxies. `HTTPS_PROXY` doesn't work with them.
2. **One env var** — matches the project's philosophy of reducing config surface (one
   deck.toml, one cold pool path, one working set dir).
3. **Implementation is a pure function** — `rewriteUrl(url, mirror)` is testable, no
   side effects, no subprocess config.
4. **Doesn't touch git/bun config** — we rewrite URLs before passing to subprocesses,
   so `git clone` and `fetch()` see the rewritten URL directly.

## Implementation sketch

```typescript
// packages/lythoskill-cold-pool/src/mirror.ts
export function rewriteUrl(url: string, mirror?: string): string {
  if (!mirror) return url
  // ghproxy.com format: https://ghproxy.com/https://github.com/owner/repo.git
  if (mirror.includes('://')) return mirror.replace(/\/+$/, '') + '/' + url
  // short form: ghproxy.com → https://ghproxy.com/<url>
  return `https://${mirror.replace(/\/+$/, '')}/${url}`
}
```

Touch points in order of priority:
1. `fetch-plan.ts` — `cloneUrl` construction for `git clone`
2. `deck add` — `raw.githubusercontent.com` URL fetch
3. `github-tree.ts` — GitHub API calls (future)
4. Documentation — README quick-start for restricted regions

Bun install is out of scope — documented separately as `bun config set registry <mirror>`.

## 影响

- 正面:
  - One env var unlocks the entire toolchain in restricted networks
  - Mirror-agnostic — works with any URL-rewriting mirror
  - Zero overhead when unset

- 负面:
  - URL rewriting adds a layer of indirection in error messages (mitigated: include both
    original and rewritten URL in error output)
  - Doesn't cover `bun install` (separate concern, documented)

- 后续:
  - Implement `rewriteUrl()` in cold-pool, consume in fetch-plan and deck add
  - Add "Restricted network" section to README with one-liner
  - Document known mirrors: ghproxy.com, mirror.ghproxy.com

## 相关

- 关联 Epic: none (cross-cutting infra)
