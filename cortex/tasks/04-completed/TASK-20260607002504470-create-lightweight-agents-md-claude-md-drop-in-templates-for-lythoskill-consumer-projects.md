# TASK-20260607002504470: Create lightweight AGENTS.md + CLAUDE.md drop-in templates for lythoskill consumer projects

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-07 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标
`lythoskill-creator init` scaffolds a full skill monorepo (packages/, build pipeline, husky). But many projects only want to **consume** lythoskill governance tools (`skill-deck`, `skill-arena`, `project-cortex`) without becoming a skill author. They need a lightweight, copy-paste-friendly `AGENTS.md` + `CLAUDE.md` starter — similar to how Karpathy's `claude.md` is distributed via raw GitHub URL.

Goal: create a drop-in template that any workspace can adopt by downloading a single file (or two), with correct lythoskill npm package names and a first-time-activation path.

## 需求详情
- [ ] Create `templates/AGENTS.md` at repo root: a generic consumer-project AGENTS.md with:
  - First-time activation section (when `cortex/` does not exist): `bunx @lythos/skill-deck link`, `bunx @lythos/project-cortex init`, `mkdir -p daily`, initial daily skeleton
  - Daily boot section (when `cortex/` exists): `bun install`, `bunx @lythos/skill-deck link`, read latest `daily/`, `git status && git log`, `bunx @lythos/project-cortex probe`
  - Daily Rhythm four phases (Boot / Incoming / Working / Closing) using `bunx @lythos/...` commands
  - Key commands table referencing real npm packages: `@lythos/skill-deck`, `@lythos/skill-arena`, `@lythos/project-cortex`, `@lythos/skill-curator`
  - Critical Gotchas section with `[PHASE] [TAG]` + "When you'll forget" format (template examples)
- [ ] Create `templates/CLAUDE.md`: minimal redirect pointing to `AGENTS.md` and native memory paths
- [ ] Create `templates/README.md`: explains how to copy/use the templates, including raw GitHub URLs
- [ ] All package names must be verified against real `packages/*/package.json` `name` fields
- [ ] No references to `packages/lythoskill-*/src/cli.ts` paths — templates use `bunx @lythos/...` only

## 技术方案
- Add `templates/` directory at repo root
- `templates/AGENTS.md` is a fully renderable example using `{{PROJECT_NAME}}` placeholder; users can `sed` or hand-edit
- `templates/CLAUDE.md` mirrors current project CLAUDE.md structure but generic
- `templates/README.md` documents installation via `curl` raw URL and manual copy
- No code changes to existing packages; pure documentation deliverable

## 验收标准
- [ ] A zero-knowledge agent reading `templates/AGENTS.md` can execute Boot First on a fresh repo without asking questions
- [ ] All `bunx @lythos/...` commands in templates resolve to real published npm package names
- [ ] `templates/README.md` includes working raw GitHub URL examples
- [ ] Pre-commit passes (ADR check, path safety, README version)
- [ ] ZK Review: spawn subagent with zero context, give it `templates/AGENTS.md`, verify it can recount Boot First + Daily Rhythm + first-time activation

## 进度记录
- 2026-06-07: Task registered.

## 关联文件
- 修改: none
- 新增: `templates/AGENTS.md`, `templates/CLAUDE.md`, `templates/README.md`

## Git 提交信息建议
```
feat(templates): add drop-in AGENTS.md + CLAUDE.md for consumer projects (TASK-20260607002504470)

- Generic lythoskill-consumer Boot First with first-time activation path
- Daily Rhythm using bunx @lythos/* commands
- Copy-paste friendly with raw GitHub URLs
```

## 备注
This is intentionally NOT a `lythoskill-creator` feature — it is a lightweight documentation artifact for projects that consume lythoskill governance without becoming skill authors.
