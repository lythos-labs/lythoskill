# 客户需求

我是一家内容公司的 CTO,运营和市场团队 5-8 个人,核心业务是给 B 端 SaaS 客户做内容代运营(公众号 / 小红书 / LinkedIn)。最近团队被 **Agent Skills** 这个概念绕晕了 —— 听说 Anthropic 的 `SKILL.md` 开放标准最近很火,OpenAI Codex / Gemini CLI / Cursor 都在跟进,但**我团队的非技术同事分不清 skill 跟 MCP server 跟 Custom GPT 的关系**,也不知道这件事该不该让公司花时间投入。

请给我一份 **60 分钟入门指南**,要求:

## 目标读者画像

- 5 年以上工作经验,做过 SaaS 产品市场或内容运营
- **不写代码,但能看懂代码截图和 CLI 输出**
- 对 ChatGPT / Claude / Cursor 等 AI 工具的"用户视角"熟悉,但对"开发者视角"陌生
- 时间稀缺,只愿意花 60 分钟读完

## 内容要求

1. **用具体类比解释 Agent Skill 是什么**(避免"它是一种插件"这种空洞类比 —— 给 1 个让运营能"啊!原来是这样"的实物类比)
2. **列 3-5 个有代表性的真实开源 skill 案例**(GitHub 上当前能找到的,不要编造)。每个案例说明:它做什么 / 谁在用 / 解决了什么具体场景
3. **讲清楚 Agent Skill 跟 MCP server / Custom GPT / Cursor Rules / Claude Project 这些相邻概念的区别**(关键区别表)
4. **给一个判断框架:"我们公司要不要投入研究/采用 Agent Skill"**,要包含 3-5 个 yes/no 信号(例:我们的工作流里有可重复的复杂任务吗 / 我们的同事会用 Claude Code 或 Cursor 吗 / 等)
5. **3-5 个具体的"今天就可以开始"的小步**(不需要大投入)

## 产出格式

**最终交付一个 styled HTML 页面**,用 baoyu-markdown-to-html 渲染成 WeChat-compatible 主题。HTML 文件保存到当前工作目录,文件名 `agent-skills-intro-for-content-ops.html`。

中文,1500-3000 字。可以用图表 / 表格 / 截图描述(不需要实际生成截图)。避免技术堆砌,但**关键术语要点出英文原名**(比如 `SKILL.md` / `MCP` / `npx skills add` 等),方便运营同事自己上网搜。
