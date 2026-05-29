import { createI18n } from "vue-i18n";
import messages from "./index";

/**
 * 模块说明：分阶段国际化初始化策略
 *
 * 【问题根因】
 * uni-app 的 App 实例（getApp()）在 main.js 的 createApp() 执行期间尚未完全就绪。
 * uni.getStorageSync() 和 uni.getLocale() 的内部实现会调用 getApp() 来获取
 * 应用运行时上下文，因此在 createApp() 阶段调用这两个 API 必然触发：
 * [warn]: getApp() failed.
 *
 * 【解决方案：两阶段初始化】
 * 阶段一（createApp 期间）：以默认语言 "zh-Hans" 创建 i18n 实例，不调用任何 uni API。
 * 阶段二（onLaunch 期间）：调用 initI18nLocale()，此时 getApp() 完全就绪，
 *   可以安全地读取 uni.getStorageSync("app_locale") 和 uni.getLocale()，
 *   并将实际语言动态写入已存在的 i18n 实例。
 */

/**
 * i18n 单例实例，在模块被导入时立即以默认语言创建，不依赖任何 uni API。
 * 语言的准确性将在 onLaunch 阶段由 initI18nLocale() 补全。
 */
const _i18nInstance = createI18n({
  legacy: false,         // 禁用 Legacy API 以支持 Vue3 Composition API 的 useI18n()
  globalInjection: true, // 全局注入 $t 等便捷函数，使模板中可直接使用 {{ $t('key') }}
  locale: "zh-Hans",     // 阶段一默认语言，待 onLaunch 后由 initI18nLocale() 纠正
  fallbackLocale: "en",  // 翻译键不存在时兜底显示英文
  messages,
});

/**
 * 导出 i18n 插件对象，兼容 app.use(i18n) 调用方式。
 * 对外 API 与 vue-i18n 原生实例完全一致，其余模块无需感知内部两阶段逻辑。
 */
export const i18n = _i18nInstance;

/**
 * 阶段二：从系统/本地存储读取真实语言设置并同步到 i18n 实例。
 *
 * 此函数必须且只能在 App.vue 的 onLaunch 生命周期中调用。
 * 此时 uni-app 应用实例已完全初始化，getApp() 可正常返回，
 * uni.getStorageSync() 和 uni.getLocale() 均可安全调用。
 *
 * 语言优先级（从高到低）：
 *   1. 用户手动选择并缓存到本地的语言（app_locale 键）
 *   2. 手机系统 / 宿主微信的当前语言设置
 *   3. 兜底语言 "zh-Hans"（中文环境）或 "en"（其他）
 */
export function initI18nLocale(): void {
  try {
    // 优先读取用户手动选择的本地缓存语言
    const savedLocale = uni.getStorageSync("app_locale");
    if (savedLocale === "zh-Hans" || savedLocale === "zh-Hant" || savedLocale === "en") {
      // @ts-ignore
      _i18nInstance.global.locale.value = savedLocale;
      uni.setLocale(savedLocale);
      console.log("国际化语言已从本地缓存恢复:", savedLocale);
      return;
    }

    // 读取系统语言，并进行简体与繁体中文的兼容性精细化映射
    let systemLocale = uni.getLocale() || "zh-Hans";
    systemLocale = systemLocale.toLowerCase().replace("_", "-");

    let targetLocale = "en";
    if (systemLocale.startsWith("zh")) {
      if (
        systemLocale.includes("hant") ||
        systemLocale.includes("tw") ||
        systemLocale.includes("hk") ||
        systemLocale.includes("mo")
      ) {
        targetLocale = "zh-Hant";
      } else {
        targetLocale = "zh-Hans";
      }
    }

    // @ts-ignore
    _i18nInstance.global.locale.value = targetLocale;
    uni.setLocale(targetLocale);
    console.log("国际化语言已从系统设置初始化:", targetLocale);
  } catch (e) {
    // 捕获异常兜底，确保语言初始化失败不影响应用正常启动
    console.error("国际化语言初始化异常（已使用默认值 zh-Hans）:", e);
  }
}

/**
 * 通用的非组件内翻译辅助函数
 * 适用于普通的 .ts/.js 逻辑文件或外部服务类中获取对应翻译文本
 * @param key 多语言词条键路径，如 'bms.ble.connect'
 * @param values 可选的占位符变量键值对
 * @returns 对应的翻译后文本字符串
 */
export function translate(key: string, values?: Record<string, any>): string {
  try {
    // 1. 尝试使用 vue-i18n 标准的全局 t 翻译
    // @ts-ignore
    const result = _i18nInstance.global.t(key, values || {});
    // 如果返回的不是 key 且不是空，则直接返回
    if (result && result !== key) {
      return result;
    }
  } catch (e) {
    console.error("[i18n] vue-i18n global.t error:", e);
  }

  // 2. 物理兜底方案：直接从静态导入的 messages 字典中解析路径路径，保障极端多端环境下的翻译可用性
  try {
    const currentLocale = (_i18nInstance.global.locale as any).value || "zh-Hans";
    const langDict = (messages as Record<string, any>)[currentLocale] || (messages as Record<string, any>)["zh-Hans"];
    
    if (langDict) {
      const parts = key.split(".");
      let current = langDict;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }
      
      if (typeof current === "string") {
        let msg = current;
        // 如果存在占位符变量替换
        if (values) {
          for (const k in values) {
            msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(values[k]));
          }
        }
        console.log(`[i18n] translate fallback success for key: ${key} -> ${msg}`);
        return msg;
      }
    }
  } catch (e) {
    console.error("[i18n] translate fallback parser error:", e);
  }

  return key;
}

