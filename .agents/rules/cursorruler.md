---
trigger: always_on
---

# BMS BLE uni-app 项目开发规范与 Ruler

本规范旨在约束和指导 BMS BLE（低功耗蓝牙电池管理）uni-app 项目的开发，确保代码在 **Android、iOS、微信小程序** 三端具备优异的兼容性、性能和可维护性。

---

## 一、 技术栈与核心要求

1. **核心框架**：uni-app (Vue 3)
2. **代码风格**：新编写的页面和组件优先使用 `<script setup>` 语法，统一采用 TypeScript 进行开发（若涉及类型定义）。
3. **UI 组件库**：优先使用 **wot-ui v2 (`wd-*`)** 组件。严禁擅自使用原生 HTML 标签或重写已有组件。
4. **样式方案**：使用 **UnoCSS**。通用布局及尺寸类名必须使用 `wot-` 前缀（对应项目配置），如 `wot-flex`, `wot-w-24`。
5. **图标方案**：
   - **统一使用 `wd-icon` 组件** 承载 UnoCSS 图标，格式为：`<wd-icon css-icon="i-<前缀>-<图标名>" size="24px" color="#fff" />`。
   - **绝对禁止** 在模板中直接编写 `svg` 标签或裸写 `<view class="i-...">` 作为图标。

---

## 二、 三端兼容性规范 (Android / iOS / 微信小程序)

在开发 uni-app 时，必须时刻注意三端的底层差异，确保一套代码稳定运行：

### 1. 条件编译规范

- 任何具有平台特异性的代码（API、样式或结构），必须使用 uni-app 条件编译进行隔离，严禁直接在全平台运行：

  ```javascript
  // #ifdef MP-WEIXIN
  // 微信小程序特有逻辑
  // #endif

  // #ifdef APP-PLUS
  // App 端特有逻辑（Android/iOS）
  // #endif

  // #ifdef H5
  // Web 端逻辑
  // #endif
  ```

### 2. 微信小程序限制

- **图片路径**：在 CSS (SCSS/CSS) 中使用 `background-image` 时，**禁止使用本地相对路径**（小程序真机不识别），必须使用 `Base64` 或是网络 URL，或直接在模板中用 `image` 标签替代。
- **分包管理**：微信小程序单包大小限制为 2MB。在开发新页面时，非主包首屏引用的组件和页面应放入相应分包。
- **原生组件层级**：`video`、`map`、`canvas` 等原生组件在小程序中层级最高。若需要在这些组件上覆盖自定义弹窗或按钮，必须使用 `cover-view` 和 `cover-image` 标签。

### 3. iOS 与 Android APP 限制

- **安全区适配**：必须考虑全面屏的顶部留白和底部安全区。
  - 顶部：使用系统状态栏高度占位 `var(--status-bar-height)`。
  - 底部：使用安全区距离 `safe-area-inset-bottom`。
- **键盘与输入框**：输入框弹起时，需要注意软键盘遮挡输入框的问题。优先使用 wot-ui 内置的 `<wd-input>` 组件，其内部已做好大部分机型的输入框聚焦位置修正。

---

## 三、 wot-ui v2 开发规范

1. **反馈类 Hook 使用限制**：
   - 在使用 `useToast()`、`useDialog()`、`useNotify()`、`useImagePreview()` 时，**必须在当前页面模板内显式挂载对应的实例组件**，否则页面无法弹窗：
     ```html
     <template>
       <view>
         <!-- 必须挂载，否则 useToast 不生效 -->
         <wd-toast />
         <wd-dialog />
       </view>
     </template>
     ```
2. **主题配置**：
   - 主题色的定制统一采用 `ConfigProvider` 和全局 SCSS 变量（修改 `uni.scss` 或引入单文件主题），**禁止** 在业务代码中通过深层 CSS 选择器（如 `::v-deep`）去强行覆盖组件库的内部类名。
3. **命名与 API 对齐**：
   - 组件属性命名与官方文档严格一致（例如：显示隐藏使用 `v-model:visible`，选择器使用 `v-model`，阻止冒泡事件使用对应的 `.stop` 饰符）。

---

## 四、 国际化 (i18n) 强制约束

为满足 BMS 项目在全球市场的使用要求，必须严格落实中英双语国际化：

1. **禁止硬编码中文**：
   - 在所有 `.vue`、`.js`、`.ts` 文件中，**除了 `console.log()` / `console.error()` 日志输出外，禁止出现任何硬编码中文字符**。
2. **模板 i18n 语法**：
   - 模板中的所有静态文本均必须使用 `$t()` 包裹：

     ```html
     <!-- 正确示例 -->
     <text>{{ $t('bms.voltage') }}</text>

     <!-- 错误示例 -->
     <text>总电压</text>
     ```
3. **脚本 i18n 语法**：
   - `<script>` 逻辑中的文本，如 `uni.showToast` 的提示文字，必须调用 `t()` 方法获取：

     ```javascript
     import { useI18n } from "vue-i18n";
     const { t } = useI18n();

     uni.showToast({
       title: t("bms.connectSuccess"),
       icon: "success",
     });
     ```
4. **语言包组织**：
   - 所有的中英文文本对照必须严格配置在 `locale/zh-Hans.json` 和 `locale/en.json` 中。
   - 键名必须结构化、分类清晰，例如：`bms.status.charging`（充电中）、`bms.error.overVoltage`（过压错误）。

---

## 五、 低功耗蓝牙 (BLE) BMS 通讯规范

由于 BMS 数据的实时性与蓝牙通讯的硬件不稳定性，开发 BLE 通讯时必须遵守以下规范：

1. **异步 API 异常捕获**：
   - 所有蓝牙 API（如 `uni.openBluetoothAdapter`、`uni.createBLEConnection` 等）调用必须进行 `try-catch` 或在 `fail` 回调中捕获异常，并使用 `i18n` 提示用户蓝牙未开启或连接失败。
2. **连接生命周期管理**：
   - **防止内存泄漏**：在页面的 `onUnload` 周期中，必须主动断开蓝牙连接（`uni.closeBLEConnection`）并注销特征值监听（`uni.onBLECharacteristicValueChange`）。
3. **分包与 MTU 写入**：
   - 向 BMS 写入特征值指令时，必须遵守硬件的 MTU 字节限制（一般为 20 字节，若协商成功可增加），大指令包必须在应用层做 **切片分包发送**，并配合适当的延时（如 50ms）防止发包阻塞。

---

## 六、 工具类与公共文件规范

1. **工具方法归口**：
   - 通用的工具方法（如十六进制转换、BMS 数据帧校验、温度/电压单位换算）必须编写在 `utils/` 目录下（如 `utils/bms-helper.ts`），禁止在页面中重复手写算法。
2. **样式重用**：
   - 非通用排版可以使用 UnoCSS 工具类；对于高度定制的局部布局，统一编写在页面的 `<style lang="scss">` 内，推荐开启 `scoped`。

---

## 七、 代码注释规范（强制约束）

1. **必须使用中文注释**：
   - **禁止** 在所有代码文件（包括 `.vue`, `.ts`, `.js`, `.json` 等）中出现任何英文或其它非中文的代码注释。
   - 所有单行注释、多行注释及 `JSDoc/TSDoc` 说明，**必须统一且只能使用简体中文**进行书写。
2. **注释详尽性与质量**：
   - 严禁简单的敷衍式注释，核心的组件 Props、Pinia 状态、API 请求、复杂的蓝牙数据帧校验逻辑以及多端兼容的条件编译块处，必须编写尽可能详尽、完善的中文说明，解释“为什么这样做”以及“关键逻辑是如何流转的”。

---

## 八、 模块架构与分层规范（强制约束）

为保证项目架构的可维护性，必须严格执行以下物理及逻辑分层设计，严禁交叉混淆：

1. **`config/` (配置层)**：仅存放应用全局静态环境变量、网络基准 URL 以及多套蓝牙 UUID 组等配置。
2. **`service/` (服务层)**：存放核心底层长线服务逻辑。包括通用的 HTTP 拦截器与响应器 (`service/request.ts`)、全局蓝牙通信连接管理器 (`service/ble.ts`)。**禁止** 放置具体 API 接口。
3. **`api/` (接口层)**：按业务模块分别建立 API 接口请求文件（如 `api/user.ts`），专门定义接口的传参及 Promise 请求，**禁止** 直接在组件或 Store 里硬编码 `url` 发送请求。
4. **`types/` (类型定义层)**：存放共享的 TypeScript 类型定义文件（如 `types/bms.d.ts`），统一规范全局数据结构实体。
5. **`utils/` (纯工具函数层)**：只放与网络、鉴权及具体业务状态无关的纯函数算法（如十六进制转换、累加和计算等 `utils/bms-helper.ts`），**禁止** 在该目录下写任何网络请求和全局配置。

---

## 九、 TypeScript 类型校验与兼容规范（强制约束）

1. **严禁遗留编译错误**：
   - 编写或修改任何 `.vue`、`.ts` 等文件后，**必须主动、彻底地检查是否还存在 TypeScript 编译或静态语法红线报错**，并全部予以解决。
2. **兼容官方三方库类型声明 Bug**：
   - 在 uni-app 官方类型库 (`@dcloudio/types`) 中，存在部分 API 声明不严谨或错误的 Bug（如蓝牙特征值读写中的 `value` 字段被错标为 `any[]` 数组，导致传入正常的 `ArrayBuffer` 报错）。
   - 针对此种官方定义 Bug，**允许且强制使用 `as any`、`as ArrayBuffer` 或通用的 `UniApp.GeneralCallbackResult` 进行类型断言和兜底**，以确保顺利通过 TS 编译器校验并完美运行。

---

## 十、 代码格式规范（强制约束）

1. **严格遵守 Prettier 配置**：
   - 所有编写、重构和修改的代码文件（包括 `.vue`、`.ts`、`.js`、`.json`、`.scss` 等）**必须完全符合根目录下的 `.prettierrc.json` 规则**，并在保存或交付前进行格式化。
2. **核心格式化细节要求**：
   - **禁止使用 Tab 缩进**，统一使用 **2 个空格** 缩进。
   - **字符串必须使用双引号**（`"singleQuote": false`），严禁在普通字符串中混用单引号（除模板字符串外）。
   - **每行结尾必须补齐分号**（`"semi": true`）。
   - **对象/数组多行排版时必须保留尾随逗号**（`"trailingComma": "all"`）。
3. **尊重忽略规则**：
   - 任何处于 `.prettierignore` 规则涵盖的编译产物、依赖包以及自动生成文件，严禁进行强制格式化或擅自修改。

---

## 十一、 开发设备与命令行执行规范（强制约束）

1. **Windows (PowerShell) 环境兼容**：
   - 用户的开发设备为 Windows x64 系统，终端 Shell 为 **PowerShell**。
   - **严禁** 编写或执行任何仅限 Unix/Linux 运行的 shell 脚本（如 `.sh`）或专有命令参数（如直接调用 `rm -rf`，`mkdir -p`，`grep` 等）。
   - 执行系统级文件操作或脚本时，必须使用 PowerShell 兼容的原生命令或 Node.js 跨平台命令（例如，使用 `Remove-Item -Recurse -Force` 代替 `rm -rf`，使用 `New-Item -ItemType Directory` 代替 `mkdir -p`，或使用 `npx rimraf` 等）。
2. **工作区临时文件与脚本清理**：
   - 严禁在项目开发工作区（即项目文件夹根目录及各子目录下）长期遗留任何为了调试、验证而临时编写的脚本文件（如测试用的 `.js`、`.ts`、`.ps1`、`.bat`、`.py` 等脚本文件）或编译日志临时文件。
   - 任何临时脚本在完成其验证任务后，**必须立即主动物理删除**，绝不允许残留在工作区中或随项目代码一同提交。
   - 调试测试脚本必须存放在指定的临时缓存目录（如系统指定的 `<appDataDir>\brain\<conversation-id>/scratch/` 目录），确保项目工作区维持干净无污染的状态。
