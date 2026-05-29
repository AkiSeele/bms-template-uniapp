import { defineStore } from "pinia";
import { ref } from "vue";

// 全局设备基础信息实体类型定义
export interface AppDeviceInfo {
  deviceBrand?: string;
  deviceId?: string;
  deviceModel?: string;
  deviceType?: string;
  system?: string;
  platform?: string;
  osName?: string;
  osVersion?: string;
  [key: string]: any; // 兼容不同平台额外上报的动态参数
}

export const useAppStore = defineStore("app", () => {
  // 应用级别的全局语言配置状态，初始化时优先从本地缓存读取，无缓存则默认 en 英文
  const locale = ref(uni.getStorageSync("app_locale") || "en");

  // 全局主题模式配置状态，亮色 (light) 或暗黑 (dark) 模式，初始化读取缓存，默认 light
  const theme = ref<"light" | "dark">(uni.getStorageSync("app_theme") || "light");

  // 手机/客户端设备基础信息状态，包含鸿蒙系统、iOS 和 Android
  const deviceInfo = ref<AppDeviceInfo>({});

  // 全局修改语言状态，并同步持久化缓存与 uni-app 宿主环境语言配置
  const setLocale = (newLocale: "zh-Hans" | "en") => {
    locale.value = newLocale;
    uni.setStorageSync("app_locale", newLocale);
    try {
      uni.setLocale(newLocale);
    } catch (e) {
      console.error("设置框架底层内置语言失败:", e);
    }
  };

  // 全局切换及修改主题模式配置状态，并自动进行本地缓存持久化
  const setTheme = (newTheme: "light" | "dark") => {
    theme.value = newTheme;
    uni.setStorageSync("app_theme", newTheme);
  };

  // 更新设备基础信息状态，支持来自 App.vue getDeviceInfo 的数据写回
  const setDeviceInfo = (info: AppDeviceInfo) => {
    deviceInfo.value = info;
  };

  return {
    locale,
    theme,
    deviceInfo,
    setLocale,
    setTheme,
    setDeviceInfo,
  };
});

