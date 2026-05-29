# BMS BLE uni-app (bms-jlw-uniapp)

本项目是一个基于 uni-app (Vue 3) 开发的低功耗蓝牙 (BLE) 电池管理系统 (BMS) 移动端应用。支持 Android、iOS 和微信小程序等多端运行。

## 🛠 技术栈

- **框架**: uni-app (Vue 3, `<script setup>`)
- **语言**: TypeScript, JavaScript
- **状态管理**: Pinia
- **国际化**: vue-i18n (支持多语言环境)
- **UI 组件库**: wot-ui v2
- **CSS 引擎**: UnoCSS (配合 @wot-ui/unocss-preset 预设)
- **包管理器**: pnpm

---

## 📂 项目结构说明

为保证代码高可维护性，项目严格遵循以下物理与逻辑分层设计：

```text
bms-jlw-uniapp/
├── api/            # 接口层：按业务模块划分的网络 API 请求定义，禁止硬编码 URL。
├── components/     # 组件层：项目公共自定义 Vue 组件。
├── composables/    # 组合式函数层：存放基于 Vue 3 Composition API 的复用逻辑（如 use-ble-permission.ts）。
├── config/         # 配置层：全局静态环境配置，如网络基准 URL、蓝牙 UUID 组及权限常量配置。
├── locale/         # 国际化层：存放中英文等语言包 (zh-Hans.json, en.json) 及 i18n 初始化入口。
├── pages/          # 页面层：uni-app 的视图页面目录（如启动页 index、蓝牙搜索页 ble-search）。
├── service/        # 服务层：核心底层长线服务逻辑（如全局蓝牙连接管理器 ble-manager.ts、权限管理器 permission.ts）。
├── stores/         # 状态管理层：Pinia 的全局状态 Store 仓库。
├── types/          # 类型定义层：存放共享的 TypeScript 类型定义文件 (.d.ts)。
├── utils/          # 工具函数层：纯工具算法（如十六进制转换、蓝牙数据帧校验等），不包含网络或业务状态逻辑。
├── unpackage/      # 编译输出层：uni-app 运行或发行的最终产物（勿手动修改）。
├── App.vue         # 应用配置：应用生命周期钩子配置及全局样式引入。
├── main.js         # 应用入口：Vue 实例的创建及各插件（Pinia, i18n 等）的挂载。
├── manifest.json   # 平台配置：应用名称、图标、权限及各端原生特有配置。
├── pages.json      # 页面配置：全局路由、导航条、选项卡等基础配置。
└── vite.config.js  # 构建配置：Vite 配置文件，集成 UnoCSS 及组件自动导入等插件。
```

---

## 📖 简易使用手册

### 1. 开发环境准备

1. **安装依赖**：建议使用 `pnpm` 安装项目依赖。
   ```bash
   pnpm install
   ```
2. **启动项目**：可使用 HBuilderX 打开项目根目录，选择对应的端（如 "运行到内置浏览器"、"运行到微信开发者工具"、"运行到 Android App 基座"）进行编译运行。

### 2. 开发规范准则 (核心)

本项目遵循严格的开发规范（详细见 `.cursorrules` 或全局开发文档）：
- **组件库优先**：界面构建优先使用 `wot-ui` (`wd-*`) 组件，禁止直接写原生或重写已有组件。
- **UnoCSS 样式**：通用排版使用 UnoCSS 类名（带 `wot-` 前缀，如 `wot-flex`），图标统一采用 `<wd-icon>`。
- **多端兼容**：涉及平台特异性 API 或样式时，必须使用 uni-app 的条件编译（`#ifdef` / `#endif`）。
- **完全国际化 (i18n)**：禁止在代码中出现硬编码中文（日志除外）。模板使用 `$t('key')`，脚本使用 `t('key')`。
- **严格 TS 类型**：新文件优先使用 TypeScript，必须解决所有类型报错，官方库 Bug 允许使用 `as any` 兜底。

### 3. 核心功能接入说明

- **蓝牙与权限**：涉及到蓝牙状态查询、系统定位开关检查、App/小程序动态权限获取等环境核验，统一通过 `service/permission.ts` 发起。UI 交互层的提示由 `composables/use-ble-permission.ts` 结合弹窗组件处理。
- **蓝牙设备连接**：底层通讯统一交给 `service/ble-manager.ts` 管理生命周期（自动处理重连、分包 MTU 写入及资源释放），禁止在页面中直接调用 `uni.openBluetoothAdapter` 等原生 API。

---

## 🤝 常见问题排查

- **蓝牙无法搜索/报错**：检查手机系统蓝牙开关、系统定位 (GPS) 开关是否开启，以及 Android 12+ 手机的“附近设备”与“位置信息”权限是否授予（Android 必须为“使用时允许”）。
- **组件样式不生效**：检查是否错误地使用了深层穿透选择器去覆盖组件库类名；如果是小程序背景图，确认是否使用了不支持的本地相对路径。
- **i18n 文本为空白**：检查对应语言包（如 `locale/en.json`）中该 key 是否存在且拼写一致。
