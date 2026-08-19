<!-- open-wot agent instructions start -->
## Wot UI Agent Instructions

Before generating or modifying wot-ui component code, read the project Skill at `.agents/skills/wot-ui-v2/SKILL.md` and query the configured `wot-ui` MCP server for version-accurate APIs and examples.

<!-- open-wot agent instructions end -->

<!-- uni-helper agent instructions start -->
## uni-helper Ecosystem Agent Instructions

Before generating, importing or modifying any `@uni-helper/*` ecosystem package code (including `uni-env`, `axios-adapter`, `vite-plugin-uni-components`, `uni-app-types`, `uni-manifest-types`), you MUST read the project Skill at `.agents/skills/uni-helper/SKILL.md` and its associated reference documentation in `.agents/skills/uni-helper/references/`.

Strictly adhere to:
1. **Never guess API names**: Verify the exact exported members from official skill reference files or `.d.ts` definitions.
2. **Vite Plugin Sequence**: All `@uni-helper/vite-plugin-*` plugins must be declared BEFORE the official `@dcloudio/vite-plugin-uni` (`uni()`) in `vite.config.js`.
3. **Environment Constants**: Use `@uni-helper/uni-env` for runtime environment checks (`isAppAndroid`, `isAppIOS`, `isMpWeixin`, `isApp`, `isH5`), keeping platform logic type-safe and consistent.
<!-- uni-helper agent instructions end -->
