---
created: 2026-05-15
updated: 2026-05-15
category: pattern
---

# Annotation mindset — agent-facing code annotations as IoC for agent behavior

> Like Spring IoC scans `@Autowired` to wire dependencies, agent runtime scans code comments, error messages, and SKILL.md frontmatter to wire agent behavior. The annotation is the trigger; the agent's pre-trained knowledge + web fetch is the resolver.

## Context

Agent-era code has two consumers:
1. **Compiler / runtime** — executes the code
2. **Agent** — reads, understands, and acts on the code

Traditional code optimizes for #1. Agent-era code must also optimize for #2. The annotation mindset is the design pattern for #2.

## Core idea

In Spring IoC, you write:

```java
@Autowired
private UserService userService;  // container scans annotation → wires dependency
```

In agent-era code, you write:

```typescript
// @agent:requires curl >= 7.60 for SOCKS proxy support
// @agent:install-hint brew install curl (macOS), apt-get install curl (Linux)
// @agent:alternative unset LYTHOS_SOCKS_PROXY to disable proxy
```

The agent reads the annotation, uses its knowledge of package managers, and acts.

## Three layers of annotations

```
L0 — System tools (git, curl, docker, node, bun)
       Agent already knows. No annotation needed.
       ↓
L1 — Project-specific tools (lythoskill-deck, skill-creator, arena)
       Agent doesn't know. SKILL.md is the annotation.
       ↓
L2 — Inline context (error messages, code comments, config files)
       Agent sees the error. Inline hint is the annotation.
```

### L0: System tools — no annotation

Agent has seen millions of `git clone`, `curl -s`, `docker run` examples. Don't annotate the obvious.

```typescript
// ❌ Don't do this — agent already knows git
// @agent:git-required min-version 2.30
execFileSync('git', ['clone', url])

// ✅ Just use it
execFileSync('git', ['clone', url])
```

### L1: Project tools — SKILL.md as annotation

Agent has never seen `lythoskill-deck` before. SKILL.md is the `@ComponentScan` that tells the agent "this is a tool, here's how to use it."

```toml
# skill-deck.toml — the annotation
[tool.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
```

Agent reads `lythoskill-deck/SKILL.md` → learns schema → discovers capabilities.

### L2: Inline hints — error messages as annotation

When something fails, the error message itself becomes the annotation:

```typescript
// ❌ Before — agent can't act
throw new Error('curl failed')

// ✅ After — agent sees annotation, acts
throw new Error(
  'curl not found — required for LYTHOS_SOCKS_PROXY. ' +
  'Install: brew install curl (macOS), apt-get install curl (Linux). ' +
  'Or disable proxy: unset LYTHOS_SOCKS_PROXY'
)
```

Agent sees this and:
1. Recognizes it's a tool-missing error (pattern match)
2. Uses bash tool to run `brew install curl` or `apt-get install curl`
3. Or uses web fetch to find the right install method for its OS

## Why this is IoC

| IoC layer | Traditional | Agent era |
|-----------|-------------|-----------|
| Control | Framework calls your code | Agent reads your annotations |
| Wiring | `@Autowired` + reflection | Error hint + agent knowledge + web fetch |
| Resolution | Classpath scan | Cold pool scan + SKILL.md parse |
| Execution | Container invokes method | Agent invokes tool |

The agent is the container. The annotations are the wiring instructions. The cold pool is the classpath.

## When to apply

- **Error messages** that agent consumers will see — always add context
- **Code comments** near system tool calls — add when non-obvious (e.g. "this curl call requires --head for probe")
- **Config files** — frontmatter is the annotation schema
- **SKILL.md** — the canonical annotation for project-level tools

## When not to apply

- Don't annotate the obvious (L0). Agent knows `git clone`.
- Don't over-annotate. One clear hint > 10 lines of metadata.
- Don't replace skill documentation with inline comments. Use SKILL.md for complex tools.

## Related

- `ADR-20260515204135649` — Agent self-healing environment (L2 inline hints)
- `ADR-20260507014124191` — Agent-friendly CLI error as decision tree
- `cortex/wiki/01-patterns/cold-pool-unified-facility-design.md` — L1 SKILL.md as tool registry
- Spring Framework IoC documentation — the original annotation mindset
