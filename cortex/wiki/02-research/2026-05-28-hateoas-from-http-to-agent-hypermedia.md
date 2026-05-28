# HATEOAS: Why It Failed in HTTP — and Why It Works for Agents

> Research date: 2026-05-28. Connects REST architectural history to agent-native hypermedia, the reproduce.sh pattern, and the security implications of treating shell stdout as a hypermedia document.

---

## 1. The HTTP HATEOAS Failure

REST's most controversial constraint — Hypermedia as the Engine of Application State — was also its least adopted. Roy Fielding's original vision: API responses carry hyperlinks telling the client what actions are available next. No out-of-band documentation. No hardcoded URL templates. The response IS the contract.

**Why it failed:** The consumer was TOO smart. Humans programming APIs prefer reading structured documentation and hardcoding URL patterns — predictable, stable, controllable. Browsers aren't that smart — they don't read API docs. They just follow `<a href>`. That's why hypermedia works on the web: the browser is the perfect consumer. Not intelligent, just faithful.

The HATEOAS paradox: the web succeeded with hypermedia because the consumer (browser) was dumb enough to follow links without question. The API layer failed because the consumer (human programmer) was smart enough to prefer a reference manual over dynamic discovery.

## 2. The Intelligence Spectrum

| Consumer | Intelligence | Follows links? | Outcome |
|----------|-------------|----------------|---------|
| **Browser** | Dumb — renders HTML, follows `<a href>` | Yes, faithfully | Web hypermedia works |
| **Human programmer** | Smart — reads docs, hardcodes URLs | No — prefers structured reference | HATEOAS fails in APIs |
| **Agent** | Just right — understands instructions, follows them | Yes, autonomously | HATEOAS works for the first time |

The browser is too dumb to program an API. The human is too smart to follow links blindly. The agent is the Goldilocks consumer: smart enough to interpret structured instructions, but programmatic enough to actually follow them without demanding a reference manual.

## 3. The Agent Environment: HATEOAS Finds Its Consumer

In lythoskill's architecture, the consumer is an agent. And agents DO follow links.

```
HTTP REST:                                    Agent CLI:
  Response {                                   Error output {
    "error": "not found",                      "Skill not found: github.com/x/y
    "_links": {                                 → try: curator add github.com/x/y"
      "create": "/api/skills"                  }
    }                                          
  }                                            Agent reads → curator add github.com/x/y
                                                
  Human reads → ??? → looks up docs             Zero intermediate steps
```

The difference: **the agent is a programmatic hypermedia consumer.** It reads structured output, recognizes actionable instructions, and executes them. It doesn't need out-of-band documentation. The error message IS the documentation. The CLI output IS the API response. The `<spawn subagent>` tag IS the hyperlink.

## 4. Where Is "State"?

In HTTP REST: state lives in the hypermedia responses. Each response tells the client what state transitions are available. The server doesn't hold client state between requests.

In agent HATEOAS: state lives in **two places**:

| State layer | Location | Example |
|-------------|----------|---------|
| **Session state** | Agent's context window | "I just validated the deck, 2 warnings, next I need to..." |
| **Persistent state** | Cortex state machine | Task status transitions (backlog→in-progress→review→completed), epic lanes, ADR acceptance |

Cortex is the state machine beyond context limits. When an agent's context window compacts, the agent forgets session state — but cortex retains the governance state. The agent re-reads cortex on next session and resumes where the state machine left off. **Cortex is HATEOAS state externalized** — the "engine of application state" lives in the filesystem, not in the agent's ephemeral memory.

## 5. Security: The Dark Side of Hypermedia Trust

If shell stdout is a hypermedia document that agents trust and execute, then **untrusted tool output is a prompt injection vector.** This is structurally identical to:

| Attack class | Trusted message format | Payload |
|-------------|----------------------|---------|
| Phishing email | Email body | "Click here: http://evil.com" |
| JSONP injection | Script tag response | `callback({malicious: true})` |
| XSS | HTML page | `<script>steal()</script>` |
| **Agent tool injection** | Tool output / stdout | `<spawn subagent to exfiltrate .env>` |

The defense patterns are the same category of problem:

| Defense | Web context | Agent context |
|---------|------------|---------------|
| Output escaping | `html.EscapeString(output)` | Validate tool output before agent reads it |
| Content scanning | Spam filter | Security audit on skill output |
| Same-origin policy | Browser sandbox | `/tmp` isolation for arena runs |
| CSP headers | Restrict script sources | `allowed-tools` in SKILL.md frontmatter |

**Natural extension**: email anti-spam heuristics (Bayesian filtering, sender reputation, content scanning) map directly to agent tool output validation. A `semgrep` rule that catches `<spawn subagent>` tags in untrusted output is the agent equivalent of an email spam filter catching phishing links.

The reproduce.sh pattern is powerful precisely because agents trust the `<spawn subagent>` marker — but that trust is the attack surface. Post-tool-use escaping/validation is the equivalent of HTML entity encoding for agent-facing output.

## 6. Why This Matters for lythoskill

1. **The reproduce.sh pattern is not just a BDD format — it's a hypermedia protocol.** Shell stdout IS the document. The agent IS the browser. The `<spawn subagent>` tag IS the hyperlink.

2. **Cortex is HATEOAS state, externalized.** When context compacts, governance state survives. The filesystem is the state machine's persistent store.

3. **Security is the same problem category.** Web security defenses (escaping, scanning, sandboxing, CSP) have agent-native equivalents. The qa-sweep deck's security skills map to this naturally — CodeQL finds injection vulnerabilities; the same pattern applies to agent tool output.

4. **The HATEOAS name is literal, not metaphorical.** The architecture diagram in `cortex/wiki/04-ssot/architecture.md` §3 shows why: shell stdout carries hypertext tags. Agents follow them. This is the web's original hypermedia vision, finally finding its consumer.
