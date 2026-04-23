# EZVIZ 项目快速上下文

> 这是 project-onboarding skill 读取的参考文件，用于自动复盘。

## 项目基本信息

```yaml
name: EZVIZ 萤石云视频监控
stack: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
player: ezuikit-js v8.x
state: Zustand + persist
current_version: v0.2.4
current_git: fa84a39
```

## 最近迭代（v0.2.2 → v0.2.4）

| 版本 | 内容 | 关键文件 |
|------|------|----------|
| v0.2.2 | 移动端播放器优化：固定 Header + 自适应视频 + 底部抽屉 | `player-page.tsx`, `video-player.tsx` |
| v0.2.3 | 全屏控制统一化：使用 forwardRef 统一全屏逻辑 | `video-player.tsx` |
| v0.2.4 | API 错误处理优化：安全解析 JSON，友好错误提示 | `route.ts` |

## 关键陷阱（所有模型注意）

### 1. playerKey 不能含时间戳
```typescript
// ❌ 错误
return `${camera.deviceSerial}-${camera.channelNo}-${Date.now()}`;

// ✅ 正确
return `${camera.deviceSerial}-${camera.channelNo}`;
```
**后果**：resize effect 无限循环，播放器反复重新加载

### 2. 必须正确 cleanup 播放器
```typescript
// 切换设备或卸载时必须调用
player.closePtz?.();
player.stop?.() || player.destroy?.();
```
**后果**：EZVIZ 并发限制，新播放器无法加载

### 3. API 响应可能非 JSON
```typescript
// 必须先 text() 再安全解析
const text = await response.text();
try {
  data = JSON.parse(text);
} catch {
  // 返回友好错误
}
```
**后果**：500 错误返回 HTML 而非 JSON

## 项目技能

| Skill | 用途 | 触发词 |
|-------|------|--------|
| red-green-release | 发布流程 | "LGTM", "打tag", "rollback" |
| dev-logging | 日志管理 | "记录日志", "daily note" |
| llm-memory | LLM 记忆传递 | "llm note", "交接" |
| project-onboarding | 项目入职 | "复盘", "了解项目" |

## 关键目录

```
daily/                  # 开发日志（ADR、踩坑记录）
archived-patches/       # PR 归档
docs/guide/             # 调研文档
.agents/llm-notes/      # LLM 间知识传递
skills/                 # 项目技能
```

## 用户风格

- **演进式设计**：先简单，后完善
- **文档驱动**：先写文档，后实现
- **游戏化隐喻**：Quest、NPC、背包、存档点
- **流程沉淀**：重视可复用的 skill

## 下一步（待确认）

- [ ] 用户确认是否需要回放功能开通
