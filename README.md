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

## 📖 技术架构与详细开发文档

为了帮助开发与维护人员快速上手并理解全局数据流向，`docs` 目录下提供了完整的技术设计文档：

1. **[系统整体架构与职责划分](docs/1.architecture.md)**：物理目录职责边界、解耦数据流（页面 - Composables - Store - Parser - Utils）。
2. **[蓝牙物理连接生命周期](docs/2.connection_lifecycle.md)**：9步物理连接时序、GATT 缓存就绪防 10008/10004 机制。
3. **[指令收发与队列调度机制](docs/3.transceiver_queue.md)**：单一通道指令队列调度器、控制指令插队、轮询指令去重去噪防堵塞及分包下发。
4. **[多协议热兼容与策略模式](docs/4.multi_protocol.md)**：数据层与 UI 面板层的“双注册表自适应架构”、Vite Glob 编译期自动加载原理。
5. **[核心业务页面功能使用指南](docs/5.page_guide.md)**：模糊搜索、温度传感器智能过滤、多语言重载、色彩色板热重绘及固件升级 OTA 写入锁。
6. **[系统安全授权与激活校验](docs/6.auth_activation.md)**：特征设备识别码离线生成、离线激活码双向演算比对、到期状态熔断保护及防重放重刷机制。
7. **[系统权限诊断与自适应修复](docs/7.permission_diagnostics.md)**：手机蓝牙、GPS 硬件开关及应用位置/附近设备权限诊断，Android 12+ 混合直申与 Manifest neverForLocation 消除定位授权摩擦。
8. **[常见问题排查与避坑指南](docs/8.troubleshooting.md)**：10003 连接失败、10008 no descriptor、大包丢包串口堵塞、小程序 services 传空数组 Bug 等经典故障定位。
9. **[UI 视觉设计美学与 GSAP 动画体系](docs/9.animations_aesthetics.md)**：莫兰迪色系应用、Vue 3 状态驱动 GSAP 补间机制、GPU 硬件加速与 destroy 强制释放防溢出红线。

---

## ⚙️ 简易使用手册

### 1. 开发环境准备

1. **安装依赖**：建议使用 `pnpm` 安装项目依赖。
   ```bash
   pnpm install
   ```
2. **启动项目**：使用 HBuilderX 打开项目根目录，在上方运行菜单中选择对应的端（如“运行到内置浏览器”、“运行到微信开发者工具”、“运行到 Android App 基座”）进行编译调试。

### 2. 多协议接入与命名规范 (核心红线)

项目采用了开闭原则与自动装载设计，**命名硬对齐规范是确保新协议生效的红线**：
1. **配置 Key 名**：在 [config/index.ts](config/index.ts) 的 `BLE_SERVICES` 中配置协议的键名（Key）（如 `"protocol-c"`）。
2. **策略文件名**：在 `service/protocol/` 目录下创建该策略文件，文件名必须与 Key 一致（即 `protocol-c.ts`）。
3. **UI 面板文件名**：在对应业务页面（如 `pages/index/components/`）下创建专属面板，文件名必须与 Key 一致（即 `protocol-c.vue`）。
*若三者名称不一致，系统会在运行时控制台抛出明确的 `console.error`（未找到策略文件）或 `console.warn`（未找到专属面板）引导您纠正。*

### 3. 开发规范准则 (Ruler)

详细规范请严格遵循 [.agents/rules/cursorruler.md](.agents/rules/cursorruler.md)，核心摘要如下：
- **组件库优先**：界面构建优先使用 `wot-ui` (`wd-*`) 组件，禁止裸写原生标签或重复封装已有组件。
- **UI 动效规范**：GSAP 补间动画禁止直接操作 DOM，必须由 Vue Ref 响应式状态驱动，且组件卸载时必须显式调用 `tween.kill()` 或 `gsap.killTweensOf()` 彻底销毁释放，防止内存溢出。
- **完全国际化 (i18n)**：代码中禁止硬编码任何中文字符（`console` 除外）。模板中采用 `{{ $t('key') }}`，脚本中采用 `t('key')`。
- **TS 类型与 Prettier**：修改代码后应主动执行 `npx tsc --noEmit` 核验。每行结尾必补分号，字符串必用双引号，使用 2 个空格缩进。

---

## 🤝 常见问题排查与避坑

- **微信小程序蓝牙搜索全空**：检查是否在底层 `startBluetoothDevicesDiscovery` 接口的 `services` 参数中传了空数组 `[]`。在部分机型和微信版本下，传递空数组会被过滤为空导致扫描搜不到任何设备，项目已在底层做了动态容错隔离。
- **蓝牙设备搜索失败 (10003)**：确认手机系统蓝牙开关与 GPS 定位服务是否均已开启。Android 12+ 需检查是否已授予“附近设备”与“位置信息”权限。
- **Android GATT 订阅失败 (10008)**：在特征值发现成功后，需给与底层 Gatt 同步微量缓存就绪时间，项目已在连接时序中默认加入 `PRE_SUBSCRIBE_DELAY_MS` (300ms) 缓冲，避免过早订阅导致无描述符报错。
