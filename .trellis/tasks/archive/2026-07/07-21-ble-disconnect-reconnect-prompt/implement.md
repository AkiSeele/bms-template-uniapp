# Execution Plan - ble-disconnect-reconnect-prompt

本计划用于指导蓝牙意外断开重连提醒功能的具体编码与测试。

## Checklist

### 1. 国际化词条配置 (i18n)
- [x] 在 `locale/zh-Hans.json` 中配置 `"bms.reconnect.*"`（如断开提示、重连中、重连成功、失败等）。
- [x] 在 `locale/zh-Hant.json` 和 `locale/en.json` 中同步配置翻译词条。

### 2. 状态层修改 (State & Service)
- [x] 在 `stores/ble-store.ts` 中新增 `activeDisconnect` 状态，并在用户主动断开的方法中（例如 `disconnectDevice`）显式设为 `true`。
- [x] 优化蓝牙连接监听回调，当 `isConnected` 发生变化且 `activeDisconnect === false` 时，标记 `isUnexpectedDisconnected = true`。
- [x] 在 `stores/ble-store.ts` 中封装 `reconnect()` Action，包括重置状态、发起连接、MTU 协商、激活遥测。必须使用 `try-catch-finally` 防御 Loading 死锁。

### 3. Hook 封装 (View Logic Separation)
- [x] 创建 `composables/use-ble-reconnect.ts`。
- [x] 监听 `isUnexpectedDisconnected` 的变化，当被标记为 `true` 时，弹出 `useDialog()` 提示用户。
- [x] 绑定确认和取消回调，调用 `bleStore.reconnect()` 并执行 Loading 和 Toast 提示。
- [x] 全中文注释编写，禁止硬编码中文，翻译文本必须取自 i18n。

### 4. 视图挂载 (UI Integration)
- [x] 在主要入口页面（如 `pages/index/index.vue`）导入并调用 `useBleReconnect()`。
- [x] 确保相关页面模版中挂载了 `<wd-dialog />` 与 `<wd-toast />` 实例。

### 5. 校验与验证
- [x] 运行 `npx tsc --noEmit` 进行 TypeScript 类型校验。
- [x] 运行 `npx @wot-ui/cli lint` 校验 wot-ui 组件使用规范。

## Rollback Plan
- 若重连逻辑导致蓝牙连接死锁或多重弹框，还原 `stores/ble-store.ts` 与 `pages/index/index.vue`，保留 i18n 词条。
