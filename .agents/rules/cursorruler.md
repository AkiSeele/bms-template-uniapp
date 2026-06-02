---
trigger: always_on
---

# BMS BLE uni-app 开发规范与 Ruler

本规范适用于 BMS BLE uni-app 项目（Android, iOS, 微信小程序），确保三端高兼容、极佳性能与强可维护性。所有开发与 AI 协同必须 100% 严格执行。

---

## 一、 技术栈与核心要求

1. **核心框架**：uni-app (Vue 3) + TypeScript + `<script setup>` 组合式语法。
2. **UI 组件库**：优先使用 **wot-ui v2 (`wd-*`)** 组件。严禁擅自使用原生 HTML 标签或重写组件。
3. **样式方案**：使用 **UnoCSS**。通用布局及尺寸类名必须使用 `wot-` 前缀（如 `wot-flex`, `wot-w-24`）。
4. **图标方案**：统一使用 `wd-icon` 承载 UnoCSS 图标，格式：`<wd-icon css-icon="i-<前缀>-<图名>" size="24px" color="#fff" />`。禁止在模板中裸写 `svg` 或 `<view class="i-...">`。
5. **模板表达式规范**：**绝对禁止在 HTML 模板中嵌套多重三目运算符**。模板应保持极简和声明式；**必须收拢于 `<script setup>` 中编写为 `computed` 计算属性**，以利用 Vue 依赖缓存并保障可读性与可维护性。

---

## 二、 四端兼容性规范 (Android / iOS / HarmonyOS / 微信小程序)

1. **条件编译**：任何具有平台特异性的逻辑/样式，必须使用条件编译（如 `#ifdef MP-WEIXIN`、`#ifdef APP-PLUS`）进行隔离。
2. **微信小程序限制**：
   - **图片路径**：SCSS/CSS 的 `background-image` 禁止使用本地相对路径，必须使用 Base64 或网络 URL，或用 `<image>` 标签替代。
   - **分包管理**：单包限 2MB。非主包首屏引用的页面/组件必须放入分包（`subPackages`）。
   - **原生层级**：`video`、`canvas` 等原生组件层级最高，其上覆盖自定义内容必须使用 `cover-view` 和 `cover-image`。
3. **App 限制**：顶部安全留白使用 `var(--status-bar-height)`，底部使用 `safe-area-inset-bottom`；输入框防遮挡优先用 `<wd-input>`。
4. **设备信息与鸿蒙自适应**：
   - **单点抓取**：设备信息抓取**仅允许在 `App.vue` 的 `onLaunch`** 中通过 `uni.getDeviceInfo()` 获取并写入 Pinia `appStore`，严禁在页面零散高频调用。
   - **鸿蒙适配**：微信小程序或 App 下鸿蒙返回的 `osName` 和 `platform` 均返回 `"harmonyos"`。任何权限与设备卡片逻辑必须基于 `deviceInfo` 进行分支自适应，配合 `try-catch` 防御。

---

## 三、 wot-ui v2 开发规范

1. **反馈 Hook**：使用 `useToast()`、`useDialog()` 时，**当前页面模板必须显式挂载对应实例**（如 `<wd-toast />`, `<wd-dialog />`），否则无法弹窗。
2. **主题配置**：定制主题色统一采用 `ConfigProvider` 和全局 SCSS 变量，**禁止**在业务代码中使用 `::v-deep` 强行覆盖组件库内部类名。
3. **命名对齐**：组件属性命名必须与官方文档严格一致（阻止冒泡用 `.stop`）。
4. **前置知识求证与物理源文件自证明核查（强约束红线）**：
   - 在使用、重构或调试任何 wot-ui 组件之前，**必须**首先阅读并调用 `wot-ui-v2` 专属 Skill，或通过 `wot` 离线命令行工具求证最新的官方组件 API 规范。
   - **自证明注释红线**：为了彻底消除 AI 仅凭直觉猜测属性或插槽名造成的运行期 Bug，**在使用任何 wot-ui 组件的插槽或自定义属性时，必须在模板中该组件的调用代码上方写明该组件的物理源文件路径作为前置校验自证明**。格式如：`<!-- Source: uni_modules/wot-ui/components/wd-cell/wd-cell.vue -->`。未添加该物理自证明路径注释的代码一律视为不合规。
   - **插槽红线**：严禁仅凭直觉凭空猜测已废弃或不存在的组件属性或插槽。**极度强调：`wd-cell` 不存在且严禁使用已废弃的 `#value` 具名插槽，右侧值展示区域必须且只能使用默认匿名插槽（`#default`）**。


---

## 四、 国际化 (i18n) 强制约束

1. **禁止硬编码中文**：所有 `.vue`、`.js`、`.ts` 文件中**除了 `console.log` / `console.error` 外，禁止出现任何硬编码中文字符**。
2. **模板/脚本语法**：模板文本用 `{{ $t('key') }}`，脚本用 `t('key')`。
3. **语言包组织**：配置在 `locale/zh-Hans.json`、`locale/zh-Hant.json` 和 `locale/en.json` 中。
4. **禁止使用动态变量占位符**：语言包中**禁止**使用 `{key}` 等大括号占位符（兼容性差），统一配置为静态词条，在脚本中通过 `t('key') + 变量` 物理拼接。
5. **系统语言自适应**：通过全局 `locale/i18n.ts` 的 `initI18nLocale()` 检测系统语言，针对包含 `hant, tw, hk, mo` 的系统语言自动激活繁体包，`en` 激活英文包；对于其他未检测到或不支持的系统语言，默认回退为简体中文（`zh-Hans`）。
6. **无用 Key 同步清理**：在删减或删除页面、组件时，必须同步清理 `locale/zh-Hans.json`、`locale/zh-Hant.json` 和 `locale/en.json` 语言包中完全没有被用到的国际化词条 Key，防止无用翻译堆积。

---

## 五、 低功耗蓝牙 (BLE) BMS 通讯规范

1. **异常捕获**：所有蓝牙 API 调用必须用 `try-catch` 或 `fail` 捕获异常，并使用 `i18n` 提示用户。
2. **生命周期防泄露**：页面 `onUnload` 时必须断开连接（`uni.closeBLEConnection`）并注销特征值监听（`uni.onBLECharacteristicValueChange`）。
3. **停止扫描防御（防 10003）**：在发起 `createBLEConnection` 前，**必须**先调用 `stopBluetoothDevicesDiscovery` 彻底停止扫描。
4. **强制发现时序（防 10004）**：建立物理连接后，**必须**依次显式调用 `getBLEDeviceServices` 与 `getBLEDeviceCharacteristics` 成功发现服务与特征值，方可启动监听（Notify）或写入（Write）。
5. **MTU 协商与动态分包**：服务发现后，Android/小程序端**必须**调用 `setBLEMTU` 协商（推荐 247）。写入数据时，应根据实际 MTU 自适应切片分包下发（扣除 3 字节协议开销），并配合 50ms 物理延时，严禁死板硬编码 20 字节。
6. **MAC 地址解析**：iOS/鸿蒙扫描返回的 `deviceId` 均为系统随机 UUID。必须调用工具函数 `resolveDeviceMac(device)` 从广播包数据段中物理提取解析真实物理 MAC。

---

## 六、 工具类与公共文件规范

1. **工具归口**：通用工具方法（如十六进制转换、BMS 数据帧校验）必须编写在 `utils/` 下（如 `utils/bms-helper.ts`），严禁重复手写。
2. **样式重用**：非通用排版使用 UnoCSS 工具类；定制的局部布局编写在页面的 `<style scoped lang="scss">` 内。

---

## 七、 代码注释规范（强制约束）

1. **全中文注释**：**禁止**出现任何英文注释。所有单行、多行及 `JSDoc/TSDoc` 注释**必须统一使用简体中文**书写。
2. **注释质量**：在 Props、Pinia 状态、API 请求、复杂数据校验和条件编译处，必须详写解释“为什么这样做”。

---

## 八、 模块架构与目录职责规范（现代化 App 架构指引）

必须严格遵循物理目录职责分工，严禁任何职责混淆：

1. **`config/` (配置层)**：仅存放全局静态运行参数、URL、蓝牙 UUID 及自定义主题变量。**红线**：严禁在此编写带有运行期副作用或依赖 Pinia 状态的代码。
2. **`service/` (服务层)**：托管底层长线服务（原生权限诊断、蓝牙适配管理器、HTTP 拦截器）。**红线**：禁止放置具体业务接口请求或视图状态控制。
3. **`api/` (接口层)**：按业务模块定义后端 Promise 网络请求端点。**红线**：严禁在组件、Store 或工具类中硬编码 URL。
4. **`stores/` (Pinia 状态层)**：全站数据/事件总线，存放通信状态和遥测数据。**红线**：状态变迁必须单向且由 Action 执行，禁止外部脏修改。
5. **`pages/` (业务页面层)**：业务 Vue 页面，每个页面容器必须被全局高阶组件 `<layout-provider>` 包裹。
6. **`components/` (公共/共享组件层)**：存放自治的共享组件（easycom）。**允许子目录下存在与组件层紧密耦合的配套 `.ts` 辅助文件**（如视图层 `panel-registry.ts` 分发器），这类配套文件**严禁**放入 `service/` 或 `utils/`，防止职责污染。
7. **`composables/` (视图复用 Hook 层)**：存放与视图交互、联动相关的 Hooks 函数。**红线**：禁止编写复杂的系统 API 检测或硬件底层判断，必须委托给 `service/`。
8. **`types/` (类型定义层)**：存放共享 TS 类型。**支持并存**：`.d.ts`（环境/全局类型声明文件）与 `.ts`（模块化类型定义文件）。**红线**：仅限类型契约声明，**严禁**编写任何含有具体业务运行逻辑的代码。
9. **`utils/` (纯工具函数层)**：仅存放与网络、全局配置、Pinia 完全解耦的纯算法。**红线**：严禁导入网络拦截器或 Store。

---

## 九、 TypeScript 类型校验与兼容规范（强制约束）

1. **严禁遗留编译错误**：修改代码后，必须主动执行 `npx tsc --noEmit` 检查并解决所有报错。
2. **第三方库类型兼容**：针对 uni-app 官方类型库的声明 Bug（如蓝牙 `value` 被标为 `any[]`），允许且强制使用 `as any` 或 `as ArrayBuffer` 类型断言进行兜底。

---

## 十、 代码格式规范（强制约束）

所有代码必须完全符合 `.prettierrc.json` 规则。核心要求：

1. **禁止 Tab 缩进**，统一使用 **2 个空格**。
2. **字符串必须使用双引号** (`"singleQuote": false`)。
3. **每行结尾必须补齐分号** (`"semi": true`)。
4. **对象/数组多行排版时必须保留尾随逗号** (`"trailingComma": "all"`)。

---

## 十一、 开发设备与命令行执行规范（强制约束）

1. **Windows (PowerShell) 兼容**：终端 Shell 为 PowerShell。**严禁**执行仅限 Unix 运行的 shell 脚本或专有参数，系统文件操作必须使用 PowerShell 原生或 Node 跨平台命令。
2. **工作区清理**：严禁遗留调试临时脚本或编译日志。临时测试脚本验证后必须立即物理删除。

---

## 十二、 GSAP (GreenSock) 高级动画开发规范（强制约束）

1. **禁止操作 DOM**：小程序无 DOM，**必须使用状态补间驱动**（绑定 Vue 的 `ref` 数值渲染到 CSS/SVG 样式中）或类名选择器，避免原生报错。
2. **防内存泄漏**：在组件卸载 `onUnmounted`（或页面 `onUnload`）中，**必须显式且主动调用 `tween.kill()` 或 `gsap.killTweensOf(target)`** 彻底终结所有动画。
3. **GPU 硬件加速与 Reflow 防御**：禁止对重排属性（如 `top`, `left`, `width`）进行补间，**必须**优先使用 GPU 加速的 `x`, `y`, `scale`, `rotation`, `opacity` 变换属性，并在活跃节点上显式添加 `will-change: transform`。

---

## 十三、 全局 Pinia 状态管理与数据联动规范（强制约束）

1. **响应式解构防丢失**：**必须**使用 **`storeToRefs(store)`** 来解构 Pinia Store 中的 state 或 getters。**绝对禁止**直接使用 ES6 的解构赋值（会导致响应式断裂）。
2. **状态修改归口**：绝对禁止绕过 Store 在外部伪造或脏修改蓝牙连接状态或遥测数据。核心状态变迁统一且只能由 `bleStore` 导出的 Action 执行。

---

## 十四、 z-paging 高效分页与设备列表去重规范（强制约束）

1. **扫描设备去重**：蓝牙广播包推送到 `z-paging` 渲染前，**必须**在 `startScan` 回调中基于物理 MAC 地址（`deviceId`）去重过滤，防重复项导致频繁重绘。
2. **自适应高度插槽**：自定义顶部导航栏必须声明在 `z-paging` 的 **`top` 插槽（`#top`）** 内部，以防内容重叠。

---

## 十五、 异步接口防御、防连点与超时熔断规范（强制约束）

1. **防连点与 Loading 死锁防御**：写入或提交操作前**必须**开启 Loading 遮罩（如 `toast.show({ mask: true })`）。必须使用 `try-catch-finally` 结构，并且在 **`finally` 块中显式关闭 Loading**，防因未捕获异常导致遮罩死锁。
2. **离线拦截**：前置校验 `APP_CONFIG.APP_MODE === "offline"`，离线模式下直接拦截并 reject 抛出 `OFFLINE_MODE` 错误。

---

## 十六、 移动端全面屏与微信小程序安全区适配（强制约束）

1. **状态栏与贴底安全区**：无原生导航栏顶部使用 **`var(--status-bar-height)`** 留白；贴底组件 padding-bottom使用 **`env(safe-area-inset-bottom)`**。
2. **小程序 CSS 路径**：SCSS/CSS 样式表中的 `background-image` **绝对禁止**使用任何本地相对路径，必须使用 Base64、网络 URL，或模板内的 `<image>` 标签。

---

## 十七、 Composables 组合式函数与系统权限安全申请（强制约束）

1. **职责隔离**：`composables/` 只处理视图交互（NoticeBar 提示、Dialog 确认弹窗）。底层核心权限状态诊断必须委托给 `service/permission.ts`。
2. **原生修复自适应**：权限缺失时，小程序调用 `uni.openSetting`；APP 端通过原生反射调起系统 Intent 页面，并用 `try-catch` 包裹保障稳定性。

---

## 十八、 遥测数据（Telemetry）通信时序与主动轮询控制（性能与实时性规范）

1. **主动轮询控制（Request-Response Model）**：本项目 BMS 通信采用“一发一收”的主动轮询机制，控制权在 APP 端。APP 必须在前置收发完毕后，通过定时器/时序队列下发查询指令（推荐间隔 500ms - 1000ms）。严禁在上一帧未响应或超时熔断前，并发/重叠下发新指令。
2. **高精度与实时性物理写回**：**绝对禁止**采用任何“数值精度差过滤”或“接收端丢帧节流”算法。BMS 遥测数据（如电压、电流）对精度与安全预警要求极高，只要解析到合法数据帧，**必须立即且完整**更新到响应式展示 State 中。
3. **计算属性性能保障**：均压差、温差、均温等高阶计算属性（`computed`）合理依赖被及时更新的响应式遥测状态，利用 Vue 缓存减少无意义的二次计算。

---

## 十九、 微信小程序与 App 端体积容量分包与打包按需引入（构建规范）

1. **首屏外绝对分包**：主包（限 2MB）仅存放首屏与核心初始化逻辑。非首屏、重度 UI 功能（如曲线、设置、校准）必须划分至分包。
2. **大资源外置**：超过 40KB 的静态图片或演示 JSON 绝对禁止放入主包，推荐网络存储或放于对应分包。
3. **Vite 打包清理**：在 `vite.config.ts` 中配置生产打包剥离 `console.log()` 及 `debugger`（仅保留核心 `error`）。
4. **按需自动引入**：组件库必须采用按需引入（Tree-Shaking），严禁在 `main.ts` 全量注册 wot-ui。

---

## 二十、 UI 设计美学与高保真动效原则（Wow 体验保障）

1. **色彩与拟物搭配**：**绝对禁止**直出高饱和纯红（`#ff0000`）、纯绿（`#00ff00`）等。选用经过语义化和谐配色的 HSL/HEX 渐变方案，搭配 `12px` - `16px` 深色卡片圆角。
2. **UnoCSS 规范**：网格及 Flex 布局统一使用配备 `wot-` 前缀的 UnoCSS 全局预设，杜绝无序 ad-hoc 类。

---

## 二十一、 AI 协同、IDE 插件联动与多分支决策规约

1. **定义求证前置**：修改或扩展接口、实体、蓝牙服务前，**必须**调用 `codegraph` 工具进行定义求证，**绝对禁止**凭空假设字段。
2. **复杂改动的 Planning**：涉及核心架构与通信校验逻辑变动，AI 必须启动 `Planning Mode`，生成 `implementation_plan.md`，唤起审阅，人类批准后方可执行。
3. **i18n ally 联动**：配置 `"zh-Hans"` 为主显示语言，翻译字段必须完整补齐 `"bms."` 命名空间前缀。

---

## 二十二、 多协议多厂商硬件热兼容与解耦规约（核心架构规范）

确保应用无缝兼容不同厂商、不同报文格式的 BMS 电池硬件。**代码中严禁出现任何具体厂商商业名称**，统一使用中性的协议序号/小写连字符（如 `protocol-a`、`protocol-b` 等）占位。

### 1. 协议规格声明区强制规范（核心红线）

每个协议实现文件顶部必须声明一个 `PROTOCOL_SPEC` 常量，实现 `types/protocol.ts` 的 `ProtocolSpec` 接口。包含：帧头字节（frameHeader）、最小帧长（minFrameLength）、字节序（byteOrder）、校验算法名（checksumAlgorithm）、校验范围（checksumRange）、下行指令字典（commandSet）。

- **红线**：严禁将帧头魔数、指令字节码、校验算法等参数散落在解析代码中，必须全部集中在规格常量中，并通过 `readonly spec = PROTOCOL_SPEC` 暴露。

### 2. 策略模式解耦

各协议封装为独立的协议策略类，统一实现 `types/protocol.ts` 的 `BmsProtocolParser` 接口。Store、组件中严禁硬编码帧结构或解析逻辑，所有指令组包与解包**统一且只能**委托给激活的协议策略实例（`activeProtocolParser`）。

### 3. 协议注册表强制注册（消灭 if-else）

- 通过 `service/protocol/protocol-registry.ts` 的 `registerProtocol()` 将蓝牙服务 UUID 与对应协议解析器工厂绑定注册。
- `ble-store.ts` 中的协议匹配**必须且只能**通过 `resolveProtocol(serviceUuid)` 调用注册表查找，**绝对禁止**编写基于 UUID 的 `if-else` 硬编码判断。
- 新增协议时，仅允许新建协议类文件并于注册表追加一行注册，无需修改 Store 或任何现有文件。

### 4. 校验算法可插拔

- 所有协议的校验验证必须调用 `utils/bms-helper.ts` 中的 `verifyChecksum(bytes, algorithm, range)` 通用分发函数。**绝对禁止**在协议类中手写校验循环。
- 内置算法：`sum8`、`sum16le`、`crc16-modbus`。新增算法时仅在 `bms-helper.ts` 新增并于分发器配置分支，协议类代码无感。

### 5. 基于 UUID 动态分流与视图容错

- 服务发现后，通过注册表实例化协议策略对象挂载至 `bleStore.activeProtocolParser` 上。
- 视图层消费 `extendedProtocolData` 时，**必须**使用可选链（`?.`）兜底防缺失崩溃。
- `protocolType` 为 `string` 开放类型，命名统一小写连字符，禁止使用商业名称。
- 遵循开闭原则（OCP），单一协议的补丁逻辑必须封装在对应协议类内，严禁外溢至全局。

### 6. 协议驱动视图自适应（双注册表架构）

首页、控制页等布局可能完全不同，必须通过数据层注册表加视图层注册表的“双注册表”实现零侵入 UI 自适应，**严禁**在业务页面编写基于 `protocolType` 的分支判断。

**双注册表架构组成：**

- 数据层：`service/protocol/protocol-registry.ts` 匹配解析器。
- 视图层：`components/protocol-panels/panel-registry.ts` 匹配 Vue 组件对象引用。

**小程序兼容性红线（核心约束）：**

- 禁止运行时动态 `import()` 加载组件，禁止使用组件的字符串名称绑定 `<component :is>`。
- **必须在 `panel-registry.ts` 中静态 import 所有组件**，通过 `protocolType` 键值查找组件对象引用后，将对象引用传给 `<component :is>`。

**页面使用姿势：**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useBleStore } from "@/stores/ble-store";
import { resolveHomePanel } from "@/components/protocol-panels/panel-registry";

const { activeProtocolParser } = storeToRefs(useBleStore());
// 获取组件对象引用，以支持小程序端动态渲染
const homePanelComponent = computed(() => resolveHomePanel(activeProtocolParser.value?.protocolType));
</script>

<template>
  <component :is="homePanelComponent" v-if="homePanelComponent" />
  <default-home-panel v-else />
</template>
```

**新增协议专属面板时：**

1. 新建 `components/protocol-panels/protocol-x-home-panel.vue`。
2. 于 `panel-registry.ts` 静态 `import` 并配置在 Map 映射中即可完成，无任何页面侵入。

---

## 二十三、 Vue 3 Composition 视图复用 Hook 架构红线（现代化架构演进规范）

为了捍卫项目的可读性、高内聚和高复用特征，彻底解决传统单文件大组件逻辑臃肿的弊端，Vue 3 的开发必须遵守 Composition API 架构解耦红线。

### 1. 视图与逻辑强分离原则

任何涉及复杂网络组合、蓝牙/硬件通信、设备扫描配对比对、权限复合诊断等**纯逻辑、与视图渲染无直接联系的交互过程，严禁在页面页面组件（`pages/` 目录下）的脚本区域中长篇手写**。这类纯逻辑管理**必须且只能**封装进独立的复用组合式 Hook 函数（`composables/` 目录下）中。

### 2. 页面组件的轻量化职责

页面组件的脚本区域只负责：
- 接收并绑定由 Hook 暴露的响应式状态和事件动作。
- 执行路由跳转、或极度轻量的用户界面状态切换（如弹窗显隐控制响应状态）。
- 绝不能持有扫描定时器、节流处理器、地址正则表达式清洗等低层业务实现。

### 3. Composable Hook 开发规约

- **命名规范**：组合式函数文件统一存放在 `composables/` 下，文件命名遵循小写连字符，以 `use-` 开头（例如：`use-scan-connect.ts`）。
- **零硬编码中文红线**：Hook 内部进行交互回执、弹窗提示时，**绝对禁止**使用任何硬编码中文字符。所有诸如“加载中...”、“连接失败”、“格式不合法”等交互文本，**必须全部**归口到 `locale/` 的国际化词条字典中，并由 `t()` 或 `translate()` 函数动态调取，以防国际化切换后交互文本失联。
- **注释纯中文红线**：在 Hook 内部所撰写的一切逻辑注释，**必须统一使用简体中文，且绝对不能夹杂任何英文字母**。
