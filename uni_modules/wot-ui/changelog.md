## 2.0.7（2026-05-12）
### [2.0.7](https://github.com/wot-ui/wot-ui/compare/v2.0.6...v2.0.7) (2026-05-12)

### [2.0.6](https://github.com/wot-ui/wot-ui/compare/v2.0.5...v2.0.6) (2026-05-12)


###  Documentation | 文档

*   更新 Sass 版本要求，添加运行时警告处理说明 ([#35](https://github.com/wot-ui/wot-ui/issues/35)) ([268cd0e](https://github.com/wot-ui/wot-ui/commit/268cd0e744707ce29209ef38c4f260114dd92a33))
*   更新深色模式和主题变量引入说明，增加代码示例 ([20aeb4d](https://github.com/wot-ui/wot-ui/commit/20aeb4d71f6993f37f38893b8e26294e5cb58180))
*   新增 v1 迁移到 v2 的文档 ([4cafe19](https://github.com/wot-ui/wot-ui/commit/4cafe19ee3be75f9b08062ee74c6d5feffe7fa51))


###  Bug Fixes | Bug 修复

*  更新 Dialog 组件关闭逻辑，支持通过点击关闭按钮触发关闭操作并返回相应的 action ([#26](https://github.com/wot-ui/wot-ui/issues/26)) ([0aabf55](https://github.com/wot-ui/wot-ui/commit/0aabf55aa9c8c4e42cf761ea023e0d0117dc1a93))
*  简化 cellConfigs 计算逻辑，移除不必要的可见性判断，修复微信小程序编译异常的问题 ([5a64e53](https://github.com/wot-ui/wot-ui/commit/5a64e531e0d40857cd8bb2c637414840d2e8f525)), closes [#34](https://github.com/wot-ui/wot-ui/issues/34)
*  将 wd-tag 组件默认插槽内容的承载元素从 text 更改为 view ([#39](https://github.com/wot-ui/wot-ui/issues/39)) ([b72a2be](https://github.com/wot-ui/wot-ui/commit/b72a2bef01c60c8ba8ba14a6b838b660e9f52205)), closes [#25](https://github.com/wot-ui/wot-ui/issues/25)
*  修复 ConfigProvider 中 Input 组件变量丢失的问题 ([#37](https://github.com/wot-ui/wot-ui/issues/37)) ([66ddace](https://github.com/wot-ui/wot-ui/commit/66ddace1f5bfd69cd23a8cead460263e2d63ee94)), closes [#36](https://github.com/wot-ui/wot-ui/issues/36)
*  修复 Dialog 覆盖 Popup 样式权重较低导致被其他 Popup 覆盖的问题 ([#22](https://github.com/wot-ui/wot-ui/issues/22)) ([9f0fc52](https://github.com/wot-ui/wot-ui/commit/9f0fc52d8d0f9adf3812b08d8a34c45fd3ba6965)), closes [#21](https://github.com/wot-ui/wot-ui/issues/21)
*  修复 FormItem label 属性不生效 ([#38](https://github.com/wot-ui/wot-ui/issues/38)) ([fdbcf93](https://github.com/wot-ui/wot-ui/commit/fdbcf935357b9ccbe4e6390551f2eca0f82c1cad)), closes [#30](https://github.com/wot-ui/wot-ui/issues/30)
*  修复日期时间选择器在 ios26 微信小程序端区域选择切换时高度坍缩的问题 ([#41](https://github.com/wot-ui/wot-ui/issues/41)) ([e6de48d](https://github.com/wot-ui/wot-ui/commit/e6de48d76c68db7f4faddda0477e2fe0a060c9f5))

# 更新日志 


### [2.0.7](https://github.com/wot-ui/wot-ui/compare/v2.0.6...v2.0.7) (2026-05-12)

### [2.0.6](https://github.com/wot-ui/wot-ui/compare/v2.0.5...v2.0.6) (2026-05-12)


### ✏️ Documentation | 文档

* ✏️  更新 Sass 版本要求，添加运行时警告处理说明 ([#35](https://github.com/wot-ui/wot-ui/issues/35)) ([268cd0e](https://github.com/wot-ui/wot-ui/commit/268cd0e744707ce29209ef38c4f260114dd92a33))
* ✏️  更新深色模式和主题变量引入说明，增加代码示例 ([20aeb4d](https://github.com/wot-ui/wot-ui/commit/20aeb4d71f6993f37f38893b8e26294e5cb58180))
* ✏️  新增 v1 迁移到 v2 的文档 ([4cafe19](https://github.com/wot-ui/wot-ui/commit/4cafe19ee3be75f9b08062ee74c6d5feffe7fa51))


### 🐛 Bug Fixes | Bug 修复

* 🐛 更新 Dialog 组件关闭逻辑，支持通过点击关闭按钮触发关闭操作并返回相应的 action ([#26](https://github.com/wot-ui/wot-ui/issues/26)) ([0aabf55](https://github.com/wot-ui/wot-ui/commit/0aabf55aa9c8c4e42cf761ea023e0d0117dc1a93))
* 🐛 简化 cellConfigs 计算逻辑，移除不必要的可见性判断，修复微信小程序编译异常的问题 ([5a64e53](https://github.com/wot-ui/wot-ui/commit/5a64e531e0d40857cd8bb2c637414840d2e8f525)), closes [#34](https://github.com/wot-ui/wot-ui/issues/34)
* 🐛 将 wd-tag 组件默认插槽内容的承载元素从 text 更改为 view ([#39](https://github.com/wot-ui/wot-ui/issues/39)) ([b72a2be](https://github.com/wot-ui/wot-ui/commit/b72a2bef01c60c8ba8ba14a6b838b660e9f52205)), closes [#25](https://github.com/wot-ui/wot-ui/issues/25)
* 🐛 修复 ConfigProvider 中 Input 组件变量丢失的问题 ([#37](https://github.com/wot-ui/wot-ui/issues/37)) ([66ddace](https://github.com/wot-ui/wot-ui/commit/66ddace1f5bfd69cd23a8cead460263e2d63ee94)), closes [#36](https://github.com/wot-ui/wot-ui/issues/36)
* 🐛 修复 Dialog 覆盖 Popup 样式权重较低导致被其他 Popup 覆盖的问题 ([#22](https://github.com/wot-ui/wot-ui/issues/22)) ([9f0fc52](https://github.com/wot-ui/wot-ui/commit/9f0fc52d8d0f9adf3812b08d8a34c45fd3ba6965)), closes [#21](https://github.com/wot-ui/wot-ui/issues/21)
* 🐛 修复 FormItem label 属性不生效 ([#38](https://github.com/wot-ui/wot-ui/issues/38)) ([fdbcf93](https://github.com/wot-ui/wot-ui/commit/fdbcf935357b9ccbe4e6390551f2eca0f82c1cad)), closes [#30](https://github.com/wot-ui/wot-ui/issues/30)
* 🐛 修复日期时间选择器在 ios26 微信小程序端区域选择切换时高度坍缩的问题 ([#41](https://github.com/wot-ui/wot-ui/issues/41)) ([e6de48d](https://github.com/wot-ui/wot-ui/commit/e6de48d76c68db7f4faddda0477e2fe0a060c9f5))

### [2.0.5](https://github.com/wot-ui/wot-ui/compare/v2.0.4...v2.0.5) (2026-04-27)


### ✏️ Documentation | 文档

* ✏️  更新深色模式和主题变量引入说明，增加代码示例 ([#19](https://github.com/wot-ui/wot-ui/issues/19)) ([abb7a1b](https://github.com/wot-ui/wot-ui/commit/abb7a1bfdbaab7e2b16b6cde5fd529d043461996))

### [2.0.4](https://github.com/wot-ui/wot-ui/compare/v2.0.3...v2.0.4) (2026-04-24)

### [2.0.3](https://github.com/wot-ui/wot-ui/compare/v2.0.2...v2.0.3) (2026-04-23)


### ✨ Features | 新功能

* ✨ checkbox 支持独立使用 ([#7](https://github.com/wot-ui/wot-ui/issues/7)) ([4b04820](https://github.com/wot-ui/wot-ui/commit/4b04820853f19459a88f69ce6e19d9a756b0cf8e))

### [2.0.2](https://github.com/wot-ui/wot-ui/compare/v2.0.1...v2.0.2) (2026-04-22)


### 🐛 Bug Fixes | Bug 修复

* 🐛 移除按钮组件的 flex-shrink 属性 ([a6d6068](https://github.com/wot-ui/wot-ui/commit/a6d6068402fb39778e68d0280e45d7894daca386))

### [2.0.1](https://github.com/wot-ui/wot-ui/compare/v2.0.0...v2.0.1) (2026-04-22)


### ✏️ Documentation | 文档

* ✏️  完善 form 组件文档示例 ([53df04a](https://github.com/wot-ui/wot-ui/commit/53df04a63076506b9de3896fcf04f5178f99c893))
* ✏️  修正 v1 链接至正确的子域名 ([558cd94](https://github.com/wot-ui/wot-ui/commit/558cd9414829b694a6c605087d57805cccef769e))
* ✏️  update miniprogram qrcode ([091fc30](https://github.com/wot-ui/wot-ui/commit/091fc308a2981ba9c4b7bdb295889544ef908c1f))
* ✏️ 更新表单组件示例 ([b439d8a](https://github.com/wot-ui/wot-ui/commit/b439d8af0a7560ba54a7fbc77700f71b9b859267))
* ✏️ 更新脚手架命令，使用 wot-starter-v2 模板 ([d7d846a](https://github.com/wot-ui/wot-ui/commit/d7d846a81a869fbb70d570eb2df33dc69b5e441b))
* ✏️ 更新文档和生态系统链接，移除无用内容 ([60a0cc8](https://github.com/wot-ui/wot-ui/commit/60a0cc81c293c096bcf727db5e867cdb269006e7))


### ✨ Features | 新功能

* ✨ 调整 button 组件高度由 padding 撑开转为固定高度 ([#4](https://github.com/wot-ui/wot-ui/issues/4)) ([b26b134](https://github.com/wot-ui/wot-ui/commit/b26b134471d78bb4ff09ba34f86852193ebc902d))

## [2.0.0](https://github.com/wot-ui/wot-ui/compare/v2.0.0-alpha.21...v2.0.0) (2026-04-21)


### ✏️ Documentation | 文档

* ✏️  更新 banner 背景样式和按钮过渡效果，增强视觉效果 ([0dedfc1](https://github.com/wot-ui/wot-ui/commit/0dedfc16966c5946a0ad464b22ef5c95ae44a147))


### ✨ Features | 新功能

* ✨ wot-ui v2 发布 ([2e96ba1](https://github.com/wot-ui/wot-ui/commit/2e96ba168360672521df51aa120ce03a1cf31ca0))
