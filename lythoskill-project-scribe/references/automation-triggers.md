# Automation Triggers
Suggested hook bindings for automatic handoff prompts:
| Event | Trigger |
|-------|---------|
| `git commit` | Prompt: "Update daily handoff?" |
| `git tag` | Auto-archive current daily, start new section |
| User says "LGTM" | Force handoff flow execution |
| User says "踩坑了" / "又出问题了" | Prompt: "Record pitfall?" |
| Context approaching limit | Force handoff flow execution |
| Conversation exceeds 20 turns | Prompt: "Should we do a handoff checkpoint?" |
## Integration with Claude Code Hooks
If using Claude Code hooks, you can bind to tool events:
```json
{
  "hooks": {    "after:Bash(git commit *)": "prompt: Update daily/YYYY-MM-DD.md handoff section?"  }
}
```
This is optional enhancement. The core workflow is manual trigger by user signal.
## Usage Examples
### Session Ending
```
User: 就这样吧，session 快结束了
Scribe:
1. Runs git status, confirms state
2. Recalls session-specific events
3. Drafts daily/2026-04-24.md handoff section
4. Shows diff to user for confirmation
5. Writes file after user approves
Output:
✅ Updated daily/2026-04-24.md
📌 Location: daily/2026-04-24.md
```
### Recording a Pitfall
```
User: 踩坑了，sed -i 在 macOS 上不兼容
Scribe:
1. Updates daily file's Pitfalls section
2. Records: wrong approach, symptom, fix, root cause, time wasted

Output:
⚠️ Pitfall recorded in daily/2026-04-24.md
‼️ Next agent: use sed -i '' on macOS or use Edit tool directly
```
