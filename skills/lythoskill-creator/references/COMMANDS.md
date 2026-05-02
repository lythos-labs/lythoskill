<!-- AUTO-GENERATED -->
@lythos/skill-creator -- thin skill scaffolder

Commands:
  init <name>       Create a new lythoskill project
  add-skill <name>  Add a new skill to an existing monorepo
  build <skill>     Build a skill for distribution
  build --all       Build all skills in packages/lythoskill-*/
  align             Audit project against current conventions
  align --fix       Auto-apply missing conventions
  bump <target>     Lock-step bump all package versions (patch|minor|major|X.Y.Z)
  bump --dry-run    Preview the bump without writing files

Examples:
  bunx @lythos/skill-creator init my-tool
  bunx @lythos/skill-creator add-skill my-new-skill
  bunx @lythos/skill-creator build example
  bunx @lythos/skill-creator align
  bunx @lythos/skill-creator align --fix
  bunx @lythos/skill-creator bump patch
  bunx @lythos/skill-creator bump 1.0.0 --dry-run

