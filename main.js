import "uno.css";
import App from "./App";
import { i18n } from "./locale/i18n";

// #ifdef VUE3
import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'

// 创建并初始化 Vue 应用实例的核心入口函数
// 注意：此阶段不调用任何依赖 getApp() 的 uni API（如 getStorageSync / getLocale），
// 语言的准确读取与同步将推迟到 App.vue 的 onLaunch 生命周期中由 initI18nLocale() 完成。
export function createApp() {
  const app = createSSRApp(App)
  
  // 注册多语言国际化插件（此阶段以默认语言 zh-Hans 初始化，不触发 getApp()）
  app.use(i18n)
  
  // 注册并挂载 Pinia 状态管理插件
  app.use(Pinia.createPinia())
  
  return {
    app,
    Pinia // 必须将 Pinia 返回以确保 uni-app 在各端平台下的热重载和底层组件状态通信正常
  }
}
// #endif
