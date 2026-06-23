import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { i18n } from "@/locale/i18n";
import { APP_CONFIG } from "@/config";

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
  // 应用级别的全局语言配置状态，初始化时优先从本地缓存读取，无缓存则自适应系统语言（从 i18n 实例获取）
  const locale = ref<"zh-Hans" | "zh-Hant" | "en">(
    (uni.getStorageSync("app_locale") as any) || (i18n.global.locale as any).value || "zh-Hans",
  );

  // 全局主题模式配置状态，支持亮色 (light)、暗色 (dark) 和跟随系统 (system)，默认 system
  const theme = ref<"light" | "dark" | "system">(uni.getStorageSync("app_theme") || "system");

  // 实际呈现的物理主题状态（只能为 light 或 dark），全站视图渲染均基于此状态
  const actualTheme = ref<"light" | "dark">("light");

  // 根据当前 theme 和系统实际主题动态演算 actualTheme
  const updateActualTheme = () => {
    if (theme.value === "system") {
      try {
        const sysInfo = uni.getSystemInfoSync();
        actualTheme.value = sysInfo.theme === "dark" ? "dark" : "light";
      } catch (e) {
        actualTheme.value = "light";
      }
    } else {
      actualTheme.value = theme.value;
    }
  };

  // 初始化物理主题状态
  updateActualTheme();

  // 监听宿主系统主题变化事件，实现“跟随系统”的主动热重绘
  try {
    if (typeof uni.onThemeChange === "function") {
      uni.onThemeChange((res) => {
        if (theme.value === "system") {
          actualTheme.value = res.theme === "dark" ? "dark" : "light";
        }
      });
    }
  } catch (e) {
    console.error("注册系统主题监听失败:", e);
  }

  // 手机/客户端设备基础信息状态，包含鸿蒙系统、iOS 和 Android
  const deviceInfo = ref<AppDeviceInfo>({});

  // ------------------------------------------------------------
  // 全局项目色彩自定义配置状态，初始化时分别从本地缓存读取
  // ------------------------------------------------------------
  const customThemeColor = ref<string>(uni.getStorageSync("project_theme_color") || "");
  const customWarningColor = ref<string>(uni.getStorageSync("project_warning_color") || "");
  const customDangerColor = ref<string>(uni.getStorageSync("project_danger_color") || "");
  const customSuccessColor = ref<string>(uni.getStorageSync("project_success_color") || "");

  // 全局修改语言状态，并同步持久化缓存与宿主环境语言配置
  const setLocale = (newLocale: "zh-Hans" | "zh-Hant" | "en") => {
    locale.value = newLocale;
    uni.setStorageSync("app_locale", newLocale);
    try {
      // @ts-ignore
      i18n.global.locale.value = newLocale;
      uni.setLocale(newLocale);
    } catch (e) {
      console.error("设置框架底层内置语言失败:", e);
    }
  };

  // 全局切换及修改主题模式配置状态，支持跟随系统
  const setTheme = (newTheme: "light" | "dark" | "system") => {
    theme.value = newTheme;
    uni.setStorageSync("app_theme", newTheme);
    updateActualTheme();
  };

  /**
   * 保存并更新手机/客户端设备基础信息状态
   */
  const setDeviceInfo = (info: AppDeviceInfo) => {
    deviceInfo.value = info;
  };

  /**
   * 一键全局更新项目的自定义配色方案，并自动做本地持久化缓存
   */
  const setProjectColors = (colors: {
    themeColor: string;
    warningColor: string;
    dangerColor: string;
    successColor: string;
  }) => {
    customThemeColor.value = colors.themeColor;
    customWarningColor.value = colors.warningColor;
    customDangerColor.value = colors.dangerColor;
    customSuccessColor.value = colors.successColor;

    uni.setStorageSync("project_theme_color", colors.themeColor);
    uni.setStorageSync("project_warning_color", colors.warningColor);
    uni.setStorageSync("project_danger_color", colors.dangerColor);
    uni.setStorageSync("project_success_color", colors.successColor);
  };

  // ------------------------------------------------------------
  // 全局品牌色彩动态获取（优先采用自定义色彩，无自定义时根据模式自适应返回默认色值）
  // ------------------------------------------------------------
  const activeThemeColor = computed(() => {
    if (customThemeColor.value) return customThemeColor.value;
    return actualTheme.value === "dark" ? "#0ea5e9" : "#0052d9";
  });

  const activeWarningColor = computed(() => {
    if (customWarningColor.value) return customWarningColor.value;
    return "#e37318";
  });

  const activeSuccessColor = computed(() => {
    if (customSuccessColor.value) return customSuccessColor.value;
    return "#2ba471";
  });

  const activeDangerColor = computed(() => {
    if (customDangerColor.value) return customDangerColor.value;
    return "#d54941";
  });

  // 底部自定义 Tabbar 激活项状态，支持 "realtime", "param", "control", "mine"，默认为 "realtime"
  const activeTab = ref<string>("realtime");

  const setActiveTab = (tab: string) => {
    activeTab.value = tab;
  };

  return {
    locale,
    theme,
    actualTheme,
    deviceInfo,
    customThemeColor,
    customWarningColor,
    customDangerColor,
    customSuccessColor,
    activeThemeColor,
    activeWarningColor,
    activeSuccessColor,
    activeDangerColor,
    activeTab,
    setLocale,
    setTheme,
    setDeviceInfo,
    setProjectColors,
    setActiveTab,
  };
});
