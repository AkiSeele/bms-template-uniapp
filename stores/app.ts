import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 应用级别的全局语言配置状态，初始化时优先从本地缓存读取，无缓存则默认 en 英文
  const locale = ref(uni.getStorageSync('app_locale') || 'en')

  // 全局修改语言状态，并同步持久化缓存与 uni-app 宿主环境语言配置
  const setLocale = (newLocale: 'zh-Hans' | 'en') => {
    locale.value = newLocale
    uni.setStorageSync('app_locale', newLocale)
    try {
      uni.setLocale(newLocale)
    } catch (e) {
      console.error('设置框架底层内置语言失败:', e)
    }
  }

  return {
    locale,
    setLocale
  }
})
