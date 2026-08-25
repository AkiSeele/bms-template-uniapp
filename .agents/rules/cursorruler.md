---
trigger: always_on
---

## 一、 技术栈与开发基础

1. **核心框架**：uni-app (Vue 3) + TypeScript + `<script setup>` 组合式语法。
2. **代码基础格式**：
   - 必须完全符合项目 Prettier 配置：缩进 2 空格（禁止 Tab），字符串双引号，行尾分号，多行对象/数组必须保留尾随逗号。
   - 模板应保持极简和声明式；**绝对禁止在 HTML 模板中嵌套多重三目运算符**，必须收拢于 `<script setup>` 中编写为 `computed` 计算属性。
3. **TypeScript 校验**：修改代码后，必须主动执行 `npx tsc --noEmit` 检查并解决所有报错。针对 uni-app 官方类型库声明 Bug（如蓝牙 value 被标为 `any[]`），强制使用 `as any` 或 `as ArrayBuffer` 进行类型断言兜底。
4. **代码注释规范**：**禁止出现任何英文注释**。所有单行、多行及 `JSDoc/TSDoc` 注释必须统一使用简体中文书写，并在 Props、Pinia 状态、API 请求和条件编译处详写解释“为什么这样做”。
5. **系统兼容性**：终端 Shell 默认为 PowerShell。禁止执行仅限 Unix 运行的 shell 脚本或专有参数，系统文件操作必须使用 PowerShell 原生或 Node 跨平台命令。

---

## 二、 多端兼容性与布局适配

1. **条件编译与物理分流选型**：
   - 具有平台特异性的轻量逻辑/样式可使用条件编译（如 `#ifdef MP-WEIXIN`、`#ifdef APP-PLUS`）进行隔离。
   - 对于涉及多端底层硬件、原生能力（如权限诊断、原生文件选择、版本检测更新）的复杂服务层逻辑，**严禁在单个文件中长篇手写大量 `#ifdef`**，必须统一通过 `@uni-helper/vite-plugin-uni-platform` 采用独立目录包裹的物理分流架构（`.app.ts` / `.mp-weixin.ts` / `.ts`）。
2. **微信小程序限制**：
   - **图片路径**：SCSS/CSS 的 `background-image` 禁止使用本地相对路径，必须使用 Base64、网络 URL，或模板内 `<image>` 标签。
   - **分包管理**：主包限 2MB。非首屏引用的页面/组件必须放入分包（`subPackages`），大资源（如超过 40KB 静态图片）禁止放入主包。
   - **原生层级**：`video`、`canvas` 等原生组件层级最高，其上覆盖自定义内容必须使用 `cover-view` 和 `cover-image`。
   - **动态组件限制**：微信小程序端不支持 `<component :is="...">`。编译器解析到此标签会报错中断构建。在页面容器中，**必须**使用条件编译进行分流（`#ifdef MP-WEIXIN`），静态导入组件并通过 `v-if` / `v-else-if` 进行渲染。
   - **UnoCSS 跨端转义与适配**：微信小程序不支持转义类名选择器。采用 `@uni-helper/unocss-preset-uni` 自动处理底层多端选择器转义，避免书写极其怪异的任意值类名；复杂颜色透明度应优先通过 `:style` 绑定或局部 scoped 样式处理。
3. **安全区与设备自适应**：
   - 无原生导航栏顶部安全留白使用 `var(--status-bar-height)`，底部使用 `env(safe-area-inset-bottom)`；输入框防遮挡优先用 `<wd-input>`。
   - 设备信息抓取**仅允许在 `App.vue` 的 `onLaunch`** 中通过 `uni.getDeviceInfo()` 获取并写入 Pinia `appStore`，严禁零散高频调用。
   - 微信小程序或 App 下鸿蒙返回的 `osName` 和 `platform` 均返回 `"harmonyos"`。任何权限与设备卡片逻辑必须基于 `deviceInfo` 进行分支自适应，配合 `try-catch` 防御。

---

## 三、 wot-ui v2 开发与组件管理

1. **反馈 Hook**：全站所有页面容器必须被全局高阶组件 `<layout-provider>` 包裹，该高阶组件内部已统一挂载全局的 `<wd-toast />` 与 `<wd-dialog root-portal />` 实例。因此，**业务页面与子组件模板内部严禁重复挂载 `<wd-toast />` 或 `<wd-dialog />`**；在脚本中直接调用 `useToast()`、`useDialog()` 即可触发全局唯一弹窗与提示，杜绝实例重复注册冲突。
2. **样式重用与主题**：定制主题色统一采用 `ConfigProvider` 和全局 SCSS 变量，**禁止**在业务代码中使用 `::v-deep` 强行覆盖组件库内部类名。全站原子类统一采用 `@uni-helper/unocss-preset-uni`（配备 `wot-` 双端前缀配置）与 `@wot-ui/unocss-preset` 双预设驱动。
3. **前置知识求证与本地诊断工具（禁止凭空猜测组件名/属性）**：
   - 优先使用 `wd-icon` 承载 UnoCSS 图标（如 `<wd-icon css-icon="i-<前缀>-<图名>" />`），属性命名与官方文档严格一致。
   - **禁止凭空猜测组件名称或 Props**：在新增、重构或使用任何 `wd-` 开头的 wot-ui 组件之前，**必须**首先调用 `wot-ui` MCP 专属工具（如 `wot_info`、`wot_doc`、`wot_demo`、`wot_list`）或直接执行 `wot info <Component>` 核对真实属性、插槽与事件，严禁凭借其他 UI 库习惯猜测名称（如将 `wd-empty` 误记为 `status-tip`）。
   - 在进行大规模 wot-ui 组件重构或遇到兼容性/编译问题时，**必须**主动调用 `wot_lint` MCP 工具或在终端运行 `wot lint` / `wot doctor` 检查项目中组件使用情况，杜绝未知组件或属性导致的运行期异常。
4. **插槽红线**：严禁凭直觉猜测属性或插槽。**`wd-cell` 不存在且严禁使用已废弃的 `#value` 具名插槽，右侧值展示区域必须且只能使用默认匿名插槽（`#default`）**。
5. **GSAP (GreenSock) 动画规范**：
   - **禁止操作 DOM**：小程序无 DOM，必须使用状态补间驱动（绑定 Vue 的 `ref` 数值渲染到 CSS/SVG 样式中）或类名选择器，避免原生报错。
   - **防内存泄漏**：在组件卸载 `onUnmounted`（或页面 `onUnload`）中，**必须显式且主动调用 `tween.kill()` 或 `gsap.killTweensOf(target)`** 彻底终结所有动画。
   - **GPU 硬件加速**：禁止对重排属性（如 `top`, `left`, `width`）进行补间，必须优先使用 GPU 加速的 `x`, `y`, `scale`, `rotation`, `opacity` 变换属性，并在活跃节点上显式添加 `will-change: transform`。

---

## 四、 国际化 (i18n) 强制约束

1. **禁止硬编码中文**：所有 `.vue`、`.js`、`.ts` 文件中**除了 `console.log` / `console.error` 外，禁止出现任何硬编码中文字符**。模板文本用 `{{ $t('key') }}`，脚本用 `t('key')`。
2. **语言包组织**：配置在 `locale/zh-Hans.json`、`locale/zh-Hant.json` 和 `locale/en.json` 中。
3. **禁止使用动态变量占位符**：语言包中**禁止**使用 `{key}` 等大括号占位符（兼容性差），统一配置为静态词条，在脚本中通过 `t('key') + 变量` 物理拼接。
4. **系统语言自适应**：通过全局 `locale/i18n.ts` 的 `initI18nLocale()` 检测系统语言，针对包含 `hant, tw, hk, mo` 的系统语言自动激活繁体包，`en` 激活英文包；其他默认回退为简体中文（`zh-Hans`）。
5. **无用 Key 同步清理**：在删减或删除页面、组件时，必须同步清理语言包中完全没有被用到的国际化词条 Key，防止无用翻译堆积。
6. **JSON 结构防重红线（严禁重复对象键）**：在修改或为 `locale/zh-Hans.json`、`locale/zh-Hant.json` 或 `locale/en.json` 添加新词条时，**必须且只能**先通过 `grep_search` 或 `view_file` 确认目标 Parent Key（如 `"common"`、`"control"`、`"mine"`）的唯一位置与精准行号。**绝对禁止凭直觉在 JSON 任意位置新建已存在的同名 Key 块**；新词条必须严格合并到既有的唯一 Parent Key 对象内，杜绝 JSON 语法“重复对象键 (Duplicate Object Key)”错误！

---

## 五、 蓝牙 (BLE) BMS 通信与遥测时序

1. **异常捕获与时序防御**：
   - 所有蓝牙 API 调用必须用 `try-catch` 或 `fail` 捕获异常，并使用 `i18n` 提示用户。页面 `onUnload` 或卸载时必须断开连接并注销特征值监听。
   - 在发起连接前，**必须**先调用 `stopBluetoothDevicesDiscovery` 停止扫描（防 10003）。
   - 物理连接后，**必须**依次显式调用 `getBLEDeviceServices` 与 `getBLEDeviceCharacteristics` 成功发现服务与特征值，方可启动监听或写入（防 10004）。
   - Android/小程序端**必须**调用 `setBLEMTU` 协商（推荐 247）。
   - iOS/鸿蒙扫描返回的 `deviceId` 均为随机 UUID。必须调用 `resolveDeviceMac(device)` 从广播包数据段中提取解析真实物理 MAC。
2. **遥测主动轮询与高精度更新**：
   - BMS 通信采用“一发一收”的主动轮询机制，控制权在 APP 端。APP 必须在前置收发完毕后，通过定时器/时序队列下发查询指令（推荐间隔 500ms - 1000ms）。严禁在上一帧未响应或超时前，并发下发新指令。
   - **绝对禁止**采用任何“数值精度差过滤”或“接收端丢帧节流”算法。只要解析到合法数据帧，**必须立即且完整**更新到响应式展示 State 中。
   - 均压差、温差、均温等高阶计算属性，合理依赖被及时更新的响应式遥测状态，利用 Vue `computed` 缓存减少二次计算。

---

## 六、 现代化架构与 Vue 3 目录职责

1. **目录物理职责分工**：
   - **`config/` (配置层)**：仅存放全局静态运行参数、URL、蓝牙 UUID 及自定义主题变量。**红线**：严禁在此编写带有运行期副作用或依赖 Pinia 状态的代码。
   - **`service/` (服务层)**：托管底层长线服务（原生权限诊断、蓝牙适配管理器、HTTP 拦截器）。**红线**：禁止放置具体业务接口请求或视图状态控制。
   - **`api/` (接口层)**：按业务模块定义后端 Promise 网络请求端点。**红线**：严禁在组件、Store 或工具类中硬编码 URL。
   - **`stores/` (Pinia 状态层)**：全站数据/事件总线，存放通信状态和遥测数据。**红线**：状态变迁必须单向且由 Action 执行，禁止外部脏修改。
   - **`pages/` (业务页面层)**：业务 Vue 页面，每个页面容器必须被全局高阶组件 `<layout-provider>` 包裹。
   - **`components/` (公共/共享组件层)**：存放自治的共享组件（easycom）。允许子目录下存在与组件层紧密耦合的配套 `.ts` 辅助文件（如分发器 `panel-registry.ts`），这类文件严禁放入 `service/` 或 `utils/`，防止职责污染。
   - **`composables/` (视图复用 Hook 层)**：存放与视图交互、联动相关的 Hooks 函数。**红线**：禁止编写复杂的系统 API 检测或硬件底层判断，必须委托给 `service/`。
   - **`types/` (类型定义层)**：存放共享 TS 类型。
   - **`utils/` (纯工具函数层)**：仅存放与网络、全局配置、Pinia 完全解耦的纯算法。**红线**：严禁导入网络拦截器或 Store。
2. **视图与逻辑强分离**：
   - 任何涉及复杂网络组合、蓝牙/硬件通信、设备扫描配对比对、权限复合诊断等纯逻辑过程，**严禁在页面组件的脚本区域中长篇手写**。这类纯逻辑管理**必须且只能**封装进独立的复用组合式 Hook 函数（`composables/` 目录下，以 `use-` 开头）。
   - 页面组件的脚本区域只负责绑定 Hook 暴露的响应式状态和事件动作、以及极度轻量的界面状态切换。
   - Hook 内部进行交互回执、弹窗提示时，**绝对禁止**使用任何硬编码中文字符，必须全部归口到国际化词条字典中。

---

## 七、 数据通信、Pinia 状态与异步防御

1. **全局 Pinia 状态管理**：
   - **必须**使用 **`storeToRefs(store)`** 来解构 Pinia Store 中的 state 或 getters，绝对禁止直接使用 ES6 的解构赋值（会导致响应式断裂）。
   - 绝对禁止绕过 Store 在外部脏修改蓝牙连接状态或遥测数据。核心状态变迁统一且只能由 `bleStore` 导出的 Action 执行。
2. **z-paging 高效分页与去重**：
   - 蓝牙广播包推送到 `z-paging` 渲染前，**必须**在 `startScan` 回调中基于物理 MAC 地址（`deviceId`）去重过滤，防重复项导致频繁重绘。
   - 自定义顶部导航栏必须声明在 `z-paging` 的 **`top` 插槽（`#top`）** 内部，以防内容重叠。
3. **接口防连点与遮罩死锁防御**：
   - 写入或提交操作前**必须**开启 Loading 遮罩。必须使用 `try-catch-finally` 结构，并且在 **`finally` 块中显式关闭 Loading**，防因未捕获异常导致遮罩死锁。
   - 离线拦截：前置校验 `APP_CONFIG.APP_MODE === "offline"`，离线模式下直接拦截并 reject 抛出 `OFFLINE_MODE` 错误。

---

## 八、 多协议解耦与微信小程序兼容红线

1. **协议规格声明区强制规范**：
   - 确保应用无缝兼容不同厂商、不同报文格式 of BMS 电池硬件。代码中**严禁出现任何具体厂商商业名称**，统一使用中性的协议序号（如 `protocol-a`、`protocol-b`）。
   - 每个协议实现文件顶部必须声明一个 `PROTOCOL_SPEC` 常量，实现 `types/protocol.ts` 的 `ProtocolSpec` 接口。**红线**：严禁将帧头魔数、指令字节码、校验算法等参数散落在解析代码中，必须全部集中在规格常量中，并通过 `readonly spec = PROTOCOL_SPEC` 暴露。
2. **策略模式解耦与校验算法可插拔**：
   - 各协议封装为独立的协议策略类，统一实现 `types/protocol.ts` 的 `BmsProtocolParser` 接口。指令组包与解包**统一且只能**委托给激活的协议策略实例（`activeProtocolParser`）。
   - 所有协议的校验验证必须调用 `utils/bms-helper.ts` 中的 `verifyChecksum(bytes, algorithm, range)` 通用分发函数（内置 `sum8`、`sum16le`、`crc16-modbus`）。**绝对禁止**在协议类中手写校验循环。
3. **协议注册表（消灭 if-else）**：
   - 通过 `service/protocol/protocol-registry.ts` 的 `registerProtocol()` 将蓝牙服务 UUID 与对应协议解析器工厂绑定注册。
   - `ble-store.ts` 中的协议匹配**必须且只能**通过 `resolveProtocol(serviceUuid)` 调用注册表查找，**绝对禁止**编写基于 UUID 的 `if-else` 判断。
4. **双注册表架构与小程序兼容（核心红线）**：
   - 视图层消费 `extendedProtocolData` 时，必须使用可选链（`?.`）兜底。
   - **微信小程序端完全不支持 `<component :is>` 动态组件编译**。在需要支持小程序的页面容器中，**必须**使用条件编译（`#ifdef MP-WEIXIN`）来通过 `v-if` / `v-else-if` 分流并显式渲染静态导入的子面板组件。
   - 动态组件 `:is` 对象绑定（由视图层组件注册表 `panel-registry.ts` 返回引用）的动态渲染设计仅允许在非小程序端（如 App、H5）作为 `#ifndef MP-WEIXIN` 分支执行。
   - 新增协议专属面板时，在 `components/protocol-panels/` 下新建组件，并在 `panel-registry.ts` 静态 `import` 并配置在 Map 映射中即可，无需在业务页面编写分支判断，保障开闭原则。

---

## 九、 uni-helper 生态组件与工具库开发规范

1. **API 核验红线（严禁凭空猜测函数名与导出项）**：
   - 在使用任何 `@uni-helper/*` 生态工具库（如 `uni-env`、`axios-adapter`、`uni-use` 等）之前，**必须**首先查阅项目 Skill 目录 `.agents/skills/uni-helper/SKILL.md` 及配套参考文档，或直接检视 `node_modules/@uni-helper/<pkg>/dist/` 的真实 `.d.ts` 声明。
   - **严禁凭空猜测导出名称**：禁止将 VueUse 或其它第三方库的 API 名称直接套用在 uni-helper 工具库上，杜绝因导出不存在引发的运行期/编译期崩溃。
2. **`@uni-helper/uni-env` 跨端环境判断规范**：
   - 区分平台大类组常量（`isApp`、`isH5`、`isMp`、`isDev`、`isProd`）与具体平台细分常量（`isAppAndroid`、`isAppIOS`、`isAppHarmony`、`isMpWeixin`）。
   - 跨端运行时差异判断优先统一采用 `uni-env` 常量，消灭零散、容易拼错的 `process.env.UNI_PLATFORM === '...'` 或手动获取系统信息的字符串比对。
   - 涉及特定端独有的原生插件、SDK 或原生 API 调用时，必须配合 `#ifdef APP-PLUS` / `#ifdef MP-WEIXIN` 条件编译，确保构建期死代码消除（Tree-shaking）。
3. **`@uni-helper/vite-plugin-uni-components` 组件按需自动引入**：
   - 全站 UI 组件库（如 Wot UI v2）必须通过 `vite.config.js` 的 `Components({ resolvers: [...] })` 插件进行自动引入与类型声明（`types/components.d.ts`），**业务页面与子组件中禁止手动编写局部 `import Wd...`**。
   - **Vite 插件链声明顺序红线**：所有 `@uni-helper/vite-plugin-*` 插件（如 `Components`）**必须严格声明在官方 `@dcloudio/vite-plugin-uni`（`uni()`）之前**，确保模板中的标签能在 uni-app 编译器解析前完成拦截与按需转换。
4. **`@uni-helper/axios-adapter` 网络请求层规范**：
   - 全局网络请求统一由 `service/request.ts` 托管，必须通过 `createUniAppAxiosAdapter()` 创建适配器实例注入给 Axios，杜绝多端网络通信差异。
5. **类型增强库统一注册**：
   - 全局原生标签与清单类型必须配置在 `tsconfig.json` 的 `compilerOptions.types` 中（`@uni-helper/uni-app-types` 与 `@uni-helper/uni-manifest-types`），确保全项目享受 TypeScript 自动推导保护。
6. **`@uni-helper/vite-plugin-uni-platform` 物理分流与目录结构规范**：
   - **文件夹包裹规范**：对于涉及多端差异实现的服务模块（如权限诊断、版本管理、固件升级），必须使用独立目录进行包裹托管，并在该目录下配置分平台实现文件：
     - `service/<module>/index.app.ts`：App 原生端专有实现（Android / iOS 底层桥接）
     - `service/<module>/index.mp-weixin.ts`：微信小程序端专有实现
     - `service/<module>/index.ts`：默认与 Web/H5 兜底实现及 TypeScript 类型契约源
   - **无缝引入**：业务代码直接通过目录名引入（如 `import { permissionManager } from "@/service/permission"`），由 Vite 编译器根据构建目标物理匹配对应文件，彻底消灭业务层与服务层中的大量 `#ifdef`，享受物理级 Tree-shaking。
7. **`@uni-helper/unocss-preset-uni` 跨端样式预设规范**：
   - 基础原子类预设统一采用 `@uni-helper/unocss-preset-uni`（配置 `presetUni({ uno: { prefix: 'wot-', presetOptions: { prefix: 'wot-' } } })`），与 `@wot-ui/unocss-preset`（组件库主题与 Token 预设）协同工作。
   - 小程序端选择器转义由 `presetUni` 内置 `presetApplet` 与 `presetLegacyCompat` 自动安全处理，无需额外手动配置易误伤 JS 语法的外部 transformer。
   - 所有通用样式工具类保持 `wot-` 前缀（`wot-flex`、`wot-items-center`、`wot-p-3` 等），实现组件库主题与原子类命名空间严密隔离。
