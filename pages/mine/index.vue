<template>
  <layout-provider>
    <!-- 自定义顶部导航栏，固定在顶部并生成占位元素 -->
    <wd-navbar :title="$t('bms.mine.title')" fixed safe-area-inset-top placeholder />
    
    <!-- 用户个人中心头部卡片 -->
    <view class="wot-p-main">
      <view class="user-card wot-bg-filled-oppo wot-rounded-2xl wot-p-main wot-shadow-sm wot-mb-4 wot-flex wot-items-center wot-gap-4">
        <view class="wot-w-16 wot-h-16 wot-rounded-full wot-bg-primary/10 wot-flex wot-items-center wot-justify-center">
          <wd-icon css-icon="i-lucide-user" size="36px" color="#0052d9" />
        </view>
        <view class="wot-flex wot-flex-col">
          <text class="wot-text-title-large wot-text-text-main wot-font-bold">BMS User</text>
          <text class="wot-text-caption wot-text-text-secondary wot-mt-1">ID: JLW-BMS-8888</text>
        </view>
      </view>

      <!-- 系统设置项单元格列表 -->
      <view class="wot-bg-filled-oppo wot-rounded-2xl wot-overflow-hidden wot-shadow-sm wot-mb-4">
        <wd-cell-group border>
          <!-- 手动切换语言的单元格 -->
          <wd-cell 
            :title="$t('bms.mine.language')" 
            :value="currentLanguageLabel" 
            is-link 
            @click="showLanguagePicker = true" 
          >
            <template #prefix>
              <wd-icon css-icon="i-lucide-globe" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>
          
          <!-- 新增的暗黑模式控制单元格，右侧通过 wd-switch 动态联动应用明暗状态 -->
          <wd-cell 
            :title="$t('bms.mine.darkMode')" 
            center
          >
            <template #prefix>
              <wd-icon css-icon="i-lucide-moon" size="20px" class="wot-mr-2" color="#858585" />
            </template>
            <template #value>
              <wd-switch 
                v-model="isDarkMode" 
                @change="handleThemeChange" 
                size="22px" 
              />
            </template>
          </wd-cell>
          
          <!-- 当前应用的版本信息单元格 -->
          <wd-cell 
            :title="$t('bms.mine.appVersion')" 
            value="v1.0.0" 
          >
            <template #prefix>
              <wd-icon css-icon="i-lucide-info" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>
          
          <!-- 设备基础信息展示单元格，实时解析展现设备品牌与操作系统（含鸿蒙） -->
          <wd-cell 
            :title="$t('bms.mine.deviceInfo')" 
            :value="deviceDisplayInfo" 
          >
            <template #prefix>
              <wd-icon css-icon="i-lucide-smartphone" size="20px" class="wot-mr-2" color="#858585" />
            </template>
          </wd-cell>
        </wd-cell-group>
      </view>
    </view>

    <!-- 语言选择的动作面板弹出层组件，双向绑定 showLanguagePicker 控制显隐 -->
    <wd-action-sheet 
      v-model="showLanguagePicker" 
      :actions="languageActions" 
      :cancel-text="$t('bms.common.cancel')"
      :title="$t('bms.common.selectLanguage')"
      @select="handleLanguageSelect" 
    />
    
    <!-- 自定义底部导航栏 -->
    <custom-tabbar active="mine" />
  </layout-provider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/uni_modules/wot-ui'
import { useAppStore } from '@/stores/app'

// 获取国际化和消息提示 hooks 以及全局 appStore 状态实例
const { locale, t } = useI18n()
const appStore = useAppStore()
const toast = useToast()

// 动态双向绑定当前应用是否处于暗黑模式的计算属性
const isDarkMode = computed({
  get: () => appStore.theme === "dark",
  set: (val) => appStore.setTheme(val ? "dark" : "light"),
})

// 动态拼装并展示用户的设备和系统信息（兼容 Android、iOS 和鸿蒙系统）
const deviceDisplayInfo = computed(() => {
  const info = appStore.deviceInfo;
  if (!info || !info.osName) return "Unknown";
  
  // 提取品牌并格式化首字母大写
  const brand = info.deviceBrand
    ? info.deviceBrand.charAt(0).toUpperCase() + info.deviceBrand.slice(1)
    : "";
  // 提取系统名称（如 harmonyos、ios、android），首字母大写
  const os = info.osName.charAt(0).toUpperCase() + info.osName.slice(1);
  
  // 如果存在系统版本号，一并显示
  const version = info.osVersion ? ` ${info.osVersion}` : "";
  
  return brand ? `${brand} (${os}${version})` : `${os}${version}`;
})

// 切换主题模式的回调，弹出 Toast 成功通知
const handleThemeChange = (val: any) => {
  toast.success(t("bms.mine.switchThemeSuccess"))
}

// 控制语言选择动作面板显隐的响应式状态
const showLanguagePicker = ref(false)

// 语言可选项数据列表定义
const languageActions = [
  { name: '简体中文', value: 'zh-Hans' },
  { name: 'English', value: 'en' }
]

// 计算属性：当前选中语言在单元格右侧的显示标签文案
const currentLanguageLabel = computed(() => {
  return appStore.locale === 'zh-Hans' ? '简体中文' : 'English'
})

// 处理语言选择确认的回调逻辑
const handleLanguageSelect = ({ item }: { item: { name: string, value: 'zh-Hans' | 'en' } }) => {
  const selectedLocale = item.value
  
  if (appStore.locale !== selectedLocale) {
    // 1. 更新 Pinia 全局状态、本地 Storage 缓存和 uni-app 框架内置语言设置
    appStore.setLocale(selectedLocale)
    
    // 2. 同步 vue-i18n 当前页面的语言实例值
    locale.value = selectedLocale
    
    // 3. 弹出修改成功的 Toast，提示完毕后调用 reLaunch 彻底刷新应用让新语言生效
    toast.success({
      msg: t('bms.mine.switchSuccess'),
      duration: 1000,
      closed: () => {
        // 重新加载应用以确保多页面模板的自定义 Tabbar 等非本页资源也全面重绘翻译
        uni.reLaunch({
          url: '/pages/mine/index'
        })
      }
    })
  }
}
</script>

<style scoped>
.page-container {
  box-sizing: border-box;
}

.user-card {
  transition: all 0.2s ease-in-out;
}
</style>
