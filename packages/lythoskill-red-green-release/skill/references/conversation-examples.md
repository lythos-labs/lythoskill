# Typical Conversation Flows
## Normal Iteration
```
User: 回放接口报错不友好
Agent: [Plan] Describes approach to improve error handling
User: 确认设计
Agent: Creates pr-20260424-error-handling.sh, shows to user
User: 可以应用
Agent: Executes patch, restarts service
User: 测试了，还有个边界情况
Agent: Creates pr-20260424-error-handling-edge.sh
User: 可以应用
Agent: Executes patch, restarts
User: 对了 / LGTM
Agent: git commit + git tag v0.3.1
```

## Rollback Scenario
```
User: 改坏了，首页白屏
Agent: ls archived-patches/
       → route.ts.20260424.bak found
       cp archived-patches/route.ts.20260424.bak src/route.ts
       Restarts service
User: 好了，回到之前的版本了
Agent: Waits for next instruction (no auto-tag on rollback)
```

## Reviewing History
```
User: 看看之前改了什么
Agent: ls archived-patches/
       pr-20260422-mobile-player.sh
       pr-20260423-fullscreen.sh
       pr-20260424-error-handling.sh
       pr-20260424-error-handling-edge.sh
User: 看看 fullscreen 那次做了什么
Agent: cat archived-patches/pr-20260423-fullscreen.sh
       (heredoc content shows exact state that was applied)
```
